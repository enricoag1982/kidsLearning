// Placement, test-out and the parent unlock over the shipped Worlds 1, 2 and 3 (m13.10, m13.11, m13.14): the platform's assessment
// planners and use cases run on the real compiled math content (16 generated lessons, Number Train, Market Orders, Race to 20), each task
// solved by its own kind (the child's first try right or wrong).
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
const PROFILE = 'p1';

/** The worlds of the main track, each with its lessons, boss and badge. */
const WORLDS = [
  {
    id: 'number-meadow',
    name: 'World 1',
    lessons: ['pv-hto', 'pv-compare', 'pv-line', 'pv-thousands', 'pv-round'],
    boss: 'number-train',
    badge: 'number-builder',
    testOutLesson: 'pv-line',
  },
  {
    id: 'mental-mountain',
    name: 'World 2',
    lessons: ['mm-bonds', 'mm-doubles', 'mm-bridge', 'mm-tens', 'mm-problems'],
    boss: 'market-orders',
    badge: 'mountain-climber',
    testOutLesson: 'mm-bridge',
  },
  {
    id: 'times-forest',
    name: 'World 3',
    lessons: ['mt-groups', 'mt-arrays', 'mt-2-5-10', 'mt-4-8', 'mt-3-6-9', 'mt-7-mixed'],
    boss: 'race-to-20',
    badge: 'times-ranger',
    testOutLesson: 'mt-3-6-9',
  },
] as const;

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

describe('placement over the worlds', () => {
  const lessons = content.lessons as unknown as readonly Lesson<MathExerciseDef>[];

  it('offers one run per world, in order: 4 different scored exercises each, drawn from the world’s lessons (never a guided try or a variant)', () => {
    const scored = new Set(
      lessons.flatMap((lesson) => lesson.exercises.map((exercise) => exercise.id)),
    );
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const plans = planPlacement(tracks, lessons, seededRandom(seed));
      expect(plans.map((plan) => plan.world.id)).toEqual(WORLDS.map((world) => world.id));
      for (const [index, plan] of plans.entries()) {
        const tasks = plan.tasks;
        expect(tasks).toHaveLength(4);
        expect(new Set(tasks.map((task) => task.exercise.id)).size).toBe(4);
        for (const task of tasks) {
          expect(WORLDS[index]?.lessons, task.lessonId).toContain(task.lessonId);
          expect(scored.has(task.exercise.id), task.exercise.id).toBe(true);
          expect(task.conceptId).toBe(task.lessonId);
        }
      }
    }
  });

  describe.each(WORLDS)('$name', ({ id: worldId, lessons: lessonIds, boss }) => {
    const planOf = (deps: AppDeps) => {
      const plan = planPlacement(tracks, lessons, deps.random).find(
        (entry) => entry.world.id === worldId,
      );
      if (plan === undefined) throw new Error('no placement plan');
      return plan;
    };

    it('a run answered 4 of 4 passes: every lesson is mastered via placement with every exercise at 1 star or more, in review, the world unlocked', async () => {
      const deps = makeMathDeps();
      const plan = planOf(deps);
      const results = answer(plan.tasks, 4);
      const score = scorePlacementWorld(results);
      expect(score).toEqual({ correct: 4, total: 4, passed: true });
      await submitAssessment(deps, {
        profileId: PROFILE,
        kind: 'placement',
        scope: { type: 'world', worldId },
        results,
        score,
      });

      const progress = await deps.progress.listLessons(PROFILE);
      expect(progress.map((entry) => entry.lessonId).sort()).toEqual([...lessonIds].sort());
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
      expect(stats.map((entry) => entry.conceptId).sort()).toEqual([...lessonIds].sort());
      expect([...((await loadUnlocked(deps, PROFILE)) ?? [])]).toEqual([worldId]);

      // The boss stays to be played: the lessons are mastered, the boss is available, and the world counts as mastered only once it is
      // won.
      const journey = await loadJourney(deps, PROFILE);
      const entry = journey.worlds.find((candidate) => candidate.world.id === worldId);
      expect(entry).toMatchObject({ status: 'available', bossStatus: 'available' });
      expect(entry?.world.boss).toBe(boss);
      for (const lessonId of lessonIds) {
        expect(journey.statuses.get(lessonId), lessonId).toBe('mastered');
      }
    });

    it('a run answered 2 of 4 fails: the result is recorded, nothing else changes, the world stays at its first lesson', async () => {
      const deps = makeMathDeps(3);
      const plan = planOf(deps);
      const results = answer(plan.tasks, 2);
      const score = scorePlacementWorld(results);
      expect(score.passed).toBe(false);
      await submitAssessment(deps, {
        profileId: PROFILE,
        kind: 'placement',
        scope: { type: 'world', worldId },
        results,
        score,
      });
      expect(await deps.progress.listLessons(PROFILE)).toEqual([]);
      expect(await deps.assessment?.listAssessmentResults(PROFILE)).toMatchObject([
        { kind: 'placement', passed: false, correct: 2, total: 4 },
      ]);
      expect(await deps.assessment?.listUnlocks(PROFILE)).toEqual([]);
      const journey = await loadJourney(deps, PROFILE);
      // World 1 is the open world of a fresh profile; the later worlds wait behind it whatever the placement said.
      expect(journey.worlds[0]?.status).toBe('available');
      expect(journey.statuses.get('pv-hto')).toBe('available');
      expect(journey.statuses.get('pv-compare')).toBe('locked');
      expect(journey.statuses.get('mm-bonds')).toBe('locked');
      expect(journey.statuses.get('mt-groups')).toBe('locked');
    });
  });
});

