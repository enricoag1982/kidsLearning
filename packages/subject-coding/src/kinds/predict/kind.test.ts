import { describe, expect, it } from 'vitest';
import type { Tile } from '../../core/tiles.ts';
import type { PredictDef } from '../../core/types.ts';
import { CODING_SAMPLES } from '../../testing/samples.ts';
import { play, playSolution, playWrongThenSolve, starsFor } from '../../testing/play.ts';
import { predictKind as kind } from './kind.ts';
import type { PickCellAction } from './kind.ts';
import { predictSolution, predictWrongAction } from './solution.ts';

const def = CODING_SAMPLES.predict;
const pick = (x: number, y: number): PickCellAction => ({ type: 'pick-cell', cell: { x, y } });
const tiles = (...kinds: readonly Tile['kind'][]): Tile[] =>
  kinds.map((k) => ({ kind: k }) as Tile);

describe('predict: picking a cell', () => {
  it('the answer cell solves, counts the move and 0 errors', () => {
    const step = kind.act(kind.init(def), pick(2, 2), null);
    expect(step.outcome).toEqual({ kind: 'solved' });
    expect(step.state).toMatchObject({ solved: true, errors: 0, moves: 1 });
  });

  it('another cell counts exactly 1 error and 1 move, reports the cell and stays answerable', () => {
    const step = kind.act(kind.init(def), pick(3, 2), null);
    expect(step.outcome).toEqual({ kind: 'wrong', cell: { x: 3, y: 2 } });
    expect(step.state).toMatchObject({ solved: false, errors: 1, moves: 1 });
    const again = kind.act(step.state, pick(2, 2), null);
    expect(again.outcome).toEqual({ kind: 'solved' });
    expect(again.state).toMatchObject({ solved: true, errors: 1, moves: 2 });
  });

  it('every wrong pick counts an error, also a cell tapped twice', () => {
    const first = kind.act(kind.init(def), pick(0, 0), null).state;
    expect(kind.act(first, pick(0, 0), null).state.errors).toBe(2);
  });

  it('ignores every action once solved: no rescoring', () => {
    const solved = kind.act(kind.init(def), pick(2, 2), null).state;
    const step = kind.act(solved, pick(0, 0), null);
    expect(step.outcome).toEqual({ kind: 'ignored' });
    expect(step.state).toBe(solved);
  });
});

describe('predict: hints', () => {
  // Six steps: the answer is reached after the last one.
  it('1 replays the first 2 steps, 2 replays up to the last step, 3 reveals the answer cell', () => {
    const first = kind.hint(kind.init(def), 1, null);
    expect(first.hint).toEqual({ kind: 'predict', level: 1, replaySteps: 2 });
    expect(first.state).toMatchObject({ hintLevel: 1, errors: 0 });
    const second = kind.hint(first.state, 2, null);
    expect(second.hint).toEqual({ kind: 'predict', level: 2, replaySteps: 5 });
    const third = kind.hint(second.state, 3, null);
    expect(third.hint).toEqual({ kind: 'predict', level: 3, reveal: { x: 2, y: 2 } });
    expect(third.state.hintLevel).toBe(3);
  });

  it('counts the steps of a run with a repeat, not the tiles', () => {
    const looped: PredictDef = {
      ...def,
      program: [
        { kind: 'repeat', times: 3, body: tiles('right') },
        ...tiles('down', 'down', 'left'),
      ],
    };
    // right ×3, down, down, left = 6 steps.
    expect(kind.hint(kind.init(looped), 2, null).hint).toMatchObject({ replaySteps: 5 });
  });

  it('never replays fewer steps on a higher level, nor more than the run has', () => {
    const short: PredictDef = { ...def, program: tiles('right', 'down'), answer: { x: 1, y: 1 } };
    expect(kind.hint(kind.init(short), 1, null).hint).toMatchObject({ replaySteps: 2 });
    expect(kind.hint(kind.init(short), 2, null).hint).toMatchObject({ replaySteps: 2 });
    const one: PredictDef = { ...def, program: tiles('right'), answer: { x: 1, y: 0 } };
    expect(kind.hint(kind.init(one), 1, null).hint).toMatchObject({ replaySteps: 1 });
    expect(kind.hint(kind.init(one), 2, null).hint).toMatchObject({ replaySteps: 1 });
    const three: PredictDef = {
      ...def,
      program: tiles('right', 'right', 'right'),
      answer: { x: 3, y: 0 },
    };
    expect(kind.hint(kind.init(three), 2, null).hint).toMatchObject({ replaySteps: 2 });
  });
});

describe('predict: stars', () => {
  it('cap stars by hints and errors', () => {
    const solvedAt = (hintLevel: 0 | 1 | 2 | 3, errors: number): number =>
      kind.stars({ ...kind.init(def), solved: true, hintLevel, errors });
    expect([
      solvedAt(0, 0),
      solvedAt(1, 0),
      solvedAt(0, 1),
      solvedAt(0, 2),
      solvedAt(3, 0),
    ]).toEqual([3, 2, 2, 1, 1]);
  });
});

describe('predict: solution and wrong action', () => {
  it('the solution picks the answer and solves with 0 errors and 3 stars', () => {
    expect(predictSolution(def)).toEqual([pick(2, 2)]);
    const solved = playSolution(def);
    expect(solved).toMatchObject({ solved: true, errors: 0 });
    expect(starsFor(solved)).toBe(3);
  });

  it('the wrong action is exactly 1 error, another cell inside the grid, and does not block solving', () => {
    const [action] = predictWrongAction(def);
    expect(action?.cell).toEqual({ x: 0, y: 0 });
    expect(play(def, predictWrongAction(def))).toMatchObject({ errors: 1, solved: false });
    const result = playWrongThenSolve(def);
    expect(result).toMatchObject({ errors: 1, solved: true });
    expect(starsFor(result)).toBe(2);
  });

  it('the wrong action skips the answer when it is the first cell', () => {
    const atStart: PredictDef = { ...def, program: [], answer: { x: 0, y: 0 } };
    expect(predictWrongAction(atStart)).toEqual([pick(1, 0)]);
    expect(play(atStart, predictWrongAction(atStart)).errors).toBe(1);
  });
});
