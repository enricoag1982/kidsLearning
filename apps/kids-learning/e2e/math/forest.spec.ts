// World 3, Times-Table Forest, on the Journey: Equal groups current and the rest locked once every earlier world is done (their
// lessons and bosses seeded as the content has them), and the Arrays lesson played end to end (the dot grid, true / false, the number
// pad), a neighbouring array speaking the neighbour reason.
import { expect, test } from '@playwright/test';
import {
  completeExercise,
  completeFirstRun,
  contentText,
  dismissCelebrationIfShown,
  findDuel,
  journeyNodeName,
  performActions,
  seedMasteredAndReopen,
  solutionActionsOf,
  wrongActionsOf,
  worldBossNodeName,
  worldLessons,
  worldsBefore,
} from './kit.ts';

const FOREST = 'times-forest';
const LESSONS = worldLessons(FOREST);
const boss = findDuel('race-to-20');

test.describe('World 3: Times-Table Forest', () => {
  test('with the earlier worlds done, Equal groups is current, the other five lessons and Race to 20 are locked', async ({
    page,
  }) => {
    await completeFirstRun(page, 'Kid');
    const before = worldsBefore(FOREST);
    await seedMasteredAndReopen(page, 'Kid', before.lessons, before.bosses);
    await page.getByRole('button', { name: /Journey/ }).click();

    const [first, ...others] = LESSONS;
    if (first === undefined) throw new Error('no lesson');
    expect(others).toHaveLength(5);
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

  test('Arrays from the Journey: the dot grid, true / false and the number pad, and a neighbouring array speaks its reason', async ({
    page,
  }) => {
    const [groups, arrays, third] = LESSONS;
    if (groups === undefined || arrays === undefined || third === undefined) {
      throw new Error('fewer than 3 lessons');
    }
    expect(arrays.id).toBe('mt-arrays');
    expect(arrays.guided.map((def) => def.type)).toEqual(['array', 'array']);
    expect(arrays.exercises.map((def) => def.type)).toEqual([
      'array',
      'array',
      'array',
      'true-false',
      'true-false',
      'number-entry',
    ]);

    await completeFirstRun(page, 'Kid');
    const before = worldsBefore(FOREST);
    await seedMasteredAndReopen(page, 'Kid', [...before.lessons, groups], before.bosses);
    await page.getByRole('button', { name: /Journey/ }).click();
    await page.getByRole('button', { name: journeyNodeName(arrays, 'current') }).click();
    await page.getByRole('button', { name: /Let me try/ }).click(); // Story -> Demo
    await page.getByRole('button', { name: /^Next/ }).click(); // Demo -> first guided try

    for (const def of arrays.guided) await completeExercise(page, def);

    // One dot more in each row (the kind's own wrong try) is the neighbour: its reason, not the plain count note.
    const [build] = arrays.exercises;
    if (build === undefined) throw new Error('no scored exercise');
    await expect(page.getByText(contentText(build.textKey))).toBeVisible();
    let state = await performActions(page, build, wrongActionsOf(build));
    await expect(page.getByText(contentText('lessons:bugs.neighbour'))).toBeVisible();
    await expect(page.getByText(contentText('math.notes.array-wrong'))).toHaveCount(0);
    // The array stays after a wrong Check: the right corner goes on from it.
    state = await performActions(page, build, solutionActionsOf(build), state);
    expect(state.solved).toBe(true);
    await page.getByRole('button', { name: /^Next/ }).click();

    for (const def of arrays.exercises.slice(1)) await completeExercise(page, def);

    await expect(page.getByRole('heading', { name: 'Lesson complete!' })).toBeVisible();
    await dismissCelebrationIfShown(page);
    await page.getByRole('button', { name: /Continue/ }).click();

    // The next node is open, the world boss waits for the whole world.
    await expect(
      page.getByRole('button', { name: journeyNodeName(third, 'current') }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: worldBossNodeName(boss, 'locked') }),
    ).toBeVisible();
  });
});
