import { describe, expect, it } from 'vitest';
import { play, playSolution, playWrongThenSolve, starsFor } from '../../testing/play.ts';
import type { NumberLineDef, PlaceAction } from './def.ts';
import { numberLineKind as kind } from './kind.ts';
import { NUMBER_LINE_SAMPLES } from './samples.ts';
import { numberLineSolution, numberLineWrongAction } from './solution.ts';
import {
  benchmarkOf,
  gapCount,
  isAccepted,
  isTick,
  labelledTicks,
  nearestInteger,
  nearestTick,
  tickValues,
} from './ticks.ts';

const { exact100, exact10, exact50, estimate, labelList, withReason } = NUMBER_LINE_SAMPLES;

const place = (value: number): PlaceAction => ({ type: 'place', value });

describe('the line arithmetic', () => {
  it('counts the gaps and lists every tick, both ends included', () => {
    expect(gapCount(exact100)).toBe(10);
    expect(tickValues(exact10)).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    expect(tickValues({ from: 200, to: 400, step: 100 })).toEqual([200, 300, 400]);
  });

  it('knows a tick from a value between ticks or off the line', () => {
    expect(isTick(exact100, 300)).toBe(true);
    expect(isTick(exact100, 0)).toBe(true);
    expect(isTick(exact100, 1000)).toBe(true);
    expect(isTick(exact100, 340)).toBe(false);
    expect(isTick(exact100, -100)).toBe(false);
    expect(isTick(exact100, 1100)).toBe(false);
  });

  it('snaps to the nearest tick (a half-way point goes right) and to the nearest whole number, never off the line', () => {
    expect(nearestTick(exact100, 340)).toBe(300);
    expect(nearestTick(exact100, 360)).toBe(400);
    expect(nearestTick(exact100, 350)).toBe(400);
    expect(nearestTick(exact100, -50)).toBe(0);
    expect(nearestTick(exact100, 5000)).toBe(1000);
    expect(nearestInteger(exact100, 340.4)).toBe(340);
    expect(nearestInteger(exact100, 340.6)).toBe(341);
    expect(nearestInteger(exact100, -3)).toBe(0);
    expect(nearestInteger(exact100, 1004)).toBe(1000);
  });

  it('the middle tick: the middle of the line, and for an odd number of gaps the right one of the two', () => {
    expect(benchmarkOf(exact100)).toBe(500);
    expect(benchmarkOf(exact10)).toBe(50);
    expect(benchmarkOf(exact50)).toBe(250);
    expect(benchmarkOf({ from: 100, to: 600, step: 100 })).toBe(400);
    expect(benchmarkOf({ from: 0, to: 300, step: 100 })).toBe(200);
  });

  it('numbers the ticks the labels say: the ends, all, or a list', () => {
    expect(labelledTicks(exact100)).toEqual([0, 1000]);
    expect(labelledTicks({ ...exact10, labels: 'all' })).toHaveLength(11);
    expect(labelledTicks(labelList)).toEqual([0, 500, 1000]);
  });

  it('accepts exactly the target, or within the tolerance both ends included', () => {
    expect(isAccepted(exact100, 300)).toBe(true);
    expect(isAccepted(exact100, 301)).toBe(false);
    expect(isAccepted(exact100, 200)).toBe(false);
    expect(isAccepted(estimate, 340)).toBe(true);
    expect(isAccepted(estimate, 290)).toBe(true);
    expect(isAccepted(estimate, 390)).toBe(true);
    expect(isAccepted(estimate, 289)).toBe(false);
    expect(isAccepted(estimate, 391)).toBe(false);
  });
});

describe('number-line checking: an exact item', () => {
  it('starts fresh', () => {
    expect(kind.init(exact100)).toEqual({
      def: exact100,
      moves: 0,
      solved: false,
      errors: 0,
      hintLevel: 0,
    });
  });

  it('the target tick solves and counts the move, with 0 errors', () => {
    const step = kind.act(kind.init(exact100), place(300), null);
    expect(step.outcome).toEqual({ kind: 'solved' });
    expect(step.state).toMatchObject({ solved: true, errors: 0, moves: 1 });
  });

  it('another tick, and a value between ticks, is wrong: an error, a move, the value reported, not solved', () => {
    for (const value of [200, 400, 0, 1000, 299, 301]) {
      const step = kind.act(kind.init(exact100), place(value), null);
      expect(step.outcome, String(value)).toEqual({ kind: 'wrong', value });
      expect(step.state, String(value)).toMatchObject({ solved: false, errors: 1, moves: 1 });
    }
  });

  it('a wrong try never blocks the right one; two wrong tries cost two errors', () => {
    const state = play(exact100, [place(200), place(400), place(300)]);
    expect(state).toMatchObject({ solved: true, errors: 2, moves: 3 });
  });

  it('ignores every action once solved, so a late tap never rescores it', () => {
    const solved = kind.act(kind.init(exact100), place(300), null).state;
    const step = kind.act(solved, place(200), null);
    expect(step.outcome).toEqual({ kind: 'ignored' });
    expect(step.state).toBe(solved);
  });
});

