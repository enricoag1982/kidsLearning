// Placement, test-out and the parent unlock over the shipped World 1 (m13.10): the platform's assessment planners and use cases run on the
// real compiled math content (5 generated lessons, Number Train), each task solved by its own kind (the child's first try right or wrong).
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compileAll } from '@learn/platform-content/compile-all';
import {
  createSubjectRuntime,
  loadJourney,
  parentUnlock,
  planPlacement,
  planTestOutLesson,
  planTestOutWorld,
  scorePlacementWorld,
  scoreTestOut,
  submitAssessment,
} from '@learn/platform-core';
import type { AppDeps, ConceptTask, Lesson } from '@learn/platform-core';
import { loadUnlocked } from '@learn/platform-core/app/assessment';
import { checkRewards } from '@learn/platform-core/app/rewards';
import { seededRandom } from '@learn/platform-core/domain/random';
import {
  makeAssessmentRepo,
  makeContentSource,
  makeDeps,
  makeRewardsRepo,
} from '@learn/platform-core/testing';
import { mathCore } from '../core/math-core.ts';
import type { MathContent, MathExerciseDef } from '../core/types.ts';
import { playSolution, playWrongThenSolve } from '../testing/play.ts';
import { mathContent } from './math-content.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content');
const { content, tracks, badges } = compileAll<MathContent>(mathContent, root);
const WORLD = 'number-meadow';
const PROFILE = 'p1';
const LESSON_IDS = ['pv-hto', 'pv-compare', 'pv-line', 'pv-thousands', 'pv-round'];

function makeMathDeps(seed = 1): AppDeps {
  return makeDeps({
    content: makeContentSource({
      lessons: content.lessons,
      minigames: content.minigames,
      catalog: tracks,
      badges,
    }),
    assessment: makeAssessmentRepo(),
    rewards: makeRewardsRepo(),
    subject: createSubjectRuntime(mathCore),
    random: seededRandom(seed),
  });
}

/** First-try results of a run in which the child answers the first `right` tasks correctly: each right one is a real solve by the
 * kind's own solution (clean, 0 errors), each wrong one costs an error first. */
function answer(tasks: readonly ConceptTask<MathExerciseDef>[], right: number): readonly boolean[] {
  return tasks.map((task, index) => {
    if (index < right) {
      expect(playSolution(task.exercise), task.exercise.id).toMatchObject({
        solved: true,
        errors: 0,
      });
      return true;
    }
    expect(playWrongThenSolve(task.exercise), task.exercise.id).toMatchObject({ errors: 1 });
    return false;
  });
}

describe('placement over World 1', () => {
  const lessons = content.lessons as unknown as readonly Lesson<MathExerciseDef>[];

  it('offers one run for Number Meadow: 4 different scored exercises, drawn from the five lessons (never a guided try or a variant)', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const plans = planPlacement(tracks, lessons, seededRandom(seed));
      expect(plans.map((plan) => plan.world.id)).toEqual([WORLD]);
      const tasks = plans[0]?.tasks ?? [];
      expect(tasks).toHaveLength(4);
      expect(new Set(tasks.map((task) => task.exercise.id)).size).toBe(4);
      const scored = new Set(
        lessons.flatMap((lesson) => lesson.exercises.map((exercise) => exercise.id)),
      );
      for (const task of tasks) {
        expect(LESSON_IDS, task.lessonId).toContain(task.lessonId);
        expect(scored.has(task.exercise.id), task.exercise.id).toBe(true);
        expect(task.conceptId).toBe(task.lessonId);
      }
    }
  });

  it('a run answered 4 of 4 passes: every lesson is mastered via placement with every exercise at 1 star or more, in review, the world unlocked', async () => {
    const deps = makeMathDeps();
    const plan = planPlacement(tracks, lessons, deps.random)[0];
    if (plan === undefined) throw new Error('no placement plan');
    const results = answer(plan.tasks, 4);
    const score = scorePlacementWorld(results);
    expect(score).toEqual({ correct: 4, total: 4, passed: true });
    await submitAssessment(deps, {
      profileId: PROFILE,
      kind: 'placement',
      scope: { type: 'world', worldId: WORLD },
      results,
      score,
    });

    const progress = await deps.progress.listLessons(PROFILE);
    expect(progress.map((entry) => entry.lessonId).sort()).toEqual([...LESSON_IDS].sort());
    for (const entry of progress) {
      expect(entry.masteredVia, entry.lessonId).toBe('placement');
      const exercises = lessons.find((lesson) => lesson.id === entry.lessonId)?.exercises ?? [];
      expect(Object.keys(entry.bestStars).sort(), entry.lessonId).toEqual(
        exercises.map((exercise) => exercise.id).sort(),
      );
      expect(
        Object.values(entry.bestStars).every((stars) => stars >= 1),
        entry.lessonId,
      ).toBe(true);
    }
    const stats = await deps.progress.listConceptStats(PROFILE);
    expect(stats.map((entry) => entry.conceptId).sort()).toEqual([...LESSON_IDS].sort());
    expect([...((await loadUnlocked(deps, PROFILE)) ?? [])]).toEqual([WORLD]);

    // Number Train stays to be played: the lessons are mastered, the boss is available, and the world counts as mastered only once it
    // is won.
    const journey = await loadJourney(deps, PROFILE);
    expect(journey.worlds.map((entry) => [entry.world.id, entry.status, entry.bossStatus])).toEqual(
      [[WORLD, 'available', 'available']],
    );
    for (const id of LESSON_IDS) expect(journey.statuses.get(id), id).toBe('mastered');
  });

  it('a run answered 2 of 4 fails: the result is recorded, nothing else changes, World 1 stays at its first lesson', async () => {
    const deps = makeMathDeps(3);
    const plan = planPlacement(tracks, lessons, deps.random)[0];
    if (plan === undefined) throw new Error('no placement plan');
    const results = answer(plan.tasks, 2);
    const score = scorePlacementWorld(results);
    expect(score.passed).toBe(false);
    await submitAssessment(deps, {
      profileId: PROFILE,
      kind: 'placement',
      scope: { type: 'world', worldId: WORLD },
      results,
      score,
    });
    expect(await deps.progress.listLessons(PROFILE)).toEqual([]);
    expect(await deps.assessment?.listAssessmentResults(PROFILE)).toMatchObject([
      { kind: 'placement', passed: false, correct: 2, total: 4 },
    ]);
    expect(await deps.assessment?.listUnlocks(PROFILE)).toEqual([]);
    const journey = await loadJourney(deps, PROFILE);
    expect(journey.worlds[0]?.status).toBe('available');
    expect(journey.statuses.get('pv-hto')).toBe('available');
    expect(journey.statuses.get('pv-compare')).toBe('locked');
  });
});

