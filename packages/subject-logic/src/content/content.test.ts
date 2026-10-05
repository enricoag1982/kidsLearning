// The authored content: it builds, every exercise plays through its own kind, and the pieces fit together. The per-world specifics
// (frozen seeds, the curriculum table, the content review) are in `pattern-pond.test.ts` (W1), `sort-shore.test.ts` (W2) and
// `grid-puzzles.test.ts` (W3).
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compileAll } from '@learn/platform-content/compile-all';
import { LOGIC_CHARACTERS, logicCore } from '../core/logic-core.ts';
import type { LogicContent, LogicExerciseDef } from '../core/types.ts';
import { playSolution, playWrongThenSolve, starsFor } from '../testing/index.ts';
import { logicContent } from './logic-content.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content');
const compiled = compileAll<LogicContent>(logicContent, root);
const { content, tracks, badges, locales } = compiled;

function allExercises(): readonly {
  readonly where: string;
  readonly exercise: LogicExerciseDef;
}[] {
  const all: { readonly where: string; readonly exercise: LogicExerciseDef }[] = [];
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
  it('solution() solves cleanly from a fresh state, with 3 stars', () => {
    const solved = playSolution(exercise);
    expect(solved.solved).toBe(true);
    expect(solved.errors).toBe(0);
    expect(starsFor(solved)).toBe(3);
  });

  it('wrongAction() costs exactly 1 error and does not block solving', () => {
    const wrong = playWrongThenSolve(exercise);
    expect(wrong.errors).toBe(1);
    expect(wrong.solved).toBe(true);
  });
});

describe('the worlds', () => {
  const lessonsOf = (world: string) =>
    [...content.lessons]
      .filter((lesson) => lesson.world === world)
      .sort((a, b) => a.order - b.order)
      .map((lesson) => [
        lesson.id,
        lesson.character,
        lesson.guided.length,
        lesson.exercises.length,
        lesson.variants?.length,
      ]);

  it('are 3: Pattern Pond (4 lessons taught by Pip the Panda, 8 guided tries, 24 scored exercises, 4 easier variants), Sort Shore (5 lessons, 10 guided, 30 scored, 5 variants) and Grid Puzzles (5 lessons, 10 guided, 20 scored, 5 variants)', () => {
    expect(content.lessons).toHaveLength(14);
    expect(lessonsOf('pattern-pond')).toEqual([
      ['pat-repeat', 'panda', 2, 6, 1],
      ['pat-steps', 'panda', 2, 6, 1],
      ['pat-grow', 'panda', 2, 6, 1],
      ['pat-far', 'panda', 2, 6, 1],
    ]);
    expect(lessonsOf('sort-shore')).toEqual([
      ['cls-odd', 'panda', 2, 6, 1],
      ['cls-rule', 'panda', 2, 6, 1],
      ['cls-boxes', 'panda', 2, 6, 1],
      ['cls-circles', 'panda', 2, 6, 1],
      ['cls-line-up', 'panda', 2, 6, 1],
    ]);
    expect(lessonsOf('grid-puzzles')).toEqual([
      ['grd-last', 'panda', 2, 4, 1],
      ['grd-only-place', 'panda', 2, 4, 1],
      ['grd-only-number', 'panda', 2, 4, 1],
      ['grd-six', 'panda', 2, 4, 1],
      ['grd-pixels', 'panda', 2, 4, 1],
    ]);
  });

  it('have a world boss each: the one mini-game of the world, a series of 5 rounds, named by the world', () => {
    expect(content.minigames.map((game) => [game.id, game.mode, game.rounds.length])).toEqual([
      ['pattern-train', 'series', 5],
      ['sorting-sprint', 'series', 5],
      ['sudoku-sprint', 'series', 5],
    ]);
    const [main] = tracks.tracks;
    expect(tracks.tracks).toHaveLength(1);
    expect(main).toMatchObject({ id: 'puzzles', kind: 'main' });
    expect(main?.worlds).toEqual([
      expect.objectContaining({
        id: 'pattern-pond',
        order: 1,
        habitat: 'river',
        boss: 'pattern-train',
      }),
      expect.objectContaining({
        id: 'sort-shore',
        order: 2,
        habitat: 'ocean',
        boss: 'sorting-sprint',
      }),
      expect.objectContaining({
        id: 'grid-puzzles',
        order: 3,
        habitat: 'jungle',
        boss: 'sudoku-sprint',
      }),
    ]);
  });

  it('have the thinker rank at the start, a rank after each world and 4 badges', () => {
    expect(tracks.ranks).toEqual([
      { id: 'thinker', after: 'start' },
      { id: 'spotter', after: 'world:pattern-pond' },
      { id: 'sorter', after: 'world:sort-shore' },
      { id: 'solver', after: 'world:grid-puzzles' },
    ]);
    expect(badges.map((badge) => badge.id)).toEqual([
      'pattern-spotter',
      'shore-sorter',
      'puzzle-solver',
      'star-collector',
    ]);
  });
});

describe('texts and the core', () => {
  it('names the subject, the track and the world in the English bundle and gives every character a name and a topic', () => {
    const en = locales.en as Record<string, Record<string, unknown>> | undefined;
    expect((en?.common?.app as { title?: string } | undefined)?.title).toBe('Logic');
    expect(en?.journey).toMatchObject({
      tracks: { puzzles: 'Puzzle Paths' },
      worlds: {
        'pattern-pond': 'Pattern Pond',
        'sort-shore': 'Sort Shore',
        'grid-puzzles': 'Grid Puzzles',
      },
      ranks: {
        thinker: 'Thinker',
        spotter: 'Pattern Spotter',
        sorter: 'Shore Sorter',
        solver: 'Puzzle Solver',
      },
    });
    for (const character of ['owl', ...Object.keys(LOGIC_CHARACTERS)]) {
      expect(en?.characters?.[character], character).toBeDefined();
    }
    expect(en?.characters).toMatchObject({ panda: { name: 'Pip' } });
    const topics = en?.common?.topic as Record<string, string> | undefined;
    expect(topics?.puzzle).toBe('Puzzler');
  });

  it('is a card core under the subject id, with the same characters as the content', () => {
    expect(logicCore.id).toBe('logic');
    expect(logicCore.characters).toBe(LOGIC_CHARACTERS);
    expect(Object.keys(LOGIC_CHARACTERS)).toEqual(['panda']);
  });
});
