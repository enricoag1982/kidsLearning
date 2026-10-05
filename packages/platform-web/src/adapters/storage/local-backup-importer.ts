import type {
  AppSettings,
  AssessmentResult,
  Attempt,
  BackupFile,
  BackupImporter,
  MergeWriteOptions,
  ConceptStats,
  EarnedBadge,
  GameRecord,
  LessonProgress,
  MiniGameProgress,
  PlacementDecision,
  Profile,
  ProfileSettings,
  SessionLog,
  Streak,
  Unlock,
} from '@learn/platform-core';
import { toPromise } from './collections.ts';
import type { LocalStore } from './local-store.ts';
import { SCHEMA_VERSION } from './local-store.ts';
import { StorageError } from './local-store.ts';
import { MAX_ASSESSMENT_RESULTS } from './local-assessment-repository.ts';
import { MAX_GAME_RECORDS } from './local-game-record-repository.ts';
import { MAX_ATTEMPTS } from './local-progress-repository.ts';
import { STORAGE_KEYS } from './storage-keys.ts';

/** Raw value per record name, as the repositories' `readAll` / `writeAll` store it. The shared store's records are `profiles`,
 * `settings`, `streaks`, `session-logs` (never `parent-lock`: a restored backup never touches the parent password); each
 * subject store's are `lesson-progress`, `attempts`, `minigame-progress`, `concept-stats`, `game-records`, `earned-badges`,
 * `assessment-results`, `unlocks`, `placement-decisions`. */
type RawRecords = Readonly<Record<string, unknown>>;

function byCreatedAtAsc(
  a: { readonly createdAt: string },
  b: { readonly createdAt: string },
): number {
  return a.createdAt.localeCompare(b.createdAt);
}

function capped<T extends { readonly createdAt: string }>(items: readonly T[], max: number): T[] {
  const sorted = [...items].sort(byCreatedAtAsc);
  return sorted.length > max ? sorted.slice(sorted.length - max) : sorted;
}

/** `${profileId}:${date}` for this device's own row (`log.deviceId` absent or equal to
 * `localDeviceId`); a foreign device's row is suffixed so it is stored alongside, never overwriting. */
function sessionLogStorageKey(log: SessionLog, localDeviceId: string | undefined): string {
  const isLocal = log.deviceId === undefined || log.deviceId === localDeviceId;
  return isLocal ? `${log.profileId}:${log.date}` : `${log.profileId}:${log.date}:${log.deviceId}`;
}

/** `file`'s shared part (profiles, settings, streaks, session logs) as raw records. */
function toSharedRecords(file: BackupFile, options: MergeWriteOptions): RawRecords {
  const profiles: Record<string, Profile> = {};
  const streaks: Record<string, Streak> = {};
  const sessionLogs: Record<string, SessionLog> = {};
  const profileSettings: Record<string, ProfileSettings> = {};

  for (const profile of file.profiles) {
    profiles[profile.id] = profile;
    const data = file.data[profile.id];
    if (data === undefined) continue;

    profileSettings[profile.id] = data.settings;
    for (const log of data.sessionLogs) {
      sessionLogs[sessionLogStorageKey(log, options.localDeviceId)] = log;
    }
    if (data.streak !== undefined) {
      streaks[profile.id] = data.streak;
    }
  }

  const { lastProfileId, suggestedLevels, lastSubjectByProfile, storagePersisted, deviceId } =
    options.deviceSettings;
  const settings: AppSettings = {
    lastProfileId,
    suggestedLevels,
    profileSettings,
    ...(lastSubjectByProfile === undefined ? {} : { lastSubjectByProfile }),
    ...(storagePersisted === undefined ? {} : { storagePersisted }),
    ...(deviceId === undefined ? {} : { deviceId }),
  };

  return {
    [STORAGE_KEYS.profiles]: profiles,
    [STORAGE_KEYS.settings]: settings,
    [STORAGE_KEYS.streaks]: streaks,
    [STORAGE_KEYS.sessionLogs]: sessionLogs,
  };
}

/** Subject `subjectId`'s records from every profile of `file`, as raw records. A profile without that subject's section
 * contributes nothing, so a subject absent from the file comes out empty. */
