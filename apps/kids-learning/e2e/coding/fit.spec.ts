import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import {
  completeExercise,
  completeFirstRun,
  contentText,
  findLesson,
  playWrongTry,
  seedLessonsMasteredAndReopen,
  solveExercise,
  startToday,
} from './kit.ts';

/**
 * The layout checks of `fit.spec.ts` (`playwright.config.ts`: phone 390x844, iPad mini 768x900 and 1024x660) for the program
 * editor: a 6-slot strip and a 4-tile tray beside the map must fit the screen, so the lesson `main` never scrolls ("move the page up
 * to reach Run / Next") — empty, with a wrong-try note, and solved with its stars and Next.
 */

/** The lesson `main` must never need scrolling to reach its own content. */
async function expectMainFits(page: Page, label: string): Promise<void> {
  const overflow = await page.locator('main').evaluate((el) => el.scrollHeight - el.clientHeight);
  expect(
    overflow,
    `${label}: main scrolls (scrollHeight - clientHeight = ${String(overflow)})`,
  ).toBeLessThanOrEqual(1);
}

/** The button is fully on screen without scrolling. */
async function expectButtonInViewport(
  page: Page,
  name: RegExp | string,
  label: string,
): Promise<void> {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error(`${label}: no viewport size set`);
  const box = await page.getByRole('button', { name }).boundingBox();
  expect(box, `${label}: no bounding box for button matching ${String(name)}`).not.toBeNull();
  if (!box) return;
  expect(box.y, `${label}: button top above viewport`).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height, `${label}: button bottom past the viewport`).toBeLessThanOrEqual(
    viewport.height + 1,
  );
  expect(box.x + box.width, `${label}: button right past the viewport`).toBeLessThanOrEqual(
    viewport.width + 1,
  );
}

async function expectFits(page: Page, buttonName: RegExp | string, label: string): Promise<void> {
  await expectMainFits(page, label);
  await expectButtonInViewport(page, buttonName, label);
}

test('program editor (6 slots, 4 tiles): Run, a wrong-try note and the solved panel fit the viewport', async ({
  page,
}) => {
  test.setTimeout(180_000);
  const lesson = findLesson('seq-arrows');
  const [first, second] = lesson.exercises;
  if (first === undefined || second?.type !== 'program' || second.cap !== 6) {
    throw new Error('arrows-02 is expected to be a program exercise with 6 slots');
  }

  await completeFirstRun(page, 'Mia');
  await seedLessonsMasteredAndReopen(page, 'Mia', [findLesson('seq-order')]);
  await startToday(page);
  for (const exercise of lesson.guided) await completeExercise(page, exercise, true);
  await completeExercise(page, first);

  // arrows-02: the empty strip of 6 slots and the 4-tile tray.
  await expect(page.getByText(contentText(second.textKey))).toBeVisible();
  await expectFits(page, contentText('coding.buttons.run'), 'program, empty strip');

  // A wrong try: the note joins the panel.
  await playWrongTry(page, second);
  await expect(page.getByText(contentText('coding.notes.unfinished'))).toBeVisible();
  await expectFits(page, contentText('coding.buttons.run'), 'program, wrong-try note');

  // Solved: the stars and Next replace the controls.
  await solveExercise(page, second);
  await expect(page.getByRole('button', { name: /^Next/ })).toBeVisible();
  await expectFits(page, /^Next/, 'program, solved');
});
