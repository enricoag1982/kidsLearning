// With the four lessons of World 1 mastered the Pattern Train is the world boss: five rounds (the next token, the missing one, the
// next number, the next picture, a far place), then won.
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
} from './kit.ts';

const LESSONS = worldLessons('pattern-pond');
const boss = findMiniGame('pattern-train');

test.describe('World 1 boss: Pattern Train', () => {
  test('the Pattern Train is the world boss: five rounds on the pattern cards, then won', async ({
    page,
  }) => {
    expect(LESSONS).toHaveLength(4);
    expect(boss.rounds).toHaveLength(5);
    await completeFirstRun(page, 'Kid');
    await seedMasteredAndReopen(page, 'Kid', LESSONS, []);

    await page.getByRole('button', { name: /Journey/ }).click();
    await page.getByRole('button', { name: worldBossNodeName(boss, 'available') }).click();
    const [firstRound] = boss.rounds;
    if (firstRound === undefined) throw new Error('no round');
    await expect(page.getByText(contentText(firstRound.textKey), { exact: true })).toBeVisible();
    await playSeries(page, boss);
    await page.getByRole('button', { name: contentText('play.back-to-journey') }).click();
    // World 1 is finished: its won boss node is on its own tab.
    await openJourneyWorld(page, 1, 'pattern-pond');
    await expect(page.getByRole('button', { name: worldBossNodeName(boss, 'won') })).toBeVisible();

    expect(await readMiniGameProgress(page, 'pattern-train')).toMatchObject({ plays: 1, wins: 1 });
  });
});
