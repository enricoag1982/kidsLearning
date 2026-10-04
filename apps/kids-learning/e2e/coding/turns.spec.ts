import { expect, test } from '@playwright/test';
import {
  completeExercise,
  completeFirstRun,
  contentText,
  findLesson,
  findMiniGame,
  openJourneyWorld,
  playRounds,
  seedMiniGamesWonAndReopen,
  startToday,
  worldBossNodeName,
} from './kit.ts';

const WORLD_1 = ['seq-order', 'seq-arrows', 'seq-collect', 'seq-debug'];
const WORLD_2 = ['loop-pattern', 'loop-repeat', 'loop-chunk', 'loop-debug'];
const WORLD_3 = ['turn-facing', 'turn-build', 'turn-loop', 'turn-jump', 'turn-debug'];

test.describe('World 3, lesson 2: Forward and turn', () => {
  test('relative tiles move Fox by its own heading: the board shows it, the programs are built from forward and the turns', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const lesson = findLesson('turn-build');

    // Worlds 1 and 2 and their bosses are behind the child, and so is the first lesson of World 3: Today offers Forward and turn.
    await completeFirstRun(page, 'Mia');
    await seedMiniGamesWonAndReopen(
      page,
      'Mia',
      [...WORLD_1, ...WORLD_2, 'turn-facing'].map(findLesson),
      ['bug-squash', 'fence-builder'],
    );
    await startToday(page);

    // The first guided try faces right: the board names Fox's heading, and turn right, forward, forward solves it.
    const [first, second] = lesson.guided;
    if (first?.type !== 'program' || second === undefined)
      throw new Error('turn-build guided tries');
    await expect(page.getByText(contentText(first.textKey))).toBeVisible();
    await expect(page.getByRole('img', { name: /Fox, facing right/ })).toBeVisible();
    await expect(page.getByTestId('grid-actor-heading')).toBeVisible();
    await completeExercise(page, first, true);
    await completeExercise(page, second, true);

    // Two scored programs: Fox faces up, then left; each solved with the tray's relative tiles.
    const [up, left] = lesson.exercises;
    if (up?.type !== 'program' || left?.type !== 'program') throw new Error('turn-build exercises');
    await expect(page.getByRole('img', { name: /Fox, facing up/ })).toBeVisible();
    await completeExercise(page, up);
    await expect(page.getByRole('img', { name: /Fox, facing left/ })).toBeVisible();
    for (const label of ['forward', 'turn-left', 'turn-right']) {
      await expect(
        page.getByRole('button', { name: contentText(`coding.tiles.${label}`), exact: true }),
      ).toBeVisible();
    }
    await completeExercise(page, left);
    await expect(page.getByText(contentText(lesson.exercises[2]?.textKey ?? ''))).toBeVisible();
  });
});

test.describe('World 3 boss', () => {
  test('Left-Right Rescue is the Journey boss node once all five lessons are mastered; winning it marks the node won', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const boss = findMiniGame('left-right-rescue');

    // Every earlier lesson is mastered and the bosses of Worlds 1 and 2 are won: World 3 is open, and its five lessons are done.
    await completeFirstRun(page, 'Mia');
    await seedMiniGamesWonAndReopen(
      page,
      'Mia',
      [...WORLD_1, ...WORLD_2, ...WORLD_3].map(findLesson),
      ['bug-squash', 'fence-builder'],
    );
    await page.getByRole('button', { name: /Journey/ }).click();
    await page.getByRole('button', { name: worldBossNodeName(boss, 'available') }).click();
    await playRounds(page, boss, boss.rounds.length);
    await page.getByRole('button', { name: contentText('play.back-to-journey') }).click();
    // Every world is finished, so the Journey opens on World 1: World 3's boss node is on its own tab.
    await openJourneyWorld(page, 3, 'turning-woods');
    await expect(page.getByRole('button', { name: worldBossNodeName(boss, 'won') })).toBeVisible();
  });
});
