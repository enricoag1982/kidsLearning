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

/** `a + b` / `a - b` as the kid reads it on the card, and its result. */
function sumOf(big: string | undefined): { readonly text: string; readonly result: number } | null {
  const match = /^(\d+) ([+-]) (\d+)$/.exec(big ?? '');
  if (match === null) return null;
  const a = Number(match[1]);
  const b = Number(match[3]);
  return { text: big ?? '', result: match[2] === '+' ? a + b : a - b };
}

describe('the authored world', () => {
  it('has 3 lessons of 1 guided and 4 exercises, taught by Hedgie then Owl', () => {
    const byOrder = [...content.lessons].sort((a, b) => a.order - b.order);
    expect(
      byOrder.map((lesson) => [
        lesson.id,
        lesson.world,
        lesson.order,
        lesson.character,
        lesson.guided.length,
        lesson.exercises.length,
      ]),
    ).toEqual([
      ['add-within-5', 'adding', 1, 'hedgehog', 1, 4],
      ['add-within-10', 'adding', 2, 'owl', 1, 4],
      ['take-away', 'adding', 3, 'owl', 1, 4],
    ]);
  });

  it('keeps every lesson, exercise, round and concept id of the build before the card kit (stored progress keeps matching)', () => {
    expect(
      content.lessons.map((lesson) => [
        lesson.id,
        lesson.concept,
        lesson.guided.map((exercise) => exercise.id),
        lesson.exercises.map((exercise) => exercise.id),
      ]),
    ).toEqual([
      [
        'add-within-10',
        'add-within-10',
        ['add10-g1'],
        ['add10-01', 'add10-02', 'add10-03', 'add10-04'],
      ],
      ['add-within-5', 'add-within-5', ['add5-g1'], ['add5-01', 'add5-02', 'add5-03', 'add5-04']],
      [
        'take-away',
        'take-away',
        ['takeaway-g1'],
        ['takeaway-01', 'takeaway-02', 'takeaway-03', 'takeaway-04'],
      ],
    ]);
    expect(
      content.minigames.map((game) => [
        game.id,
        game.concept,
        game.rounds.map((round) => round.id),
      ]),
    ).toEqual([
      [
        'number-parade',
        'add-within-10',
        [
          'number-parade-r1',
          'number-parade-r2',
          'number-parade-r3',
          'number-parade-r4',
          'number-parade-r5',
          'number-parade-r6',
        ],
      ],
    ]);
    for (const { where, exercise } of allExercises()) {
      expect(exercise.textKey, where).toBe(`lessons:${exercise.id}`);
    }
    for (const lesson of content.lessons) {
      expect(lesson.demo.textKey).toBe(`lessons:${lesson.id}.demo`);
    }
  });

  it('uses the card kinds choice and number-entry, and both operators', () => {
    const exercises = allExercises().map(({ exercise }) => exercise);
    expect(new Set(exercises.map((exercise) => exercise.type))).toEqual(
      new Set(['choice', 'number-entry']),
    );
    const operators = exercises.map((exercise) => / ([+-]) /.exec(exercise.prompt?.big ?? '')?.[1]);
    expect(new Set(operators)).toEqual(new Set(['+', '-']));
  });

  it('every sum on a card, in an exercise or a demo, is right: the answer is its result, never below zero', () => {
    for (const { where, exercise } of allExercises()) {
      const sum = sumOf(exercise.prompt?.big);
      expect(sum, `${where}: a sum or a difference on the card`).not.toBeNull();
      if (sum === null) continue;
      expect(sum.result, `${where}: ${sum.text} is not below zero`).toBeGreaterThanOrEqual(0);
      if (exercise.type === 'number-entry') {
        expect(exercise.answer, `${where}: ${sum.text}`).toBe(sum.result);
      } else if (exercise.type === 'choice') {
        const matching = exercise.options.filter((option) => option.big === String(sum.result));
        expect(
          matching.map((option) => option.id),
          `${where}: exactly one option is ${String(sum.result)}, and it is the answer`,
        ).toEqual([exercise.answer]);
        expect(
          new Set(exercise.options.map((option) => option.big)).size,
          `${where}: no two options alike`,
        ).toBe(exercise.options.length);
      }
    }
    for (const lesson of content.lessons) {
      const sum = sumOf(lesson.demo.prompt?.big);
      expect(sum, `${lesson.id} demo: a sum or a difference on the card`).not.toBeNull();
      expect(sum?.result ?? -1, `${lesson.id} demo`).toBeGreaterThanOrEqual(0);
    }
  });

  it('ends with the Number Parade world boss: 6 rounds, 3 stars up to 0 mistakes, 2 up to 2', () => {
    const [main] = tracks.tracks;
    expect(main).toMatchObject({ id: 'numbers', kind: 'main' });
    expect(main?.worlds).toEqual([
      expect.objectContaining({ id: 'adding', habitat: 'meadow', boss: 'number-parade' }),
    ]);
    const [boss] = content.minigames;
    expect(boss).toMatchObject({
      id: 'number-parade',
      mode: 'series',
      unlockAfter: 'take-away',
      errors3: 0,
      errors2: 2,
    });
    expect(boss?.rounds).toHaveLength(6);
    expect(boss?.rounds.map((round) => round.type)).toEqual([
      'number-entry',
      'choice',
      'number-entry',
      'number-entry',
      'choice',
      'number-entry',
    ]);
  });

  it('has the counter and adder ranks and 2 badges', () => {
    expect(tracks.ranks).toEqual([
      { id: 'counter', after: 'start' },
      { id: 'adder', after: 'world:adding' },
    ]);
    expect(badges.map((badge) => badge.id)).toEqual(['first-sums', 'star-counter']);
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

  it('has no note of a kind the world does not use (order, place-value)', () => {
    expect(notes('exercise-note')).not.toContain('Not that one. Try another!');
    expect(notes('exercise-note')).not.toContain('Count the blocks in each column again.');
    expect(voice.filter((entry) => /^Here are the \w+\. Now finish!$/.test(entry.text))).toEqual(
      [],
    );
  });
});
