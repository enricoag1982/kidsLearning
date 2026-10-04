import { describe, expect, it } from 'vitest';
import type { BackupFile, Profile, SessionLog } from '@learn/platform-core';
import { makeAttempt, makeProgress } from '@learn/platform-core/testing';
import { createMemoryStorage } from '../../testing/memory-storage.ts';
import { LocalStorageBackupImporter } from './local-backup-importer.ts';
import { openLocalStore, SCHEMA_VERSION } from './local-store.ts';
import type { LocalStore } from './local-store.ts';
import { MAX_ATTEMPTS } from './local-progress-repository.ts';

const T0 = '2026-01-01T00:00:00.000Z';
const DEVICE_SETTINGS = { lastProfileId: null, suggestedLevels: {} };

const PROFILE: Profile = {
  id: 'p1',
  accountId: 'local',
  nickname: 'Mia',
  avatar: 'fox',
  locale: 'en',
  createdAt: T0,
  updatedAt: T0,
};

type ProfileData = BackupFile['data'][string];
type SubjectSection = ProfileData['subjects'][string];

const SETTINGS: ProfileData['settings'] = {
  dailyLimitMinutes: null,
  voice: true,
  sound: true,
  hints: true,
};

const SHARED_NAMES = ['profiles', 'settings', 'streaks', 'session-logs'];
const SUBJECT_NAMES = [
  'lesson-progress',
  'attempts',
  'minigame-progress',
  'concept-stats',
  'game-records',
  'earned-badges',
  'assessment-results',
  'unlocks',
];

function emptySection(overrides: Partial<SubjectSection> = {}): SubjectSection {
  return {
    lessonProgress: [],
    attempts: [],
    miniGameProgress: [],
    conceptStats: [],
    gameRecords: [],
    earnedBadges: [],
    assessmentResults: [],
    unlocks: [],
    ...overrides,
  };
}

function sessionLog(overrides: Partial<SessionLog> = {}): SessionLog {
  return {
    id: 'log-local',
    profileId: 'p1',
    date: '2026-01-10',
    minutes: 10,
    createdAt: T0,
    updatedAt: T0,
    ...overrides,
  };
}

function fileWith(
  subjects: Readonly<Record<string, SubjectSection>>,
  sessionLogs: readonly SessionLog[] = [],
): BackupFile {
  return {
    app: 'app',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: T0,
    profiles: [PROFILE],
    data: { p1: { settings: SETTINGS, sessionLogs, subjects } },
  };
}

function keysOf(storage: Storage): string[] {
  return Array.from({ length: storage.length }, (_, i) => storage.key(i) ?? '').sort();
}

/** The parsed JSON stored at `key`, or `undefined`. */
function stored(storage: Storage, key: string): unknown {
  const raw = storage.getItem(key);
  return raw === null ? undefined : (JSON.parse(raw) as unknown);
}

interface Device {
  readonly storage: Storage;
  readonly shared: LocalStore;
  readonly a: LocalStore;
  readonly b: LocalStore;
}

function openDevice(storage: Storage = createMemoryStorage()): Device {
  const open = (keyPrefix: string): LocalStore => openLocalStore(storage, { keyPrefix });
  return { storage, shared: open('app:'), a: open('app-a:'), b: open('app-b:') };
}

function importerFor(device: Device): LocalStorageBackupImporter {
  return new LocalStorageBackupImporter(device.shared, { a: device.a, b: device.b });
}

function stagingKeys(storage: Storage): string[] {
  return keysOf(storage).filter((key) => key.includes('backup-staging:'));
}

