// Logic in the app: the hub lists it and a first visit opens its Home (placement declined); World 1, Pattern Pond, on the Journey:
// Pip the Puzzler current and the other three lessons and the Pattern Train locked on a fresh install.
import { expect, test } from '@playwright/test';
import {
  completeFirstRun,
  completeFirstRunToPlacementOffer,
  contentText,
  findMiniGame,
  interpolate,
  journeyNodeName,
  openJourneyWorld,
  worldBossNodeName,
  worldLessons,
} from './kit.ts';

const LESSONS = worldLessons('pattern-pond');
const boss = findMiniGame('pattern-train');

test.describe('Logic in the app', () => {
  test('the hub lists Logic with the other three subjects; a first visit offers placement, declined it opens the Logic Home', async ({
    page,
  }) => {
    // First run -> hub -> the Logic tile -> the placement offer (a fresh subject for this child).
    await completeFirstRunToPlacementOffer(page, 'Mia');
    await expect(page.getByText(contentText('placement.offer-question'))).toBeVisible();
    await page.getByRole('button', { name: contentText('placement.offer-no') }).click();

    // Home: the Logic title, Pip's line for today's lesson, and Start.
    await expect(page.getByRole('heading', { level: 1, name: 'Logic', exact: true })).toBeVisible();
    await expect(
      page.getByText(interpolate(contentText('home.owl-next'), { character: 'Pip' })),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Start/ })).toBeVisible();

    // The hub shows all four subjects; Logic, just opened, is the active one.
    await page.getByRole('button', { name: 'Subjects', exact: true }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'What shall we learn?' }),
    ).toBeVisible();
    await expect(page.locator('[data-testid^="subject-tile-"]')).toHaveCount(4);
    await expect(page.getByTestId('subject-tile-chess')).toContainText('Chess');
    await expect(page.getByTestId('subject-tile-math')).toContainText('Math');
    await expect(page.getByTestId('subject-tile-coding')).toContainText('Coding');
    await expect(page.getByTestId('subject-tile-logic')).toContainText('Logic');
    await expect(page.getByTestId('subject-tile-logic')).toHaveAttribute('aria-current', 'true');
  });
});

test.describe('World 1: Pattern Pond', () => {
  test('a fresh Journey: Pip the Puzzler is current, the other three lessons and the Pattern Train are locked', async ({
    page,
  }) => {
    await completeFirstRun(page, 'Kid');
    await page.getByRole('button', { name: /Journey/ }).click();

    // The world, by number and name, and its first node by the character's name and topic.
    await openJourneyWorld(page, 1, 'pattern-pond');
    await expect(page.getByText('Pattern Pond').first()).toBeVisible();
    const [first, ...others] = LESSONS;
    if (first === undefined) throw new Error('no lesson');
    expect(others).toHaveLength(3);
    const current = page.getByRole('button', { name: journeyNodeName(first, 'current') });
    await expect(current).toBeVisible();
    await expect(current).toHaveAccessibleName(/^Pip the Puzzler, /);
    for (const lesson of others) {
      await expect(
        page.getByRole('button', { name: journeyNodeName(lesson, 'locked') }),
      ).toBeVisible();
    }
    await expect(
      page.getByRole('button', { name: worldBossNodeName(boss, 'locked') }),
    ).toBeVisible();
  });
});
