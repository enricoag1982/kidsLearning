import { describe, expect, it, vi } from 'vitest';
import type {
  AppConfig,
  AppDeps,
  EarnedBadge,
  Profile,
  SessionLog,
  Streak,
} from '@learn/platform-core';
import { deleteProfile } from '@learn/platform-core';
import { buildBackupFile, parseBackupFile } from '@learn/platform-core/backup';
import { importMerged } from '@learn/platform-core/merge';
import { makeProgress } from '@learn/platform-core/testing';
import { SCHEMA_VERSION } from '../adapters/storage/local-store.ts';
import { createMemoryStorage } from '../testing/memory-storage.ts';
import { createTestEntry, createTestPack } from '../testing/test-pack.ts';
import type { LoadedSubject } from './subject.ts';
import { createAppServices, createServices } from './services.ts';

const APP: Omit<AppConfig, 'version'> = {
  title: 'Test app',
  storagePrefix: 'app:',
  backupAppId: 'app',
  backupFilePrefix: 'app',
  parentCodeFilePrefix: 'app-code',
};

const NOW = '2026-01-05T00:00:00.000Z';

const PROFILE: Profile = {
  id: 'p1',
  accountId: 'local',
  nickname: 'Mia',
  avatar: 'fox',
  locale: 'en',
  createdAt: NOW,
  updatedAt: NOW,
};

const BADGE: EarnedBadge = {
  id: 'eb1',
  profileId: 'p1',
  badgeId: 'first-win',
  at: NOW,
  seen: false,
  createdAt: NOW,
  updatedAt: NOW,
};

const STREAK: Streak = {
  id: 's1',
  profileId: 'p1',
  current: 2,
  best: 3,
  skipsUsedThisWeek: 0,
  createdAt: NOW,
  updatedAt: NOW,
};

const LOG: SessionLog = {
  id: 'sl1',
  profileId: 'p1',
  date: '2026-01-05',
  minutes: 12,
  createdAt: NOW,
  updatedAt: NOW,
};

/** Two subjects over `storage`, both activated: what the app shell has after the user opened each. */
function twoSubjects(storage = createMemoryStorage(), config: Omit<AppConfig, 'version'> = APP) {
  const packA = createTestPack('a');
  const packB = createTestPack('b');
  const app = createAppServices([createTestEntry(packA), createTestEntry(packB)], config, storage);
  const servicesA = app.activateLoaded('a', { pack: packA, locales: {} });
  const servicesB = app.activateLoaded('b', { pack: packB, locales: {} });
  return { app, storage, servicesA, servicesB, a: servicesA.deps, b: servicesB.deps };
}

function keysOf(storage: Storage): string[] {
  return Array.from({ length: storage.length }, (_, i) => storage.key(i) ?? '');
}

