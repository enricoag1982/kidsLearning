// World 1's first lesson, Hundreds, tens, ones (pv-hto), through the deployed app: the blocks (place-value), the number pad
// (number-entry) and the option cards (choice), each driven by its kind's own e2e driver from its `solution()`.
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
  typedNumber,
  wrongActionsOf,
} from './kit.ts';

test.describe('First lesson: Hundreds, tens, ones', () => {
  test('play the whole lesson end to end, then the stars survive a reload', async ({ page }) => {
    const lesson = findLesson('pv-hto');
    expect(lesson.guided.map((def) => def.type)).toEqual(['place-value', 'place-value']);
    expect(lesson.exercises.map((def) => def.type)).toEqual([
      'place-value',
      'place-value',
      'number-entry',
      'number-entry',
      'choice',
      'choice',
    ]);

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

  test('a wrong answer that matches a known bug shows its reason: swapped places (blocks), 8005 for 805 (number pad)', async ({
    page,
  }) => {
    const lesson = findLesson('pv-hto');
    const [build, zero, read, readZero] = lesson.exercises;
    if (build === undefined || zero === undefined || read === undefined || readZero === undefined) {
      throw new Error('pv-hto has fewer than 4 scored exercises');
    }

    await startLessonToFirstGuided(page);
    for (const def of lesson.guided) await completeExercise(page, def);

    // Blocks: 932 built as 923 (tens and ones swapped, the kind's own wrong try): the bug's reason, not the plain count note.
    await expect(page.getByText(contentText(build.textKey))).toBeVisible();
    let state = await performActions(page, build, wrongActionsOf(build));
    await expect(page.getByText(contentText('lessons:bugs.swap'))).toBeVisible();
    await expect(page.getByText(contentText('math.notes.pv-wrong'))).toHaveCount(0);
    // The blocks stay after a wrong Check: the next build goes on from them.
    state = await performActions(page, build, solutionActionsOf(build), state);
    expect(state.solved).toBe(true);
    await page.getByRole('button', { name: /^Next/ }).click();

    await completeExercise(page, zero);
    await completeExercise(page, read);

    // Number pad: 8005 for 8 hundreds, 0 tens and 5 ones: "Each place holds one digit".
    await expect(page.getByText(contentText(readZero.textKey))).toBeVisible();
    state = await performActions(page, readZero, typedNumber(8005));
    await expect(page.getByText(contentText('lessons:bugs.append'))).toBeVisible();
    // A wrong number that is no known bug of 805 (those are 850 and 8005) gets the pad's own note instead.
    state = await performActions(page, readZero, typedNumber(806), state);
    await expect(page.getByText(contentText('cards.number-wrong'))).toBeVisible();
    state = await performActions(page, readZero, solutionActionsOf(readZero), state);
    expect(state.solved).toBe(true);
  });
});
