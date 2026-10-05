import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { findLesson, journeyNodeName, pickProfileFromPicker } from './helpers.ts';

const FIXTURES_DIR = join(import.meta.dirname, '..', 'test-fixtures', 'storage');

test.describe('Chess for Kids progress without a file (F1)', () => {
  test('first run on a device with the older app’s store: Yes brings Mia and Leo, Chess shows her progress', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    // The v2.0.0 app's `chess-kids:*` keys, as that app stored them, are on this origin before the first run.
    const keys = JSON.parse(
      readFileSync(join(FIXTURES_DIR, 'v2.0.0', 'local-storage.json'), 'utf8'),
    ) as Record<string, string>;
    await page.addInitScript((entries) => {
      for (const [key, value] of Object.entries(entries)) {
        if (window.localStorage.getItem(key) === null) window.localStorage.setItem(key, value);
      }
    }, keys);

    await page.goto('/');
    await page.getByRole('button', { name: 'Start setup' }).click();
    await page.getByLabel('Parent code', { exact: true }).fill('1234');
    await page.getByLabel('Repeat parent code').fill('1234');
    await page.getByRole('button', { name: 'Save parent code' }).click();
    await page.getByRole('button', { name: 'Next' }).click(); // Saved -> the offer

    await expect(
      page.getByText('Found chess progress from Chess for Kids on this device. Bring it here?'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Yes', exact: true }).click();

    // Both children arrive, none was created by hand.
    await expect(page.getByRole('button', { name: /Mia/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Leo/ })).toBeVisible();

    // Mia -> hub -> Chess: her Continue, stars above zero and her in-progress Rook lesson (as the file import in
    // `storage-compat.spec.ts`).
    await pickProfileFromPicker(page, 'Mia');
    await expect(page.getByRole('heading', { level: 1, name: 'Chess' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue/ })).toBeVisible();
    await expect(page.locator('[aria-label$=" stars"]')).toHaveAttribute(
      'aria-label',
      /^(?!0 stars$).+/,
    );
    await page.getByRole('button', { name: /Journey/ }).click();
    await expect(
      page.getByRole('button', { name: journeyNodeName(findLesson('rook'), 'current') }),
    ).toBeVisible();

    // Answered once: the store is only read (its keys stay), the answer is kept, a restart does not ask again.
    const state = await page.evaluate(() => ({
      answer: window.localStorage.getItem('kids:legacy-import'),
      older: window.localStorage.getItem('chess-kids:profiles'),
    }));
    expect(state.answer).toBe('"done"');
    expect(state.older).toBe(keys['chess-kids:profiles']);
    await page.reload();
    await expect(page.getByRole('heading', { name: "Who's playing today?" })).toBeVisible();
    await expect(page.getByText(/Found chess progress/)).toHaveCount(0);
  });
});