describe('createAppServices: several subjects', () => {
  it('builds scoped deps and services per subject', () => {
    const { servicesA, servicesB, a, b } = twoSubjects();

    expect(servicesA.subjectId).toBe('a');
    expect(servicesB.subjectId).toBe('b');
    expect(servicesA.deps).toBe(a);
    expect(servicesA.subject).not.toBe(servicesB.subject);
    expect(a.subjectId).toBe('a');
    expect(b.subjectId).toBe('b');
    expect(a.subject).not.toBe(b.subject);
    expect(a.content).not.toBe(b.content);
  });

  it('keeps lesson progress per subject, under the subject prefix', async () => {
    const { storage, a, b } = twoSubjects();
    await a.progress.saveLesson(makeProgress({ profileId: 'p1', lessonId: 'rook' }));

    expect(await a.progress.getLesson('p1', 'rook')).toBeDefined();
    expect(await b.progress.getLesson('p1', 'rook')).toBeUndefined();
    expect(keysOf(storage)).toContain('app-a:lesson-progress');
    expect(keysOf(storage).filter((key) => key.startsWith('app-b:'))).not.toContain(
      'app-b:lesson-progress',
    );
    expect(keysOf(storage)).not.toContain('app:lesson-progress');
  });

  it('shares streak and session logs across subjects, but not badges', async () => {
    const { storage, a, b } = twoSubjects();
    await a.rewards?.saveStreak(STREAK);
    await a.rewards?.saveSessionLog(LOG);
    await a.rewards?.addEarnedBadge(BADGE);

    expect(await b.rewards?.getStreak('p1')).toEqual(STREAK);
    expect(await b.rewards?.listSessionLogs('p1')).toEqual([LOG]);
    expect(await b.rewards?.listEarnedBadges('p1')).toEqual([]);
    expect(keysOf(storage)).toEqual(
      expect.arrayContaining(['app:streaks', 'app:session-logs', 'app-a:earned-badges']),
    );
  });

  it('shares profiles, settings and the other platform services (same instances)', () => {
    const { a, b } = twoSubjects();

    expect(a.profiles).toBe(b.profiles);
    expect(a.settings).toBe(b.settings);
    expect(a.parentLock).toBe(b.parentLock);
    expect(a.clock).toBe(b.clock);
    expect(a.ids).toBe(b.ids);
    expect(a.passwordFile).toBe(b.passwordFile);
    expect(a.random).toBe(b.random);
    expect(a.backupFileWriter).toBe(b.backupFileWriter);
    expect(a.backupImporter).toBe(b.backupImporter);
    expect(a.app).toBe(b.app);
    expect(a.storageSchemaVersion).toBe(b.storageSchemaVersion);
    expect(a.progress).not.toBe(b.progress);
    expect(a.subjectData).toBe(b.subjectData);
    expect(Object.keys(a.subjectData ?? {})).toEqual(['a', 'b']);
  });

  it('flat settings: every subject runtime exposes the composed slot', () => {
    const { a, b } = twoSubjects();

    expect(a.subject.settings).toBe(b.subject.settings);
    expect(a.subject.settings.defaults).toEqual({ 'a-level': 1, 'b-level': 1 });
  });

  it('deleteProfile clears the profile rows in both subjects and the shared streak / logs', async () => {
    const { a, b } = twoSubjects();
    await a.profiles.save(PROFILE);
    for (const deps of [a, b]) {
      await deps.progress.saveLesson(makeProgress({ id: 'lp', profileId: 'p1' }));
      await deps.rewards?.addEarnedBadge(BADGE);
    }
    await a.rewards?.saveStreak(STREAK);
    await a.rewards?.saveSessionLog(LOG);

    await deleteProfile(a, 'p1');

    expect(await b.profiles.get('p1')).toBeUndefined();
    for (const deps of [a, b]) {
      expect(await deps.progress.listLessons('p1')).toEqual([]);
      expect(await deps.rewards?.listEarnedBadges('p1')).toEqual([]);
    }
    expect(await b.rewards?.getStreak('p1')).toBeUndefined();
    expect(await b.rewards?.listSessionLogs('p1')).toEqual([]);
  });

  it('a second createAppServices over the same storage reads the same per-subject data', async () => {
    const { storage, a } = twoSubjects();
    await a.progress.saveLesson(makeProgress({ profileId: 'p1', lessonId: 'rook' }));

    const again = twoSubjects(storage);
    expect(await again.a.progress.getLesson('p1', 'rook')).toBeDefined();
    expect(await again.b.progress.getLesson('p1', 'rook')).toBeUndefined();
  });
});

