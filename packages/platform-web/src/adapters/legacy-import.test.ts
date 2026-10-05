import { describe, expect, it } from 'vitest';
import type { AppConfig, AppDeps } from '@learn/platform-core';
import { composeDefaultSettings, createProfile } from '@learn/platform-core';
import { LEGACY_FLAT_MAX_SCHEMA, parseBackupFile } from '@learn/platform-core/backup';
import { importMerged, planImport } from '@learn/platform-core/merge';
import { makeAttempt, makeProfile, makeProgress } from '@learn/platform-core/testing';
import { createAppServices } from '../app/services.ts';
import { createMemoryStorage } from '../testing/memory-storage.ts';
import { createTestContent, createTestEntry, createTestPack } from '../testing/test-pack.ts';
import {
  buildLegacyBackupFile,
  findLegacyImportOffer,
  findLegacyStore,
  importLegacyStore,
  readLegacyDecision,
  storeLegacyDecision,
} from './legacy-import.ts';

const APP: Omit<AppConfig, 'version'> = {
  title: 'Test app',
  storagePrefix: 'app:',
  backupAppId: 'app',
  backupFilePrefix: 'app',
  parentCodeFilePrefix: 'app-code',
  legacyBackupApps: { 'old-app': 'b' },
  legacyStorePrefixes: { 'old-app': 'old:' },
};

const OLD = { appId: 'old-app', prefix: 'old:' } as const;
const T0 = '2026-01-01T00:00:00.000Z';

/** Writes `value` under the older app's key `name`, as its `LocalStore` did (JSON). */
function putOld(storage: Storage, name: string, value: unknown, prefix = 'old:'): void {
  storage.setItem(`${prefix}${name}`, JSON.stringify(value));
}

/** An older store with Mia (one lesson, one attempt, a streak and a session log) and Leo (nothing yet), schema 5. */
function seedOldStore(storage: Storage, prefix = 'old:'): void {
  const mia = makeProfile({ id: 'mia', nickname: 'Mia', createdAt: T0, updatedAt: T0 });
  const leo = makeProfile({
    id: 'leo',
    nickname: 'Leo',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  });
  putOld(storage, 'schema-version', 5, prefix);
  putOld(storage, 'profiles', { mia, leo }, prefix);
  putOld(
    storage,
    'lesson-progress',
    {
      'mia:b-lesson': makeProgress({
        id: 'lp1',
        profileId: 'mia',
        lessonId: 'b-lesson',
        bestStars: { 'b-lesson-01': 3 },
      }),
    },
    prefix,
  );
  putOld(storage, 'attempts', [makeAttempt({ id: 'at1', profileId: 'mia' })], prefix);
  putOld(
    storage,
    'streaks',
    {
      mia: {
        id: 's1',
        profileId: 'mia',
        current: 2,
        best: 4,
        skipsUsedThisWeek: 0,
        createdAt: T0,
        updatedAt: T0,
      },
    },
    prefix,
  );
  putOld(
    storage,
    'session-logs',
    {
      'mia:2026-01-01': {
        id: 'l1',
        profileId: 'mia',
        date: '2026-01-01',
        minutes: 12,
        createdAt: T0,
        updatedAt: T0,
      },
    },
    prefix,
  );
  putOld(storage, 'parent-lock', { id: 'pl', password: '1234' }, prefix);
  putOld(
    storage,
    'settings',
    { lastProfileId: 'mia', suggestedLevels: {}, profileSettings: {} },
    prefix,
  );
}

/** The new app's services over `storage` (subjects `a` and `b`; the older app's data belongs to `b`), `a` active. */
async function newApp(storage: Storage): Promise<AppDeps> {
  const entries = (['a', 'b'] as const).map((id) =>
    createTestEntry(createTestPack(id, undefined, createTestContent(id))),
  );
  return (await createAppServices(entries, APP, storage).activate('a')).deps;
}

const CODE = { parseBackupFile, planImport, importMerged };

/** The composed default settings, as the first run's screen passes them (`activeProfileSettings` before a child is chosen). */
function defaultsOf(deps: AppDeps): ReturnType<typeof composeDefaultSettings> {
  return composeDefaultSettings(deps.subject.settings);
}

function snapshotOf(storage: Storage): Record<string, string | null> {
  return Object.fromEntries(
    Array.from({ length: storage.length }, (_, index) => storage.key(index) ?? '').map((key) => [
      key,
      storage.getItem(key),
    ]),
  );
}

