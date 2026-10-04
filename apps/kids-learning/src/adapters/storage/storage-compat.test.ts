// Snapshot rule (docs/refactor-v4.md R0 "storage-compat fixtures"): these snapshots change ONLY
// when the storage or backup format changes on purpose. A fixture that fails to load cleanly here is a
// real compat bug: fix the storage code, never the fixture (`test-fixtures/storage/README.md`).
//
// Since m11.6 (docs/multi-subject.md D3, D18) the app reads no `chess-kids:` localStorage: the recorded
// `local-storage.json` dumps stay in the repo as records only. What is replayed here are the recorded
// backup files, which import as the chess subject (`AppConfig.legacyBackupApps`) into a device of the
// current layout (shared `kids:` store, `kids-chess:` / `kids-math:` per subject).
//
// `kids-m12.5` is the deployed app's own export at tag `m12.5` (v6 format, every subject's section): chess, the math demo
// world `adding` and coding progress of one child. It is the last record before the math demo retires (m13.10);
// `retired-content.test.tsx` replays its math progress against content without that world.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AppDeps, AppSettings, BackupFile, ParentLock } from '@learn/platform-core';
import { buildBackupFile, parseBackupFile } from '@learn/platform-core/backup';
import { importMerged, planImport } from '@learn/platform-core/merge';
import { beforeEach, describe, expect, it } from 'vitest';
import { createServices } from '@learn/platform-web/app/services.ts';
import { SCHEMA_VERSION } from '@learn/platform-web/adapters/storage/local-store.ts';
import { chessWeb } from '@learn/subject-chess/web/chess-pack.ts';
import { mathWeb } from '@learn/subject-math/web/math-pack.ts';
import { codingWeb } from '@learn/subject-coding/web/coding-pack.ts';
import { KIDS_APP_CONFIG } from '../../app-config.ts';

const FIXTURES_DIR = join(import.meta.dirname, '..', '..', '..', 'test-fixtures', 'storage');
const TAGS = ['v1.0.0', 'v1.1.0', 'v2.0.0'] as const;
/** The recorded export of the deployed multi-subject app at tag `m12.5`: chess, math and coding sections. */
const KIDS_M12_5 = 'kids-m12.5';

function readFixture(tag: string, name: string): string {
  return readFileSync(join(FIXTURES_DIR, tag, name), 'utf8');
}

/** The app's services over `localStorage`: both subjects, chess active. */
function kidsDeps(): AppDeps {
  return createServices([chessWeb, mathWeb], KIDS_APP_CONFIG, localStorage).deps;
}

/** The same with coding registered too (the three subjects of the recorded files: logic joined later, so no recorded file has a logic section): a backup file carries one section per subject. */
function allSubjectsDeps(): AppDeps {
  return createServices([chessWeb, mathWeb, codingWeb], KIDS_APP_CONFIG, localStorage).deps;
}

/** Imports a recorded backup file with every child's default choice (the Backup screen's own preselection). */
async function importRecorded(deps: AppDeps, tag: string, name: string): Promise<void> {
  const incoming = await parseBackupFile(deps, readFixture(tag, name));
  const plan = await planImport(deps, incoming);
  await importMerged(
    deps,
    incoming,
    plan.children.map((child) => child.defaultChoice),
  );
}

/** One device's own loadable state (what the parent area's own overview/report/backup screens all
 * read): the built backup file (every profile), the parent lock, and device-wide app settings
 * (which embed every profile's own `ProfileSettings`, `AppSettings.profileSettings`). */
interface DeviceSnapshot {
  readonly backup: BackupFile;
  readonly parentLock: ParentLock | undefined;
  readonly appSettings: AppSettings;
}

const MASK = '<masked>';

/** Masks the only two fields this app ever writes that are not a pure function of the stored data:
 * `exportedAt` (the real clock, a new value every run) and `deviceId` (a real random id, once
 * created) — everything else must match the fixture byte for byte. */
function maskSnapshot(snapshot: DeviceSnapshot): DeviceSnapshot {
  return {
    ...snapshot,
    backup: { ...snapshot.backup, exportedAt: MASK },
    appSettings: {
      ...snapshot.appSettings,
      ...(snapshot.appSettings.deviceId === undefined ? {} : { deviceId: MASK }),
    },
  };
}

async function snapshotOf(deps: AppDeps): Promise<DeviceSnapshot> {
  const profiles = await deps.profiles.list();
  const backup = await buildBackupFile(
    deps,
    profiles.map((profile) => profile.id),
  );
  const parentLock = await deps.parentLock.get();
  const appSettings = await deps.settings.get();
  return maskSnapshot({ backup, parentLock, appSettings });
}

/** Pretty-printed (`JSON.stringify(v, null, 1)`) so a diff here stays reviewable, same convention
 * as `packages/subject-chess/src/content/content-snapshot.test.ts`. */
function pretty(value: unknown): string {
  return `${JSON.stringify(value, null, 1)}\n`;
}

function snapshotFile(tag: string, name: string): string {
  return join('..', '..', '..', 'test-fixtures', 'storage', tag, name);
}

beforeEach(() => {
  localStorage.clear();
});