describe('createAppServices: backup across subjects', () => {
  async function seedBoth(a: AppDeps, b: AppDeps): Promise<void> {
    await a.profiles.save(PROFILE);
    await a.progress.saveLesson(
      makeProgress({ id: 'lp-a', profileId: 'p1', lessonId: 'intro', bestStars: { e1: 1 } }),
    );
    await b.progress.saveLesson(
      makeProgress({ id: 'lp-b', profileId: 'p1', lessonId: 'intro', bestStars: { e1: 3 } }),
    );
    await a.rewards?.addEarnedBadge(BADGE);
    await a.rewards?.saveStreak(STREAK);
    await a.rewards?.saveSessionLog(LOG);
  }

  it('exports one section per subject, the shared streak and logs once', async () => {
    const { a, b } = twoSubjects();
    await seedBoth(a, b);

    const file = await buildBackupFile(a);

    expect(file.schemaVersion).toBe(SCHEMA_VERSION);
    const data = file.data.p1;
    expect(Object.keys(data?.subjects ?? {})).toEqual(['a', 'b']);
    expect(data?.subjects.a?.lessonProgress[0]?.bestStars).toEqual({ e1: 1 });
    expect(data?.subjects.b?.lessonProgress[0]?.bestStars).toEqual({ e1: 3 });
    expect(data?.subjects.a?.earnedBadges).toEqual([BADGE]);
    expect(data?.subjects.b?.earnedBadges).toEqual([]);
    expect(data?.streak).toEqual(STREAK);
    expect(data?.sessionLogs).toEqual([LOG]);
  });

  it('an export imported into a fresh two-subject device restores each subject separately', async () => {
    const source = twoSubjects();
    await seedBoth(source.a, source.b);
    const raw = JSON.stringify(await buildBackupFile(source.a));

    const target = twoSubjects();
    const incoming = await parseBackupFile(target.a, raw);
    await importMerged(target.a, incoming, []);

    // Fresh services over the same storage: what the next app start reads.
    const { a, b } = twoSubjects(target.storage);
    expect((await a.progress.getLesson('p1', 'intro'))?.bestStars).toEqual({ e1: 1 });
    expect((await b.progress.getLesson('p1', 'intro'))?.bestStars).toEqual({ e1: 3 });
    expect(await a.rewards?.listEarnedBadges('p1')).toEqual([BADGE]);
    expect(await b.rewards?.listEarnedBadges('p1')).toEqual([]);
    expect(await a.rewards?.getStreak('p1')).toEqual(STREAK);
    expect(await b.rewards?.listSessionLogs('p1')).toEqual([LOG]);
    expect((await a.profiles.list()).map((profile) => profile.id)).toEqual(['p1']);
    expect(keysOf(target.storage)).toEqual(
      expect.arrayContaining(['app-a:lesson-progress', 'app-b:lesson-progress', 'app:streaks']),
    );
    expect(keysOf(target.storage)).not.toContain('app:lesson-progress');
  });

  it('merging the same file again changes nothing', async () => {
    const source = twoSubjects();
    await seedBoth(source.a, source.b);
    const raw = JSON.stringify(await buildBackupFile(source.a));
    const target = twoSubjects();
    await importMerged(target.a, await parseBackupFile(target.a, raw), []);
    const once = await buildBackupFile(target.a);

    await importMerged(target.a, await parseBackupFile(target.a, raw), []);

    const twice = await buildBackupFile(target.a);
    expect(twice).toEqual({ ...once, exportedAt: twice.exportedAt });
  });

  it('a legacy flat file lands in the subject its app id maps to', async () => {
    const { a, b } = twoSubjects(createMemoryStorage(), {
      ...APP,
      legacyBackupApps: { 'old-app': 'b' },
    });
    const legacy = {
      app: 'old-app',
      schemaVersion: 5,
      exportedAt: NOW,
      profiles: [PROFILE],
      data: {
        p1: {
          settings: { dailyLimitMinutes: null, voice: true, sound: true, hints: true },
          lessonProgress: [
            makeProgress({ id: 'lp-old', profileId: 'p1', lessonId: 'old', bestStars: { e1: 2 } }),
          ],
          attempts: [],
          miniGameProgress: [],
          conceptStats: [],
          gameRecords: [],
          earnedBadges: [BADGE],
          streak: STREAK,
          sessionLogs: [LOG],
          assessmentResults: [],
          unlocks: [],
        },
      },
    };

    const incoming = await parseBackupFile(a, JSON.stringify(legacy));
    await importMerged(a, incoming, []);

    expect((await b.progress.getLesson('p1', 'old'))?.bestStars).toEqual({ e1: 2 });
    expect(await b.rewards?.listEarnedBadges('p1')).toEqual([BADGE]);
    expect(await a.progress.listLessons('p1')).toEqual([]);
    expect(await a.rewards?.listEarnedBadges('p1')).toEqual([]);
    expect(await a.rewards?.getStreak('p1')).toEqual(STREAK);
    expect(await a.rewards?.listSessionLogs('p1')).toEqual([LOG]);
  });

  it('a one-subject app over one store (interim chess / math) exports and imports under its subject id', async () => {
    const config = { ...APP, subjectStoragePrefix: () => 'app:' };
    const source = createServices([createTestPack('solo')], config, createMemoryStorage());
    await source.deps.profiles.save(PROFILE);
    await source.deps.progress.saveLesson(
      makeProgress({ id: 'lp', profileId: 'p1', lessonId: 'rook', bestStars: { e1: 3 } }),
    );
    const file = await buildBackupFile(source.deps);
    const raw = JSON.stringify(file);

    const target = createServices([createTestPack('solo')], config, createMemoryStorage());
    await importMerged(target.deps, await parseBackupFile(target.deps, raw), []);

    expect(Object.keys(file.data.p1?.subjects ?? {})).toEqual(['solo']);
    expect((await target.deps.progress.getLesson('p1', 'rook'))?.bestStars).toEqual({ e1: 3 });
  });
});

