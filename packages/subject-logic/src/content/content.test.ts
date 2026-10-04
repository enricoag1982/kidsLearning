// The authored fixture content: it builds, every exercise plays through its own kind, and the pieces fit together.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compileAll } from '@learn/platform-content/compile-all';
import { contentRoot } from '../../scripts/content-root.ts';
import { LOGIC_CHARACTERS, logicCore } from '../core/logic-core.ts';
import type { LogicContent, LogicExerciseDef } from '../core/types.ts';
import { playSolution, playWrongThenSolve, starsFor } from '../testing/index.ts';
import { logicContent } from './logic-content.ts';

const root = contentRoot(join(dirname(fileURLToPath(import.meta.url)), '..', '..'));
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

describe('the fixture world', () => {
  it('is one lesson, fx-first, taught by Pip the Panda: 2 guided tries and 3 scored exercises, no variant', () => {
    expect(
      content.lessons.map((lesson) => [
        lesson.id,
        lesson.world,
        lesson.character,
        lesson.guided.map((def) => def.type),
        lesson.exercises.map((def) => def.type),
        lesson.variants?.length,
      ]),
    ).toEqual([
      [
        'fx-first',
        'pattern-pond',
        'panda',
        ['choice', 'order'],
        ['choice', 'order', 'choice'],
        undefined,
      ],
    ]);
  });

  it('has no boss: the world names none and the content has no mini-game', () => {
    expect(content.minigames).toEqual([]);
    const [main] = tracks.tracks;
    expect(tracks.tracks).toHaveLength(1);
    expect(main).toMatchObject({ id: 'puzzles', kind: 'main' });
    expect(main?.worlds).toEqual([
      expect.objectContaining({ id: 'pattern-pond', order: 1, habitat: 'river' }),
    ]);
    expect(main?.worlds[0]).not.toHaveProperty('boss');
  });

  it('has the thinker rank at the start and 2 generic badges', () => {
    expect(tracks.ranks).toEqual([{ id: 'thinker', after: 'start' }]);
    expect(badges.map((badge) => badge.id)).toEqual(['first-lesson', 'star-collector']);
  });
});

describe('texts and the core', () => {
  it('names the subject, the track and the world in the English bundle and gives every character a name and a topic', () => {
    const en = locales.en as Record<string, Record<string, unknown>> | undefined;
    expect((en?.common?.app as { title?: string } | undefined)?.title).toBe('Logic');
    expect(en?.journey).toMatchObject({
      tracks: { puzzles: 'Puzzle Paths' },
      worlds: { 'pattern-pond': 'Pattern Pond' },
      ranks: { thinker: 'Thinker' },
    });
    for (const character of ['owl', ...Object.keys(LOGIC_CHARACTERS)]) {
      expect(en?.characters?.[character], character).toBeDefined();
    }
    expect(en?.characters).toMatchObject({ panda: { name: 'Pip' } });
    const topics = en?.common?.topic as Record<string, string> | undefined;
    expect(topics?.puzzle).toBe('Puzzle');
  });

  it('is a card core under the subject id, with the same characters as the content', () => {
    expect(logicCore.id).toBe('logic');
    expect(logicCore.characters).toBe(LOGIC_CHARACTERS);
    expect(Object.keys(LOGIC_CHARACTERS)).toEqual(['panda']);
  });
});
