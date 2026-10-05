// World 3, Grid Puzzles, on the Journey of the deployed app: it opens once the worlds before it are behind the child; the first sudoku
// lesson (Last empty cell) played end to end through the grid-fill driver (a guided try with its ringed cell, then whole grids) for
// 3 stars; and a wrong number that shows the note of the unit that already holds it.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { LogicExerciseDef, LogicLesson } from '@learn/subject-logic';
import type { GridFillState } from '@learn/subject-logic/kinds/grid-fill/def.ts';
import {
  completeExercise,
  completeFirstRun,
  contentText,
  dismissCelebrationIfShown,
  findLesson,
  findMiniGame,
  interpolate,
  journeyNodeName,
  performActions,
  playLesson,
  seedMasteredAndReopen,
  solutionActionsOf,
  worldBossNodeName,
  worldLessons,
  worldsBefore,
  wrongActionsOf,
} from './kit.ts';

const WORLD = 'grid-puzzles';
const LESSONS = worldLessons(WORLD);
const BEFORE = worldsBefore(WORLD);
const boss = findMiniGame('sudoku-sprint');

/** A fresh install whose child finished every world before World 3: the Journey opens on it. */
async function reachWorldThree(page: Page): Promise<void> {
  await completeFirstRun(page, 'Kid');
  await seedMasteredAndReopen(page, 'Kid', BEFORE.lessons, BEFORE.bosses);
}

/** From the Journey: opens `lesson`'s current node and goes through its story and demo to the first guided try. */
async function openLessonFromJourney(page: Page, lesson: LogicLesson): Promise<void> {
  await page.getByRole('button', { name: journeyNodeName(lesson, 'current') }).click();
  await page.getByRole('button', { name: /Let me try/ }).click(); // Story -> Demo
  await page.getByRole('button', { name: /^Next/ }).click(); // Demo -> first guided try
}

test.describe('World 3: Grid Puzzles', () => {
  test('with the worlds before it done the Journey opens on Grid Puzzles: Last empty cell is current, the other four lessons and Sudoku Sprint are locked', async ({
    page,
  }) => {
    expect(LESSONS.map((lesson) => lesson.id)).toEqual([
      'grd-last',
      'grd-only-place',
      'grd-only-number',
      'grd-six',
      'grd-pixels',
    ]);
    await reachWorldThree(page);
    await page.getByRole('button', { name: /Journey/ }).click();

    await expect(page.getByText('Grid Puzzles').first()).toBeVisible();
    const [first, ...others] = LESSONS;
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
      page.getByRole('button', { name: worldBossNodeName(boss, 'locked') }),
    ).toBeVisible();
  });

  test('Last empty cell from the Journey: the guided tries ring one cell, every grid is solved with the driver for 3 stars, then the next lesson opens', async ({
    page,
  }) => {
    const lesson = findLesson('grd-last');
    const next = findLesson('grd-only-place');
    expect(lesson.guided.map((def) => def.type)).toEqual(['grid-fill', 'grid-fill']);
    expect(lesson.exercises.map((def) => def.type)).toEqual(Array<string>(4).fill('grid-fill'));

    await reachWorldThree(page);
    await page.getByRole('button', { name: /Journey/ }).click();
    await openLessonFromJourney(page, lesson);

    // The guided try: its sentence, and exactly one cell carries the target ring.
    await expect(page.getByText('Which number goes in the ringed cell?').first()).toBeVisible();
    await expect(page.locator('[data-testid^="grid-highlight-"][data-kind="target"]')).toHaveCount(
      1,
    );
    await playLesson(page, lesson);

    await expect(page.getByRole('heading', { name: 'Lesson complete!' })).toBeVisible();
    await dismissCelebrationIfShown(page);
    await page.getByRole('button', { name: /Continue/ }).click();
    await expect(
      page.getByRole('button', { name: journeyNodeName(next, 'current') }),
    ).toBeVisible();

    // 3 stars on every scored grid: the finished lesson's node says "complete, 3 stars".
    await expect(
      page.getByRole('button', {
        name: interpolate(contentText('journey:ui.node-name-stars'), {
          name: contentText(lesson.titleKey),
          status: contentText('journey:ui.status-complete'),
          count: 3,
        }),
        exact: true,
      }),
    ).toBeVisible();
  });

  test('a number that is already in the row, column or box shows that unit’s note, costs one error, and the grid still solves', async ({
    page,
  }) => {
    const lesson = findLesson('grd-last');
    const [guided, ...rest] = lesson.guided;
    const scored: LogicExerciseDef | undefined = lesson.exercises[0];
    if (guided === undefined || rest.length !== 1 || scored === undefined)
      throw new Error('lesson shape');

    await reachWorldThree(page);
    await page.getByRole('button', { name: /Journey/ }).click();
    await openLessonFromJourney(page, lesson);
    for (const def of lesson.guided) await completeExercise(page, def);

    await expect(page.getByText(contentText(scored.textKey), { exact: true })).toBeVisible();
    let state = (await performActions(page, scored, wrongActionsOf(scored))) as GridFillState;
    expect(state.errors).toBe(1);
    // The note names the unit that already holds the number (`grid.wrong.row` / `column` / `box`), else the plain one.
    const unit = state.wrong?.conflict?.kind;
    await expect(
      page.getByText(contentText(`common:grid.wrong.${unit ?? 'plain'}`), { exact: true }),
    ).toBeVisible();

    state = (await performActions(page, scored, solutionActionsOf(scored), state)) as GridFillState;
    expect(state.solved).toBe(true);
    expect(state.errors).toBe(1);
  });
});
