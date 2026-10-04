// The authored content: it builds, every exercise plays through its own card kind, and the pieces fit together.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compileAll } from '@learn/platform-content/compile-all';
import type { CompiledContent, Lesson, MiniGameBase, SeriesGameDef } from '@learn/platform-core';
import type {
  CardDemo,
  CardExerciseDef,
} from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { templateContent } from './content.ts';
import { TEMPLATE_CHARACTERS, templateCore } from './core.ts';
import { cardStars, playCardSolution, playCardWrongThenSolve } from './testing/index.ts';

interface CardContent extends CompiledContent {
  readonly lessons: readonly Lesson<CardExerciseDef, CardDemo>[];
  readonly minigames: readonly (MiniGameBase & SeriesGameDef<CardExerciseDef>)[];
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'content');
const compiled = compileAll<CardContent>(templateContent, root);
const { content, tracks, badges, locales } = compiled;

function allExercises(): readonly { readonly where: string; readonly exercise: CardExerciseDef }[] {
  const all: { readonly where: string; readonly exercise: CardExerciseDef }[] = [];
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
  it('the platform card solution solves it cleanly from a fresh state, with 3 stars', () => {
    const solved = playCardSolution(exercise);
    expect(solved.solved).toBe(true);
    expect(solved.errors).toBe(0);
    expect(cardStars(solved)).toBe(3);
  });

  it('a wrong try costs exactly 1 error and does not block solving', () => {
    const wrong = playCardWrongThenSolve(exercise);
    expect(wrong.errors).toBe(1);
    expect(wrong.solved).toBe(true);
  });
});

describe('the authored world', () => {
  it('has 2 lessons of 2 guided tries, 5 scored exercises and 1 easier variant, taught by the Owl', () => {
    const byOrder = [...content.lessons].sort((a, b) => a.order - b.order);
    expect(
      byOrder.map((lesson) => [
        lesson.id,
        lesson.world,
        lesson.character,
        lesson.guided.length,
        lesson.exercises.length,
        lesson.variants?.length,
      ]),
    ).toEqual([
      ['sample-lesson-1', 'first-steps', 'owl', 2, 5, 1],
      ['sample-lesson-2', 'first-steps', 'owl', 2, 5, 1],
    ]);
  });

  it('uses all four card kinds in every lesson and in the boss', () => {
    const kinds = new Set(['choice', 'true-false', 'number-entry', 'order']);
    for (const lesson of content.lessons) {
      const used = new Set(lesson.exercises.map((exercise) => exercise.type));
      expect(used, lesson.id).toEqual(kinds);
    }
    const [boss] = content.minigames;
    expect(new Set(boss?.rounds.map((round) => round.type))).toEqual(kinds);
  });

  it('ends with the sample boss, a series that opens after the last lesson', () => {
    const [main] = tracks.tracks;
    expect(main).toMatchObject({ id: 'basics', kind: 'main' });
    expect(main?.worlds).toEqual([
      expect.objectContaining({ id: 'first-steps', habitat: 'meadow', boss: 'sample-boss' }),
    ]);
    expect(content.minigames).toHaveLength(1);
    expect(content.minigames[0]).toMatchObject({
      id: 'sample-boss',
      mode: 'series',
      unlockAfter: 'sample-lesson-2',
      errors3: 0,
      errors2: 2,
    });
  });

  it('has the starter and explorer ranks and 2 badges', () => {
    expect(tracks.ranks).toEqual([
      { id: 'starter', after: 'start' },
      { id: 'explorer', after: 'world:first-steps' },
    ]);
    expect(badges.map((badge) => badge.id)).toEqual(['first-lesson', 'star-collector']);
  });
});

describe('texts and the core', () => {
  it('names the subject in the English bundle and gives every character a topic', () => {
    const en = locales.en as Record<string, Record<string, unknown>> | undefined;
    expect((en?.common?.app as { title?: string } | undefined)?.title).toBe('Template');
    for (const character of Object.keys(TEMPLATE_CHARACTERS)) {
      expect(en?.characters?.[character], character).toBeDefined();
    }
    const topics = en?.common?.topic as Record<string, string> | undefined;
    expect(topics?.owl).toBe('Owl');
  });

  it('is a card core under the subject id, with the same characters as the content', () => {
    expect(templateCore.id).toBe('template');
    expect(templateCore.characters).toBe(TEMPLATE_CHARACTERS);
    expect(Object.keys(templateCore.kinds).sort()).toEqual([
      'choice',
      'number-entry',
      'order',
      'true-false',
    ]);
  });
});
