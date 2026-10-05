// With the five lessons of World 3 mastered Sudoku Sprint is the world boss: five rounds (last cell, only place, only number, two
// 6 x 6 grids) filled with the grid-fill driver, then won.
import { expect, test } from '@playwright/test';
import {
  completeFirstRun,
  contentText,
  findMiniGame,
  openJourneyWorld,
  playSeries,
  readMiniGameProgress,
  seedMasteredAndReopen,
  worldBossNodeName,
  worldLessons,
  worldsBefore,
} from './kit.ts';

const WORLD = 'grid-puzzles';
const LESSONS = worldLessons(WORLD);
const BEFORE = worldsBefore(WORLD);
const boss = findMiniGame('sudoku-sprint');

test.describe('World 3 boss: Sudoku Sprint', () => {
  test('Sudoku Sprint is the world boss: five grids, then won', async ({ page }) => {
    expect(LESSONS).toHaveLength(5);
    expect(boss.rounds).toHaveLength(5);
    await completeFirstRun(page, 'Kid');
    await seedMasteredAndReopen(page, 'Kid', [...BEFORE.lessons, ...LESSONS], BEFORE.bosses);

    await page.getByRole('button', { name: /Journey/ }).click();
    await page.getByRole('button', { name: worldBossNodeName(boss, 'available') }).click();
    const [firstRound] = boss.rounds;
    if (firstRound === undefined) throw new Error('no round');
    await expect(
      page.getByText(contentText(firstRound.textKey), { exact: true }).first(),
    ).toBeVisible();
    await playSeries(page, boss);
    await page.getByRole('button', { name: contentText('play.back-to-journey') }).click();
    // World 3 is finished: its won boss node is on its own tab.
    await openJourneyWorld(page, 3, WORLD);
    await expect(page.getByRole('button', { name: worldBossNodeName(boss, 'won') })).toBeVisible();

    expect(await readMiniGameProgress(page, 'sudoku-sprint')).toMatchObject({ plays: 1, wins: 1 });
  });
});
