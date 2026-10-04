import { describe, expect, it } from 'vitest';
import { exerciseNote } from '@learn/platform-core/domain/notes';
import { mathCore } from '../../core/math-core.ts';
import { MATH_NOTES } from '../../core/notes.ts';
import type { MathFeedback, MathHintPayload } from '../../core/notes.ts';
import { play, playSolution, playWrongThenSolve, starsFor } from '../../testing/play.ts';
import type { ArrayAction, ArrayDef } from './def.ts';
import { arrayKind as kind } from './kind.ts';
import { ARRAY_SAMPLES } from './samples.ts';
import { arraySolution, arrayWrongAction } from './solution.ts';
import { ARRAY_MAX, covers, inRange, isAccepted, isSwapped, reasonKeyOf } from './shape.ts';

const { guided, fixed, free, full, single, withReason } = ARRAY_SAMPLES;

const make = (rows: number, cols: number): ArrayAction => ({ type: 'make-array', rows, cols });

describe('the array arithmetic', () => {
  it('the grid is 6 x 6: a side is a whole number from 1 to 6', () => {
    expect(ARRAY_MAX).toBe(6);
    for (const count of [1, 2, 6]) expect(inRange(count), String(count)).toBe(true);
    for (const count of [0, 7, -1, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(inRange(count), String(count)).toBe(false);
    }
  });

  it('accepts rows x cols; cols x rows too only when the rows are free', () => {
    expect(isAccepted(fixed, { rows: 3, cols: 4 })).toBe(true);
    expect(isAccepted(fixed, { rows: 4, cols: 3 })).toBe(false);
    expect(isAccepted(free, { rows: 4, cols: 3 })).toBe(true);
    expect(isAccepted(free, { rows: 3, cols: 4 })).toBe(true);
    expect(isAccepted(free, { rows: 3, cols: 3 })).toBe(false);
    expect(isAccepted(fixed, { rows: 3, cols: 5 })).toBe(false);
    expect(isAccepted(fixed, { rows: 2, cols: 6 })).toBe(false);
  });

  it('a square array is its own swap, accepted either way', () => {
    expect(isAccepted(full, { rows: 6, cols: 6 })).toBe(true);
    expect(isSwapped(full, { rows: 6, cols: 6 })).toBe(true);
  });

  it('the swapped shape is only noted where the rows are fixed, and only for exactly that shape', () => {
    expect(isSwapped(fixed, { rows: 4, cols: 3 })).toBe(true);
    expect(isSwapped(free, { rows: 3, cols: 4 })).toBe(false);
    // The same number of dots in another shape is not the swap.
    expect(isSwapped(fixed, { rows: 2, cols: 6 })).toBe(false);
    expect(isSwapped(fixed, { rows: 3, cols: 5 })).toBe(false);
    expect(isSwapped(fixed, { rows: 3, cols: 4 })).toBe(false);
  });

  it('finds the reason of exactly the shape it names', () => {
    expect(reasonKeyOf(withReason, { rows: 2, cols: 4 })).toBe('lessons:bugs.array-short');
    expect(reasonKeyOf(withReason, { rows: 4, cols: 2 })).toBeUndefined();
    expect(reasonKeyOf(withReason, { rows: 2, cols: 5 })).toBeUndefined();
    expect(reasonKeyOf(fixed, { rows: 3, cols: 3 })).toBeUndefined();
  });

  it('a shape covers the cells from the top-left corner to its bottom-right one', () => {
    const shape = { rows: 3, cols: 4 };
    expect(covers(shape, 0, 0)).toBe(true);
    expect(covers(shape, 3, 2)).toBe(true);
    expect(covers(shape, 4, 2)).toBe(false);
    expect(covers(shape, 3, 3)).toBe(false);
    const cells = Array.from({ length: 36 }, (_, index) =>
      covers(shape, index % 6, Math.floor(index / 6)),
    );
    expect(cells.filter(Boolean)).toHaveLength(12);
  });
});

describe('array checking', () => {
  it('starts fresh', () => {
    expect(kind.init(fixed)).toEqual({
      def: fixed,
      moves: 0,
      solved: false,
      errors: 0,
      hintLevel: 0,
    });
  });

  it('the right shape solves and counts the move, with 0 errors', () => {
    const step = kind.act(kind.init(fixed), make(3, 4), null);
    expect(step.outcome).toEqual({ kind: 'solved' });
    expect(step.state).toMatchObject({ solved: true, errors: 0, moves: 1 });
  });

  it('rows fixed: the swapped shape is wrong (an error, a move, the shape reported)', () => {
    const step = kind.act(kind.init(fixed), make(4, 3), null);
    expect(step.outcome).toEqual({ kind: 'wrong', rows: 4, cols: 3 });
    expect(step.state).toMatchObject({ solved: false, errors: 1, moves: 1 });
  });

  it('rows free: both orders solve', () => {
    expect(kind.act(kind.init(free), make(4, 3), null).outcome).toEqual({ kind: 'solved' });
    const swapped = kind.act(kind.init(free), make(3, 4), null);
    expect(swapped.outcome).toEqual({ kind: 'solved' });
    expect(swapped.state).toMatchObject({ solved: true, errors: 0, moves: 1 });
  });

  it('any other shape is wrong: one dot too many or few, a row or column off, the same number of dots', () => {
    for (const [rows, cols] of [
      [3, 5],
      [3, 3],
      [2, 4],
      [4, 4],
      [1, 1],
      [6, 6],
      [2, 6],
      [6, 2],
    ] as const) {
      const step = kind.act(kind.init(fixed), make(rows, cols), null);
      expect(step.outcome, `${String(rows)} x ${String(cols)}`).toEqual({
        kind: 'wrong',
        rows,
        cols,
      });
      expect(step.state.errors).toBe(1);
    }
  });

  it('a wrong try never blocks the right one; two wrong tries cost two errors', () => {
    const state = play(fixed, [make(4, 3), make(3, 3), make(3, 4)]);
    expect(state).toMatchObject({ solved: true, errors: 2, moves: 3 });
  });

  it('the whole grid and a single row are plain shapes too', () => {
    expect(kind.act(kind.init(full), make(6, 6), null).outcome).toEqual({ kind: 'solved' });
    expect(kind.act(kind.init(single), make(1, 5), null).outcome).toEqual({ kind: 'solved' });
    expect(kind.act(kind.init(single), make(5, 1), null).outcome).toEqual({
      kind: 'wrong',
      rows: 5,
      cols: 1,
    });
  });

  it('a size off the grid is invalid: nothing is checked, no move and no error counts', () => {
    for (const [rows, cols] of [
      [0, 4],
      [3, 0],
      [7, 4],
      [3, 7],
      [-1, 4],
      [2.5, 4],
      [3, Number.NaN],
    ] as const) {
      const state = kind.init(fixed);
      const step = kind.act(state, make(rows, cols), null);
      expect(step.outcome, `${String(rows)} x ${String(cols)}`).toEqual({ kind: 'invalid' });
      expect(step.state).toBe(state);
    }
    // The shape of a def whose rows or columns were wrong would otherwise match here.
    const outOfRange: ArrayDef = { ...fixed, rows: 7 };
    expect(kind.act(kind.init(outOfRange), make(7, 4), null).outcome).toEqual({ kind: 'invalid' });
  });

  it('ignores every action once solved, so a late tap never rescores it', () => {
    const solved = kind.act(kind.init(fixed), make(3, 4), null).state;
    for (const action of [make(2, 2), make(3, 4), make(9, 9)]) {
      const step = kind.act(solved, action, null);
      expect(step.outcome).toEqual({ kind: 'ignored' });
      expect(step.state).toBe(solved);
    }
  });
});

describe('array hints', () => {
  it('level 1 says rows go across, level 2 gives the row total, level 3 outlines the rows', () => {
    const first = kind.hint(kind.init(fixed), 1, null);
    expect(first.hint).toEqual({ kind: 'array', level: 1 });
    expect(first.state).toMatchObject({ hintLevel: 1, solved: false, errors: 0 });
    const second = kind.hint(first.state, 2, null);
    expect(second.hint).toEqual({ kind: 'array', level: 2, cols: 4 });
    expect(second.state.hintLevel).toBe(2);
    const third = kind.hint(second.state, 3, null);
    expect(third.hint).toEqual({ kind: 'array', level: 3, fillRows: 3 });
    expect(third.state.hintLevel).toBe(3);
    // The rows are outlined, but the child still has to make the array and check it.
    expect(third.state.solved).toBe(false);
    expect(kind.act(third.state, make(3, 4), null).outcome).toEqual({ kind: 'solved' });
  });

  it('reads the def: the row total is the columns, the rows outlined are the rows', () => {
    expect(kind.hint(kind.init(free), 2, null).hint).toMatchObject({ cols: 3 });
    expect(kind.hint(kind.init(free), 3, null).hint).toMatchObject({ fillRows: 4 });
    expect(kind.hint(kind.init(single), 2, null).hint).toMatchObject({ cols: 5 });
    expect(kind.hint(kind.init(full), 3, null).hint).toMatchObject({ fillRows: 6 });
  });
});

describe('array stars', () => {
  const solvedAt = (hintLevel: 0 | 1 | 2 | 3, errors: number): number =>
    kind.stars({ ...kind.init(fixed), solved: true, hintLevel, errors });

  it('caps stars by hint level and errors, like the card kit', () => {
    expect([
      solvedAt(0, 0),
      solvedAt(1, 0),
      solvedAt(0, 1),
      solvedAt(0, 2),
      solvedAt(2, 0),
      solvedAt(3, 0),
    ]).toEqual([3, 2, 2, 1, 1, 1]);
  });
});

describe('array solution', () => {
  it('makes the def shape and solves every sample with 0 errors and 3 stars', () => {
    expect(arraySolution(fixed)).toEqual([make(3, 4)]);
    expect(arraySolution(free)).toEqual([make(4, 3)]);
    for (const def of Object.values(ARRAY_SAMPLES)) {
      const solved = playSolution(def);
      expect(solved, def.id).toMatchObject({ solved: true, errors: 0 });
      expect(starsFor(solved), def.id).toBe(3);
    }
  });

  it('the wrong action is one more column, one fewer when the array is 6 wide, and costs exactly 1 error', () => {
    expect(arrayWrongAction(fixed)).toEqual([make(3, 5)]);
    expect(arrayWrongAction(full)).toEqual([make(6, 5)]);
    expect(arrayWrongAction({ ...fixed, cols: 6 })).toEqual([make(3, 5)]);
    for (const def of Object.values(ARRAY_SAMPLES)) {
      expect(play(def, arrayWrongAction(def)), def.id).toMatchObject({
        errors: 1,
        solved: false,
      });
      const result = playWrongThenSolve(def);
      expect(result, def.id).toMatchObject({ errors: 1, solved: true });
      expect(starsFor(result), def.id).toBe(2);
    }
  });

  it('the wrong action is wrong for every shape on the grid, rows fixed or free', () => {
    for (let rows = 1; rows <= ARRAY_MAX; rows += 1) {
      for (let cols = 1; cols <= ARRAY_MAX; cols += 1) {
        for (const fixedRows of [true, false]) {
          const def: ArrayDef = { ...fixed, rows, cols, fixedRows };
          expect(
            play(def, arrayWrongAction(def)),
            `${String(rows)} x ${String(cols)}`,
          ).toMatchObject({
            errors: 1,
            solved: false,
          });
          expect(playSolution(def)).toMatchObject({ errors: 0, solved: true });
        }
      }
    }
  });
});

describe('array reasons', () => {
  it('a shape with a reason is still a plain wrong try for the engine (the UI speaks the reason)', () => {
    const step = kind.act(kind.init(withReason), make(2, 4), null);
    expect(step.outcome).toEqual({ kind: 'wrong', rows: 2, cols: 4 });
    expect(step.state.errors).toBe(1);
    expect(withReason.reasons).toEqual([
      { rows: 2, cols: 4, reasonKey: 'lessons:bugs.array-short' },
    ]);
  });

  it('the guided sample has no reasons', () => {
    expect(guided.reasons).toBeUndefined();
  });
});

describe('array notes', () => {
  const text = (key: string, vars: Readonly<Record<string, string | number>> = {}): string =>
    `${key}${Object.entries(vars)
      .map(([name, value]) => `|${name}=${String(value)}`)
      .join('')}`;
  const noteOf = (feedback: MathFeedback): string | undefined =>
    exerciseNote(text, feedback, { name: 'Owl', stars: 3, vars: {} }, mathCore.notes, false)?.text;
  const note = (feedback: MathFeedback): string | undefined => noteOf(feedback);

  it('a wrong shape: its reason, else the swap note, else the count note', () => {
    expect(note({ kind: 'array-wrong', reasonKey: 'lessons:bugs.x' })).toBe('lessons:bugs.x');
    expect(note({ kind: 'array-wrong', reasonKey: 'lessons:bugs.x', swapped: true })).toBe(
      'lessons:bugs.x',
    );
    expect(note({ kind: 'array-wrong', swapped: true })).toBe('math.notes.array-swapped');
    expect(note({ kind: 'array-wrong' })).toBe('math.notes.array-wrong');
    expect(note({ kind: 'array-wrong', swapped: false })).toBe('math.notes.array-wrong');
  });

  it('is an error note (the easier offer rides on it), in the attention tone', () => {
    expect(MATH_NOTES['array-wrong']).toMatchObject({ tone: 'attention', error: true });
    expect(
      exerciseNote(
        text,
        { kind: 'array-wrong' },
        { name: 'Owl', stars: 3, vars: {} },
        mathCore.notes,
        true,
      ),
    ).toEqual({ text: 'math.notes.array-wrong exercise.easier-offer', tone: 'attention' });
  });

  it('words each hint level: rows go across, the row total, the answer', () => {
    const hintNote = (hint: MathHintPayload): string | undefined => noteOf({ kind: 'hint', hint });
    expect(hintNote({ kind: 'array', level: 1 })).toBe('math.hints.array-rows');
    expect(hintNote({ kind: 'array', level: 2, cols: 4 })).toBe(
      'math.hints.array-row-total|cols=4',
    );
    expect(hintNote({ kind: 'array', level: 2 })).toBe('cards.hint-look');
    expect(hintNote({ kind: 'array', level: 3, fillRows: 3 })).toBe('exercise.hint-answer');
  });
});