describe('the answer to the offer', () => {
  it('is read back as stored, and reads as unanswered for nothing, junk or an unreadable store', () => {
    const storage = createMemoryStorage();
    expect(readLegacyDecision(storage, APP)).toBeUndefined();

    storeLegacyDecision(storage, APP, 'declined');
    expect(readLegacyDecision(storage, APP)).toBe('declined');
    storeLegacyDecision(storage, APP, 'done');
    expect(readLegacyDecision(storage, APP)).toBe('done');
    expect(storage.getItem('app:legacy-import')).toBe('"done"');

    storage.setItem('app:legacy-import', 'not json');
    expect(readLegacyDecision(storage, APP)).toBeUndefined();
    storage.setItem('app:legacy-import', '"maybe"');
    expect(readLegacyDecision(storage, APP)).toBeUndefined();
  });

  it('never throws when storage refuses the write', () => {
    const storage = createMemoryStorage();
    storage.setItem = () => {
      throw new Error('quota');
    };
    expect(() => {
      storeLegacyDecision(storage, APP, 'done');
    }).not.toThrow();
  });
});

describe('findLegacyStore', () => {
  it('finds the older store when it holds children', () => {
    const storage = createMemoryStorage();
    seedOldStore(storage);
    expect(findLegacyStore(storage, APP)).toEqual(OLD);
  });

  it('finds nothing without an older store, with one that has no children, or with unreadable profiles', () => {
    const storage = createMemoryStorage();
    expect(findLegacyStore(storage, APP)).toBeUndefined();

    putOld(storage, 'parent-lock', { id: 'pl', password: '1234' });
    expect(findLegacyStore(storage, APP)).toBeUndefined();

    putOld(storage, 'profiles', {});
    expect(findLegacyStore(storage, APP)).toBeUndefined();

    storage.setItem('old:profiles', '{not json');
    expect(findLegacyStore(storage, APP)).toBeUndefined();

    putOld(storage, 'profiles', { x: { nickname: 'no id' } });
    expect(findLegacyStore(storage, APP)).toBeUndefined();
  });

  it('only offers a store whose backup app id the app maps to a subject, and none when the app names no older store', () => {
    const storage = createMemoryStorage();
    seedOldStore(storage);
    expect(findLegacyStore(storage, { ...APP, legacyBackupApps: {} })).toBeUndefined();
    expect(findLegacyStore(storage, { ...APP, legacyBackupApps: undefined })).toBeUndefined();
    expect(findLegacyStore(storage, { ...APP, legacyStorePrefixes: undefined })).toBeUndefined();
  });
});

describe('findLegacyImportOffer', () => {
  it('offers on an empty device with an older store, once', async () => {
    const storage = createMemoryStorage();
    seedOldStore(storage);
    const deps = await newApp(storage);

    expect(await findLegacyImportOffer(storage, deps)).toEqual(OLD);

    storeLegacyDecision(storage, deps.app, 'declined');
    expect(await findLegacyImportOffer(storage, deps)).toBeUndefined();
  });

  it('offers nothing once the question was answered "done" either', async () => {
    const storage = createMemoryStorage();
    seedOldStore(storage);
    const deps = await newApp(storage);
    storeLegacyDecision(storage, deps.app, 'done');

    expect(await findLegacyImportOffer(storage, deps)).toBeUndefined();
  });

  it('offers nothing when children are already on this device', async () => {
    const storage = createMemoryStorage();
    seedOldStore(storage);
    const deps = await newApp(storage);
    await createProfile(deps, 'Zoe', 'cat');

    expect(await findLegacyImportOffer(storage, deps)).toBeUndefined();
  });

  it('offers nothing without an older store', async () => {
    const storage = createMemoryStorage();
    const deps = await newApp(storage);

    expect(await findLegacyImportOffer(storage, deps)).toBeUndefined();
  });
});