describe('LocalStorageBackupImporter: shared store + per-subject stores', () => {
  it('writes shared records to the shared store and each subject’s records to its own', async () => {
    const device = openDevice();
    const file = fileWith(
      {
        a: emptySection({
          lessonProgress: [makeProgress({ id: 'lp-a', profileId: 'p1', lessonId: 'la' })],
          attempts: [makeAttempt({ id: 'at-a', profileId: 'p1' })],
        }),
        b: emptySection({
          lessonProgress: [makeProgress({ id: 'lp-b', profileId: 'p1', lessonId: 'lb' })],
        }),
      },
      [sessionLog()],
    );

    await importerFor(device).writeMerged(file, { deviceSettings: DEVICE_SETTINGS });

    const { storage } = device;
    expect(keysOf(storage)).toEqual(
      [
        'app:schema-version',
        'app-a:schema-version',
        'app-b:schema-version',
        ...SHARED_NAMES.map((name) => `app:${name}`),
        ...SUBJECT_NAMES.map((name) => `app-a:${name}`),
        ...SUBJECT_NAMES.map((name) => `app-b:${name}`),
      ].sort(),
    );
    expect(Object.keys(stored(storage, 'app-a:lesson-progress') as object)).toEqual(['p1:la']);
    expect(Object.keys(stored(storage, 'app-b:lesson-progress') as object)).toEqual(['p1:lb']);
    expect((stored(storage, 'app-a:attempts') as unknown[]).length).toBe(1);
    expect(stored(storage, 'app-b:attempts')).toEqual([]);
    expect(Object.keys(stored(storage, 'app:profiles') as object)).toEqual(['p1']);
    expect(stagingKeys(storage)).toEqual([]);
  });

  it('keeps a foreign device’s session-log row beside this device’s, under the :<deviceId> suffix', async () => {
    const device = openDevice();
    const file = fileWith({ a: emptySection() }, [
      sessionLog({ id: 'mine', deviceId: 'this-device', minutes: 10 }),
      sessionLog({ id: 'theirs', deviceId: 'other-device', minutes: 25 }),
      sessionLog({ id: 'legacy', date: '2026-01-09', minutes: 5 }),
    ]);

    await importerFor(device).writeMerged(file, {
      localDeviceId: 'this-device',
      deviceSettings: DEVICE_SETTINGS,
    });

    const logs = stored(device.storage, 'app:session-logs') as Record<string, SessionLog>;
    expect(Object.keys(logs).sort()).toEqual([
      'p1:2026-01-09',
      'p1:2026-01-10',
      'p1:2026-01-10:other-device',
    ]);
    expect(logs['p1:2026-01-10']?.minutes).toBe(10);
    expect(logs['p1:2026-01-10:other-device']?.minutes).toBe(25);
    // Subject stores never hold session logs.
    expect(device.storage.getItem('app-a:session-logs')).toBeNull();
  });

  it('writes the shared streak and settings, with this device’s own settings kept', async () => {
    const device = openDevice();
    const file: BackupFile = {
      ...fileWith({ a: emptySection() }),
      data: {
        p1: {
          settings: SETTINGS,
          streak: {
            id: 's1',
            profileId: 'p1',
            current: 3,
            best: 4,
            skipsUsedThisWeek: 0,
            createdAt: T0,
            updatedAt: T0,
          },
          sessionLogs: [],
          subjects: { a: emptySection() },
        },
      },
    };

    await importerFor(device).writeMerged(file, {
      deviceSettings: { lastProfileId: 'p1', suggestedLevels: {}, deviceId: 'dev-1' },
    });

    expect(Object.keys(stored(device.storage, 'app:streaks') as object)).toEqual(['p1']);
    expect(stored(device.storage, 'app:settings')).toMatchObject({
      lastProfileId: 'p1',
      deviceId: 'dev-1',
      profileSettings: { p1: SETTINGS },
    });
  });

  it('ignores subjects without a registered store, and writes a registered one the file lacks as empty', async () => {
    const device = openDevice();
    device.b.write('lesson-progress', { 'p1:old': makeProgress({ lessonId: 'old' }) });
    device.b.write('attempts', [makeAttempt({ id: 'old-attempt' })]);
    const file = fileWith({
      a: emptySection({
        lessonProgress: [makeProgress({ id: 'lp-a', profileId: 'p1', lessonId: 'la' })],
      }),
      unhosted: emptySection({
        lessonProgress: [makeProgress({ id: 'lp-u', profileId: 'p1', lessonId: 'lu' })],
      }),
    });

    await importerFor(device).writeMerged(file, { deviceSettings: DEVICE_SETTINGS });

    expect(stored(device.storage, 'app-b:lesson-progress')).toEqual({});
    expect(stored(device.storage, 'app-b:attempts')).toEqual([]);
    expect(Object.keys(stored(device.storage, 'app-a:lesson-progress') as object)).toEqual([
      'p1:la',
    ]);
    expect(keysOf(device.storage).every((key) => /^app(-a|-b)?:/.test(key))).toBe(true);
    expect(JSON.stringify(stored(device.storage, 'app-a:lesson-progress'))).not.toContain('lu');
  });

  it('caps attempts per subject, not over all of them', async () => {
    const device = openDevice();
    const at = (index: number): string => new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString();
    const attempts = (prefix: string, count: number) =>
      Array.from({ length: count }, (_, index) =>
        makeAttempt({
          id: `${prefix}-${String(index)}`,
          profileId: 'p1',
          createdAt: at(index),
          updatedAt: at(index),
        }),
      );
    const file = fileWith({
      a: emptySection({ attempts: attempts('a', MAX_ATTEMPTS + 1) }),
      b: emptySection({ attempts: attempts('b', 5) }),
    });

    await importerFor(device).writeMerged(file, { deviceSettings: DEVICE_SETTINGS });

    const storedA = stored(device.storage, 'app-a:attempts') as { id: string }[];
    expect(storedA).toHaveLength(MAX_ATTEMPTS);
    expect(storedA[0]?.id).toBe('a-1'); // the oldest one was dropped
    expect(stored(device.storage, 'app-b:attempts')).toHaveLength(5);
  });

  it('rejects a schemaVersion newer than SCHEMA_VERSION, changing nothing', async () => {
    const device = openDevice();
    const importer = importerFor(device);
    await importer.writeMerged(fileWith({ a: emptySection() }), {
      deviceSettings: DEVICE_SETTINGS,
    });
    const before = keysOf(device.storage).map((key) => [key, device.storage.getItem(key)]);

    await expect(
      importer.writeMerged(
        { ...fileWith({ b: emptySection() }), schemaVersion: SCHEMA_VERSION + 1 },
        { deviceSettings: DEVICE_SETTINGS },
      ),
    ).rejects.toThrow(/newer than supported/);

    expect(keysOf(device.storage).map((key) => [key, device.storage.getItem(key)])).toEqual(before);
  });

  it('refuses two subject ids on one store instance', () => {
    const device = openDevice();
    expect(
      () => new LocalStorageBackupImporter(device.shared, { a: device.a, b: device.a }),
    ).toThrow(/share one store/);
  });
});

