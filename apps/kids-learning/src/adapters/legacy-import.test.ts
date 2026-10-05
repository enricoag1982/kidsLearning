// Chess for Kids progress without a file (docs/multi-subject.md F1): the older app's `chess-kids:` keys, as recorded from the
// real v2.0.0 app (`test-fixtures/storage/v2.0.0/local-storage.json`, the same device as its `backup-all.json`), become the
// backup object that app would have exported, and the ordinary import lands it in the chess subject. The result must equal the
// recorded file's own import (`merged-into-empty.snap.json`, `storage-compat.test.ts`).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AppDeps } from '@learn/platform-core';
import { composeDefaultSettings } from '@learn/platform-core';
import { buildBackupFile, parseBackupFile } from '@learn/platform-core/backup';
import { importMerged, planImport } from '@learn/platform-core/merge';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildLegacyBackupFile,
  findLegacyImportOffer,
  importLegacyStore,
  readLegacyDecision,
} from '@learn/platform-web/adapters/legacy-import.ts';
import { createServices } from '@learn/platform-web/app/services.ts';
import { chessWeb } from '@learn/subject-chess/web/chess-pack.ts';
import { mathWeb } from '@learn/subject-math/web/math-pack.ts';
import { KIDS_APP_CONFIG } from '../app-config.ts';

const FIXTURE_DIR = join(import.meta.dirname, '..', '..', 'test-fixtures', 'storage', 'v2.0.0');

/** The v2.0.0 `chess-kids:*` keys exactly as that app stored them (raw strings). */
function chessKidsKeys(): Record<string, string> {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, 'local-storage.json'), 'utf8')) as Record<
    string,
    string
  >;
}

function seedChessKids(): Record<string, string> {
  const keys = chessKidsKeys();
  for (const [key, value] of Object.entries(keys)) localStorage.setItem(key, value);
  return keys;
}

const CODE = { parseBackupFile, planImport, importMerged };

function kidsDeps(): AppDeps {
  return createServices([chessWeb, mathWeb], KIDS_APP_CONFIG, localStorage).deps;
}

/** What the first run's screen passes: the composed default settings. */
function defaultsOf(deps: AppDeps): ReturnType<typeof composeDefaultSettings> {
  return composeDefaultSettings(deps.subject.settings);
}

/** What `storage-compat.test.ts` snapshots: the built backup file of every profile, `exportedAt` masked. */
async function maskedBackup(deps: AppDeps): Promise<unknown> {
  const profiles = await deps.profiles.list();
  const backup = await buildBackupFile(
    deps,
    profiles.map((profile) => profile.id),
  );
  return { ...backup, exportedAt: '<masked>' };
}

beforeEach(() => {
  localStorage.clear();
});

describe('Chess for Kids progress without a file (F1)', () => {
  it('finds the v2.0.0 store, offers it on an empty device, and builds its flat export (app chess-kids, both children)', async () => {
    seedChessKids();
    const deps = kidsDeps();

    const offer = await findLegacyImportOffer(localStorage, deps);
    expect(offer).toEqual({ appId: 'chess-kids', prefix: 'chess-kids:' });

    const file = buildLegacyBackupFile(
      localStorage,
      deps,
      offer ?? { appId: '', prefix: '' },
      defaultsOf(deps),
    ) as {
      app: string;
      schemaVersion: number;
      profiles: { nickname: string }[];
      data: Record<string, { lessonProgress: unknown[]; attempts: unknown[] }>;
    };
    expect(file.app).toBe('chess-kids');
    expect(file.profiles.map((profile) => profile.nickname)).toEqual(['Mia', 'Leo']);
    const recorded = JSON.parse(readFileSync(join(FIXTURE_DIR, 'backup-all.json'), 'utf8')) as {
      data: typeof file.data;
    };
    for (const [id, data] of Object.entries(recorded.data)) {
      expect(file.data[id]?.lessonProgress, id).toEqual(data.lessonProgress);
      expect(file.data[id]?.attempts, id).toEqual(data.attempts);
    }
  });

  it('importing it gives exactly what importing the recorded backup-all.json gives (the v2.0.0 snapshot), chess only', async () => {
    seedChessKids();
    const deps = kidsDeps();
    const offer = await findLegacyImportOffer(localStorage, deps);

    await importLegacyStore(
      localStorage,
      deps,
      offer ?? { appId: '', prefix: '' },
      defaultsOf(deps),
      CODE,
    );

    const recorded = JSON.parse(
      readFileSync(join(FIXTURE_DIR, 'merged-into-empty.snap.json'), 'utf8'),
    ) as { backup: unknown };
    expect(await maskedBackup(deps)).toEqual(recorded.backup);
    const [mia] = await deps.profiles.list();
    expect(await deps.subjectData?.math?.progress.listLessons(mia?.id ?? '')).toEqual([]);
    expect(readLegacyDecision(localStorage, deps.app)).toBe('done');
    expect(localStorage.getItem('kids:legacy-import')).toBe('"done"');
  });

  it('leaves every chess-kids: key exactly as it was (value and presence)', async () => {
    const before = seedChessKids();
    const deps = kidsDeps();
    const offer = await findLegacyImportOffer(localStorage, deps);

    await importLegacyStore(
      localStorage,
      deps,
      offer ?? { appId: '', prefix: '' },
      defaultsOf(deps),
      CODE,
    );

    const after = Object.fromEntries(
      Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index) ?? '')
        .filter((key) => key.startsWith('chess-kids:'))
        .map((key) => [key, localStorage.getItem(key)]),
    );
    expect(after).toEqual(before);
  });

  it('is never offered again after the import (the decision is stored), nor on a device that already has children', async () => {
    seedChessKids();
    const deps = kidsDeps();
    const offer = await findLegacyImportOffer(localStorage, deps);
    await importLegacyStore(
      localStorage,
      deps,
      offer ?? { appId: '', prefix: '' },
      defaultsOf(deps),
      CODE,
    );

    expect(await findLegacyImportOffer(localStorage, deps)).toBeUndefined();
  });
});
