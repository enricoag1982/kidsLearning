import { describe, expect, it } from 'vitest';
import { play, playSolution, playWrongThenSolve, starsFor } from '../../testing/play.ts';
import { PLACE_VALUE_SAMPLES } from '../../testing/place-value-samples.ts';
import type { BuildAction, PlaceValueDef } from './def.ts';
import { placeValueKind as kind } from './kind.ts';
import { digitsOf, valueOf } from './model.ts';
import { placeValueSolution, placeValueWrongAction } from './solution.ts';

const def = PLACE_VALUE_SAMPLES.zero;
const build = (...counts: readonly number[]): BuildAction => ({ type: 'build', counts });
const defOf = (target: number, columns: 3 | 4 = 3): PlaceValueDef => ({
  ...def,
  target,
  columns,
  reasons: undefined,
});

describe('place-value: checking a build', () => {
  it('the target solves, counts the move and 0 errors', () => {
    const step = kind.act(kind.init(def), build(3, 0, 5), null);
    expect(step.outcome).toEqual({ kind: 'solved' });
    expect(step.state).toMatchObject({ solved: true, errors: 0, moves: 1 });
  });

  it('another valid build counts exactly 1 error and 1 move, reports its value and stays answerable', () => {
    const step = kind.act(kind.init(def), build(3, 5, 0), null);
    expect(step.outcome).toEqual({ kind: 'wrong', value: 350 });
    expect(step.state).toMatchObject({ solved: false, errors: 1, moves: 1 });
    const again = kind.act(step.state, build(3, 0, 5), null);
    expect(again.outcome).toEqual({ kind: 'solved' });
    expect(again.state).toMatchObject({ solved: true, errors: 1, moves: 2 });
  });

  it('an empty build is a wrong build like any other: it checks 0', () => {
    const step = kind.act(kind.init(def), build(0, 0, 0), null);
    expect(step.outcome).toEqual({ kind: 'wrong', value: 0 });
    expect(step.state.errors).toBe(1);
  });

  it('every wrong build counts an error, also the same one twice', () => {
    const first = kind.act(kind.init(def), build(3, 5, 0), null).state;
    expect(kind.act(first, build(3, 5, 0), null).state).toMatchObject({ errors: 2, moves: 2 });
  });

  it('a 4-column target is checked over 4 counts', () => {
    const four = PLACE_VALUE_SAMPLES.thousands;
    expect(kind.act(kind.init(four), build(4, 0, 7, 2), null).outcome).toEqual({ kind: 'solved' });
    expect(kind.act(kind.init(four), build(0, 4, 0, 7), null).outcome).toEqual({
      kind: 'wrong',
      value: 407,
    });
  });

  it('a build that does not fit the exercise is invalid: nothing counts, the state is the same object', () => {
    const fresh = kind.init(def);
    for (const counts of [
      [3, 0],
      [3, 0, 5, 0],
      [3, 0, 10],
      [-1, 0, 5],
      [3, 0.5, 5],
      [3, 0, Number.NaN],
    ]) {
      const step = kind.act(fresh, build(...counts), null);
      expect(step.outcome, counts.join()).toEqual({ kind: 'invalid' });
      expect(step.state, counts.join()).toBe(fresh);
    }
    // A 4-count build for a 3-column exercise, and the other way round.
    expect(
      kind.act(kind.init(PLACE_VALUE_SAMPLES.thousands), build(0, 3, 0, 5, 0), null).outcome,
    ).toEqual({ kind: 'invalid' });
    expect(kind.act(fresh, build(0, 3, 0, 5), null).outcome).toEqual({ kind: 'invalid' });
  });

  it('ignores every action once solved: no rescoring', () => {
    const solved = kind.act(kind.init(def), build(3, 0, 5), null).state;
    for (const counts of [build(3, 5, 0), build(3, 0, 5), build(1)]) {
      const step = kind.act(solved, counts, null);
      expect(step.outcome).toEqual({ kind: 'ignored' });
      expect(step.state).toBe(solved);
    }
  });

  it('starts fresh: no move, no error, no hint', () => {
    expect(kind.init(def)).toEqual({ def, moves: 0, solved: false, errors: 0, hintLevel: 0 });
    expect(kind.type).toBe('place-value');
    expect(kind.input).toBe('place');
  });
});

