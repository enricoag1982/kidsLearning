// World 3's picture cross (grd-pixels) on the Journey of the deployed app: with the four sudoku lessons behind the child it is the
// current lesson; a scored picture is filled with the driver (Fill / Cross tools, then the cell) and its reveal appears below the
// board, where a "?" waited, without covering the child's drawing.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { LogicLesson } from '@learn/subject-logic';
import {
  completeExercise,
  completeFirstRun,
  findLesson,
  journeyNodeName,
  seedMasteredAndReopen,
  solveExercise,
  worldLessons,
  worldsBefore,
} from './kit.ts';

const WORLD = 'grid-puzzles';
const lesson = findLesson('grd-pixels');
const BEFORE = worldsBefore(WORLD);
const SUDOKU_LESSONS = worldLessons(WORLD).filter((entry) => entry.id !== 'grd-pixels');

/** A fresh install whose child finished the worlds before World 3 and its four sudoku lessons: the picture lesson is current. */
async function reachPictures(page: Page): Promise<void> {
  await completeFirstRun(page, 'Kid');
  await seedMasteredAndReopen(page, 'Kid', [...BEFORE.lessons, ...SUDOKU_LESSONS], BEFORE.bosses);
}

async function openLessonFromJourney(page: Page, entry: LogicLesson): Promise<void> {
  await page.getByRole('button', { name: /Journey/ }).click();
  await page.getByRole('button', { name: journeyNodeName(entry, 'current') }).click();
  await page.getByRole('button', { name: /Let me try/ }).click(); // Story -> Demo
  await page.getByRole('button', { name: /^Next/ }).click(); // Demo -> first guided try
}

test.describe('World 3: Picture cross', () => {
  test('the lesson is seven 5 x 5 pictures: two guided, four scored, one easier', () => {
    expect(lesson.guided.map((def) => def.id)).toEqual(['pix-snake', 'pix-rabbit']);
    expect(lesson.exercises.map((def) => def.id)).toEqual([
      'pix-frog',
      'pix-owl',
      'pix-turtle',
      'pix-cat',
    ]);
    expect(lesson.variants?.map((def) => def.id)).toEqual(['pix-mouse']);
  });

  test('a scored picture filled with the driver shows its reveal below the drawing, where the "?" was', async ({
    page,
  }) => {
    const [picture] = lesson.exercises;
    if (picture?.type !== 'grid-fill') throw new Error('no scored picture');
    const { puzzle: reveal } = picture;
    if (reveal.rules !== 'picture-cross' || reveal.reveal === undefined)
      throw new Error('no reveal');

    await reachPictures(page);
    await openLessonFromJourney(page, lesson);
    for (const def of lesson.guided) await completeExercise(page, def);

    // Before the last cell: the "?" slot, no reveal.
    await expect(page.getByTestId('grid-reveal-slot')).toHaveText('?');
    await expect(page.getByTestId('grid-reveal')).toHaveCount(0);

    await solveExercise(page, picture);

    const shown = page.getByRole('img', { name: 'Picture revealed' });
    await expect(shown).toHaveText(reveal.reveal);
    await expect(page.getByTestId('grid-reveal-slot')).toHaveCount(0);
    // Below the board, not over it: the drawing stays visible.
    const board = await page.getByTestId('grid-fill-board').boundingBox();
    const box = await shown.boundingBox();
    if (board === null || box === null) throw new Error('no layout');
    expect(box.y).toBeGreaterThanOrEqual(board.y + board.height - 1);
    // Every filled cell of the picture reads as filled.
    const filled = reveal.solution.filter(Boolean).length;
    await expect(page.locator('[data-testid^="grid-cell-"][aria-label*="filled"]')).toHaveCount(
      filled,
    );
  });
});
