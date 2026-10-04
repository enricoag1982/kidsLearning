import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { completeFirstRun, openParentArea, pickProfileFromPicker } from './kit.ts';

/** The parsed contents of a saved backup file. */
function readBackup(path: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('backup is not a JSON object');
  }
  return parsed as Record<string, unknown>;
}

interface V6ProfileData {
  readonly settings: unknown;
  readonly sessionLogs: unknown;
  readonly subjects: { readonly math?: Record<string, unknown> };
}

/**
 * The file the math demo app (`app: 'math-demo'`, schema 5) would have exported for the same child: flat records beside
 * the shared part, one `add-within-5` lesson with stars (the demo's whole learning data lives in the file).
 */
function mathDemoFile(v6: Record<string, unknown>): Record<string, unknown> {
  const profiles = v6.profiles as readonly { readonly id: string }[];
  const data = v6.data as Readonly<Record<string, V6ProfileData>>;
  const flatData: Record<string, unknown> = {};
  for (const { id } of profiles) {
    const own = data[id];
    if (own === undefined) throw new Error(`no data for profile ${id}`);
    const stamp = '2026-01-10T10:00:00.000Z';
    flatData[id] = {
      settings: own.settings,
      sessionLogs: own.sessionLogs,
      lessonProgress: [
        {
          id: `legacy-lp-${id}`,
          profileId: id,
          lessonId: 'add-within-5',
          bestStars: { 'add5-01': 3, 'add5-02': 3 },
          bossStars: 0,
          resumeStep: 0,
          createdAt: stamp,
          updatedAt: stamp,
        },
      ],
      attempts: [],
      miniGameProgress: [],
      conceptStats: [],
      gameRecords: [],
      earnedBadges: [],
      assessmentResults: [],
      unlocks: [],
    };
  }
  return { ...v6, app: 'math-demo', schemaVersion: 5, data: flatData };
}

test.describe('Backup', () => {
  test('exports carry the app id; importing one back merges; a math-demo file (schema 5) imports into math', async ({
    page,
  }) => {
    // Playwright drives no OS share sheet: without navigator.share, "Send to other device" downloads.
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, 'share', { value: undefined, configurable: true });
      Object.defineProperty(window.navigator, 'canShare', { value: undefined, configurable: true });
    });
    await completeFirstRun(page, 'Mia');
    await page.getByRole('button', { name: 'Switch player' }).click();
    await openParentArea(page);
    await page.getByRole('button', { name: 'Backup' }).click();

    const [exported] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export all' }).click(),
    ]);
    expect(exported.suggestedFilename()).toMatch(/^kids-learning-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const exportedPath = await exported.path();
    expect(readBackup(exportedPath)).toMatchObject({ app: 'kids-learning', schemaVersion: 6 });

    const [shared] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Send to other device' }).click(),
    ]);
    expect(shared.suggestedFilename()).toMatch(/^kids-learning-all-\d{4}-\d{2}-\d{2}\.json$/);
    expect(readBackup(await shared.path())).toMatchObject({ app: 'kids-learning' });

    // The same device's own file: the child is recognised, so it merges with no choice to make.
    await page.getByLabel('Choose file').setInputFiles(exportedPath);
    await page.getByText(/^1 child$/).waitFor();
    await page.getByText('Merging into Mia').waitFor();
    await page.getByRole('button', { name: 'Merge' }).click();
    await page.getByText('Import complete.').waitFor();

    // A file the math demo app made (schema 5, its own app id): same child, its lesson stars import into math.
    const legacy = mathDemoFile(readBackup(exportedPath));
    await page.getByLabel('Choose file').setInputFiles({
      name: 'math-demo-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(legacy)),
    });
    await page.getByText(/^1 child$/).waitFor();
    await page.getByText('Merging into Mia').waitFor();
    await page.getByRole('button', { name: 'Merge' }).click();
    await page.getByText('Import complete.').waitFor();

    await page.getByRole('button', { name: 'Back' }).click(); // backup -> overview
    await page.getByRole('button', { name: 'Done' }).click(); // -> picker
    await pickProfileFromPicker(page, 'Mia');
    await expect(page.locator('[aria-label$=" stars"]')).toHaveAttribute(
      'aria-label',
      /^(?!0 stars$).+/,
    );

    // A file of any other app is rejected.
    await page.getByRole('button', { name: 'Switch player' }).click();
    await openParentArea(page);
    await page.getByRole('button', { name: 'Backup' }).click();
    await page.getByLabel('Choose file').setInputFiles({
      name: 'other-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ ...readBackup(exportedPath), app: 'other-app' })),
    });
    await page.getByText('Not a valid backup file.').waitFor();
    await expect(page.getByRole('button', { name: 'Merge' })).toHaveCount(0);
  });
});
