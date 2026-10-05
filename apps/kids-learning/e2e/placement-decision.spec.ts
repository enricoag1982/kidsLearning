import { expect, test } from '@playwright/test';
import { completeFirstRunToPlacementOffer, contentText } from './helpers.ts';

test.describe('The placement offer is asked once per child and subject (F3)', () => {
  test('declining is stored: after a reload Chess opens straight on Home, a subject never opened is still offered', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const offer = page.getByText(contentText('placement.offer-question'));
    const chessHome = page.getByRole('heading', { level: 1, name: 'Chess', exact: true });

    await completeFirstRunToPlacementOffer(page, 'Mia'); // first run -> hub -> Chess -> offer
    await page.getByRole('button', { name: contentText('placement.offer-no') }).click();
    await chessHome.waitFor();

    // A restart (reload) -> picker -> Mia -> hub -> Chess: no offer this time.
    await page.reload();
    await page.getByRole('heading', { name: "Who's playing today?" }).waitFor();
    await page.getByRole('button', { name: /Mia/ }).click();
    await page.getByTestId('subject-tile-chess').click();
    await chessHome.waitFor();
    await expect(offer).toHaveCount(0);

    // Math was never opened by this child: its first entry is still offered (its own question text; the buttons are shared).
    await page.getByRole('button', { name: 'Subjects', exact: true }).click();
    await page.getByTestId('subject-tile-math').click();
    await expect(
      page.getByRole('button', { name: contentText('placement.offer-yes') }),
    ).toBeVisible();
  });
});