describe('createServices: one subject', () => {
  it('may keep the shared prefix as its own store (keys unchanged)', async () => {
    const storage = createMemoryStorage();
    const pack = createTestPack('a');
    const services = createServices(
      [pack],
      { ...APP, subjectStoragePrefix: () => 'app:' },
      storage,
    );
    await services.deps.progress.saveLesson(makeProgress({ profileId: 'p1', lessonId: 'rook' }));

    expect(keysOf(storage).filter((key) => key.startsWith('app'))).toEqual(
      expect.arrayContaining(['app:schema-version', 'app:lesson-progress']),
    );
    expect(keysOf(storage).every((key) => key.startsWith('app:'))).toBe(true);
    expect(services.app.activateLoaded('a', { pack, locales: {} })).toBe(services);
  });

  it('uses the default sibling prefix when the app has no override', async () => {
    const storage = createMemoryStorage();
    const services = createServices([createTestPack('a')], APP, storage);
    await services.deps.progress.saveLesson(makeProgress({ profileId: 'p1', lessonId: 'rook' }));

    expect(keysOf(storage)).toContain('app-a:lesson-progress');
  });
});

describe('createAppServices: lazy activation', () => {
  function countedEntries(
    storage = createMemoryStorage(),
    config: Omit<AppConfig, 'version'> = APP,
  ) {
    const packs = { a: createTestPack('a'), b: createTestPack('b') };
    const loads = {
      a: vi.fn((): Promise<LoadedSubject> => Promise.resolve({ pack: packs.a, locales: {} })),
      b: vi.fn((): Promise<LoadedSubject> => Promise.resolve({ pack: packs.b, locales: {} })),
    };
    const app = createAppServices(
      [createTestEntry(packs.a, { load: loads.a }), createTestEntry(packs.b, { load: loads.b })],
      config,
      storage,
    );
    return { app, packs, loads, storage };
  }

  it('loads nothing until a subject is activated, and each pack once however often it is activated', async () => {
    const { app, loads } = countedEntries();
    expect(loads.a).not.toHaveBeenCalled();
    expect(loads.b).not.toHaveBeenCalled();

    const first = await app.activate('a');
    const again = await app.activate('a');
    const concurrent = await Promise.all([app.activate('b'), app.activate('b'), app.activate('a')]);

    expect(loads.a).toHaveBeenCalledTimes(1);
    expect(loads.b).toHaveBeenCalledTimes(1);
    expect(again.deps).toBe(first.deps);
    expect(again.subject).toBe(first.subject);
    expect(concurrent[0].deps).toBe(concurrent[1].deps);
    expect(concurrent[2].deps).toBe(first.deps);
  });

  it('builds a subject services object once: `pack.createServices()` runs once per subject', async () => {
    const { app, packs } = countedEntries();
    const spy = vi.spyOn(packs.a, 'createServices');

    await app.activate('a');
    await app.activate('a');
    app.activateLoaded('a', { pack: packs.a, locales: {} });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('exposes every subject repository set before any activation', async () => {
    const { app, loads } = countedEntries();

    await app.subjectData.a?.progress.saveLesson(
      makeProgress({ profileId: 'p1', lessonId: 'rook' }),
    );

    expect(Object.keys(app.subjectData)).toEqual(['a', 'b']);
    expect(await app.subjectData.a?.progress.getLesson('p1', 'rook')).toBeDefined();
    expect(await app.subjectData.b?.progress.getLesson('p1', 'rook')).toBeUndefined();
    expect(loads.a).not.toHaveBeenCalled();
  });

  it('activated subjects share the profile and settings repositories and keep progress apart', async () => {
    const { app } = countedEntries();
    const a = await app.activate('a');
    const b = await app.activate('b');
    await a.deps.progress.saveLesson(makeProgress({ profileId: 'p1', lessonId: 'rook' }));

    expect(a.deps.profiles).toBe(b.deps.profiles);
    expect(a.deps.settings).toBe(b.deps.settings);
    expect(a.deps.subjectData).toBe(app.subjectData);
    expect(await a.deps.progress.getLesson('p1', 'rook')).toBeDefined();
    expect(await b.deps.progress.getLesson('p1', 'rook')).toBeUndefined();
    expect(a.app).toBe(app);
    expect(a.pack.core.id).toBe('a');
    expect(b.pack.core.id).toBe('b');
  });

  it('hands the loaded locales through on the activated services', async () => {
    const pack = createTestPack('a');
    const locales = { en: { common: { app: { title: 'A' } } } };
    const app = createAppServices([createTestEntry(pack, { locales })], APP, createMemoryStorage());

    expect((await app.activate('a')).locales).toBe(locales);
  });

  it('throws on an unknown id, and on a loaded pack whose core id differs', async () => {
    const { app, packs } = countedEntries();

    await expect(app.activate('nope')).rejects.toThrow(/unknown subject "nope"/);
    expect(() => app.activateLoaded('nope', { pack: packs.a, locales: {} })).toThrow(
      /unknown subject "nope"/,
    );
    expect(() => app.activateLoaded('b', { pack: packs.a, locales: {} })).toThrow(
      /subject "b".*core id "a"/,
    );
  });

  it('does not cache a failed load: the next activate loads again', async () => {
    const pack = createTestPack('a');
    const load = vi
      .fn<() => Promise<LoadedSubject>>()
      .mockRejectedValueOnce(new Error('chunk missing'))
      .mockResolvedValue({ pack, locales: {} });
    const app = createAppServices([createTestEntry(pack, { load })], APP, createMemoryStorage());

    await expect(app.activate('a')).rejects.toThrow('chunk missing');
    expect((await app.activate('a')).subjectId).toBe('a');
    expect(load).toHaveBeenCalledTimes(2);
  });

  describe('initialSubjectId', () => {
    async function settingsOver(storage: Storage, settings: object): Promise<void> {
      // Same storage, same shared repository: write through a second app over it.
      const { app } = countedEntries(storage);
      const a = await app.activate('a');
      const current = await a.deps.settings.get();
      await a.deps.settings.save({ ...current, ...settings });
    }

    it('is the first entry without settings', async () => {
      const { app } = countedEntries();
      expect(await app.initialSubjectId()).toBe('a');
    });

    it("is the last profile's last subject when that subject is registered", async () => {
      const storage = createMemoryStorage();
      await settingsOver(storage, {
        lastProfileId: 'p1',
        lastSubjectByProfile: { p1: 'b', p2: 'a' },
      });

      expect(await countedEntries(storage).app.initialSubjectId()).toBe('b');
    });

    it('is the first entry when that subject is not registered', async () => {
      const storage = createMemoryStorage();
      await settingsOver(storage, { lastProfileId: 'p1', lastSubjectByProfile: { p1: 'gone' } });

      expect(await countedEntries(storage).app.initialSubjectId()).toBe('a');
    });

    it('is the first entry without a last profile or without an entry for it', async () => {
      const noProfile = createMemoryStorage();
      await settingsOver(noProfile, { lastSubjectByProfile: { p1: 'b' } });
      const otherProfile = createMemoryStorage();
      await settingsOver(otherProfile, { lastProfileId: 'p2', lastSubjectByProfile: { p1: 'b' } });

      expect(await countedEntries(noProfile).app.initialSubjectId()).toBe('a');
      expect(await countedEntries(otherProfile).app.initialSubjectId()).toBe('a');
    });
  });
});

describe('createServices: rejected setups', () => {
  const same = { ...APP, subjectStoragePrefix: () => 'app:' };

  it('throws when two subjects would share the shared store', () => {
    expect(() =>
      createServices([createTestPack('a'), createTestPack('b')], same, createMemoryStorage()),
    ).toThrow(/share one store/);
  });

  it('throws on a subject prefix nested under the shared prefix', () => {
    expect(() =>
      createServices(
        [createTestPack('a')],
        { ...APP, subjectStoragePrefix: () => 'app:x:' },
        createMemoryStorage(),
      ),
    ).toThrow(/nested/);
  });

  it('throws on a shared prefix nested under the subject prefix', () => {
    expect(() =>
      createServices(
        [createTestPack('a')],
        { ...APP, storagePrefix: 'app:x:', subjectStoragePrefix: () => 'app:' },
        createMemoryStorage(),
      ),
    ).toThrow(/nested/);
  });

  it('writes nothing to storage when the setup is rejected', () => {
    const storage = createMemoryStorage();
    expect(() =>
      createServices([createTestPack('a'), createTestPack('b')], same, storage),
    ).toThrow();
    expect(storage.length).toBe(0);
  });

  it('throws when two subjects get the same own prefix', () => {
    expect(() =>
      createServices(
        [createTestPack('a'), createTestPack('b')],
        { ...APP, subjectStoragePrefix: () => 'other:' },
        createMemoryStorage(),
      ),
    ).toThrow(/share one store/);
  });

  it('throws when one subject prefix is nested inside another subject prefix', () => {
    expect(() =>
      createServices(
        [createTestPack('a'), createTestPack('b')],
        { ...APP, subjectStoragePrefix: (id) => (id === 'a' ? 'x:' : 'x:y:') },
        createMemoryStorage(),
      ),
    ).toThrow(/nested with the prefix "x:" of another subject/);
  });

  it('throws on duplicate subject ids', () => {
    expect(() =>
      createServices([createTestPack('a'), createTestPack('a')], APP, createMemoryStorage()),
    ).toThrow(/duplicate subject id "a"/);
  });

  it('throws on an invalid subject id', () => {
    expect(() => createServices([createTestPack('Bad_Id')], APP, createMemoryStorage())).toThrow(
      /must match/,
    );
  });

  it('throws on no subject at all', () => {
    expect(() => createServices([], APP, createMemoryStorage())).toThrow(/at least one/);
  });

  it('throws when two packs declare the same settings default key', () => {
    const slot = {
      defaults: { level: 1 },
      isValid: () => true,
      loadBackupShape: () => Promise.resolve({}),
    };
    expect(() =>
      createServices(
        [createTestPack('a', slot), createTestPack('b', slot)],
        APP,
        createMemoryStorage(),
      ),
    ).toThrow(/"level".*slots 0 and 1/);
  });
});
