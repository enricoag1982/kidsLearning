// World 1, Number Meadow, on the Journey: the first lesson current and the Number Train boss locked on a fresh install; the second
// lesson from the Journey (sign cards, ordering, true / false); and, with the five lessons seeded as mastered, the Number Train
// reached as the world boss and played round by round on the number line.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { MathLesson } from '@learn/subject-math';
import {
  completeFirstRun,
  contentText,
  dismissCelebrationIfShown,
  findLesson,
  findMiniGame,
  journeyNodeName,
  openJourneyWorld,
  playLesson,
  playSeries,
  readMiniGameProgress,
  seedMasteredAndReopen,
  worldBossNodeName,
} from './kit.ts';

const LESSONS = ['pv-hto', 'pv-compare', 'pv-line', 'pv-thousands', 'pv-round'].map(findLesson);
const boss = findMiniGame('number-train');

/** From the Journey: opens `lesson`'s current node, plays it, and returns to the Journey. */
async function playLessonFromJourney(page: Page, lesson: MathLesson): Promise<void> {
  await page.getByRole('button', { name: journeyNodeName(lesson, 'current') }).click();
  await page.getByRole('button', { name: /Let me try/ }).click(); // Story -> Demo
  await page.getByRole('button', { name: /^Next/ }).click(); // Demo -> first guided try
  await playLesson(page, lesson);
  await expect(page.getByRole('heading', { name: 'Lesson complete!' })).toBeVisible();
  await dismissCelebrationIfShown(page);
  await page.getByRole('button', { name: /Continue/ }).click();
}

test.describe('World 1: Number Meadow', () => {
  test('a fresh Journey: Hundreds, tens, ones is current, the other four lessons and the Number Train are locked', async ({
    page,
  }) => {
    await completeFirstRun(page, 'Kid');
    await page.getByRole('button', { name: /Journey/ }).click();

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

  test('lesson 2 from the Journey (sign cards, ordering, true / false) once lesson 1 is mastered', async ({
    page,
  }) => {
    const [first, second, third] = LESSONS;
    if (first === undefined || second === undefined || third === undefined) {
      throw new Error('fewer than 3 lessons');
    }
    await completeFirstRun(page, 'Kid');
    await seedMasteredAndReopen(page, 'Kid', [first], []);

    await page.getByRole('button', { name: /Journey/ }).click();
    await expect(
      page.getByRole('button', { name: worldBossNodeName(boss, 'locked') }),
    ).toBeVisible();
    await playLessonFromJourney(page, second);

    // The next node is open, the boss still waits for the whole world.
    await expect(
      page.getByRole('button', { name: journeyNodeName(third, 'current') }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: worldBossNodeName(boss, 'locked') }),
    ).toBeVisible();
  });

  test('with the five lessons mastered the Number Train is the world boss: five rounds on the number line, then won', async ({
    page,
  }) => {
    await completeFirstRun(page, 'Kid');
    await seedMasteredAndReopen(page, 'Kid', LESSONS, []);

    await page.getByRole('button', { name: /Journey/ }).click();
    await page.getByRole('button', { name: worldBossNodeName(boss, 'available') }).click();
    await playSeries(page, boss);
    await page.getByRole('button', { name: contentText('play.back-to-journey') }).click();
    // World 1 is finished, so the Journey moves on to World 2: the won boss node is on World 1's own tab.
    await openJourneyWorld(page, 1, 'number-meadow');
    await expect(page.getByRole('button', { name: worldBossNodeName(boss, 'won') })).toBeVisible();

    expect(await readMiniGameProgress(page, 'number-train')).toMatchObject({ plays: 1, wins: 1 });
  });
});
