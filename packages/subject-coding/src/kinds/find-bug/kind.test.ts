import { describe, expect, it } from 'vitest';
import type { Tile } from '../../core/tiles.ts';
import type { FindBugDef } from '../../core/types.ts';
import { CODING_SAMPLES } from '../../testing/samples.ts';
import { play, playSolution, playWrongThenSolve, starsFor } from '../../testing/play.ts';
import { bugCandidates, findBugKind as kind } from './kind.ts';
import type { PickTileAction } from './kind.ts';
import { findBugSolution, findBugWrongAction } from './solution.ts';

const def = CODING_SAMPLES['find-bug'];
const pick = (...path: number[]): PickTileAction => ({ type: 'pick-tile', path });
const tiles = (...kinds: readonly Tile['kind'][]): Tile[] =>
  kinds.map((k) => ({ kind: k }) as Tile);

// A repeat whose count is the bug: the loop runs 2 times instead of 3.
const looped: FindBugDef = {
  ...def,
  id: 'cb2',
  program: [{ kind: 'repeat', times: 2, body: tiles('right') }, ...tiles('down', 'down')],
  bug: [0],
  fix: { kind: 'repeat', times: 3, body: tiles('right') },
};

describe('find-bug: picking a tile', () => {
  it('the bug solves, counts the move and 0 errors', () => {
    const step = kind.act(kind.init(def), pick(2), null);
    expect(step.outcome).toEqual({ kind: 'solved' });
    expect(step.state).toMatchObject({ solved: true, errors: 0, moves: 1 });
  });

  it('another tile counts exactly 1 error and 1 move, reports the path and stays answerable', () => {
    const step = kind.act(kind.init(def), pick(3), null);
    expect(step.outcome).toEqual({ kind: 'wrong', path: [3] });
    expect(step.state).toMatchObject({ solved: false, errors: 1, moves: 1 });
    const again = kind.act(step.state, pick(2), null);
    expect(again.outcome).toEqual({ kind: 'solved' });
    expect(again.state).toMatchObject({ solved: true, errors: 1, moves: 2 });
  });

  it('a path inside a repeat is not the repeat tile, and the other way round', () => {
    const insideBug: FindBugDef = {
      ...looped,
      program: [{ kind: 'repeat', times: 3, body: tiles('right', 'up') }, ...tiles('down')],
      bug: [0, 1],
      fix: { kind: 'down' },
    };
    expect(kind.act(kind.init(insideBug), pick(0, 1), null).outcome).toEqual({ kind: 'solved' });
    expect(kind.act(kind.init(insideBug), pick(0), null).outcome).toEqual({
      kind: 'wrong',
      path: [0],
    });
    expect(kind.act(kind.init(looped), pick(0, 0), null).outcome).toEqual({
      kind: 'wrong',
      path: [0, 0],
    });
    expect(kind.act(kind.init(looped), pick(0), null).outcome).toEqual({ kind: 'solved' });
  });

  it('ignores every action once solved: no rescoring', () => {
    const solved = kind.act(kind.init(def), pick(2), null).state;
    const step = kind.act(solved, pick(0), null);
    expect(step.outcome).toEqual({ kind: 'ignored' });
    expect(step.state).toBe(solved);
  });
});

describe('find-bug: hints', () => {
  it('1 replays up to the bug, 2 narrows to 3 tiles that include it, 3 reveals the bug', () => {
    const first = kind.hint(kind.init(def), 1, null);
    expect(first.hint).toEqual({ kind: 'find-bug', level: 1, replayUntil: [2] });
    expect(first.state).toMatchObject({ hintLevel: 1, errors: 0 });
    const second = kind.hint(first.state, 2, null);
    expect(second.hint).toEqual({ kind: 'find-bug', level: 2, candidates: [[1], [2], [3]] });
    const third = kind.hint(second.state, 3, null);
    expect(third.hint).toEqual({ kind: 'find-bug', level: 3, reveal: [2] });
    expect(third.state.hintLevel).toBe(3);
  });

  it('the candidates are the bug and its two nearest tiles, in display order', () => {
    expect(bugCandidates(def.program, [0])).toEqual([[0], [1], [2]]);
    expect(bugCandidates(def.program, [4])).toEqual([[2], [3], [4]]);
    expect(bugCandidates(def.program, [1])).toEqual([[0], [1], [2]]);
    // a tie goes to the earlier tile: from [1], [0] and [2] are 1 away, [3] is 2.
  });

  it('counts a repeat and its body as tiles of their own', () => {
    expect(bugCandidates(looped.program, [0])).toEqual([[0], [0, 0], [1]]);
    const inside = [
      { kind: 'repeat', times: 3, body: tiles('right', 'up') },
      ...tiles('down'),
    ] as Tile[];
    // paths: [0], [0, 0], [0, 1], [1]; from [0, 1] the nearest are [0, 0] and [1].
    expect(bugCandidates(inside, [0, 1])).toEqual([[0, 0], [0, 1], [1]]);
  });

  it('gives every tile when the program has fewer than 3', () => {
    expect(bugCandidates(tiles('up', 'down'), [1])).toEqual([[0], [1]]);
    expect(bugCandidates(tiles('up'), [0])).toEqual([[0]]);
  });

  it('keeps the bug among the candidates wherever it is', () => {
    for (const path of [[0], [1], [2], [3], [4]]) {
      expect(bugCandidates(def.program, path)).toContainEqual(path);
      expect(bugCandidates(def.program, path)).toHaveLength(3);
    }
  });
});

describe('find-bug: stars', () => {
  it('cap stars by hints and errors', () => {
    const solvedAt = (hintLevel: 0 | 1 | 2 | 3, errors: number): number =>
      kind.stars({ ...kind.init(def), solved: true, hintLevel, errors });
    expect(solvedAt(0, 0)).toBe(3);
    expect(solvedAt(1, 0)).toBe(2);
    expect(solvedAt(0, 1)).toBe(2);
    expect(solvedAt(0, 2)).toBe(1);
    expect(solvedAt(3, 0)).toBe(1);
  });
});

describe('find-bug: solution and wrong action', () => {
  it('the solution picks the bug and solves with 0 errors and 3 stars', () => {
    expect(findBugSolution(def)).toEqual([pick(2)]);
    expect(findBugSolution(looped)).toEqual([pick(0)]);
    const solved = playSolution(def);
    expect(solved).toMatchObject({ solved: true, errors: 0 });
    expect(starsFor(solved)).toBe(3);
  });

  it('the wrong action is exactly 1 error, another tile, and does not block solving', () => {
    expect(findBugWrongAction(def)).toEqual([pick(0)]);
    expect(findBugWrongAction({ ...def, bug: [0] })).toEqual([pick(1)]);
    expect(play(def, findBugWrongAction(def))).toMatchObject({ errors: 1, solved: false });
    const result = playWrongThenSolve(looped);
    expect(result).toMatchObject({ errors: 1, solved: true });
    expect(starsFor(result)).toBe(2);
  });

  it('throws when the bug is the only tile', () => {
    expect(() => findBugWrongAction({ ...def, program: tiles('up'), bug: [0] })).toThrow(
      'no tile other than',
    );
  });
});
