import { describe, expect, it } from 'vitest';

import { composeDefaultSettings } from '../domain/profile-settings.ts';
import { newProfile } from '../domain/profile.ts';
import { newLessonProgress, recordExerciseStars } from '../domain/progress.ts';
import { createSubjectRuntime } from '../domain/runtime.ts';
import type { GameRecord, LessonProgress } from '../domain/progress.ts';
import type { AppConfig } from '../domain/subject.ts';
import { emptySubjectProfileData } from '../domain/merge.ts';
import type { SessionLog } from '../domain/session-log.ts';
import type { Streak } from '../domain/streak.ts';
import {
  makeGameRecordRepo,
  makeProfileRepo,
  makeProgressRepo as buildProgressRepo,
  makeRewardsRepo as buildRewardsRepo,
  makeAssessmentRepo as buildAssessmentRepo,
  makeClock as buildClock,
  makeBackupFileWriter,
  makeBackupImporter,
  makeExercise as buildExercise,
  makeLesson as buildLesson,
  makeContentSource,
  makeDeps as buildDeps,
  makeMiniGameProgress,
  makeProgress,
  makeConceptStats,
  makeAttempt,
  TEST_APP_CONFIG,
  testSubject,
} from '../testing/index.ts';
import {
  BackupValidationError,
  LEGACY_FLAT_MAX_SCHEMA,
  backupFileName,
  buildBackupFile,
  exportBackup,
  parseBackupFile,
} from './backup.ts';
import type { BackupFile } from './backup.ts';
import type { SubjectDataRepositories } from './ports.ts';
import type { AppDeps } from './use-cases.ts';

const NOW = new Date('2026-01-10T12:00:00.000Z');

const APP: AppConfig = {
  title: 'Chess for Kids',
  storagePrefix: 'chess-kids:',
  backupAppId: 'chess-kids',
  backupFilePrefix: 'chess-for-kids',
  parentCodeFilePrefix: 'chess-for-kids-parent-code',
  version: '0.0.0-test',
};

function makeExercise(id: string) {
  return buildExercise({ id, concept: `${id}-concept` });
}

const L1 = buildLesson({
  id: 'l1',
  world: 'w1',
  concept: 'l1-concept',
  exercises: [makeExercise('l1-01'), makeExercise('l1-02')],
});

function makeContent(): ReturnType<typeof makeContentSource> {
  return makeContentSource({ lessons: [L1] });
}

function makeProgressRepo(lessons: readonly LessonProgress[] = []): AppDeps['progress'] {
  return buildProgressRepo({ lessons });
}

function makeDeps(overrides: Partial<AppDeps> = {}): AppDeps {
  return buildDeps({
    rewards: buildRewardsRepo(),
    assessment: buildAssessmentRepo(),
    clock: buildClock(NOW),
    content: makeContent(),
    backupFileWriter: makeBackupFileWriter(),
    backupImporter: makeBackupImporter(),
    storageSchemaVersion: 6,
    ...overrides,
  });
}

const DEFAULT_PROFILE_SETTINGS = composeDefaultSettings(buildDeps({}).subject.settings);

