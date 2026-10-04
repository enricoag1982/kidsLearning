// Snapshot rule (docs/refactor-v4.md R0 "storage-compat fixtures"): this spec's own expectations
// change ONLY when the storage/backup format or these screens' contracts change on purpose.
//
// Since m11.6 (docs/multi-subject.md D3) the app reads no `chess-kids:` localStorage, so the recorded
// `local-storage.json` dumps are not replayed any more: what a returning chess user does is import the
// backup file of the old app, which lands in the chess subject (`AppConfig.legacyBackupApps`).
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import {
  completeFirstRun,
  findLesson,
  journeyNodeName,
  openParentArea,
  pickProfileFromPicker,
} from './helpers.ts';

const FIXTURES_DIR = join(import.meta.dirname, '..', 'test-fixtures', 'storage');
const TAGS = ['v1.0.0', 'v1.1.0', 'v2.0.0'] as const;

for (const tag of TAGS) {
  test(`storage compat smoke: ${tag} backup file imports into the chess subject`, async ({
    page,
  }) => {
    test.setTimeout(30_000);

    // A fresh device with its own child; the old app's file brings Mia and Leo.
    await completeFirstRun(page, 'Kid');
    await page.getByRole('button', { name: 'Switch player' }).click();
    await openParentArea(page);
    await page.getByRole('button', { name: 'Backup' }).click();
    await page.getByLabel('Choose file').setInputFiles(join(FIXTURES_DIR, tag, 'backup-all.json'));

    // The file's own app id (`chess-kids`) is accepted: a plan with both fixture children, no error.
    await expect(page.getByText(/^2 children$/)).toBeVisible();
    await page.getByRole('button', { name: 'Merge' }).click();
    await page.getByText('Import complete.').waitFor();
    await page.getByRole('button', { name: 'Back' }).click(); // backup -> overview
    await expect(page.getByRole('button', { name: /^Mia/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Leo/ })).toBeVisible();
    await page.getByRole('button', { name: 'Done' }).click();

    // Picker shows both fixture children. Pick Mia -> hub -> Chess -> Home shows her Continue (she has
    // one lesson left mid-way, `resumeStep > 0`) and her stars pill above zero (3 lessons mastered for
    // real, per the fixture).
    await expect(page.getByRole('button', { name: /Mia/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Leo/ })).toBeVisible();
    await pickProfileFromPicker(page, 'Mia');
    await expect(page.getByRole('heading', { level: 1, name: 'Chess' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue/ })).toBeVisible();
    const starsPill = page.locator('[aria-label$=" stars"]');
    await expect(starsPill).toHaveAttribute('aria-label', /^(?!0 stars$).+/);

    // Journey: the fixture's own in-progress lesson (World 2's Rook) shows as her current lesson —
    // only true once World 1's 3 lessons the fixture completed are recognised as mastered.
    await page.getByRole('button', { name: /Journey/ }).click();
    const rook = findLesson('rook');
    await expect(
      page.getByRole('button', { name: journeyNodeName(rook, 'current') }),
    ).toBeVisible();
  });
}
