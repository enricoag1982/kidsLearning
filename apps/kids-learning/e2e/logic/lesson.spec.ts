// World 1's first lesson, Repeat (pat-repeat), through the deployed app: the rows of shapes and the shape cards (choice), each driven
// by its kind's own e2e driver from its `solution()`; and the reason spoken for the part that does not repeat.
import { expect, test } from '@playwright/test';
import {
  completeExercise,
  contentText,
  dismissCelebrationIfShown,
  findLesson,
  performActions,
  pickProfileFromPicker,
  playLesson,
  solutionActionsOf,
  startLessonToFirstGuided,
} from './kit.ts';

test.describe('First lesson: Repeat', () => {
  test('play the whole lesson end to end for 3 stars, then the stars survive a reload', async ({
    page,
  }) => {
    const lesson = findLesson('pat-repeat');
    expect(lesson.guided.map((def) => def.type)).toEqual(['choice', 'choice']);
    expect(lesson.exercises.map((def) => def.type)).toEqual(Array<string>(6).fill('choice'));

    await startLessonToFirstGuided(page);
    await expect(page.getByText(contentText(lesson.guided[0]?.textKey ?? ''))).toBeVisible();
    await playLesson(page, lesson);

    await expect(page.getByRole('heading', { name: 'Lesson complete!' })).toBeVisible();
    // A newly earned badge celebrates first, its own "Continue" sharing this screen's text.
    await dismissCelebrationIfShown(page);
    await page.getByRole('button', { name: /Continue/ }).click();

    await expect(page.getByText('Great session!')).toBeVisible();
    await page.getByRole('button', { name: 'Done' }).click();

    const starsPill = page.locator('[aria-label$=" stars"]');
    await expect(starsPill).toHaveAttribute('aria-label', '18 stars');

    await page.reload();
    await pickProfileFromPicker(page, 'Kid');
    await expect(starsPill).toHaveAttribute('aria-label', '18 stars');
  });

  test('picking the shape that repeats the last one speaks the unit-break reason, and the next try still solves', async ({
    page,
  }) => {
    const lesson = findLesson('pat-repeat');
    // The first scored exercise with a card that carries the reason (the token just before the gap, when it is wrong).
    const slip = lesson.exercises.find(
      (def) =>
        def.type === 'choice' && def.options.some((option) => option.reasonKey !== undefined),
    );
    const card =
      slip?.type === 'choice' ? slip.options.find((option) => option.reasonKey) : undefined;
    if (slip === undefined || card === undefined) throw new Error('no scored card with a reason');

    await startLessonToFirstGuided(page);
    for (const def of lesson.guided) await completeExercise(page, def);
    for (const def of lesson.exercises) {
      if (def.id === slip.id) break;
      await completeExercise(page, def);
    }

    await expect(page.getByText(contentText(slip.textKey))).toBeVisible();
    let state = await performActions(page, slip, [{ type: 'answer-choice', optionId: card.id }]);
    await expect(page.getByText(contentText('lessons:bugs.unit-break'))).toBeVisible();
    expect(state.errors).toBe(1);
    state = await performActions(page, slip, solutionActionsOf(slip), state);
    expect(state.solved).toBe(true);
  });
});