describe('test-out over the worlds', () => {
  const lessons = content.lessons as unknown as readonly Lesson<MathExerciseDef>[];
  const lessonOf = (id: string) => {
    const found = lessons.find((lesson) => lesson.id === id);
    if (found === undefined) throw new Error(`no lesson ${id}`);
    return found;
  };

  describe.each(WORLDS)(
    '$name',
    ({ id: worldId, lessons: lessonIds, boss, badge, testOutLesson }) => {
      const entryOf = async (deps: AppDeps) =>
        (await loadJourney(deps, PROFILE)).worlds.find((entry) => entry.world.id === worldId);

      it('a lesson test-out asks 5 of the lesson’s 6 scored exercises, all different, and 4 of 5 passes it', async () => {
        for (const id of lessonIds) {
          const lesson = lessonOf(id);
          const tasks = planTestOutLesson(lesson, seededRandom(5));
          expect(tasks).toHaveLength(5);
          expect(new Set(tasks.map((task) => task.exercise.id)).size).toBe(5);
          const scored = new Set(lesson.exercises.map((exercise) => exercise.id));
          for (const task of tasks) {
            expect(scored.has(task.exercise.id), task.exercise.id).toBe(true);
          }
        }
        const deps = makeMathDeps();
        const lesson = lessonOf(testOutLesson);
        const tasks = planTestOutLesson(lesson, seededRandom(5));
        const results = answer(tasks, 4);
        const score = scoreTestOut(results);
        expect(score.passed).toBe(true);
        await submitAssessment(deps, {
          profileId: PROFILE,
          kind: 'test-out',
          scope: { type: 'lesson', lessonId: testOutLesson, worldId },
          results,
          score,
        });
        const [saved] = await deps.progress.listLessons(PROFILE);
        expect(saved).toMatchObject({ lessonId: testOutLesson, masteredVia: 'test-out' });
        expect(
          (await deps.progress.listConceptStats(PROFILE)).map((entry) => entry.conceptId),
        ).toEqual([testOutLesson]);
        const journey = await loadJourney(deps, PROFILE);
        expect(journey.statuses.get(testOutLesson)).toBe('mastered');
      });

      it('a world test-out asks 8 tasks with at least one per lesson and 7 of 8 passes the world; the boss is then won by playing it', async () => {
        const deps = makeMathDeps();
        const world = tracks.tracks[0]?.worlds.find((entry) => entry.id === worldId);
        if (world === undefined) throw new Error('no world');
        for (const seed of [1, 2, 3, 4, 5]) {
          const tasks = planTestOutWorld(world, lessons, seededRandom(seed));
          expect(tasks).toHaveLength(8);
          expect([...new Set(tasks.map((task) => task.lessonId))].sort()).toEqual(
            [...lessonIds].sort(),
          );
        }
        const tasks = planTestOutWorld(world, lessons, seededRandom(1));
        const results = answer(tasks, 7);
        const score = scoreTestOut(results);
        expect(score).toEqual({ correct: 7, total: 8, passed: true });
        await submitAssessment(deps, {
          profileId: PROFILE,
          kind: 'test-out',
          scope: { type: 'world', worldId },
          results,
          score,
        });
        expect(await entryOf(deps)).toMatchObject({ status: 'available', bossStatus: 'available' });
        // The pass floors the stars (Star Counter tiers may follow) but earns no world badge: the badge needs the boss too.
        expect(
          (await deps.rewards?.listEarnedBadges(PROFILE))?.map((entry) => entry.badgeId),
        ).not.toContain(badge);

        // The boss counts as won only once the child wins it: then the world is mastered and its badge is earned.
        await deps.progress.saveMiniGame({
          id: 'mg1',
          profileId: PROFILE,
          miniGameId: boss,
          bestStars: 3,
          plays: 1,
          wins: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        });
        expect(await entryOf(deps)).toMatchObject({ status: 'mastered', bossStatus: 'won' });
        const { newBadges } = await checkRewards(deps, PROFILE);
        expect(newBadges.map((entry) => entry.badgeId)).toContain(badge);
      });

      it('the parent unlock opens the world: every lesson is mastered via the parent, with no stars given', async () => {
        const deps = makeMathDeps();
        await parentUnlock(deps, PROFILE, { type: 'world', worldId });
        const progress = await deps.progress.listLessons(PROFILE);
        expect(progress.map((entry) => entry.masteredVia)).toEqual(lessonIds.map(() => 'parent'));
        expect(progress.every((entry) => Object.keys(entry.bestStars).length === 0)).toBe(true);
        expect((await entryOf(deps))?.bossStatus).toBe('available');
      });
    },
  );
});
