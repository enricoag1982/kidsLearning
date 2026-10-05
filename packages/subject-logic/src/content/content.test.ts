// The authored content: it builds, every exercise plays through its own kind, and the pieces fit together. The W1 specifics (frozen
// seeds, the curriculum table, the content review) are in `pattern-pond.test.ts`.
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

describe('the world', () => {
  it('is Pattern Pond: 4 lessons taught by Pip the Panda, 8 guided tries, 24 scored exercises and 4 easier variants', () => {
    expect(
      [...content.lessons]
        .sort((a, b) => a.order - b.order)
        .map((lesson) => [
          lesson.id,
          lesson.world,
          lesson.character,
          lesson.guided.length,
          lesson.exercises.length,
          lesson.variants?.length,
        ]),
    ).toEqual([
      ['pat-repeat', 'pattern-pond', 'panda', 2, 6, 1],
      ['pat-steps', 'pattern-pond', 'panda', 2, 6, 1],
      ['pat-grow', 'pattern-pond', 'panda', 2, 6, 1],
      ['pat-far', 'pattern-pond', 'panda', 2, 6, 1],
    ]);
  });

  it('has the Pattern Train boss: the one mini-game, a series of 5 rounds, named by the world', () => {
    expect(content.minigames.map((game) => [game.id, game.mode, game.rounds.length])).toEqual([
      ['pattern-train', 'series', 5],
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
    ]);
  });

  it('has the thinker rank at the start, the spotter rank after the world and 2 badges', () => {
    expect(tracks.ranks).toEqual([
      { id: 'thinker', after: 'start' },
      { id: 'spotter', after: 'world:pattern-pond' },
    ]);
    expect(badges.map((badge) => badge.id)).toEqual(['pattern-spotter', 'star-collector']);
  });
});

describe('texts and the core', () => {
  it('names the subject, the track and the world in the English bundle and gives every character a name and a topic', () => {
    const en = locales.en as Record<string, Record<string, unknown>> | undefined;
    expect((en?.common?.app as { title?: string } | undefined)?.title).toBe('Logic');
    expect(en?.journey).toMatchObject({
      tracks: { puzzles: 'Puzzle Paths' },
      worlds: { 'pattern-pond': 'Pattern Pond' },
      ranks: { thinker: 'Thinker', spotter: 'Pattern Spotter' },
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
