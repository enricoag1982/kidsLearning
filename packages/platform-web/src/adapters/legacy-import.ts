import type { AppConfig, AppDeps, BackupFile, ProfileSettings } from '@learn/platform-core';
import type { ChildImportChoice, ImportPlan } from '@learn/platform-core/merge';

// Bringing an older single-subject app's progress along (docs/multi-subject.md F1): Chess for Kids ran on the same origin, so
// its `chess-kids:` localStorage is readable here. The first run offers once to import it; the answer is a plain device-level
// key beside the app's own (`<storagePrefix>legacy-import`), like `persistent-storage.ts`'s flag. The older keys are only read,
// never changed.

/** The flat backup format an older app exported (`LEGACY_FLAT_MAX_SCHEMA` and below, `app/backup.ts`); what is built here. */
const LEGACY_FILE_SCHEMA = 5;

const DECISION_KEY = 'legacy-import';

/** `'done'`: the progress was imported; `'declined'`: "Not now", or the import did not work. Either way never offered again. */
export type LegacyDecision = 'done' | 'declined';

/** An older app's store on this device: its backup app id (a key of `AppConfig.legacyBackupApps`) and its key prefix. */
export interface LegacyStore {
  readonly appId: string;
  readonly prefix: string;
}

type LegacyApp = Pick<AppConfig, 'storagePrefix' | 'legacyBackupApps' | 'legacyStorePrefixes'>;

function decisionKey(app: Pick<AppConfig, 'storagePrefix'>): string {
  return `${app.storagePrefix}${DECISION_KEY}`;
}