describe.each(TAGS)('storage compat: %s', (tag) => {
  it('imports backup-all.json into an empty device, as the chess subject', async () => {
    const deps = kidsDeps();
    await importRecorded(deps, tag, 'backup-all.json');

    const snapshot = await snapshotOf(deps);
    await expect(pretty(snapshot)).toMatchFileSnapshot(
      snapshotFile(tag, 'merged-into-empty.snap.json'),
    );
  });

  it('imports backup-all.json into a device that already holds the v2.0.0 backup', async () => {
    const deps = kidsDeps();
    await importRecorded(deps, 'v2.0.0', 'backup-all.json');
    await importRecorded(deps, tag, 'backup-all.json');

    const snapshot = await snapshotOf(deps);
    await expect(pretty(snapshot)).toMatchFileSnapshot(
      snapshotFile(tag, 'merged-into-v2.0.0.snap.json'),
    );
  });

  it('lands in the kids: layout: profiles shared, progress in kids-chess:, nothing in kids-math:', async () => {
    const deps = kidsDeps();
    await importRecorded(deps, tag, 'backup-all.json');

    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));
    expect(keys.filter((key) => key !== null && !/^kids(-chess|-math)?:/.test(key))).toEqual([]);
    expect(keys).toContain('kids:profiles');
    expect(keys).toContain('kids-chess:lesson-progress');
    const [first] = await deps.profiles.list();
    expect(await deps.subjectData?.math?.progress.listLessons(first?.id ?? '')).toEqual([]);
    expect(localStorage.getItem('kids:schema-version')).toBe(String(SCHEMA_VERSION));
    expect(localStorage.getItem('kids-chess:schema-version')).toBe(String(SCHEMA_VERSION));
  });
});

describe('storage compat: v2.0.0 share-mia.json', () => {
  it('imports as Mia with her progress in the chess subject only', async () => {
    const deps = kidsDeps();
    const incoming = await parseBackupFile(deps, readFixture('v2.0.0', 'share-mia.json'));
    expect(incoming.profiles.map((profile) => profile.nickname)).toEqual(['Mia']);

    const plan = await planImport(deps, incoming);
    await importMerged(
      deps,
      incoming,
      plan.children.map((child) => child.defaultChoice),
    );

    const [mia] = await deps.profiles.list();
    expect(mia?.nickname).toBe('Mia');
    const chess = deps.subjectData?.chess;
    const math = deps.subjectData?.math;
    expect((await chess?.progress.listLessons(mia?.id ?? ''))?.length).toBeGreaterThan(0);
    expect(await math?.progress.listLessons(mia?.id ?? '')).toEqual([]);
  });
});

describe(`storage compat: ${KIDS_M12_5} backup-all.json (chess + math demo + coding)`, () => {
  it('imports into an empty device, every subject section present', async () => {
    const deps = allSubjectsDeps();
    await importRecorded(deps, KIDS_M12_5, 'backup-all.json');

    const snapshot = await snapshotOf(deps);
    await expect(pretty(snapshot)).toMatchFileSnapshot(
      snapshotFile(KIDS_M12_5, 'merged-into-empty.snap.json'),
    );
  });

  it('imports into a device that already holds the v2.0.0 backup', async () => {
    const deps = allSubjectsDeps();
    await importRecorded(deps, 'v2.0.0', 'backup-all.json');
    await importRecorded(deps, KIDS_M12_5, 'backup-all.json');

    const snapshot = await snapshotOf(deps);
    await expect(pretty(snapshot)).toMatchFileSnapshot(
      snapshotFile(KIDS_M12_5, 'merged-into-v2.0.0.snap.json'),
    );
  });

  it("keeps each subject's progress in its own kids-<id>: store and nothing outside kids: / kids-<id>:", async () => {
    const deps = allSubjectsDeps();
    await importRecorded(deps, KIDS_M12_5, 'backup-all.json');

    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));
    expect(
      keys.filter((key) => key !== null && !/^kids(-chess|-math|-coding)?:/.test(key)),
    ).toEqual([]);
    for (const subject of ['chess', 'math', 'coding']) {
      expect(keys).toContain(`kids-${subject}:lesson-progress`);
      expect(keys).toContain(`kids-${subject}:concept-stats`);
    }

    const [mia] = await deps.profiles.list();
    expect(mia?.nickname).toBe('Mia');
    const profileId = mia?.id ?? '';
    const lessonIds = async (subject: string): Promise<readonly string[]> =>
      ((await deps.subjectData?.[subject]?.progress.listLessons(profileId)) ?? [])
        .map((progress) => progress.lessonId)
        .sort();
    expect((await lessonIds('chess')).length).toBe(1);
    expect(await lessonIds('math')).toEqual(['add-within-10', 'add-within-5', 'take-away']);
    expect(await lessonIds('coding')).toEqual(['seq-arrows', 'seq-order']);

    const math = deps.subjectData?.math;
    const parade = (await math?.progress.listMiniGames(profileId))?.find(
      (entry) => entry.miniGameId === 'number-parade',
    );
    expect(parade?.wins).toBeGreaterThanOrEqual(1);
    const mathBadges = (await math?.badges.listEarnedBadges(profileId))?.map(
      (badge) => badge.badgeId,
    );
    expect(mathBadges).toContain('first-sums');
    const mathStats = await math?.progress.listConceptStats(profileId);
    expect(mathStats?.map((stats) => stats.conceptId).sort()).toEqual([
      'add-within-10',
      'add-within-5',
      'take-away',
    ]);
    expect(mathStats?.every((stats) => stats.box !== undefined)).toBe(true);
    expect(mathStats?.some((stats) => (stats.box ?? 0) > 1)).toBe(true);
  });
});