function makeGameRecord(overrides: Partial<GameRecord> = {}): GameRecord {
  return {
    id: 'g1',
    profileId: 'p1',
    game: 'full',
    opponent: 'computer:1',
    result: 'win',
    reason: 'checkmate',
    moves: ['e4', 'e5'],
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

describe('buildBackupFile', () => {
  it('includes every profile and its data by default', async () => {
    const mia = newProfile('p1', 'Mia', 'fox', NOW);
    const leo = newProfile('p2', 'Leo', 'panda', NOW);
    let progress = newLessonProgress('lp1', 'p1', 'l1', NOW);
    progress = recordExerciseStars(progress, 'l1-01', 3, L1, NOW);
    const deps = makeDeps({
      profiles: makeProfileRepo([mia, leo]),
      progress: makeProgressRepo([progress]),
      gameRecords: makeGameRecordRepo([makeGameRecord()]),
    });

    const file = await buildBackupFile(deps);

    expect(file.app).toBe('test-app');
    expect(file.schemaVersion).toBe(6);
    expect(file.exportedAt).toBe(NOW.toISOString());
    expect(file.profiles.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(file.data.p1?.subjects.main?.lessonProgress).toEqual([progress]);
    expect(file.data.p1?.subjects.main?.gameRecords).toEqual([makeGameRecord()]);
    expect(file.data.p2?.subjects.main?.lessonProgress).toEqual([]);
  });

  it('filters to the given profile ids ("Export per child")', async () => {
    const mia = newProfile('p1', 'Mia', 'fox', NOW);
    const leo = newProfile('p2', 'Leo', 'panda', NOW);
    const deps = makeDeps({ profiles: makeProfileRepo([mia, leo]) });

    const file = await buildBackupFile(deps, ['p2']);

    expect(file.profiles.map((p) => p.id)).toEqual(['p2']);
    expect(Object.keys(file.data)).toEqual(['p2']);
  });

  it('defaults a profile’s settings when none stored yet', async () => {
    const mia = newProfile('p1', 'Mia', 'fox', NOW);
    const deps = makeDeps({ profiles: makeProfileRepo([mia]) });

    const file = await buildBackupFile(deps);

    expect(file.data.p1?.settings).toEqual(DEFAULT_PROFILE_SETTINGS);
  });

  it('adds the subject’s legacyExport constants to every profile’s settings (write-only)', async () => {
    const mia = newProfile('p1', 'Mia', 'fox', NOW);
    const deps = makeDeps({
      profiles: makeProfileRepo([mia]),
      subject: createSubjectRuntime({
        ...testSubject,
        settings: { ...testSubject.settings, legacyExport: { legacy: 'const' } },
      }),
    });

    const file = await buildBackupFile(deps);
    expect(file.data.p1?.settings).toEqual({ ...DEFAULT_PROFILE_SETTINGS, legacy: 'const' });

    // Reading the file back drops it: the subject's backup shape does not know the field.
    const parsed = await parseBackupFile(deps, JSON.stringify(file));
    expect(parsed.data.p1?.settings).toEqual(DEFAULT_PROFILE_SETTINGS);
  });
});

describe('backupFileName', () => {
  it('is chess-kids-backup-<date>.json with no nickname', () => {
    expect(backupFileName(APP, NOW)).toBe('chess-kids-backup-2026-01-10.json');
  });

  it('slugs the nickname in for a per-child export', () => {
    expect(backupFileName(APP, NOW, 'Mia')).toBe('chess-kids-backup-mia-2026-01-10.json');
  });

  it('collapses punctuation/spaces in the nickname', () => {
    expect(backupFileName(APP, NOW, 'Léo Jr.')).toMatch(
      /^chess-kids-backup-l.*o-jr-2026-01-10\.json$/,
    );
  });
});

describe('exportBackup', () => {
  it('writes the built file via backupFileWriter, filename with no nickname for "everyone"', async () => {
    const mia = newProfile('p1', 'Mia', 'fox', NOW);
    const leo = newProfile('p2', 'Leo', 'panda', NOW);
    const writer = makeBackupFileWriter();
    const deps = makeDeps({ profiles: makeProfileRepo([mia, leo]), backupFileWriter: writer });

    await exportBackup(deps);

    expect(writer.writes).toHaveLength(1);
    expect(writer.writes[0]?.filename).toBe('test-app-backup-2026-01-10.json');
    const parsed = JSON.parse(writer.writes[0]?.contents ?? '{}') as BackupFile;
    expect(parsed.profiles).toHaveLength(2);
  });

  it('names the file after the one profile for a per-child export', async () => {
    const mia = newProfile('p1', 'Mia', 'fox', NOW);
    const writer = makeBackupFileWriter();
    const deps = makeDeps({ profiles: makeProfileRepo([mia]), backupFileWriter: writer });

    await exportBackup(deps, ['p1']);

    expect(writer.writes[0]?.filename).toBe('test-app-backup-mia-2026-01-10.json');
  });

  it('throws without deps.backupFileWriter wired up', async () => {
    const deps = makeDeps({ backupFileWriter: undefined });
    await expect(exportBackup(deps)).rejects.toThrow();
  });
});

describe('parseBackupFile', () => {
  it('round-trips a built backup file through JSON', async () => {
    const mia = newProfile('p1', 'Mia', 'fox', NOW);
    let progress = newLessonProgress('lp1', 'p1', 'l1', NOW);
    progress = recordExerciseStars(progress, 'l1-01', 3, L1, NOW);
    progress = recordExerciseStars(progress, 'l1-02', 2, L1, NOW);
    const deps = makeDeps({
      profiles: makeProfileRepo([mia]),
      progress: makeProgressRepo([progress]),
    });

    const file = await buildBackupFile(deps);
    const raw = JSON.stringify(file);
    const parsed = await parseBackupFile(deps, raw);

    expect(parsed).toEqual(file);
  });

  it('rejects invalid JSON', async () => {
    const deps = makeDeps();
    await expect(parseBackupFile(deps, '{not json')).rejects.toThrow(BackupValidationError);
  });

  it('rejects a valid-JSON file with the wrong app id', async () => {
    const deps = makeDeps();
    const raw = JSON.stringify({
      app: 'someone-else',
      schemaVersion: 1,
      exportedAt: NOW.toISOString(),
      profiles: [],
      data: {},
    });
    await expect(parseBackupFile(deps, raw)).rejects.toThrow(BackupValidationError);
  });

  it('rejects a file missing required fields', async () => {
    const deps = makeDeps();
    const raw = JSON.stringify({ app: 'chess-kids' });
    await expect(parseBackupFile(deps, raw)).rejects.toThrow(BackupValidationError);
  });

  it('rejects a schemaVersion newer than deps.storageSchemaVersion', async () => {
    const deps = makeDeps({ storageSchemaVersion: 6 });
    const file = await buildBackupFile(deps);
    const raw = JSON.stringify({ ...file, schemaVersion: 7 });
    await expect(parseBackupFile(deps, raw)).rejects.toThrow(/newer version of the app/);
  });

  it('accepts the current schemaVersion', async () => {
    const deps = makeDeps({ storageSchemaVersion: 6 });
    const file = await buildBackupFile(deps);
    await expect(parseBackupFile(deps, JSON.stringify(file))).resolves.toEqual(file);
  });
});

const MIA = newProfile('p1', 'Mia', 'fox', NOW);
const T0 = '2026-01-01T00:00:00.000Z';

/** One subject's own repositories, seeded with a few rows for `p1`; `tag` makes ids / lesson ids distinct per subject. */
function subjectRepos(tag: string): SubjectDataRepositories {
  return {
    progress: buildProgressRepo({
      lessons: [makeProgress({ id: `lp-${tag}`, profileId: 'p1', lessonId: `lesson-${tag}` })],
      miniGames: [
        makeMiniGameProgress({ id: `mg-${tag}`, profileId: 'p1', miniGameId: `game-${tag}` }),
      ],
      conceptStats: [
        makeConceptStats({ id: `cs-${tag}`, profileId: 'p1', conceptId: `concept-${tag}` }),
      ],
      attempts: [makeAttempt({ id: `at-${tag}`, profileId: 'p1' })],
    }),
    gameRecords: makeGameRecordRepo([makeGameRecord({ id: `g-${tag}` })]),
    assessment: buildAssessmentRepo(
      [
        {
          id: `ar-${tag}`,
          profileId: 'p1',
          kind: 'placement',
          scope: { type: 'world', worldId: 'w1' },
          correct: 3,
          total: 4,
          passed: true,
          at: T0,
          createdAt: T0,
          updatedAt: T0,
        },
      ],
      [
        {
          id: `un-${tag}`,
          profileId: 'p1',
          targetType: 'world',
          targetId: `world-${tag}`,
          via: 'placement',
          createdAt: T0,
          updatedAt: T0,
        },
      ],
    ),
    badges: buildRewardsRepo({
      badges: [
        {
          id: `bd-${tag}`,
          profileId: 'p1',
          badgeId: `badge-${tag}`,
          at: T0,
          seen: false,
          createdAt: T0,
          updatedAt: T0,
        },
      ],
    }),
  };
}

const STREAK: Streak = {
  id: 's1',
  profileId: 'p1',
  current: 3,
  best: 4,
  lastDay: '2026-01-09',
  skipsUsedThisWeek: 0,
  createdAt: T0,
  updatedAt: T0,
};

const FULL_LOG: SessionLog = {
  id: 'log1',
  profileId: 'p1',
  date: '2026-01-09',
  minutes: 12,
  extraMinutes: 15,
  hoursOverrideUntil: '2026-01-09T19:15:00.000Z',
  warnedAt: '2026-01-09T18:55:00.000Z',
  deviceId: 'device-x',
  createdAt: T0,
  updatedAt: T0,
};

function twoSubjectDeps(overrides: Partial<AppDeps> = {}): AppDeps {
  return makeDeps({
    profiles: makeProfileRepo([MIA]),
    rewards: buildRewardsRepo({ streaks: [STREAK], sessionLogs: [FULL_LOG] }),
    subjectData: { a: subjectRepos('a'), b: subjectRepos('b') },
    ...overrides,
  });
}

/** The 8 per-subject lists of the old flat format, for subject tag `tag`. */
function flatRecords(tag: string) {
  return {
    lessonProgress: [makeProgress({ id: `lp-${tag}`, profileId: 'p1', lessonId: `lesson-${tag}` })],
    attempts: [makeAttempt({ id: `at-${tag}`, profileId: 'p1' })],
    miniGameProgress: [
      makeMiniGameProgress({ id: `mg-${tag}`, profileId: 'p1', miniGameId: `game-${tag}` }),
    ],
    conceptStats: [
      makeConceptStats({ id: `cs-${tag}`, profileId: 'p1', conceptId: `concept-${tag}` }),
    ],
    gameRecords: [makeGameRecord({ id: `g-${tag}` })],
    earnedBadges: [
      {
        id: `bd-${tag}`,
        profileId: 'p1',
        badgeId: `badge-${tag}`,
        at: T0,
        seen: false,
        createdAt: T0,
        updatedAt: T0,
      },
    ],
    assessmentResults: [],
    unlocks: [],
  };
}

/** A flat (schema <= 5) backup file as raw JSON. */
function legacyRaw(app: string, schemaVersion: number): string {
  return JSON.stringify({
    app,
    schemaVersion,
    exportedAt: NOW.toISOString(),
    profiles: [MIA],
    data: {
      p1: {
        settings: DEFAULT_PROFILE_SETTINGS,
        ...flatRecords('old'),
        streak: STREAK,
        sessionLogs: [FULL_LOG],
      },
    },
  });
}

const APP_WITH_LEGACY: AppConfig = {
  ...TEST_APP_CONFIG,
  legacyBackupApps: { 'old-app': 'b' },
};

describe('buildBackupFile: per-subject sections', () => {
  it('holds each subject’s rows under its own id, shared streak / session logs once', async () => {
    const deps = twoSubjectDeps();

    const file = await buildBackupFile(deps);

    expect(file.schemaVersion).toBe(6);
    const data = file.data.p1;
    expect(Object.keys(data?.subjects ?? {})).toEqual(['a', 'b']);
    for (const tag of ['a', 'b'] as const) {
      const subject = data?.subjects[tag];
      expect(subject?.lessonProgress.map((row) => row.lessonId)).toEqual([`lesson-${tag}`]);
      expect(subject?.miniGameProgress.map((row) => row.miniGameId)).toEqual([`game-${tag}`]);
      expect(subject?.conceptStats.map((row) => row.conceptId)).toEqual([`concept-${tag}`]);
      expect(subject?.attempts.map((row) => row.id)).toEqual([`at-${tag}`]);
      expect(subject?.gameRecords.map((row) => row.id)).toEqual([`g-${tag}`]);
      expect(subject?.earnedBadges.map((row) => row.badgeId)).toEqual([`badge-${tag}`]);
      expect(subject?.assessmentResults.map((row) => row.id)).toEqual([`ar-${tag}`]);
      expect(subject?.unlocks.map((row) => row.targetId)).toEqual([`world-${tag}`]);
    }
    expect(data?.streak).toEqual(STREAK);
    expect(data?.sessionLogs).toEqual([FULL_LOG]);
    // Per-subject lists are not repeated at the profile level.
    expect(Object.keys(data ?? {}).sort()).toEqual([
      'sessionLogs',
      'settings',
      'streak',
      'subjects',
    ]);
  });

  it('a subject without an assessment store exports empty assessment lists', async () => {
    const { progress, gameRecords, badges } = subjectRepos('a');
    const deps = twoSubjectDeps({
      subjectData: { a: { progress, gameRecords, badges }, b: subjectRepos('b') },
    });
    const file = await buildBackupFile(deps);
    expect(file.data.p1?.subjects.a?.assessmentResults).toEqual([]);
    expect(file.data.p1?.subjects.a?.unlocks).toEqual([]);
    expect(file.data.p1?.subjects.b?.unlocks).toHaveLength(1);
  });

  it('single-subject deps export one section under deps.subjectId', async () => {
    const deps = makeDeps({
      profiles: makeProfileRepo([MIA]),
      subjectId: 'solo',
      gameRecords: makeGameRecordRepo([makeGameRecord()]),
    });
    const file = await buildBackupFile(deps);
    expect(Object.keys(file.data.p1?.subjects ?? {})).toEqual(['solo']);
    expect(file.data.p1?.subjects.solo?.gameRecords).toEqual([makeGameRecord()]);
  });
});

describe('placement decision in the backup', () => {
  const DECISION = {
    id: 'pd-b',
    profileId: 'p1',
    decision: 'declined' as const,
    createdAt: T0,
    updatedAt: T0,
  };

  /** Subject `a` untouched, subject `b` with the child's answer to the placement offer. */
  function deciderDeps(): AppDeps {
    const b = subjectRepos('b');
    return twoSubjectDeps({
      subjectData: {
        a: subjectRepos('a'),
        b: { ...b, assessment: buildAssessmentRepo([], [], [DECISION]) },
      },
    });
  }

  it('exports the decision in its own subject section, and no key for a subject without one', async () => {
    const file = await buildBackupFile(deciderDeps());

    expect(file.data.p1?.subjects.b?.placementDecision).toEqual(DECISION);
    expect('placementDecision' in (file.data.p1?.subjects.a ?? {})).toBe(false);
  });

  it('round-trips through JSON, and a taken answer reads back as taken', async () => {
    const deps = deciderDeps();
    const file = await buildBackupFile(deps);
    expect(await parseBackupFile(deps, JSON.stringify(file))).toEqual(file);

    const taken = {
      ...file,
      data: {
        p1: {
          ...file.data.p1,
          subjects: {
            ...file.data.p1?.subjects,
            b: {
              ...file.data.p1?.subjects.b,
              placementDecision: { ...DECISION, decision: 'taken' },
            },
          },
        },
      },
    };
    const parsed = await parseBackupFile(deps, JSON.stringify(taken));
    expect(parsed.data.p1?.subjects.b?.placementDecision?.decision).toBe('taken');
  });

  it('a file from before the field existed (no key) parses, the decision stays absent', async () => {
    const deps = twoSubjectDeps();
    const file = await buildBackupFile(deps);

    const parsed = await parseBackupFile(deps, JSON.stringify(file));

    expect('placementDecision' in (parsed.data.p1?.subjects.a ?? {})).toBe(false);
  });

  it('rejects an answer that is neither taken nor declined', async () => {
    const deps = deciderDeps();
    const file = await buildBackupFile(deps);
    const bad = JSON.stringify(file).replace('"decision":"declined"', '"decision":"maybe"');

    await expect(parseBackupFile(deps, bad)).rejects.toThrow(BackupValidationError);
  });
});

describe('parseBackupFile: format v6', () => {
  it('round-trips a two-subject file', async () => {
    const deps = twoSubjectDeps();
    const file = await buildBackupFile(deps);
    expect(await parseBackupFile(deps, JSON.stringify(file))).toEqual(file);
  });

  it('keeps session-log deviceId / extraMinutes / hoursOverrideUntil / warnedAt', async () => {
    const deps = twoSubjectDeps();
    const file = await buildBackupFile(deps);
    const parsed = await parseBackupFile(deps, JSON.stringify(file));
    expect(parsed.data.p1?.sessionLogs).toEqual([FULL_LOG]);
  });

  it('drops subject sections this app does not host', async () => {
    const hosting = makeDeps({
      profiles: makeProfileRepo([MIA]),
      subjectData: { a: subjectRepos('a') },
    });
    const file = await buildBackupFile(twoSubjectDeps());

    const parsed = await parseBackupFile(hosting, JSON.stringify(file));

    expect(Object.keys(parsed.data.p1?.subjects ?? {})).toEqual(['a']);
    expect(parsed.data.p1?.subjects.a).toEqual(file.data.p1?.subjects.a);
  });

  it('rejects a v6 file with a foreign app id', async () => {
    const deps = twoSubjectDeps();
    const file = await buildBackupFile(deps);
    await expect(
      parseBackupFile(deps, JSON.stringify({ ...file, app: 'someone-else' })),
    ).rejects.toThrow('Not a valid backup file.');
  });

  it('rejects a v6 file under a legacy app id (legacy ids are for schema <= 5 only)', async () => {
    const deps = twoSubjectDeps({ app: APP_WITH_LEGACY });
    const file = await buildBackupFile(deps);
    await expect(
      parseBackupFile(deps, JSON.stringify({ ...file, app: 'old-app' })),
    ).rejects.toThrow('Not a valid backup file.');
  });

  it('rejects a flat-shaped file claiming schemaVersion 6', async () => {
    const deps = twoSubjectDeps();
    await expect(parseBackupFile(deps, legacyRaw('test-app', 6))).rejects.toThrow(
      'Not a valid backup file.',
    );
  });

  it('a v7 file gets the newer-version error, not a shape error', async () => {
    const deps = twoSubjectDeps();
    const raw = JSON.stringify({
      app: 'test-app',
      schemaVersion: 7,
      exportedAt: NOW.toISOString(),
      profiles: [],
      data: { somethingNew: true },
    });
    await expect(parseBackupFile(deps, raw)).rejects.toThrow(/newer version of the app/);
  });

  it('rejects a file without app / schemaVersion', async () => {
    const deps = twoSubjectDeps();
    await expect(parseBackupFile(deps, JSON.stringify({ schemaVersion: 6 }))).rejects.toThrow(
      'Not a valid backup file.',
    );
    await expect(parseBackupFile(deps, JSON.stringify({ app: 'test-app' }))).rejects.toThrow(
      'Not a valid backup file.',
    );
    await expect(parseBackupFile(deps, 'null')).rejects.toThrow('Not a valid backup file.');
  });

  it('rejects invalid profile settings', async () => {
    const deps = twoSubjectDeps();
    const file = await buildBackupFile(deps);
    const bad = {
      ...file,
      data: {
        p1: {
          ...file.data.p1,
          settings: { ...DEFAULT_PROFILE_SETTINGS, difficulty: 'impossible' },
        },
      },
    };
    await expect(parseBackupFile(deps, JSON.stringify(bad))).rejects.toThrow(
      'Not a valid backup file.',
    );
  });
});

describe('parseBackupFile: legacy flat files (schema <= 5)', () => {
  it('LEGACY_FLAT_MAX_SCHEMA is 5', () => {
    expect(LEGACY_FLAT_MAX_SCHEMA).toBe(5);
  });

  it('own app id + exactly one registered subject: converted under that subject, returned as a current file', async () => {
    const deps = makeDeps({ profiles: makeProfileRepo([MIA]), subjectId: 'solo' });

    const parsed = await parseBackupFile(deps, legacyRaw('test-app', 5));

    expect(parsed.app).toBe('test-app');
    expect(parsed.schemaVersion).toBe(6);
    expect(parsed.profiles.map((profile) => profile.id)).toEqual(['p1']);
    const data = parsed.data.p1;
    expect(Object.keys(data?.subjects ?? {})).toEqual(['solo']);
    expect(data?.subjects.solo).toEqual({ ...emptySubjectProfileData(), ...flatRecords('old') });
    expect(data?.settings).toEqual(DEFAULT_PROFILE_SETTINGS);
    expect(data?.streak).toEqual(STREAK);
    expect(data?.sessionLogs).toEqual([FULL_LOG]);
    expect(Object.keys(data ?? {}).sort()).toEqual([
      'sessionLogs',
      'settings',
      'streak',
      'subjects',
    ]);
  });

  it('single-subject deps without subjectId: the default subject id', async () => {
    const deps = makeDeps({ profiles: makeProfileRepo([MIA]) });
    const parsed = await parseBackupFile(deps, legacyRaw('test-app', 3));
    expect(Object.keys(parsed.data.p1?.subjects ?? {})).toEqual(['main']);
    expect(parsed.schemaVersion).toBe(6);
  });

  it('a legacy app id lands in the mapped subject of a two-subject app', async () => {
    const deps = twoSubjectDeps({ app: APP_WITH_LEGACY });

    const parsed = await parseBackupFile(deps, legacyRaw('old-app', 5));

    expect(parsed.app).toBe('test-app');
    expect(parsed.schemaVersion).toBe(6);
    expect(Object.keys(parsed.data.p1?.subjects ?? {})).toEqual(['b']);
    expect(parsed.data.p1?.subjects.b?.lessonProgress.map((row) => row.lessonId)).toEqual([
      'lesson-old',
    ]);
    expect(parsed.data.p1?.sessionLogs).toEqual([FULL_LOG]);
  });

  it('session-log extra fields survive the legacy parse too', async () => {
    const deps = makeDeps({ profiles: makeProfileRepo([MIA]) });
    const parsed = await parseBackupFile(deps, legacyRaw('test-app', 5));
    expect(parsed.data.p1?.sessionLogs[0]).toEqual(FULL_LOG);
  });

  it('rejects an unknown app id', async () => {
    const deps = twoSubjectDeps({ app: APP_WITH_LEGACY });
    await expect(parseBackupFile(deps, legacyRaw('unknown-app', 5))).rejects.toThrow(
      'Not a valid backup file.',
    );
  });

  it('rejects a legacy app id mapped to an unregistered subject', async () => {
    const deps = twoSubjectDeps({
      app: { ...TEST_APP_CONFIG, legacyBackupApps: { 'old-app': 'zzz' } },
    });
    await expect(parseBackupFile(deps, legacyRaw('old-app', 5))).rejects.toThrow(
      'Not a valid backup file.',
    );
  });

  it('rejects the own app id when several subjects are registered and no mapping names one', async () => {
    const deps = twoSubjectDeps();
    await expect(parseBackupFile(deps, legacyRaw('test-app', 5))).rejects.toThrow(
      'Not a valid backup file.',
    );
  });

  it('rejects inherited property names as legacy app ids', async () => {
    const deps = twoSubjectDeps({ app: APP_WITH_LEGACY });
    await expect(parseBackupFile(deps, legacyRaw('constructor', 5))).rejects.toThrow(
      'Not a valid backup file.',
    );
  });

  it('rejects a legacy file with a bad shape', async () => {
    const deps = makeDeps({ profiles: makeProfileRepo([MIA]) });
    const broken = JSON.parse(legacyRaw('test-app', 5)) as { data: { p1: { attempts: unknown } } };
    broken.data.p1.attempts = 'nope';
    await expect(parseBackupFile(deps, JSON.stringify(broken))).rejects.toThrow(
      'Not a valid backup file.',
    );
  });
});
