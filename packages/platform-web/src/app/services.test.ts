import { describe, expect, it } from 'vitest';
import type { AppConfig, EarnedBadge, Profile, SessionLog, Streak } from '@learn/platform-core';
import { deleteProfile } from '@learn/platform-core';
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

  it('throws when two subjects get the same own prefix', () => {
    expect(() =>
      createServices(
        [createTestPack('a'), createTestPack('b')],
        { ...APP, subjectStoragePrefix: () => 'other:' },
        createMemoryStorage(),
      ),
    ).toThrow(/share one store/);
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
