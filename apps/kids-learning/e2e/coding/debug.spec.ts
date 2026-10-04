import { expect, test } from '@playwright/test';
import {
  completeFirstRun,
  completeExercise,
  contentText,
  findLesson,
  findMiniGame,
  playLesson,
  playRounds,
  playWrongTry,
  seedLessonsMasteredAndReopen,
  solveExercise,
  startToday,
  worldBossNodeName,
} from './kit.ts';

test.describe('World 1, lesson 4: Bug hunt', () => {
  test('a wrong tap on a step that is fine shows the note; the right tap fixes the bug and solves it', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const lesson = findLesson('seq-debug');

    await completeFirstRun(page, 'Mia');
    await seedLessonsMasteredAndReopen(page, 'Mia', [
      findLesson('seq-order'),
      findLesson('seq-arrows'),
      findLesson('seq-collect'),
    ]);
    await startToday(page);

    // The first guided try: Fox's own run replays by itself, then every tile can be tapped.
    const [first] = lesson.guided;
    if (first === undefined) throw new Error('seq-debug has no guided try');
    await expect(page.getByText(contentText(first.textKey))).toBeVisible();
    await playWrongTry(page, first);
    await expect(page.getByText(contentText('coding.notes.bug-wrong'))).toBeVisible();

    // The right tile: it turns red, the fix goes in, the program runs and the success panel offers Next.
    await solveExercise(page, first);
    await expect(page.getByRole('button', { name: /^Next/ })).toBeVisible();
    await expect(page.getByText(/Well done|Amazing|Good try/)).toBeVisible();
    await page.getByRole('button', { name: /^Next/ }).click();

    // A scored hunt in the same lesson.
    const [second] = lesson.guided.slice(1);
    if (second === undefined) throw new Error('seq-debug has one guided try');
    await completeExercise(page, second, true);
    await expect(page.getByText(contentText(lesson.exercises[0]?.textKey ?? ''))).toBeVisible();
  });
});

test.describe('Bug Squash', () => {
  test('it follows a Today session once the debugging lesson is done: play the first lesson, then a round of Bug Squash', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const boss = findMiniGame('bug-squash');

    // Only the debugging lesson is behind this child, so Today plans the first lesson, then the mini-game it opened.
    await completeFirstRun(page, 'Mia');
    await seedLessonsMasteredAndReopen(page, 'Mia', [findLesson('seq-debug')]);
    await startToday(page);
    await playLesson(page, findLesson('seq-order'));
    await expect(page.getByRole('heading', { name: 'Lesson complete!' })).toBeVisible();
    await page.getByRole('button', { name: /Continue/ }).click();

    // Round 1 of 5 shows its counters; one round solved, Next brings round 2.
    await expect(page.getByText('Round 1 of 5')).toBeVisible();
    await expect(page.getByText('0 mistakes so far')).toBeVisible();
    await playRounds(page, boss, 1);
    await expect(page.getByText('Round 2 of 5')).toBeVisible();
    await expect(page.getByText(contentText('lessons:ask-bug'))).toBeVisible();
  });
});

test.describe('World 1 boss', () => {
  test('Bug Squash is the Journey boss node once all four lessons are mastered; winning it marks the node won', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const boss = findMiniGame('bug-squash');

    await completeFirstRun(page, 'Mia');
    await seedLessonsMasteredAndReopen(
      page,
      'Mia',
      ['seq-order', 'seq-arrows', 'seq-collect', 'seq-debug'].map(findLesson),
    );
    await page.getByRole('button', { name: /Journey/ }).click();
    await page.getByRole('button', { name: worldBossNodeName(boss, 'available') }).click();
    await playRounds(page, boss, boss.rounds.length);
    await page.getByRole('button', { name: contentText('play.back-to-journey') }).click();
    await expect(page.getByRole('button', { name: worldBossNodeName(boss, 'won') })).toBeVisible();
  });
});