describe('test-out over World 1', () => {
  const lessons = content.lessons as unknown as readonly Lesson<MathExerciseDef>[];
  const lessonOf = (id: string) => {
    const found = lessons.find((lesson) => lesson.id === id);
    if (found === undefined) throw new Error(`no lesson ${id}`);
    return found;
  };

  it('a lesson test-out asks 5 of the lesson’s 6 scored exercises, all different, and 4 of 5 passes it', async () => {
    for (const id of LESSON_IDS) {
      const lesson = lessonOf(id);
      const tasks = planTestOutLesson(lesson, seededRandom(5));
      expect(tasks).toHaveLength(5);
      expect(new Set(tasks.map((task) => task.exercise.id)).size).toBe(5);
      const scored = new Set(lesson.exercises.map((exercise) => exercise.id));
      for (const task of tasks) expect(scored.has(task.exercise.id), task.exercise.id).toBe(true);
    }
    const deps = makeMathDeps();
    const lesson = lessonOf('pv-line');
    const tasks = planTestOutLesson(lesson, seededRandom(5));
    const results = answer(tasks, 4);
    const score = scoreTestOut(results);
    expect(score.passed).toBe(true);
    await submitAssessment(deps, {
      profileId: PROFILE,
      kind: 'test-out',
      scope: { type: 'lesson', lessonId: 'pv-line', worldId: WORLD },
      results,
      score,
    });
    const [saved] = await deps.progress.listLessons(PROFILE);
    expect(saved).toMatchObject({ lessonId: 'pv-line', masteredVia: 'test-out' });
    expect((await deps.progress.listConceptStats(PROFILE)).map((entry) => entry.conceptId)).toEqual(
      ['pv-line'],
    );
    const journey = await loadJourney(deps, PROFILE);
    expect(journey.statuses.get('pv-line')).toBe('mastered');
  });

  it('a world test-out asks 8 tasks with at least one per lesson and 7 of 8 passes the world; the boss is then won by playing it', async () => {
    const deps = makeMathDeps();
    const world = tracks.tracks[0]?.worlds[0];
    if (world === undefined) throw new Error('no world');
    for (const seed of [1, 2, 3, 4, 5]) {
      const tasks = planTestOutWorld(world, lessons, seededRandom(seed));
      expect(tasks).toHaveLength(8);
      expect([...new Set(tasks.map((task) => task.lessonId))].sort()).toEqual(
        [...LESSON_IDS].sort(),
      );
    }
    const tasks = planTestOutWorld(world, lessons, seededRandom(1));
    const results = answer(tasks, 7);
    const score = scoreTestOut(results);
    expect(score).toEqual({ correct: 7, total: 8, passed: true });
    await submitAssessment(deps, {
      profileId: PROFILE,
      kind: 'test-out',
      scope: { type: 'world', worldId: WORLD },
      results,
      score,
    });
    let journey = await loadJourney(deps, PROFILE);
    expect(journey.worlds[0]).toMatchObject({ status: 'available', bossStatus: 'available' });
    // The pass floors the stars (Star Counter tiers may follow) but earns no world badge: Number Builder needs the boss too.
    expect(
      (await deps.rewards?.listEarnedBadges(PROFILE))?.map((badge) => badge.badgeId),
    ).not.toContain('number-builder');

    // The boss counts as won only once the child wins it: then the world is mastered and Number Builder is earned.
    await deps.progress.saveMiniGame({
      id: 'mg1',
      profileId: PROFILE,
      miniGameId: 'number-train',
      bestStars: 3,
      plays: 1,
      wins: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    journey = await loadJourney(deps, PROFILE);
    expect(journey.worlds[0]).toMatchObject({ status: 'mastered', bossStatus: 'won' });
    const { newBadges } = await checkRewards(deps, PROFILE);
    expect(newBadges.map((badge) => badge.badgeId)).toContain('number-builder');
  });

  it('the parent unlock opens the world: every lesson is mastered via the parent, with no stars given', async () => {
    const deps = makeMathDeps();
    await parentUnlock(deps, PROFILE, { type: 'world', worldId: WORLD });
    const progress = await deps.progress.listLessons(PROFILE);
    expect(progress.map((entry) => entry.masteredVia)).toEqual(LESSON_IDS.map(() => 'parent'));
    expect(progress.every((entry) => Object.keys(entry.bestStars).length === 0)).toBe(true);
    const journey = await loadJourney(deps, PROFILE);
    expect(journey.worlds[0]?.bossStatus).toBe('available');
  });
});
