import { expect, test } from '@playwright/test';
import {
  completeFirstRun,
  dismissCelebrationIfShown,
  findLesson,
  pickProfileFromPicker,
  playLesson,
  seedLessonsMasteredAndReopen,
  startToday,
} from './kit.ts';

test.describe('World 1, lesson 2: Walk the path', () => {
  test('play the whole lesson end to end through the UI, then the stars survive a reload', async ({
    page,
  }) => {
    // Story, demo, 2 guided tries and 6 scored exercises, every run animated at its real pace.
    test.setTimeout(180_000);
    const lesson = findLesson('seq-arrows');

    // The child finished lesson 1 earlier: Today offers Walk the path.
    await completeFirstRun(page, 'Mia');
    await seedLessonsMasteredAndReopen(page, 'Mia', [findLesson('seq-order')]);
    await startToday(page);
    await playLesson(page, lesson);

    await expect(page.getByRole('heading', { name: 'Lesson complete!' })).toBeVisible();
    // The first clean program of Walk the path earns the First Program badge, whose own "Continue" shares this screen's text.
    await expect(page.getByRole('alertdialog', { name: 'New badge!' })).toBeVisible();
    await dismissCelebrationIfShown(page);
    await expect(page.getByText(/^\+\d+ stars$/)).toBeVisible();
    await page.getByRole('button', { name: /Continue/ }).click();

    await expect(page.getByText('Great session!')).toBeVisible();
    await page.getByRole('button', { name: 'Done' }).click();

    const starsPill = page.locator('[aria-label$=" stars"]');
    await expect(starsPill).toHaveAttribute('aria-label', /^(?!0 stars$).+/);

    await page.reload();
    await pickProfileFromPicker(page, 'Mia');
    await expect(starsPill).toHaveAttribute('aria-label', /^(?!0 stars$).+/);
  });
});