function toSubjectRecords(file: BackupFile, subjectId: string): RawRecords {
  const lessonProgress: Record<string, LessonProgress> = {};
  const miniGameProgress: Record<string, MiniGameProgress> = {};
  const conceptStats: Record<string, ConceptStats> = {};
  let attempts: Attempt[] = [];
  let gameRecords: GameRecord[] = [];
  let earnedBadges: EarnedBadge[] = [];
  let assessmentResults: AssessmentResult[] = [];
  let unlocks: Unlock[] = [];
  const placementDecisions: Record<string, PlacementDecision> = {};

  for (const profile of file.profiles) {
    const subject = file.data[profile.id]?.subjects[subjectId];
    if (subject === undefined) continue;

    for (const progress of subject.lessonProgress) {
      lessonProgress[`${progress.profileId}:${progress.lessonId}`] = progress;
    }
    for (const progress of subject.miniGameProgress) {
      miniGameProgress[`${progress.profileId}:${progress.miniGameId}`] = progress;
    }
    for (const stats of subject.conceptStats) {
      conceptStats[`${stats.profileId}:${stats.conceptId}`] = stats;
    }
    attempts = attempts.concat(subject.attempts);
    gameRecords = gameRecords.concat(subject.gameRecords);
    earnedBadges = earnedBadges.concat(subject.earnedBadges);
    assessmentResults = assessmentResults.concat(subject.assessmentResults);
    unlocks = unlocks.concat(subject.unlocks);
    if (subject.placementDecision !== undefined) {
      placementDecisions[subject.placementDecision.profileId] = subject.placementDecision;
    }
  }

  return {
    [STORAGE_KEYS.lessonProgress]: lessonProgress,
    [STORAGE_KEYS.attempts]: capped(attempts, MAX_ATTEMPTS),
    [STORAGE_KEYS.minigameProgress]: miniGameProgress,
    [STORAGE_KEYS.conceptStats]: conceptStats,
    [STORAGE_KEYS.gameRecords]: capped(gameRecords, MAX_GAME_RECORDS),
    [STORAGE_KEYS.earnedBadges]: earnedBadges,
    [STORAGE_KEYS.assessmentResults]: capped(assessmentResults, MAX_ASSESSMENT_RESULTS),
    [STORAGE_KEYS.unlocks]: unlocks,
    [STORAGE_KEYS.placementDecisions]: placementDecisions,
  };
}

const STAGING_PREFIX = 'backup-staging:';

interface StagedRecord {
  readonly store: LocalStore;
  readonly name: string;
}

/** Writes `file` as the device's whole dataset: the shared part over `sharedStore`, each subject's records over its own store
 * in `subjectStores` (by subject id). A store may be both the shared one and a subject's (single-store apps): it then gets
 * all thirteen records. Every replaced record in every store is staged under `backup-staging:<name>` first, then all are
 * copied to the real keys: a quota error partway removes everything staged and leaves the real keys untouched
 * (`docs/architecture.md` §11). A file's subject with no registered store is ignored; a registered subject missing from the
 * file is written empty. */
export class LocalStorageBackupImporter implements BackupImporter {
  private readonly sharedStore: LocalStore;
  private readonly subjectStores: Readonly<Record<string, LocalStore>>;

  constructor(sharedStore: LocalStore, subjectStores: Readonly<Record<string, LocalStore>>) {
    const seen = new Map<LocalStore, string>();
    for (const [id, store] of Object.entries(subjectStores)) {
      const other = seen.get(store);
      if (other !== undefined) {
        throw new Error(`subjects "${other}" and "${id}" share one store`);
      }
      seen.set(store, id);
    }
    this.sharedStore = sharedStore;
    this.subjectStores = subjectStores;
  }

  writeMerged(file: BackupFile, options: MergeWriteOptions): Promise<void> {
    return toPromise(() => {
      this.checkSchemaVersion(file);
      this.stageThenSwap(this.recordsByStore(file, options));
    });
  }

  private checkSchemaVersion(file: BackupFile): void {
    if (file.schemaVersion > SCHEMA_VERSION) {
      throw new StorageError(
        `Backup schema version ${String(file.schemaVersion)} is newer than supported version ${String(SCHEMA_VERSION)}`,
      );
    }
  }

  /** Every record to write, grouped by the store instance that holds it. */
  private recordsByStore(
    file: BackupFile,
    options: MergeWriteOptions,
  ): ReadonlyMap<LocalStore, RawRecords> {
    const byStore = new Map<LocalStore, RawRecords>();
    const add = (store: LocalStore, records: RawRecords): void => {
      byStore.set(store, { ...byStore.get(store), ...records });
    };
    add(this.sharedStore, toSharedRecords(file, options));
    for (const [subjectId, store] of Object.entries(this.subjectStores)) {
      add(store, toSubjectRecords(file, subjectId));
    }
    return byStore;
  }

  private stageThenSwap(byStore: ReadonlyMap<LocalStore, RawRecords>): void {
    const staged: StagedRecord[] = [];
    try {
      for (const [store, records] of byStore) {
        for (const [name, value] of Object.entries(records)) {
          store.write(`${STAGING_PREFIX}${name}`, value);
          staged.push({ store, name });
        }
      }
    } catch (error: unknown) {
      for (const { store, name } of staged) {
        store.remove(`${STAGING_PREFIX}${name}`);
      }
      throw error instanceof Error ? error : new Error(String(error));
    }

    for (const { store, name } of staged) {
      store.write(name, store.read(`${STAGING_PREFIX}${name}`));
      store.remove(`${STAGING_PREFIX}${name}`);
    }
  }
}
