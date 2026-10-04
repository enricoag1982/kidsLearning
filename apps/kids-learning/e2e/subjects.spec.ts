import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import {
  completeFirstRun,
  firstJourneyLesson,
  getSoleProfileId,
  openSubject,
  seedLessonMastered,
} from './helpers.ts';

/** The stars pill's accessible name ("N stars") on a subject's Home. */
async function starsLabel(page: Page): Promise<string | null> {
  const pill = page.locator('[aria-label$=" stars"]');
  await expect(pill).toBeVisible();
  return pill.getAttribute('aria-label');
}

/** Reload -> picker -> Mia -> the hub, left open (no subject tile tapped). */
async function reloadToHub(page: Page): Promise<void> {
  await page.reload();
  await page.getByRole('heading', { name: "Who's playing today?" }).waitFor();
  await page.getByRole('button', { name: /Mia/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'What shall we learn?' })).toBeVisible();
}

test.describe('Subjects: one profile, Chess, Math, Coding and Logic', () => {
  test('hub with all four subjects; progress is per subject; the hub marks the last subject after a reload', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await completeFirstRun(page, 'Mia'); // first run -> hub -> Chess -> Home

    // The hub shows all four subjects; Chess, just opened, is the active one.
    await page.getByRole('button', { name: 'Subjects', exact: true }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'What shall we learn?' }),
    ).toBeVisible();
    await expect(page.locator('[data-testid^="subject-tile-"]')).toHaveCount(4);
    await expect(page.getByTestId('subject-tile-chess')).toContainText('Chess');
    await expect(page.getByTestId('subject-tile-math')).toContainText('Math');
    await expect(page.getByTestId('subject-tile-coding')).toContainText('Coding');
    await expect(page.getByTestId('subject-tile-logic')).toContainText('Logic');
    await expect(page.getByTestId('subject-tile-chess')).toHaveAttribute('aria-current', 'true');
    await expect(page.getByTestId('subject-tile-math')).not.toHaveAttribute('aria-current');

    // A chess lesson's stars (seeded into the chess store; a reload makes the app read them).
    await openSubject(page, 'chess');
    const miaId = await getSoleProfileId(page);
    await seedLessonMastered(page, miaId, firstJourneyLesson());
    await reloadToHub(page);
    await openSubject(page, 'chess');
    const chessStars = await starsLabel(page);
    expect(chessStars).not.toBe('0 stars');

    // Math: its own Home, none of the chess stars.
    await openSubject(page, 'math', 'Math');
    await expect(page.getByRole('heading', { level: 1, name: 'Math', exact: true })).toBeVisible();
    expect(await starsLabel(page)).toBe('0 stars');

    // Back to Chess: its stars are back.
    await openSubject(page, 'chess');
    expect(await starsLabel(page)).toBe(chessStars);

    // After a reload the hub marks the last subject: Chess, then (after switching) Math.
    await reloadToHub(page);
    await expect(page.getByTestId('subject-tile-chess')).toHaveAttribute('aria-current', 'true');
    await expect(page.getByTestId('subject-tile-math')).not.toHaveAttribute('aria-current');

    await openSubject(page, 'math', 'Math');
    await reloadToHub(page);
    await expect(page.getByTestId('subject-tile-math')).toHaveAttribute('aria-current', 'true');
    await expect(page.getByTestId('subject-tile-chess')).not.toHaveAttribute('aria-current');
  });
});
