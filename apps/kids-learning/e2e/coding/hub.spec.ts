import { expect, test } from '@playwright/test';
import { completeFirstRunToPlacementOffer, contentText, interpolate } from './kit.ts';

test.describe('Coding in the app', () => {
  test('the hub lists Coding; a first visit offers placement, declined it opens the Coding Home', async ({
    page,
  }) => {
    // First run -> hub -> the Coding tile -> the placement offer (a fresh subject for this child).
    await completeFirstRunToPlacementOffer(page, 'Mia');
    await expect(page.getByText(contentText('placement.offer-question'))).toBeVisible();
    await page.getByRole('button', { name: contentText('placement.offer-no') }).click();

    // Home: the Coding title, the Fox's line for today's lesson, and Start.
    await expect(
      page.getByRole('heading', { level: 1, name: 'Coding', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(interpolate(contentText('home.owl-next'), { character: 'Fox' })),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Start/ })).toBeVisible();

    // The hub shows all four subjects; Coding, just opened, is the active one.
    await page.getByRole('button', { name: 'Subjects', exact: true }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'What shall we learn?' }),
    ).toBeVisible();
    await expect(page.locator('[data-testid^="subject-tile-"]')).toHaveCount(4);
    await expect(page.getByTestId('subject-tile-chess')).toContainText('Chess');
    await expect(page.getByTestId('subject-tile-math')).toContainText('Math');
    await expect(page.getByTestId('subject-tile-coding')).toContainText('Coding');
    await expect(page.getByTestId('subject-tile-logic')).toContainText('Logic');
    await expect(page.getByTestId('subject-tile-coding')).toHaveAttribute('aria-current', 'true');
  });
});
