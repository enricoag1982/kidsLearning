import { expect, test } from '@playwright/test';
import {
  completeExercise,
  completeFirstRun,
  contentText,
  findLesson,
  findMiniGame,
  interpolate,
  openJourneyWorld,
  playRounds,
  seedMiniGamesWonAndReopen,
  startToday,
  worldBossNodeName,
} from './kit.ts';

const WORLD_1 = ['seq-order', 'seq-arrows', 'seq-collect', 'seq-debug'];
const WORLD_2 = ['loop-pattern', 'loop-repeat', 'loop-chunk', 'loop-debug'];

test.describe('World 2, lesson 2: Repeat N', () => {
  test('build the first Repeat with the tray, then play the whole lesson end to end', async ({
    page,
  }) => {
    // Story, demo, 2 guided tries and 6 scored exercises; every run animated at its real pace (a repeat runs its body each time).
    test.setTimeout(240_000);
    const lesson = findLesson('loop-repeat');

    // World 1 and its boss are behind the child, and so is the first lesson of World 2: Today offers Repeat N.
    await completeFirstRun(page, 'Mia');
    await seedMiniGamesWonAndReopen(page, 'Mia', [...WORLD_1, 'loop-pattern'].map(findLesson), [
      'bug-squash',
    ]);
    await startToday(page);

    // The first guided try, built by hand: Repeat, an arrow inside it, the count.
    const [first, ...otherGuided] = lesson.guided;
    if (first?.type !== 'program') throw new Error('loop-repeat starts with a program');
    await expect(page.getByText(contentText(first.textKey))).toBeVisible();
    await page
      .getByRole('button', { name: contentText('coding.tiles.repeat-new'), exact: true })
      .click();
    await page
      .getByRole('button', { name: contentText('coding.tiles.right'), exact: true })
      .click();
    const timesLabel = (times: number): string =>
      interpolate(contentText('coding.strip.times'), { n: 1, times });
    await expect(page.getByRole('button', { name: timesLabel(3), exact: true })).toBeVisible();
    await page.getByRole('button', { name: timesLabel(3), exact: true }).click();
    await expect(page.getByRole('button', { name: timesLabel(4), exact: true })).toBeVisible();
    await page
      .getByRole('button', { name: contentText('coding.buttons.run'), exact: true })
      .click();
    await expect(page.getByRole('button', { name: /^Next/ })).toBeVisible();
    await page.getByRole('button', { name: /^Next/ }).click();

    // The other guided try and every scored exercise, each solved from its kind's solution (a repeat built through the tray).
    for (const exercise of otherGuided) await completeExercise(page, exercise, true);
    for (const exercise of lesson.exercises) await completeExercise(page, exercise);

    await expect(page.getByRole('heading', { name: 'Lesson complete!' })).toBeVisible();
    await expect(page.getByText(/^\+\d+ stars$/)).toBeVisible();
  });
});

test.describe('World 2 boss', () => {
  test('Fence Builder is the Journey boss node once all four lessons are mastered; winning it marks the node won', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const boss = findMiniGame('fence-builder');

    // Every earlier lesson is mastered and World 1's boss is won: World 2 is open, and its four lessons are done.
    await completeFirstRun(page, 'Mia');
    await seedMiniGamesWonAndReopen(page, 'Mia', [...WORLD_1, ...WORLD_2].map(findLesson), [
      'bug-squash',
    ]);
    await page.getByRole('button', { name: /Journey/ }).click();
    await page.getByRole('button', { name: worldBossNodeName(boss, 'available') }).click();
    await playRounds(page, boss, boss.rounds.length);
    await page.getByRole('button', { name: contentText('play.back-to-journey') }).click();
    // World 2 is finished, so the Journey moves on to World 3: its boss node is on World 2's own tab.
    await openJourneyWorld(page, 2, 'looping-hills');
    await expect(page.getByRole('button', { name: worldBossNodeName(boss, 'won') })).toBeVisible();
  });
});
