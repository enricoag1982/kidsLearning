// With the five lessons of World 2 mastered (and World 1 behind the child) the Sorting Sprint is the world boss: five rounds (the odd
// one out, the rule, two boxes, the Carroll table, the Venn), then won.
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

const WORLD_TWO = worldLessons('sort-shore');
const BEFORE = worldsBefore('sort-shore');
const boss = findMiniGame('sorting-sprint');

test.describe('World 2 boss: Sorting Sprint', () => {
  test('the Sorting Sprint is the world boss: five rounds on the odd-one, rule, box, Carroll and Venn cards, then won', async ({
    page,
  }) => {
    expect(WORLD_TWO).toHaveLength(5);
    expect(boss.rounds).toHaveLength(5);
    await completeFirstRun(page, 'Kid');
    await seedMasteredAndReopen(page, 'Kid', [...BEFORE.lessons, ...WORLD_TWO], BEFORE.bosses);

    await page.getByRole('button', { name: /Journey/ }).click();
    await page.getByRole('button', { name: worldBossNodeName(boss, 'available') }).click();
    const [firstRound] = boss.rounds;
    if (firstRound === undefined) throw new Error('no round');
    await expect(page.getByText(contentText(firstRound.textKey), { exact: true })).toBeVisible();
    await playSeries(page, boss);
    await page.getByRole('button', { name: contentText('play.back-to-journey') }).click();
    // World 2 is finished: its won boss node is on its own tab.
    await openJourneyWorld(page, 2, 'sort-shore');
    await expect(page.getByRole('button', { name: worldBossNodeName(boss, 'won') })).toBeVisible();

    expect(await readMiniGameProgress(page, 'sorting-sprint')).toMatchObject({
      plays: 1,
      wins: 1,
    });
  });
});
