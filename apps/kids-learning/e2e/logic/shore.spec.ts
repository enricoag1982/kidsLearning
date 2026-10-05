// World 2, Sort Shore, on the Journey of the deployed app: open once World 1 and the Pattern Train are behind the child; the Circles
// lesson (Venn diagrams over shapes, then animals) played end to end through the platform's group driver for 3 stars; and a wrong put
// that speaks what it got half right (a Venn region, a Carroll column or row).
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { GroupOutcome } from '@learn/platform-core';
import type { LogicExerciseDef, LogicLesson } from '@learn/subject-logic';
import { kindOf } from '@learn/subject-logic';
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
  seedMasteredAndReopen,
  solutionActionsOf,
  worldBossNodeName,
  worldLessons,
  worldsBefore,
  wrongActionsOf,
} from './kit.ts';

const WORLD_TWO = worldLessons('sort-shore');
const BEFORE = worldsBefore('sort-shore');
const sprint = findMiniGame('sorting-sprint');

/** A fresh install whose child finished World 1 (its four lessons and the Pattern Train) and the first `done` lessons of World 2. */
async function reachWorldTwo(page: Page, done: number): Promise<void> {
  await completeFirstRun(page, 'Kid');
  await seedMasteredAndReopen(
    page,
    'Kid',
    [...BEFORE.lessons, ...WORLD_TWO.slice(0, done)],
    BEFORE.bosses,
  );
}

/** From the Journey: opens `lesson`'s current node and goes through its story and demo to the first guided try. */
async function openLessonFromJourney(page: Page, lesson: LogicLesson): Promise<void> {
  await page.getByRole('button', { name: /Journey/ }).click();
  await page.getByRole('button', { name: journeyNodeName(lesson, 'current') }).click();
  await page.getByRole('button', { name: /Let me try/ }).click(); // Story -> Demo
  await page.getByRole('button', { name: /^Next/ }).click(); // Demo -> first guided try
}

/** The note the Owl speaks for the first wrong put of a group exercise: the platform's text for what it got half right. */
function wrongNoteOf(def: LogicExerciseDef): string {
  const kind = kindOf(def);
  const [wrong] = wrongActionsOf(def);
  if (wrong === undefined) throw new Error(`${def.id} has no wrong action`);
  // A group exercise's outcome (the logic kinds' outcomes are a union of every kind's).
  const outcome = kind.act(kind.init(def), wrong, null).outcome as GroupOutcome;
  if (outcome.kind !== 'wrong') throw new Error(`${def.id}: the wrong action is not a wrong put`);
  return contentText(
    outcome.miss === undefined ? 'cards.group.wrong' : `cards.group.wrong-${outcome.miss}`,
  );
}

test.describe('World 2: Sort Shore', () => {
  test('with World 1 done the Journey opens on World 2: Odd one out is current, the other four lessons and the Sorting Sprint are locked', async ({
    page,
  }) => {
    expect(WORLD_TWO).toHaveLength(5);
    await reachWorldTwo(page, 0);
    await page.getByRole('button', { name: /Journey/ }).click();

    await expect(page.getByText('Sort Shore').first()).toBeVisible();
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
      page.getByRole('button', { name: worldBossNodeName(sprint, 'locked') }),
    ).toBeVisible();
  });

  test('Circles from the Journey: every guided try and scored exercise on the Venn (shapes, then animals) for 3 stars, then the next lesson opens', async ({
    page,
  }) => {
    const lesson = findLesson('cls-circles');
    const next = findLesson('cls-line-up');
    expect(lesson.guided.map((def) => def.type)).toEqual(['group', 'group']);
    expect(lesson.exercises.map((def) => def.type)).toEqual(Array<string>(6).fill('group'));

    await reachWorldTwo(page, 3); // Odd one out, Find the rule and Two boxes are done: Circles is the current node
    await openLessonFromJourney(page, lesson);
    await expect(page.getByText(contentText(lesson.guided[0]?.textKey ?? ''))).toBeVisible();
    await playLesson(page, lesson);

    await expect(page.getByRole('heading', { name: 'Lesson complete!' })).toBeVisible();
    await expect(page.getByText('+18 stars')).toBeVisible();
    await expect(page.getByTestId('stars-row').locator('.reward-star-pop')).toHaveCount(3);
    await dismissCelebrationIfShown(page);
    await page.getByRole('button', { name: /Continue/ }).click();

    // The next node is open, the boss still waits for the whole world.
    await expect(
      page.getByRole('button', { name: journeyNodeName(next, 'current') }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: worldBossNodeName(sprint, 'locked') }),
    ).toBeVisible();
  });

  test('a card put in the wrong Venn region speaks what it got half right, and the next put still solves', async ({
    page,
  }) => {
    const lesson = findLesson('cls-circles');
    const venn = lesson.guided[0];
    if (venn?.type !== 'group') throw new Error('cls-circles starts with a Venn');
    const note = wrongNoteOf(venn);

    await reachWorldTwo(page, 3);
    await openLessonFromJourney(page, lesson);
    await expect(page.getByText(contentText(venn.textKey))).toBeVisible();
    let state = await performActions(page, venn, wrongActionsOf(venn));
    await expect(page.getByText(note)).toBeVisible();
    expect(state.errors).toBe(1);
    state = await performActions(page, venn, solutionActionsOf(venn), state);
    expect(state.solved).toBe(true);
  });

  test('a card put in the wrong Carroll cell says which half it got right (the column, or the row)', async ({
    page,
  }) => {
    const lesson = findLesson('cls-boxes');
    const table = lesson.exercises.find((def) => def.type === 'group' && def.layout === 'carroll');
    if (table === undefined) throw new Error('cls-boxes has no Carroll table');
    const note = wrongNoteOf(table);
    expect([
      contentText('cards.group.wrong-row'),
      contentText('cards.group.wrong-column'),
    ]).toContain(note);

    await reachWorldTwo(page, 2); // Odd one out and Find the rule are done: Two boxes is the current node
    await openLessonFromJourney(page, lesson);
    for (const def of lesson.guided) await completeExercise(page, def);
    for (const def of lesson.exercises) {
      if (def.id === table.id) break;
      await completeExercise(page, def);
    }
    await expect(page.getByText(contentText(table.textKey))).toBeVisible();
    let state = await performActions(page, table, wrongActionsOf(table));
    await expect(page.getByText(note)).toBeVisible();
    expect(state.errors).toBe(1);
    state = await performActions(page, table, solutionActionsOf(table), state);
    expect(state.solved).toBe(true);
  });

  test('with the five lessons done the Sorting Sprint is available on World 2’s own tab', async ({
    page,
  }) => {
    await reachWorldTwo(page, WORLD_TWO.length);
    await page.getByRole('button', { name: /Journey/ }).click();
    await openJourneyWorld(page, 2, 'sort-shore');
    await expect(
      page.getByRole('button', { name: worldBossNodeName(sprint, 'available') }),
    ).toBeVisible();
  });
});