describe('number-line checking: an estimate item', () => {
  it('accepts the target and every value within half an interval of it, the borders included', () => {
    for (const value of [340, 290, 291, 389, 390, 300, 350]) {
      expect(kind.act(kind.init(estimate), place(value), null).outcome, String(value)).toEqual({
        kind: 'solved',
      });
    }
  });

  it('refuses a value just outside the tolerance, on either side', () => {
    for (const value of [289, 391, 200, 400, 0, 1000]) {
      const step = kind.act(kind.init(estimate), place(value), null);
      expect(step.outcome, String(value)).toEqual({ kind: 'wrong', value });
      expect(step.state.errors).toBe(1);
    }
  });

  it('the half interval of an odd step (2.5 for step 5) takes the whole numbers within it', () => {
    const odd: NumberLineDef = {
      ...estimate,
      from: 0,
      to: 50,
      step: 5,
      target: 17,
      tolerance: 2.5,
    };
    const accepted = [15, 16, 17, 18, 19].every(
      (value) => kind.act(kind.init(odd), place(value), null).outcome.kind === 'solved',
    );
    expect(accepted).toBe(true);
    for (const value of [14, 20]) {
      expect(kind.act(kind.init(odd), place(value), null).outcome.kind).toBe('wrong');
    }
  });
});

describe('number-line hints', () => {
  it('level 1 labels the middle tick, level 2 every tick, level 3 puts the marker on the target', () => {
    const first = kind.hint(kind.init(exact100), 1, null);
    expect(first.hint).toEqual({ kind: 'number-line', level: 1, benchmark: 500 });
    expect(first.state).toMatchObject({ hintLevel: 1, solved: false, errors: 0 });
    const second = kind.hint(first.state, 2, null);
    expect(second.hint).toEqual({ kind: 'number-line', level: 2 });
    expect(second.state.hintLevel).toBe(2);
    const third = kind.hint(second.state, 3, null);
    expect(third.hint).toEqual({ kind: 'number-line', level: 3, reveal: 300 });
    expect(third.state.hintLevel).toBe(3);
    // The marker is shown at the target, but the child still has to check it.
    expect(third.state.solved).toBe(false);
    expect(kind.act(third.state, place(300), null).outcome).toEqual({ kind: 'solved' });
  });

  it('level 1 names the middle of the line the item has', () => {
    expect(kind.hint(kind.init(exact10), 1, null).hint).toMatchObject({ benchmark: 50 });
    expect(kind.hint(kind.init(exact50), 1, null).hint).toMatchObject({ benchmark: 250 });
    expect(kind.hint(kind.init(estimate), 3, null).hint).toMatchObject({ reveal: 340 });
  });
});

describe('number-line stars', () => {
  const solvedAt = (hintLevel: 0 | 1 | 2 | 3, errors: number): number =>
    kind.stars({ ...kind.init(exact100), solved: true, hintLevel, errors });

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

describe('number-line solution', () => {
  it('places the target and solves every sample with 0 errors and 3 stars', () => {
    expect(numberLineSolution(exact100)).toEqual([place(300)]);
    for (const def of Object.values(NUMBER_LINE_SAMPLES)) {
      const solved = playSolution(def);
      expect(solved, def.id).toMatchObject({ solved: true, errors: 0 });
      expect(starsFor(solved), def.id).toBe(3);
    }
  });

  it('the wrong action is one tick right of the target, one left when that is past the end, and costs exactly 1 error', () => {
    expect(numberLineWrongAction(exact100)).toEqual([place(400)]);
    expect(numberLineWrongAction({ ...exact100, target: 1000 })).toEqual([place(900)]);
    expect(numberLineWrongAction({ ...exact100, target: 900 })).toEqual([place(1000)]);
    expect(numberLineWrongAction({ ...exact100, target: 0 })).toEqual([place(100)]);
    for (const def of Object.values(NUMBER_LINE_SAMPLES)) {
      expect(play(def, numberLineWrongAction(def)), def.id).toMatchObject({
        errors: 1,
        solved: false,
      });
      const result = playWrongThenSolve(def);
      expect(result, def.id).toMatchObject({ errors: 1, solved: true });
      expect(starsFor(result), def.id).toBe(2);
    }
  });

  it('the wrong action stays wrong at both ends of an estimate line (a whole interval is outside half an interval)', () => {
    for (const target of [5, 995]) {
      const edge: NumberLineDef = { ...estimate, target };
      expect(playWrongThenSolve(edge)).toMatchObject({ errors: 1, solved: true });
    }
  });
});

describe('number-line reasons', () => {
  it('a value with a reason is still a plain wrong try for the engine (the UI speaks the reason)', () => {
    const step = kind.act(kind.init(withReason), place(50), null);
    expect(step.outcome).toEqual({ kind: 'wrong', value: 50 });
    expect(step.state.errors).toBe(1);
    expect(withReason.reasons).toEqual([{ value: 50, reasonKey: 'lessons:bugs.ticks-not-gaps' }]);
  });
});