describe('LocalStorageBackupImporter: one store for shared and subject records (single-store app)', () => {
  it('gives that store all twelve records', async () => {
    const storage = createMemoryStorage();
    const store = openLocalStore(storage, { keyPrefix: 'solo:' });
    const importer = new LocalStorageBackupImporter(store, { chess: store });
    const file = fileWith(
      {
        chess: emptySection({
          lessonProgress: [makeProgress({ id: 'lp', profileId: 'p1', lessonId: 'rook' })],
        }),
      },
      [sessionLog({ deviceId: 'other-device' })],
    );

    await importer.writeMerged(file, { deviceSettings: DEVICE_SETTINGS });

    expect(keysOf(storage)).toEqual(
      [
        'solo:schema-version',
        ...SHARED_NAMES.map((name) => `solo:${name}`),
        ...SUBJECT_NAMES.map((name) => `solo:${name}`),
      ].sort(),
    );
    expect(Object.keys(stored(storage, 'solo:lesson-progress') as object)).toEqual(['p1:rook']);
    expect(Object.keys(stored(storage, 'solo:session-logs') as object)).toEqual([
      'p1:2026-01-10:other-device',
    ]);
    expect(stagingKeys(storage)).toEqual([]);
  });
});

describe('LocalStorageBackupImporter: staging across stores', () => {
  /** Storage whose `setItem` throws a quota error for keys `failOn` accepts while `armed.on` is set. */
  function failingStorage(
    inner: Storage,
    armed: { on: boolean },
    failOn: (key: string) => boolean,
  ): Storage {
    return {
      getItem: (key) => inner.getItem(key),
      setItem: (key, value) => {
        if (armed.on && failOn(key)) throw new DOMException('quota exceeded', 'QuotaExceededError');
        inner.setItem(key, value);
      },
      removeItem: (key) => {
        inner.removeItem(key);
      },
      clear: () => {
        inner.clear();
      },
      key: (index) => inner.key(index),
      get length() {
        return inner.length;
      },
    };
  }

  it('a write error in one subject store removes everything staged in every store and leaves the real keys untouched', async () => {
    const armed = { on: false };
    const inner = createMemoryStorage();
    const device = openDevice(
      failingStorage(inner, armed, (key) => key === 'app-b:backup-staging:earned-badges'),
    );
    const importer = importerFor(device);
    await importer.writeMerged(
      fileWith({
        a: emptySection({
          lessonProgress: [makeProgress({ id: 'lp-a', profileId: 'p1', lessonId: 'first-a' })],
        }),
        b: emptySection({
          lessonProgress: [makeProgress({ id: 'lp-b', profileId: 'p1', lessonId: 'first-b' })],
        }),
      }),
      { deviceSettings: DEVICE_SETTINGS },
    );
    const before = keysOf(inner).map((key) => [key, inner.getItem(key)]);

    armed.on = true;
    await expect(
      importer.writeMerged(
        fileWith({
          a: emptySection({
            lessonProgress: [makeProgress({ id: 'lp-a2', profileId: 'p1', lessonId: 'second-a' })],
          }),
          b: emptySection({
            lessonProgress: [makeProgress({ id: 'lp-b2', profileId: 'p1', lessonId: 'second-b' })],
          }),
        }),
        { deviceSettings: DEVICE_SETTINGS },
      ),
    ).rejects.toThrow();
    armed.on = false;

    expect(stagingKeys(inner)).toEqual([]);
    expect(keysOf(inner).map((key) => [key, inner.getItem(key)])).toEqual(before);
    expect(Object.keys(stored(inner, 'app-a:lesson-progress') as object)).toEqual(['p1:first-a']);
    expect(Object.keys(stored(inner, 'app-b:lesson-progress') as object)).toEqual(['p1:first-b']);
  });

  it('a write error in the shared store also leaves the subject stores untouched', async () => {
    const armed = { on: false };
    const inner = createMemoryStorage();
    const device = openDevice(
      failingStorage(inner, armed, (key) => key === 'app:backup-staging:session-logs'),
    );
    const importer = importerFor(device);
    await importer.writeMerged(
      fileWith({
        a: emptySection({
          lessonProgress: [makeProgress({ id: 'lp-a', profileId: 'p1', lessonId: 'first-a' })],
        }),
      }),
      { deviceSettings: DEVICE_SETTINGS },
    );
    const before = keysOf(inner).map((key) => [key, inner.getItem(key)]);

    armed.on = true;
    await expect(
      importer.writeMerged(
        fileWith({
          a: emptySection({
            lessonProgress: [makeProgress({ id: 'lp-a2', profileId: 'p1', lessonId: 'second-a' })],
          }),
        }),
        { deviceSettings: DEVICE_SETTINGS },
      ),
    ).rejects.toThrow();

    expect(stagingKeys(inner)).toEqual([]);
    expect(keysOf(inner).map((key) => [key, inner.getItem(key)])).toEqual(before);
  });
});