/** The stored answer, `undefined` before one was given (or when storage is unreadable). */
export function readLegacyDecision(
  storage: Storage,
  app: Pick<AppConfig, 'storagePrefix'>,
): LegacyDecision | undefined {
  try {
    const raw = storage.getItem(decisionKey(app));
    const value: unknown = raw === null ? undefined : JSON.parse(raw);
    return value === 'done' || value === 'declined' ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Remembers the answer (JSON, like every record of the app's stores); best effort: the flow goes on if storage refuses. */
export function storeLegacyDecision(
  storage: Storage,
  app: Pick<AppConfig, 'storagePrefix'>,
  decision: LegacyDecision,
): void {
  try {
    storage.setItem(decisionKey(app), JSON.stringify(decision));
  } catch {
    // Worst case the offer shows again on a later first run; nothing is lost.
  }
}

/** The older app's record `name` as stored (JSON under `<prefix><name>`), `undefined` when absent. Read-only by construction:
 * nothing here ever writes or removes a key. The older layout (`chess-kids` schema 5) is read as it was written then, not
 * through this app's own repositories, which may change shape later. */
function readRecord(storage: Storage, prefix: string, name: string): unknown {
  const raw = storage.getItem(`${prefix}${name}`);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error(`Corrupt JSON stored at key "${name}"`);
  }
}

/** A stored record as a list of rows: a `{ <key>: row }` collection (profiles, lesson progress, streaks, ...) or a plain
 * `row[]` list (attempts, badges, ...); none stored is an empty list. */
function rowsOf(value: unknown, name: string): unknown[] {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value as unknown[];
  if (typeof value === 'object' && value !== null) return Object.values(value);
  throw new Error(`Corrupt data stored at "${name}"`);
}

function fieldOf(row: unknown, field: string): unknown {
  return typeof row === 'object' && row !== null
    ? (row as Record<string, unknown>)[field]
    : undefined;
}

/** The rows of `name` that belong to child `profileId`. */
function rowsFor(storage: Storage, prefix: string, name: string, profileId: string): unknown[] {
  return rowsOf(readRecord(storage, prefix, name), name).filter(
    (row) => fieldOf(row, 'profileId') === profileId,
  );
}

/** The children of the older store (rows with a string id), oldest first as its own export lists them. */
function childrenOf(storage: Storage, prefix: string): unknown[] {
  return rowsOf(readRecord(storage, prefix, 'profiles'), 'profiles')
    .filter((row) => typeof fieldOf(row, 'id') === 'string')
    .sort((a, b) => {
      const byCreated = String(fieldOf(a, 'createdAt')).localeCompare(
        String(fieldOf(b, 'createdAt')),
      );
      return byCreated !== 0
        ? byCreated
        : String(fieldOf(a, 'id')).localeCompare(String(fieldOf(b, 'id')));
    });
}

/** Whether the older store at `prefix` holds at least one child (a store with only a parent code has nothing to bring). */
function holdsChildren(storage: Storage, prefix: string): boolean {
  try {
    return childrenOf(storage, prefix).length > 0;
  } catch {
    return false;
  }
}

/** The first older store on this device that holds children and whose backup app id this app maps to a subject; `undefined`
 * when `app` names none or none is there. */
export function findLegacyStore(storage: Storage, app: LegacyApp): LegacyStore | undefined {
  const mapped = app.legacyBackupApps ?? {};
  for (const [appId, prefix] of Object.entries(app.legacyStorePrefixes ?? {})) {
    if (Object.hasOwn(mapped, appId) && holdsChildren(storage, prefix)) return { appId, prefix };
  }
  return undefined;
}

/** The older store to offer on this first run, or `undefined` when there is none to offer: nothing to bring, children already
 * on this device (this is not a first run of an empty device), or the question was answered before. */
export async function findLegacyImportOffer(
  storage: Storage,
  deps: AppDeps,
): Promise<LegacyStore | undefined> {
  if (readLegacyDecision(storage, deps.app) !== undefined) return undefined;
  const found = findLegacyStore(storage, deps.app);
  if (found === undefined) return undefined;
  return (await deps.profiles.list()).length === 0 ? found : undefined;
}

/** What the older app's own "Export all" would have written from its keys (flat format, `app` = its backup id): every child
 * with that child's settings (`defaults`, the composed default settings, for one that never changed any), progress, attempts,
 * mini-games, concept stats, game records, badges, streak, session logs, assessment results and unlocks. Read-only; the rows
 * are passed on as stored and checked by `parseBackupFile`. */
export function buildLegacyBackupFile(
  storage: Storage,
  deps: AppDeps,
  legacy: LegacyStore,
  defaults: ProfileSettings,
): unknown {
  const { prefix } = legacy;
  const profiles = childrenOf(storage, prefix);
  const settings = fieldOf(readRecord(storage, prefix, 'settings'), 'profileSettings');
  const data = Object.fromEntries(
    profiles.map((profile) => {
      const id = String(fieldOf(profile, 'id'));
      const rows = (name: string): unknown[] => rowsFor(storage, prefix, name, id);
      const [streak] = rows('streaks');
      return [
        id,
        {
          settings: { ...defaults, ...(fieldOf(settings, id) as object | undefined) },
          lessonProgress: rows('lesson-progress'),
          attempts: rows('attempts'),
          miniGameProgress: rows('minigame-progress'),
          conceptStats: rows('concept-stats'),
          gameRecords: rows('game-records'),
          earnedBadges: rows('earned-badges'),
          ...(streak === undefined ? {} : { streak }),
          sessionLogs: rows('session-logs'),
          assessmentResults: rows('assessment-results'),
          unlocks: rows('unlocks'),
        },
      ] as const;
    }),
  );
  return {
    app: legacy.appId,
    schemaVersion: LEGACY_FILE_SCHEMA,
    exportedAt: deps.clock.now().toISOString(),
    profiles,
    data,
  };
}

/** The backup import pipeline `importLegacyStore` runs, passed in: `parseBackupFile`, `planImport` and `importMerged` of
 * `@learn/platform-core/backup` / `/merge` (zod-based, so the caller fetches them lazily: `ui/parent-area.ts`). */
export interface BackupImportCode {
  parseBackupFile(deps: AppDeps, raw: string): Promise<BackupFile>;
  planImport(deps: AppDeps, incoming: BackupFile): Promise<ImportPlan>;
  importMerged(
    deps: AppDeps,
    incoming: BackupFile,
    choices: readonly ChildImportChoice[],
  ): Promise<unknown>;
}

/** The "Yes": builds the older app's backup object from its keys and runs the ordinary import on it with `code` (validated by
 * `parseBackupFile`, converted into the mapped subject, every child added as new, written atomically), then remembers
 * `'done'`. Rejects, changing nothing, when the older data cannot be read or is not a valid backup. */
export async function importLegacyStore(
  storage: Storage,
  deps: AppDeps,
  legacy: LegacyStore,
  defaults: ProfileSettings,
  code: BackupImportCode,
): Promise<void> {
  const file = buildLegacyBackupFile(storage, deps, legacy, defaults);
  const incoming = await code.parseBackupFile(deps, JSON.stringify(file));
  const plan = await code.planImport(deps, incoming);
  await code.importMerged(
    deps,
    incoming,
    plan.children.map((child) => child.defaultChoice),
  );
  storeLegacyDecision(storage, deps.app, 'done');
}
