// The authored math content: every exercise plays through its own kind, every sum is right, and every text it or the app shell reads
// exists.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compileAll } from '@learn/platform-content/compile-all';
import type { LocaleTree } from '@learn/platform-content/schema';
import type { CardFeedback } from '@learn/platform-core/domain/exercise/kinds/cards/notes';
import { exerciseNote } from '@learn/platform-core/domain/notes';
import type { Resolve } from '@learn/platform-core/domain/notes';
import { MATH_CHARACTERS, mathCore } from '../core/math-core.ts';
import type { MathFeedback } from '../core/notes.ts';
import type { MathContent, MathExerciseDef } from '../core/types.ts';
import { playSolution, playWrongThenSolve, starsFor } from '../testing/play.ts';
import { mathContent } from './math-content.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content');
const compiled = compileAll<MathContent>(mathContent, root);
const { content, tracks, badges, locales } = compiled;

function allExercises(): readonly { readonly where: string; readonly exercise: MathExerciseDef }[] {
  const all: { readonly where: string; readonly exercise: MathExerciseDef }[] = [];
  for (const lesson of content.lessons) {
    for (const exercise of [...lesson.guided, ...lesson.exercises, ...(lesson.variants ?? [])]) {
      all.push({ where: `${lesson.id}/${exercise.id}`, exercise });
    }
  }
  for (const minigame of content.minigames) {
    if (minigame.mode !== 'series') continue;
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

describe('the authored world', () => {
  it('is World 1 Number Meadow (Number Train), World 2 Mental Math Mountain (Market Orders) and World 3 Times-Table Forest (Race to 20) in the main track Number Adventures', () => {
    const [main] = tracks.tracks;
    expect(tracks.tracks).toHaveLength(1);
    expect(main).toMatchObject({ id: 'numbers', kind: 'main' });
    expect(main?.worlds).toEqual([
      expect.objectContaining({
        id: 'number-meadow',
        order: 1,
        habitat: 'meadow',
        boss: 'number-train',
      }),
      expect.objectContaining({
        id: 'mental-mountain',
        order: 2,
        habitat: 'mountains',
        boss: 'market-orders',
      }),
      expect.objectContaining({
        id: 'times-forest',
        order: 3,
        habitat: 'forest',
        boss: 'race-to-20',
      }),
    ]);
    expect(new Set(content.lessons.map((lesson) => lesson.world))).toEqual(
      new Set(['number-meadow', 'mental-mountain', 'times-forest']),
    );
  });

  it('has the counter, builder, climber and multiplier ranks and the Number Builder, Mountain Climber, Times Ranger and Star Counter badges', () => {
    expect(tracks.ranks).toEqual([
      { id: 'counter', after: 'start' },
      { id: 'builder', after: 'world:number-meadow' },
      { id: 'climber', after: 'world:mental-mountain' },
      { id: 'multiplier', after: 'world:times-forest' },
    ]);
    expect(badges).toEqual([
      expect.objectContaining({
        id: 'number-builder',
        category: 'milestone',
        condition: { type: 'mastered', scope: 'world:number-meadow', thresholds: [1] },
      }),
      expect.objectContaining({
        id: 'mountain-climber',
        category: 'milestone',
        condition: { type: 'mastered', scope: 'world:mental-mountain', thresholds: [1] },
      }),
      expect.objectContaining({
        id: 'times-ranger',
        category: 'milestone',
        condition: { type: 'mastered', scope: 'world:times-forest', thresholds: [1] },
      }),
      expect.objectContaining({
        id: 'star-counter',
        condition: { type: 'stars-total', thresholds: [10, 30] },
      }),
    ]);
  });

  it('keeps nothing of the retired demo world adding: no lesson, round, rank, badge or text of it (stored progress is tolerated, m13.4)', () => {
    const retired = ['adding', 'add-within-5', 'add-within-10', 'take-away', 'number-parade'];
    const ids = [
      ...content.lessons.map((lesson) => lesson.id),
      ...content.lessons.map((lesson) => lesson.concept),
      ...content.minigames.map((game) => game.id),
      ...content.minigames.map((game) => game.concept),
      ...content.minigames.map((game) => game.unlockAfter),
      ...tracks.tracks.flatMap((track) => track.worlds.map((world) => world.id)),
      ...tracks.ranks.map((rank) => rank.id),
      ...badges.map((badge) => badge.id),
    ];
    for (const id of retired) expect(ids, id).not.toContain(id);
    expect(ids).not.toContain('adder');
    expect(ids).not.toContain('first-sums');
    const texts = JSON.stringify(locales.en);
    for (const text of ['Adding with Hedgie', 'Number Parade', 'First Sums', 'Adder', 'plus 1']) {
      expect(texts, text).not.toContain(text);
    }
  });
});

function lookup(tree: LocaleTree | undefined, path: string): string | undefined {
  let node: string | LocaleTree | undefined = tree;
  for (const segment of path.split('.')) {
    if (typeof node !== 'object') return undefined;
    node = node[segment];
  }
  return typeof node === 'string' ? node : undefined;
}

/** i18next-alike over the built `en` locale: `namespace:path` (default `common`), `_one` / `_other` on `count`,
 * `{{var}}` interpolation; a missing key throws. */
const resolve: Resolve = (key, vars = {}) => {
  const [namespace = 'common', path = key] = key.includes(':') ? key.split(':') : ['common', key];
  const tree = locales.en?.[namespace];
  const suffix = typeof vars.count === 'number' ? (vars.count === 1 ? '_one' : '_other') : '';
  const text = lookup(tree, `${path}${suffix}`) ?? lookup(tree, path);
  if (text === undefined) throw new Error(`missing text key "${key}"`);
  return text.replace(/\{\{(\w+)\}\}/g, (whole, name: string) => String(vars[name] ?? whole));
};

describe('texts', () => {
  it('the app shell texts every subject supplies say "Math"', () => {
    expect(resolve('app.title')).toBe('Math');
    for (const key of [
      'voice-check.sentence',
      'placement.offer-question',
      'placement.summary-none-body',
    ]) {
      expect(resolve(key), key).toMatch(/math/i);
    }
    expect(resolve('time-limit.early-body', { time: '09:00' })).toBe(
      'Math opens at 09:00. See you soon!',
    );
  });

  it('the number pad (the card kit’s), the topic and every character resolve', () => {
    expect(resolve('cards.pad-label')).toBe('Number pad');
    expect(resolve('cards.erase')).toBe('Delete');
    expect(resolve('cards.entry-label', { value: 7 })).toBe('Your answer: 7');
    expect(resolve('topic.counter')).toBe('Counter');
    for (const lesson of content.lessons) {
      expect(resolve(`characters:${lesson.character}.name`)).not.toBe('');
    }
    for (const character of Object.keys(MATH_CHARACTERS)) {
      expect(resolve(`characters:${character}.name`), character).not.toBe('');
    }
  });

  it('keeps no text of the retired problem card in the English bundle', () => {
    const common = locales.en?.common as Record<string, unknown> | undefined;
    // `math.notes` / `math.hints` / `math.line` / `math.pv` / `math.array` hold the number line's (m13.6), the place-value kind's
    // (m13.7) and the array kind's (m13.8) texts, not the retired card's.
    const math = (common?.math ?? {}) as Record<string, unknown>;
    for (const key of [
      'pad-label',
      'erase',
      'entry-label',
      'hint-dots',
      'hint-count-on',
      'hint-count-back',
    ]) {
      expect(math[key], `math.${key}`).toBeUndefined();
    }
    expect(
      (common?.exercise as Record<string, unknown> | undefined)?.['hint-look'],
    ).toBeUndefined();
  });

  it('the array texts are the spec ones', () => {
    expect(resolve('math.notes.array-wrong')).toBe('Count the rows and the dots in each row.');
    expect(resolve('math.notes.array-swapped')).toBe('Same number, but count the rows again.');
    expect(resolve('math.hints.array-rows')).toBe('Rows go across, like lines in a book.');
    expect(resolve('math.hints.array-row-total', { cols: 4 })).toBe('Each row has 4.');
  });

  it('the number line texts are the spec ones', () => {
    expect(resolve('math.notes.line-wrong')).toBe(
      'Not there yet. Look at the numbers on the line.',
    );
    expect(resolve('math.hints.line-benchmark', { benchmark: 500 })).toBe('Find the middle: 500.');
    expect(resolve('math.hints.line-labels')).toBe('Read the numbers on every mark.');
  });

  it('every note the Owl bubble can say resolves, with no placeholder left', () => {
    const feedback: readonly (CardFeedback | MathFeedback)[] = [
      { kind: 'wrong-answer' },
      { kind: 'number-wrong' },
      { kind: 'order-wrong' },
      { kind: 'solved' },
      { kind: 'hint', hint: { kind: 'choice', level: 1, reveal: false } },
      { kind: 'hint', hint: { kind: 'choice', level: 3, reveal: true } },
      { kind: 'hint', hint: { kind: 'number-entry', level: 1, reveal: false } },
      { kind: 'hint', hint: { kind: 'number-entry', level: 2, reveal: false, digit: '4' } },
      { kind: 'hint', hint: { kind: 'number-entry', level: 3, reveal: true } },
      { kind: 'line-wrong' },
      { kind: 'hint', hint: { kind: 'number-line', level: 1, benchmark: 500 } },
      { kind: 'hint', hint: { kind: 'number-line', level: 2 } },
      { kind: 'hint', hint: { kind: 'number-line', level: 3, reveal: 300 } },
      { kind: 'array-wrong' },
      { kind: 'array-wrong', swapped: true },
      { kind: 'hint', hint: { kind: 'array', level: 1 } },
      { kind: 'hint', hint: { kind: 'array', level: 2, cols: 4 } },
      { kind: 'hint', hint: { kind: 'array', level: 3, fillRows: 3 } },
    ];
    for (const stars of [1, 2, 3] as const) {
      for (const entry of feedback) {
        for (const offer of [false, true]) {
          const note = exerciseNote(
            resolve,
            entry,
            { name: 'Owl', stars, vars: {} },
            mathCore.notes,
            offer,
          );
          expect(note?.text, JSON.stringify(entry)).toMatch(/^[^{]+$/);
        }
      }
    }
  });
});

describe('the voice inventory covers every note', () => {
  const voice = compiled.voiceTexts.entries;
  const notes = (source: string): string[] =>
    voice.filter((entry) => entry.source === source).map((entry) => entry.text);

  it('has the card notes of the two kinds the world uses: wrong, hints by level, the 1-3 star praise', () => {
    const plain = notes('exercise-note');
    for (const text of [
      'Not quite! Try again.',
      'Not that number. Try again!',
      'One choice is ruled out.',
      'Here is the answer.',
      'Look closely.',
      'It starts with 7.',
      'Amazing!',
      'Well done!',
      'Good try!',
    ]) {
      expect(plain, text).toContain(text);
    }
    expect(plain.filter((text) => /^It starts with \d\.$/.test(text))).toHaveLength(10);
  });

  it('has the wrong notes joined with the easier offer', () => {
    expect(notes('exercise-note-easier-offer')).toEqual(
      expect.arrayContaining([
        'Not quite! Try again. This one is tricky. Want an easier one?',
        'Not that number. Try again! This one is tricky. Want an easier one?',
      ]),
    );
  });

  it('has the notes of the kinds the worlds use beyond the card pad and cards (order, place-value, number-line, array)', () => {
    const plain = notes('exercise-note');
    for (const text of [
      'Not that one. Try another!',
      'Count the blocks in each column again.',
      'Not there yet. Look at the numbers on the line.',
      'Count the rows and the dots in each row.',
      'Same number, but count the rows again.',
      'Rows go across, like lines in a book.',
    ]) {
      expect(plain, text).toContain(text);
    }
  });
});
