// World 2, Mental Math Mountain, on the Journey of the deployed app: open once World 1 and the Number Train are behind the child, the
// bridging lesson played end to end, a wrong answer that matches a known bug of a story problem (wrong-op) speaking its reason, and Market
// Orders reached as the world boss and played round by round.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { MathLesson } from '@learn/subject-math';
import {
  completeExercise,
  completeFirstRun,
  contentText,
  dismissCelebrationIfShown,
  findLesson,
  findMiniGame,
  journeyNodeName,
  openJourneyWorld,
  performActions,
  playLesson,
  playSeries,
  readMiniGameProgress,
  seedMasteredAndReopen,
  solutionActionsOf,
  typedNumber,
  worldBossNodeName,
  worldLessons,
} from './kit.ts';

const WORLD_ONE = worldLessons('number-meadow');
const WORLD_TWO = worldLessons('mental-mountain');
const NUMBER_TRAIN = 'number-train';
const orders = findMiniGame('market-orders');

/** From the Journey: opens `lesson`'s current node and goes through its story and demo to the first guided try. */
async function openLessonFromJourney(page: Page, lesson: MathLesson): Promise<void> {
  await page.getByRole('button', { name: journeyNodeName(lesson, 'current') }).click();
  await page.getByRole('button', { name: /Let me try/ }).click(); // Story -> Demo
  await page.getByRole('button', { name: /^Next/ }).click(); // Demo -> first guided try
}

/** A fresh install whose child finished World 1 (its five lessons and the Number Train) and the first `done` lessons of World 2. */
async function reachWorldTwo(page: Page, done: number): Promise<void> {
  await completeFirstRun(page, 'Kid');
  await seedMasteredAndReopen(
    page,
    'Kid',
    [...WORLD_ONE, ...WORLD_TWO.slice(0, done)],
    [NUMBER_TRAIN],
  );
}

test.describe('World 2: Mental Math Mountain', () => {
  test('with World 1 done the Journey opens on World 2: Number bonds is current, the other four lessons and Market Orders are locked', async ({
    page,
  }) => {
    await reachWorldTwo(page, 0);
    await page.getByRole('button', { name: /Journey/ }).click();

    const [first, ...others] = WORLD_TWO;
    if (first === undefined) throw new Error('no lesson');
    await expect(
      page.getByRole('button', { name: journeyNodeName(first, 'current') }),
    ).toBeVisible();
    for (const lesson of others) {
      await expect(
        page.getByRole('button', { name: journeyNodeName(lesson, 'locked') }),
      ).toBeVisible();
    }
    await expect(
      page.getByRole('button', { name: worldBossNodeName(orders, 'locked') }),
    ).toBeVisible();
  });

  test('Bridge through ten from the Journey: every guided try and scored exercise on the number pad, then the next lesson opens', async ({
    page,
  }) => {
    const lesson = findLesson('mm-bridge');
    const next = findLesson('mm-tens');
    expect(lesson.exercises.map((def) => def.type)).toEqual(
      Array.from({ length: 6 }, () => 'number-entry'),
    );

    await reachWorldTwo(page, 2); // Number bonds and Doubles and halves are done: Bridge is the current node
    await page.getByRole('button', { name: /Journey/ }).click();
    await openLessonFromJourney(page, lesson);
    await expect(page.getByText(contentText(lesson.guided[0]?.textKey ?? ''))).toBeVisible();
    await playLesson(page, lesson);

    await expect(page.getByRole('heading', { name: 'Lesson complete!' })).toBeVisible();
    await expect(page.getByText(/^\+\d+ stars$/)).toBeVisible();
    await dismissCelebrationIfShown(page);
    await page.getByRole('button', { name: /Continue/ }).click();

    // The next node is open, the boss still waits for the whole world.
    await expect(
      page.getByRole('button', { name: journeyNodeName(next, 'current') }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: worldBossNodeName(orders, 'locked') }),
    ).toBeVisible();
  });

  test('a story answered with the other operation speaks wrong-op: 43 for 68 + 25 → "Read it again: does the number get bigger or smaller?"', async ({
    page,
  }) => {
    const lesson = findLesson('mm-problems');
    const first = lesson.exercises[0];
    if (first?.type !== 'number-entry' || first.reasons?.[0] === undefined) {
      throw new Error('mm-problems starts with a story that has a wrong-op reason');
    }
    const [reason] = first.reasons;

    await reachWorldTwo(page, 4); // Story problems is the current node
    await page.getByRole('button', { name: /Journey/ }).click();
    await openLessonFromJourney(page, lesson);
    for (const def of lesson.guided) await completeExercise(page, def);

    await expect(page.getByText(contentText(first.textKey))).toBeVisible();
    // The other operation's result: the reason of this story, not the pad's plain note.
    let state = await performActions(page, first, typedNumber(reason.value));
    await expect(page.getByText(contentText(reason.reasonKey))).toBeVisible();
    await expect(page.getByText(contentText('lessons:bugs.wrong-op'))).toBeVisible();
    await expect(page.getByText(contentText('cards.number-wrong'))).toHaveCount(0);
    // A wrong number that is no known bug of this story gets the pad's own note instead.
    state = await performActions(page, first, typedNumber(first.answer + 1), state);
    await expect(page.getByText(contentText('cards.number-wrong'))).toBeVisible();
    state = await performActions(page, first, solutionActionsOf(first), state);
    expect(state.solved).toBe(true);
  });

  test('with the five lessons mastered Market Orders is the world boss: five story rounds, then won', async ({
    page,
  }) => {
    await reachWorldTwo(page, WORLD_TWO.length);

    await page.getByRole('button', { name: /Journey/ }).click();
    await page.getByRole('button', { name: worldBossNodeName(orders, 'available') }).click();
    await playSeries(page, orders);
    await page.getByRole('button', { name: contentText('play.back-to-journey') }).click();
    // Every world is done, so the Journey goes back to World 1: the won boss node is on World 2's own tab.
    await openJourneyWorld(page, 2, 'mental-mountain');
    await expect(
      page.getByRole('button', { name: worldBossNodeName(orders, 'won') }),
    ).toBeVisible();

    expect(await readMiniGameProgress(page, 'market-orders')).toMatchObject({ plays: 1, wins: 1 });
  });
});
