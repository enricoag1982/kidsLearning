// The authored content: it builds, every exercise plays through its own kind, and the pieces fit together.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compileAll } from '@learn/platform-content/compile-all';
import type { CompiledContent, Lesson, MiniGameBase, SeriesGameDef } from '@learn/platform-core';
import type { CardDemo } from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { CODING_CHARACTERS, codingCore } from '../core/coding-core.ts';
import type { CodingExerciseDef } from '../core/types.ts';
import { playSolution, playWrongThenSolve, starsFor } from '../testing/index.ts';
import { codingContent } from './coding-content.ts';

interface CodingBundle extends CompiledContent {
  readonly lessons: readonly Lesson<CodingExerciseDef, CardDemo>[];
  readonly minigames: readonly (MiniGameBase & SeriesGameDef<CodingExerciseDef>)[];
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content');
const compiled = compileAll<CodingBundle>(codingContent, root);
const { content, tracks, badges, locales } = compiled;

function allExercises(): readonly {
  readonly where: string;
  readonly exercise: CodingExerciseDef;
}[] {
  const all: { readonly where: string; readonly exercise: CodingExerciseDef }[] = [];
  for (const lesson of content.lessons) {
    for (const exercise of [...lesson.guided, ...lesson.exercises, ...(lesson.variants ?? [])]) {
      all.push({ where: `${lesson.id}/${exercise.id}`, exercise });
    }
  }
  for (const minigame of content.minigames) {
    for (const round of minigame.rounds) {
      all.push({ where: `${minigame.id}/${round.id}`, exercise: round });
    }
  }
  return all;
}

describe.each(allExercises())('$where ($exercise.type)', ({ exercise }) => {
  it('the kind solution solves it cleanly from a fresh state, with 3 stars', () => {
    const solved = playSolution(exercise);
    expect(solved.solved).toBe(true);
    expect(solved.errors).toBe(0);
    expect(starsFor(solved)).toBe(3);
  });

  it('a wrong try costs exactly 1 error and does not block solving', () => {
    const wrong = playWrongThenSolve(exercise);
    expect(wrong.errors).toBe(1);
    expect(wrong.solved).toBe(true);
  });
});

describe('the fixture world', () => {
  it('has the one lesson: 2 guided tries and 5 scored exercises, taught by the Fox', () => {
    expect(
      content.lessons.map((lesson) => [
        lesson.id,
        lesson.world,
        lesson.order,
        lesson.character,
        lesson.guided.map((exercise) => exercise.type),
        lesson.exercises.map((exercise) => exercise.type),
        lesson.variants?.length,
      ]),
    ).toEqual([
      [
        'seq-arrows',
        'meadow-steps',
        1,
        'fox',
        ['program', 'predict'],
        ['program', 'program', 'program', 'predict', 'find-bug'],
        undefined,
      ],
    ]);
  });

  it('names the goal in every program exercise: "reach the flag"', () => {
    const lessons = locales.en?.lessons as Record<string, unknown> | undefined;
    for (const { exercise, where } of allExercises()) {
      if (exercise.type !== 'program') continue;
      const key = exercise.textKey.replace('lessons:', '');
      expect(String(lessons?.[key]), where).toContain('reach the flag');
    }
  });

  it('ends with the fixture boss, a series of a bug to find and a loop to build, opening after the lesson', () => {
    const [main] = tracks.tracks;
    expect(main).toMatchObject({ id: 'basics', kind: 'main' });
    expect(main?.worlds).toEqual([
      expect.objectContaining({ id: 'meadow-steps', habitat: 'meadow', boss: 'fixture-boss' }),
    ]);
    expect(content.minigames).toHaveLength(1);
    expect(content.minigames[0]).toMatchObject({
      id: 'fixture-boss',
      mode: 'series',
      unlockAfter: 'seq-arrows',
      errors3: 0,
      errors2: 2,
    });
    expect(content.minigames[0]?.rounds.map((round) => round.type)).toEqual([
      'find-bug',
      'program',
    ]);
  });

  it('proves the loop path: the boss program round has a repeat and needs it', () => {
    const round = content.minigames[0]?.rounds[1];
    expect(round).toMatchObject({
      type: 'program',
      cap: 3,
      mustLoop: true,
      solution: [{ kind: 'repeat', times: 5, body: [{ kind: 'right' }] }],
    });
  });

  it('has the starter and explorer ranks and 2 badges', () => {
    expect(tracks.ranks).toEqual([
      { id: 'starter', after: 'start' },
      { id: 'explorer', after: 'world:meadow-steps' },
    ]);
    expect(badges.map((badge) => badge.id)).toEqual(['first-lesson', 'star-collector']);
  });
});

describe('texts and the core', () => {
  it('names the subject in the English bundle, the world, and gives every character a topic', () => {
    const en = locales.en as Record<string, Record<string, unknown>> | undefined;
    expect((en?.common?.app as { title?: string } | undefined)?.title).toBe('Coding');
    expect((en?.journey?.worlds as Record<string, string> | undefined)?.['meadow-steps']).toBe(
      'Meadow Steps',
    );
    for (const character of Object.keys(CODING_CHARACTERS)) {
      expect(en?.characters?.[character], character).toBeDefined();
    }
    const topics = en?.common?.topic as Record<string, string> | undefined;
    expect(topics?.owl).toBe('Owl');
    expect(topics?.fox).toBe('Fox');
  });

  it('is a core under the subject id, with the same characters as the content and a kind for every exercise', () => {
    expect(codingCore.id).toBe('coding');
    expect(codingCore.characters).toBe(CODING_CHARACTERS);
    expect(codingContent.characters).toBe(CODING_CHARACTERS);
    for (const { exercise } of allExercises()) {
      expect(codingCore.kinds[exercise.type], exercise.id).toBeDefined();
      expect(codingContent.kinds[exercise.type], exercise.id).toBeDefined();
    }
    expect(Object.keys(codingContent.kinds).sort()).toEqual(Object.keys(codingCore.kinds).sort());
  });
});