describe('buildLegacyBackupFile', () => {
  it('builds the older app’s flat export from its keys: every child, the records of each, schema <= the flat maximum', async () => {
    const storage = createMemoryStorage();
    seedOldStore(storage);
    const deps = await newApp(storage);

    const file = buildLegacyBackupFile(storage, deps, OLD, defaultsOf(deps)) as {
      app: string;
      schemaVersion: number;
      profiles: { id: string }[];
      data: Record<string, Record<string, unknown>>;
    };

    expect(file.app).toBe('old-app');
    expect(file.schemaVersion).toBeLessThanOrEqual(LEGACY_FLAT_MAX_SCHEMA);
    expect(file.profiles.map((profile) => profile.id)).toEqual(['mia', 'leo']);
    expect(Object.keys(file.data)).toEqual(['mia', 'leo']);
    const mia = file.data.mia ?? {};
    expect((mia.lessonProgress as { lessonId: string }[]).map((row) => row.lessonId)).toEqual([
      'b-lesson',
    ]);
    expect(mia.attempts).toHaveLength(1);
    expect(mia.streak).toMatchObject({ current: 2, best: 4 });
    expect(mia.sessionLogs).toHaveLength(1);
    expect(mia.settings).toMatchObject({ voice: true, 'a-level': 1 });
    const leo = file.data.leo ?? {};
    expect(leo.lessonProgress).toEqual([]);
    expect('streak' in leo).toBe(false);
  });

  it('keeps a child’s own stored settings over the defaults', async () => {
    const storage = createMemoryStorage();
    seedOldStore(storage);
    putOld(storage, 'settings', {
      lastProfileId: null,
      suggestedLevels: {},
      profileSettings: { mia: { dailyLimitMinutes: 30, voice: false, sound: true, hints: true } },
    });
    const deps = await newApp(storage);

    const file = buildLegacyBackupFile(storage, deps, OLD, defaultsOf(deps)) as {
      data: Record<string, { settings: Record<string, unknown> }>;
    };

    expect(file.data.mia?.settings).toMatchObject({ dailyLimitMinutes: 30, voice: false });
    expect(file.data.leo?.settings).toMatchObject({ dailyLimitMinutes: null, voice: true });
  });

  it('changes nothing in the older store (or anywhere): every key and value stays', async () => {
    const storage = createMemoryStorage();
    seedOldStore(storage);
    const deps = await newApp(storage);
    const before = snapshotOf(storage);

    buildLegacyBackupFile(storage, deps, OLD, defaultsOf(deps));

    expect(snapshotOf(storage)).toEqual(before);
  });

  it('rejects, not guesses, when an older record is corrupt', async () => {
    const storage = createMemoryStorage();
    seedOldStore(storage);
    storage.setItem('old:lesson-progress', '{broken');
    const deps = await newApp(storage);

    expect(() => buildLegacyBackupFile(storage, deps, OLD, defaultsOf(deps))).toThrow(
      /Corrupt JSON/,
    );
  });
});

describe('importLegacyStore', () => {
  it('imports every child with its progress into the mapped subject (b), remembers "done", and leaves the older keys as they were', async () => {
    const storage = createMemoryStorage();
    seedOldStore(storage);
    const deps = await newApp(storage);
    const oldKeys = Object.fromEntries(
      Object.entries(snapshotOf(storage)).filter(([key]) => key.startsWith('old:')),
    );

    await importLegacyStore(storage, deps, OLD, defaultsOf(deps), CODE);

    expect((await deps.profiles.list()).map((profile) => profile.nickname)).toEqual(['Mia', 'Leo']);
    const mia = (await deps.profiles.list())[0];
    const imported = await deps.subjectData?.b?.progress.listLessons(mia?.id ?? '');
    expect(imported?.map((row) => [row.lessonId, row.bestStars])).toEqual([
      ['b-lesson', { 'b-lesson-01': 3 }],
    ]);
    expect(await deps.subjectData?.a?.progress.listLessons(mia?.id ?? '')).toEqual([]);
    expect(await deps.rewards?.getStreak(mia?.id ?? '')).toMatchObject({ current: 2, best: 4 });
    expect(readLegacyDecision(storage, deps.app)).toBe('done');
    expect(await findLegacyImportOffer(storage, deps)).toBeUndefined();
    const keysNow = snapshotOf(storage);
    for (const [key, value] of Object.entries(oldKeys)) expect(keysNow[key], key).toBe(value);
    // The older app's parent code is never imported: this device's own is set up in the first run.
    expect(await deps.parentLock.get()).toBeUndefined();
  });

  it('rejects and writes nothing when the older data is not a valid backup', async () => {
    const storage = createMemoryStorage();
    seedOldStore(storage);
    putOld(storage, 'attempts', [{ id: 'bad', profileId: 'mia', lessonId: 'x', exerciseId: 'y' }]);
    const deps = await newApp(storage);

    await expect(importLegacyStore(storage, deps, OLD, defaultsOf(deps), CODE)).rejects.toThrow(
      'Not a valid backup file',
    );

    expect(await deps.profiles.list()).toEqual([]);
    expect(readLegacyDecision(storage, deps.app)).toBeUndefined();
  });
});
