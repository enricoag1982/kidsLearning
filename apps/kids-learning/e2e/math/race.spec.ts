// Race to 20 in the deployed math app: the duel mini-game the Today session offers once Take away is done (it becomes the W3 world boss
// in m13.14), played through the real UI with the platform duel driver (a best move every kid turn). Chromium only, like the other
// math specs.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { race } from '@learn/subject-math';
import type { RaceState } from '@learn/subject-math';
import {
  completeFirstRun,
  contentText,
  dismissCelebrationIfShown,
  findDuel,
  findLesson,
  findMiniGame,
  playDuel,
  playLesson,
  playSeries,
  playWarmUp,
  readMiniGameProgress,
  seedMasteredAndReopen,
} from './kit.ts';

const NICKNAME = 'Kid';
const duel = findDuel('race-to-20');
const takeAway = findLesson('take-away');

/**
 * Fresh install, then the way the app reaches the game today: the first two lessons seeded as mastered, Take away played through
 * "Start today" (that session was planned before Take away was done, so it holds the lesson only), and the next "Start today" plans
 * the world boss (Number Parade) and then Race to 20 as the session's mini-game. The Number Parade is played through, so the
 * session lands on the duel.
 */
async function openRaceFromToday(page: Page): Promise<void> {
  await completeFirstRun(page, NICKNAME);
  await seedMasteredAndReopen(
    page,
    NICKNAME,
    [findLesson('add-within-5'), findLesson('add-within-10')],
    [],
  );

  await page.getByRole('button', { name: /Start/ }).click();
  await page.getByRole('button', { name: /Let me try/ }).click(); // Story -> Demo
  await page.getByRole('button', { name: /^Next/ }).click(); // Demo -> first guided try
  await playLesson(page, takeAway);
  await expect(page.getByRole('heading', { name: 'Lesson complete!' })).toBeVisible();
  await dismissCelebrationIfShown(page);
  await page.getByRole('button', { name: /Continue/ }).click();
  await page.getByRole('button', { name: 'Done' }).click();

  await page.getByRole('button', { name: /Start/ }).click();
  // Take away's concept is due at once: the session opens with one warm-up task from it.
  await playWarmUp(page, takeAway.exercises, /^Round 1 of/);
  await playSeries(page, findMiniGame('number-parade'));
  await page.getByRole('button', { name: /Continue/ }).click();
  await dismissCelebrationIfShown(page);
  await expect(
    page.getByRole('heading', { name: contentText(duel.titleKey), level: 2 }),
  ).toBeVisible();
}

/** The earned stars on the result panel (the filled ones animate in). */
function earnedStars(page: Page) {
  return page.getByTestId('stars-row').locator('.reward-star-pop');
}

test.describe('Race to 20', () => {
  test('the session offers it after Take away: the bot opens, the kid lands on 4, 8, 12, 16 and wins with 3 stars', async ({
    page,
  }) => {
    await openRaceFromToday(page);

    // The bot moves first, from 0 (where the mover loses); the kid's step buttons open on its turn.
    await expect(page.getByTestId('duel-turn')).toHaveText("Owl's turn");
    await expect(page.locator('[data-duel-turn="kid"]')).toBeVisible();
    await expect(page.getByTestId('race-line')).toContainText('Owl adds');
    for (const step of [1, 2, 3]) {
      await expect(page.getByRole('button', { name: `+${String(step)}` })).toBeEnabled();
    }

    await playDuel(page, duel);

    await expect(page.locator('[data-duel-status="won"]')).toBeVisible();
    await expect(page.getByText(contentText('boss.duel.won'))).toBeVisible();
    await expect(page.locator('[data-token="true"]')).toHaveAttribute('data-stone', '20');
    await expect(earnedStars(page)).toHaveCount(3);

    // Saved with the result panel's Continue (the session's next step), not before.
    await page.getByRole('button', { name: /Continue/ }).click();
    await expect(page.getByText('Great session!')).toBeVisible();
    expect(await readMiniGameProgress(page, 'race-to-20')).toEqual({
      bestStars: 3,
      plays: 1,
      wins: 1,
    });
  });

  test('a Hint makes the best step glow and costs a star: 2 stars', async ({ page }) => {
    await openRaceFromToday(page);
    await page.locator('[data-duel-turn="kid"]').waitFor();

    await page.getByRole('button', { name: 'Hint' }).click();
    const glowing = page.locator('[data-hint="true"]');
    await expect(glowing).toHaveCount(1);
    await expect(page.getByText(contentText('lessons:race.hint'))).toBeVisible();
    const state = JSON.parse(
      (await page.locator('[data-duel-state]').getAttribute('data-duel-state')) ?? 'null',
    ) as RaceState;
    expect(await glowing.getAttribute('data-move')).toBe(JSON.stringify(race.bestMoves(state)[0]));

    await playDuel(page, duel);

    await expect(page.locator('[data-duel-status="won"]')).toBeVisible();
    await expect(earnedStars(page)).toHaveCount(2);
    await page.getByRole('button', { name: /Continue/ }).click();
    expect(await readMiniGameProgress(page, 'race-to-20')).toMatchObject({
      bestStars: 2,
      wins: 1,
    });
  });
});