describe('place-value: hints', () => {
  it('1 and 2 only raise the level (the UI shows the column labels, then the numeral)', () => {
    const first = kind.hint(kind.init(def), 1, null);
    expect(first.hint).toEqual({ kind: 'place-value', level: 1 });
    expect(first.state).toMatchObject({ hintLevel: 1, errors: 0, moves: 0, solved: false });
    const second = kind.hint(first.state, 2, null);
    expect(second.hint).toEqual({ kind: 'place-value', level: 2 });
    expect(second.state).toMatchObject({ hintLevel: 2, errors: 0, moves: 0 });
  });

  it('3 gives the target digit of the highest column and nothing for the others; it does not solve', () => {
    const third = kind.hint(kind.init(def), 3, null);
    expect(third.hint).toEqual({ kind: 'place-value', level: 3, fill: [3, 0, 0] });
    expect(third.state).toMatchObject({ hintLevel: 3, solved: false, moves: 0 });
    const hintFill = (target: number, columns: 3 | 4) =>
      kind.hint(kind.init(defOf(target, columns)), 3, null).hint;
    expect(hintFill(4072, 4)).toEqual({ kind: 'place-value', level: 3, fill: [4, 0, 0, 0] });
    // A short number in more columns: the highest column that is not 0.
    expect(hintFill(305, 4)).toEqual({ kind: 'place-value', level: 3, fill: [0, 3, 0, 0] });
    expect(hintFill(42, 3)).toEqual({ kind: 'place-value', level: 3, fill: [0, 4, 0] });
    expect(hintFill(7, 3)).toEqual({ kind: 'place-value', level: 3, fill: [0, 0, 7] });
  });

  it('the child still finishes and checks after hint 3', () => {
    const hinted = kind.hint(kind.init(def), 3, null).state;
    expect(kind.act(hinted, build(3, 0, 5), null).state).toMatchObject({
      solved: true,
      hintLevel: 3,
      errors: 0,
    });
  });

  it('caps stars by hint level and errors', () => {
    const solvedAt = (hintLevel: 0 | 1 | 2 | 3, errors: number): number =>
      kind.stars({ ...kind.init(def), solved: true, hintLevel, errors });
    expect([
      solvedAt(0, 0),
      solvedAt(1, 0),
      solvedAt(2, 0),
      solvedAt(0, 1),
      solvedAt(1, 1),
      solvedAt(0, 2),
      solvedAt(3, 0),
    ]).toEqual([3, 2, 1, 2, 2, 1, 1]);
  });
});

describe('place-value: solution', () => {
  it('builds the target digit by digit, in every column of the exercise', () => {
    expect(placeValueSolution(def)).toEqual([build(3, 0, 5)]);
    expect(placeValueSolution(PLACE_VALUE_SAMPLES.thousands)).toEqual([build(4, 0, 7, 2)]);
    expect(placeValueSolution(defOf(305, 4))).toEqual([build(0, 3, 0, 5)]);
  });

  it('solves every sample with 0 errors and 3 stars', () => {
    for (const sample of Object.values(PLACE_VALUE_SAMPLES)) {
      const solved = playSolution(sample);
      expect(solved, sample.id).toMatchObject({ solved: true, errors: 0 });
      expect(starsFor(solved), sample.id).toBe(3);
    }
  });

  it('the wrong action swaps the tens and the ones when they differ (the classic 305 for 350)', () => {
    expect(placeValueWrongAction(def)).toEqual([build(3, 5, 0)]);
    expect(placeValueWrongAction(PLACE_VALUE_SAMPLES.thousands)).toEqual([build(4, 0, 2, 7)]);
  });

  it('the wrong action adds a one when the tens and the ones are alike, takes one away at 9', () => {
    expect(placeValueWrongAction(defOf(311))).toEqual([build(3, 1, 2)]);
    expect(placeValueWrongAction(defOf(100))).toEqual([build(1, 0, 1)]);
    expect(placeValueWrongAction(defOf(399))).toEqual([build(3, 9, 8)]);
    expect(placeValueWrongAction(defOf(9999, 4))).toEqual([build(9, 9, 9, 8)]);
  });

  it('the wrong action is exactly 1 error for every sample and for the edges, and never blocks solving', () => {
    const edges = [1, 9, 10, 11, 90, 99, 100, 101, 110, 305, 350, 909, 990, 999].map((target) =>
      defOf(target),
    );
    const edges4 = [1, 999, 1000, 4072, 9990, 9999].map((target) => defOf(target, 4));
    for (const sample of [...Object.values(PLACE_VALUE_SAMPLES), ...edges, ...edges4]) {
      const wrong = placeValueWrongAction(sample);
      const afterWrong = play(sample, wrong);
      expect(afterWrong, `${sample.id} ${String(sample.target)}`).toMatchObject({
        errors: 1,
        solved: false,
      });
      expect(valueOf(wrong[0]?.counts ?? []), sample.id).not.toBe(sample.target);
      expect(playWrongThenSolve(sample)).toMatchObject({ errors: 1, solved: true });
      expect(starsFor(playWrongThenSolve(sample))).toBe(2);
    }
  });

  it('the digits of the target are what the solution builds', () => {
    for (const sample of Object.values(PLACE_VALUE_SAMPLES)) {
      expect(placeValueSolution(sample)[0]?.counts).toEqual(
        digitsOf(sample.target, sample.columns),
      );
    }
  });
});
