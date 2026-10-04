// Race to 20 in the deployed math app: the world boss of World 3, Times-Table Forest. With every earlier world (lessons and bosses, as
// the content has them) and the six times-table lessons mastered, its Journey node opens the duel, played through the real UI with the
// platform duel driver (a best move every kid turn). The bot is the Hedgehog, the character of mt-7-mixed. Chromium only, like the
// other math specs.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { race } from '@learn/subject-math';
import type { RaceState } from '@learn/subject-math';
import {
  completeFirstRun,
  contentText,
  findDuel,
  playDuel,
  readMiniGameProgress,
  seedMasteredAndReopen,
  openJourneyWorld,
  worldBossNodeName,
  worldLessons,
  worldsBefore,
} from './kit.ts';

const NICKNAME = 'Kid';
const FOREST = 'times-forest';
const duel = findDuel('race-to-20');

/**
 * Fresh install, then the way the app reaches the game: the lessons and world bosses of every earlier world and the six lessons of the
 * forest seeded as mastered, the Journey opened on the forest, and the world boss node (Race to 20) tapped.
 */
async function openRaceFromJourney(page: Page): Promise<void> {
  await completeFirstRun(page, NICKNAME);
  const before = worldsBefore(FOREST);
  await seedMasteredAndReopen(
    page,
    NICKNAME,
    [...before.lessons, ...worldLessons(FOREST)],
    before.bosses,
  );
  await page.getByRole('button', { name: /Journey/ }).click();
  await page.getByRole('button', { name: worldBossNodeName(duel, 'available') }).click();
  await expect(
    page.getByRole('heading', { name: contentText(duel.titleKey), level: 2 }),
  ).toBeVisible();
}

/** The earned stars on the result panel (the filled ones animate in). */
function earnedStars(page: Page) {
  return page.getByTestId('stars-row').locator('.reward-star-pop');
}

test.describe('Race to 20', () => {
  test('the world boss of Times-Table Forest: Hedgie opens, the kid lands on 4, 8, 12, 16 and wins with 3 stars; the node is won', async ({
    page,
  }) => {
    await openRaceFromJourney(page);

    // The bot moves first, from 0 (where the mover loses); the kid's step buttons open on its turn.
    await expect(page.getByTestId('duel-turn')).toHaveText("Hedgie's turn");
    await expect(page.locator('[data-duel-turn="kid"]')).toBeVisible();
    await expect(page.getByTestId('race-line')).toContainText('Hedgie adds');
    for (const step of [1, 2, 3]) {
      await expect(page.getByRole('button', { name: `+${String(step)}` })).toBeEnabled();
    }

    await playDuel(page, duel);

    await expect(page.locator('[data-duel-status="won"]')).toBeVisible();
    await expect(page.getByText(contentText('boss.duel.won'))).toBeVisible();
    await expect(page.locator('[data-token="true"]')).toHaveAttribute('data-stone', '20');
    await expect(earnedStars(page)).toHaveCount(3);

    // Saved with the result panel's button, not before; the Journey (open on the first world, all being done) shows the boss as won.
    await page.getByRole('button', { name: contentText('play.back-to-journey') }).click();
    await openJourneyWorld(page, 3, FOREST);
    await expect(page.getByRole('button', { name: worldBossNodeName(duel, 'won') })).toBeVisible();
    expect(await readMiniGameProgress(page, 'race-to-20')).toEqual({
      bestStars: 3,
      plays: 1,
      wins: 1,
    });
  });

  test('a Hint makes the best step glow and costs a star: 2 stars', async ({ page }) => {
    await openRaceFromJourney(page);
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
    await page.getByRole('button', { name: contentText('play.back-to-journey') }).click();
    expect(await readMiniGameProgress(page, 'race-to-20')).toMatchObject({
      bestStars: 2,
      wins: 1,
    });
  });
});
