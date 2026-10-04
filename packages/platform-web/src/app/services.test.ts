import { describe, expect, it } from 'vitest';
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
import { createMemoryStorage } from '../testing/memory-storage.ts';
import { createTestPack } from '../testing/test-pack.ts';
import { createServices } from './services.ts';

const APP: Omit<AppConfig, 'version'> = {
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

function twoSubjects(storage = createMemoryStorage()) {
  const services = createServices([createTestPack('a'), createTestPack('b')], APP, storage);
  const a = services.subjectDeps.a;
  const b = services.subjectDeps.b;
  if (a === undefined || b === undefined) throw new Error('subject deps missing');
  return { services, storage, a, b };
}

function keysOf(storage: Storage): string[] {
  return Array.from({ length: storage.length }, (_, i) => storage.key(i) ?? '');
}

describe('createServices: several subjects', () => {
  it('builds scoped deps and services per subject; the active one is the first pack', () => {
    const { services, a, b } = twoSubjects();

    expect(Object.keys(services.subjectDeps)).toEqual(['a', 'b']);
    expect(Object.keys(services.subjectServices)).toEqual(['a', 'b']);
    expect(services.deps).toBe(a);
    expect(services.subject).toBe(services.subjectServices.a);
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

  it('a second createServices over the same storage reads the same per-subject data', async () => {
    const { storage, a } = twoSubjects();
    await a.progress.saveLesson(makeProgress({ profileId: 'p1', lessonId: 'rook' }));

    const again = createServices([createTestPack('a'), createTestPack('b')], APP, storage);
    expect(await again.subjectDeps.a?.progress.getLesson('p1', 'rook')).toBeDefined();
    expect(await again.subjectDeps.b?.progress.getLesson('p1', 'rook')).toBeUndefined();
  });
});

describe('createServices: backup across subjects', () => {
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

    expect(file.schemaVersion).toBe(6);
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
    const again = createServices([createTestPack('a'), createTestPack('b')], APP, target.storage);
    const a = again.subjectDeps.a;
    const b = again.subjectDeps.b;
    expect((await a?.progress.getLesson('p1', 'intro'))?.bestStars).toEqual({ e1: 1 });
    expect((await b?.progress.getLesson('p1', 'intro'))?.bestStars).toEqual({ e1: 3 });
    expect(await a?.rewards?.listEarnedBadges('p1')).toEqual([BADGE]);
    expect(await b?.rewards?.listEarnedBadges('p1')).toEqual([]);
    expect(await a?.rewards?.getStreak('p1')).toEqual(STREAK);
    expect(await b?.rewards?.listSessionLogs('p1')).toEqual([LOG]);
    expect((await a?.profiles.list())?.map((profile) => profile.id)).toEqual(['p1']);
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
    const services = createServices(
      [createTestPack('a'), createTestPack('b')],
      { ...APP, legacyBackupApps: { 'old-app': 'b' } },
      createMemoryStorage(),
    );
    const a = services.subjectDeps.a;
    const b = services.subjectDeps.b;
    if (a === undefined || b === undefined) throw new Error('subject deps missing');
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
    const services = createServices(
      [createTestPack('a')],
      { ...APP, subjectStoragePrefix: () => 'app:' },
      storage,
    );
    await services.deps.progress.saveLesson(makeProgress({ profileId: 'p1', lessonId: 'rook' }));

    expect(keysOf(storage).filter((key) => key.startsWith('app'))).toEqual(
      expect.arrayContaining(['app:schema-version', 'app:lesson-progress']),
    );
    expect(keysOf(storage).every((key) => key.startsWith('app:'))).toBe(true);
    expect(services.deps).toBe(services.subjectDeps.a);
  });

  it('uses the default sibling prefix when the app has no override', async () => {
    const storage = createMemoryStorage();
    const services = createServices([createTestPack('a')], APP, storage);
    await services.deps.progress.saveLesson(makeProgress({ profileId: 'p1', lessonId: 'rook' }));

    expect(keysOf(storage)).toContain('app-a:lesson-progress');
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
