import { expect, test } from '@playwright/test';
import { pickProfileFromPicker } from './helpers.ts';

test.describe('Profiles, first run and parent area', () => {
  test('fresh install → first run → Home; reload → picker → Home; lockout → parent area → add child', async ({
    page,
  }) => {
    // Fake timers from the start, so the 5-wrong-attempts lockout can be skipped instantly below
    // without a real 60s wait (non-functional.md §3).
    await page.clock.install();
    await page.goto('/');

    // First run: Welcome.
    await page.getByRole('button', { name: 'Start setup' }).click();

    // First run: parent password.
    await page.getByLabel('Parent code', { exact: true }).fill('1234');
    await page.getByLabel('Repeat parent code').fill('1234');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Save parent code' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('kids-learning-parent-code.txt');

    // First run: Saved.
    await expect(page.getByText('Parent code saved!')).toBeVisible();
    await expect(page.getByText('kids-learning-parent-code.txt')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();

    // New player: nickname, then avatar.
    await page.getByPlaceholder('Your name').fill('Mia');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Pick your animal!')).toBeVisible();
    await page.getByRole('button', { name: 'Fox' }).click();
    await page.getByRole('button', { name: "Let's play!" }).click();

    // The subjects hub (two subjects): Chess.
    await expect(
      page.getByRole('heading', { level: 1, name: 'What shall we learn?' }),
    ).toBeVisible();
    await expect(page.getByTestId('subject-tile-chess')).toBeVisible();
    await expect(page.getByTestId('subject-tile-math')).toBeVisible();
    await expect(page.getByTestId('subject-tile-coding')).toBeVisible();
    await expect(page.getByTestId('subject-tile-logic')).toBeVisible();
    await page.getByTestId('subject-tile-chess').click();

    // Offered on the first entry into a fresh subject; declines it here (Home shows Mia).
    await expect(
      page.getByText("Already know some chess? Let's find out where to start you!"),
    ).toBeVisible();
    await page.getByRole('button', { name: 'No, start at World 1' }).click();

    // Home shows Mia.
    await expect(page.getByRole('heading', { level: 1, name: 'Chess' })).toBeVisible();
    await expect(page.getByText('Mia')).toBeVisible();

    // Reload → picker (app start always shows it once a parent lock exists) → Mia → hub → Chess → Home.
    await page.reload();
    await expect(page.getByRole('heading', { name: "Who's playing today?" })).toBeVisible();
    await pickProfileFromPicker(page, 'Mia');
    await expect(page.getByRole('heading', { level: 1, name: 'Chess' })).toBeVisible();

    // Grown-ups: 5 wrong attempts locks the gate with a countdown.
    await page.getByRole('button', { name: 'Switch player' }).click();
    await page.getByRole('button', { name: /Grown-ups/ }).click();
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await page.getByLabel('Parent code', { exact: true }).fill('nope');
      await page.getByRole('button', { name: 'Open' }).click();
      await expect(page.getByText(`Wrong parent code (${String(attempt)} of 5)`)).toBeVisible();
    }
    await page.getByLabel('Parent code', { exact: true }).fill('nope');
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByText(/Try again in \d:\d\d/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open' })).toBeDisabled();

    // Skip the 1-minute wait, then the right password opens the parent area.
    await page.clock.fastForward('01:01');
    await expect(page.getByRole('button', { name: 'Open' })).toBeEnabled();
    await page.getByLabel('Parent code', { exact: true }).fill('1234');
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByRole('heading', { name: 'Parent area' })).toBeVisible();

    // Add child "Leo" from the parent area (stays in the parent area, does not switch player).
    await page.getByRole('button', { name: 'Add child' }).click();
    await page.getByPlaceholder('Your name').fill('Leo');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Pick your animal!')).toBeVisible();
    await page.getByRole('button', { name: "Let's play!" }).click();
    await expect(page.getByRole('heading', { name: 'Parent area' })).toBeVisible();
    await expect(page.getByText('Leo')).toBeVisible();

    // Done → picker shows both children.
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByRole('heading', { name: "Who's playing today?" })).toBeVisible();
    await expect(page.getByRole('button', { name: /Mia/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Leo/ })).toBeVisible();
  });
});
