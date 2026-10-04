import { describe, expect, it } from 'vitest';
import { parseLevel } from './level.ts';
import { run } from './simulator.ts';
import type { PrimitiveKind, Tile } from './tiles.ts';

const tiles = (...kinds: readonly PrimitiveKind[]): Tile[] => kinds.map((kind) => ({ kind }));
const repeat = (times: number, ...body: readonly PrimitiveKind[]): Tile => ({
  kind: 'repeat',
  times,
  body: tiles(...body),
});

describe('run: absolute arrows', () => {
  const level = parseLevel(['S..*', '.#..', '...F']);

  it('moves one cell per arrow and keeps the heading', () => {
    const result = run(level, tiles('right', 'down', 'down', 'up', 'left'));
    expect(result.steps.map((s) => [s.kind, s.result, s.state.cell, s.state.heading])).toEqual([
      ['right', 'moved', { x: 1, y: 0 }, 'right'],
      ['down', 'bumped', { x: 1, y: 0 }, 'right'],
    ]);
    const walk = run(level, tiles('down', 'down', 'right', 'up', 'left'));
    expect(walk.steps.map((s) => [s.kind, s.result, s.state.cell, s.state.heading])).toEqual([
      ['down', 'moved', { x: 0, y: 1 }, 'right'],
      ['down', 'moved', { x: 0, y: 2 }, 'right'],
      ['right', 'moved', { x: 1, y: 2 }, 'right'],
      ['up', 'bumped', { x: 1, y: 2 }, 'right'],
    ]);
  });

  it('numbers each step by its top-level index and has no iteration outside a repeat', () => {
    const result = run(level, tiles('right', 'right', 'right'));
    expect(result.steps.map((s) => s.path)).toEqual([[0], [1], [2]]);
    expect(result.steps.every((s) => !('iteration' in s))).toBe(true);
  });

  it('is unfinished with an empty program', () => {
    const result = run(level, []);
    expect(result).toEqual({
      steps: [],
      outcome: 'unfinished',
      final: { cell: { x: 0, y: 0 }, heading: 'right', collected: [] },
    });
  });

  it('succeeds once the star is picked up and the animal ends on the flag', () => {
    const result = run(level, tiles('right', 'right', 'right', 'down', 'down'));
    expect(result.outcome).toBe('success');
    expect(result.final).toEqual({ cell: { x: 3, y: 2 }, heading: 'right', collected: ['3,0'] });
    expect(result.steps.map((s) => s.result)).toEqual(Array<string>(5).fill('moved'));
  });
});

describe('run: bumps', () => {
  const level = parseLevel(['S#.', '..*']);

  it('bumps into a rock: the step is recorded, the position is unchanged and the run stops there', () => {
    const result = run(level, tiles('right', 'down', 'down'));
    expect(result.outcome).toBe('bumped');
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]).toMatchObject({
      path: [0],
      kind: 'right',
      result: 'bumped',
      state: { cell: { x: 0, y: 0 } },
    });
    expect(result.final.cell).toEqual({ x: 0, y: 0 });
  });

  it('bumps off the edge of the grid, on every side', () => {
    expect(run(level, tiles('up')).outcome).toBe('bumped');
    expect(run(level, tiles('left')).outcome).toBe('bumped');
    expect(run(level, tiles('down', 'down')).outcome).toBe('bumped');
    expect(run(level, tiles('down', 'right', 'right', 'right')).outcome).toBe('bumped');
  });

  it('keeps what was collected before the bump, and never reports success after one', () => {
    const wide = parseLevel(['S*.', '#..']);
    const result = run(wide, tiles('right', 'down', 'down', 'left'));
    expect(result.outcome).toBe('bumped');
    expect(result.final).toEqual({ cell: { x: 1, y: 1 }, heading: 'right', collected: ['1,0'] });
    expect(result.steps).toHaveLength(3);
  });

  it('a bump inside a repeat stops the whole run with the iteration it happened in', () => {
    const corridor = parseLevel(['S..*']);
    const result = run(corridor, [repeat(5, 'right'), ...tiles('left')]);
    expect(result.outcome).toBe('bumped');
    expect(result.steps.map((s) => [s.iteration, s.result])).toEqual([
      [1, 'moved'],
      [2, 'moved'],
      [3, 'moved'],
      [4, 'bumped'],
    ]);
  });
});

describe('run: forward and turns', () => {
  const level = parseLevel(['S..', '...', '..*']);

  it('forward moves along the heading', () => {
    const result = run(level, tiles('forward', 'forward'));
    expect(result.final).toMatchObject({ cell: { x: 2, y: 0 }, heading: 'right' });
    expect(result.steps.map((s) => s.result)).toEqual(['moved', 'moved']);
  });

  it('a turn rotates in place: the cell stays, the heading changes, the result is turned', () => {
    const result = run(level, tiles('turn-right', 'turn-right', 'turn-right', 'turn-right'));
    expect(result.steps.map((s) => [s.result, s.state.cell, s.state.heading])).toEqual([
      ['turned', { x: 0, y: 0 }, 'down'],
      ['turned', { x: 0, y: 0 }, 'left'],
      ['turned', { x: 0, y: 0 }, 'up'],
      ['turned', { x: 0, y: 0 }, 'right'],
    ]);
  });

  it('turn-left goes the other way round', () => {
    const result = run(level, tiles('turn-left'));
    expect(result.final.heading).toBe('up');
    expect(run(level, tiles('turn-left', 'turn-left')).final.heading).toBe('left');
  });

  it('forward after a turn follows the new heading; arrows ignore it', () => {
    expect(run(level, tiles('turn-right', 'forward', 'forward')).final.cell).toEqual({
      x: 0,
      y: 2,
    });
    const afterTurn = run(level, tiles('turn-right', 'right'));
    expect(afterTurn.final).toMatchObject({ cell: { x: 1, y: 0 }, heading: 'down' });
  });

  it('forward into the wall bumps', () => {
    expect(run(level, tiles('turn-left', 'forward')).outcome).toBe('bumped');
  });

  it('starts with the level heading', () => {
    const facingDown = parseLevel(['S..', '...', '..*'], 'down');
    expect(run(facingDown, tiles('forward')).final.cell).toEqual({ x: 0, y: 1 });
  });
});

describe('run: jump', () => {
  it('moves two cells along the heading and is result jumped', () => {
    const level = parseLevel(['S..*']);
    const result = run(level, tiles('jump'));
    expect(result.steps[0]).toMatchObject({ result: 'jumped', state: { cell: { x: 2, y: 0 } } });
  });

  it('may go over a rock', () => {
    const level = parseLevel(['S#F']);
    const result = run(level, tiles('jump'));
    expect(result.outcome).toBe('success');
    expect(result.final.cell).toEqual({ x: 2, y: 0 });
  });

  it('bumps when the landing cell is a rock, even with an empty cell before it', () => {
    const level = parseLevel(['S.#F']);
    const result = run(level, tiles('jump'));
    expect(result.outcome).toBe('bumped');
    expect(result.steps[0]).toMatchObject({ result: 'bumped', state: { cell: { x: 0, y: 0 } } });
  });

  it('bumps off the grid: landing outside, and one cell from the edge', () => {
    const level = parseLevel(['S.*']);
    expect(run(level, tiles('right', 'jump')).outcome).toBe('bumped');
    expect(run(level, tiles('right', 'right', 'jump')).outcome).toBe('bumped');
    expect(run(level, tiles('turn-left', 'jump')).outcome).toBe('bumped');
  });

  it('jumps along the heading after a turn', () => {
    const level = parseLevel(['S..', '.#.', '..F'], 'down');
    expect(run(level, tiles('jump')).final.cell).toEqual({ x: 0, y: 2 });
  });
});

describe('run: stars', () => {
  it('collects a star by entering its cell, in the order reached', () => {
    const level = parseLevel(['S*.*']);
    const result = run(level, tiles('right', 'right', 'right'));
    expect(result.final.collected).toEqual(['1,0', '3,0']);
    expect(result.steps.map((s) => s.state.collected)).toEqual([['1,0'], ['1,0'], ['1,0', '3,0']]);
    expect(result.outcome).toBe('success');
  });

  it('collects the star on the landing cell of a jump, not the one jumped over', () => {
    const landing = run(parseLevel(['S.*']), tiles('jump'));
    expect(landing.final.collected).toEqual(['2,0']);
    expect(landing.outcome).toBe('success');
    const over = run(parseLevel(['S*.']), tiles('jump'));
    expect(over.final.collected).toEqual([]);
    expect(over.outcome).toBe('unfinished');
  });

  it('counts a star once however often the animal walks over it', () => {
    const level = parseLevel(['S*.']);
    const result = run(level, tiles('right', 'left', 'right', 'left'));
    expect(result.final.collected).toEqual(['1,0']);
    expect(result.outcome).toBe('success');
  });

  it('is unfinished while a star is left, even standing on the flag', () => {
    const level = parseLevel(['SF', '*.']);
    expect(run(level, tiles('right')).outcome).toBe('unfinished');
    expect(run(level, tiles('down', 'up', 'right')).outcome).toBe('success');
  });
});

describe('run: success is judged at the end of the program', () => {
  it('standing on the flag half way is not enough once the program moves on', () => {
    const level = parseLevel(['SF.']);
    expect(run(level, tiles('right')).outcome).toBe('success');
    const result = run(level, tiles('right', 'right'));
    expect(result.outcome).toBe('unfinished');
    expect(result.steps).toHaveLength(2);
  });

  it('always runs every step: all stars collected early still runs on, and a late step can undo the flag', () => {
    const level = parseLevel(['S*F']);
    const result = run(level, tiles('right', 'right', 'left'));
    expect(result.steps).toHaveLength(3);
    expect(result.outcome).toBe('unfinished');
  });

  it('a level without a flag succeeds as soon as the last star is held at the end, wherever the animal stands', () => {
    const level = parseLevel(['S*.']);
    expect(run(level, tiles('right', 'right')).outcome).toBe('success');
  });

  it('a flag-only level needs the animal on the flag at the end', () => {
    const level = parseLevel(['S.F']);
    expect(run(level, tiles('right')).outcome).toBe('unfinished');
    expect(run(level, tiles('right', 'right')).outcome).toBe('success');
  });
});

describe('run: repeat', () => {
  const level = parseLevel(['S....*']);

  it('runs the body `times` times with 1-based iterations and [top, body] paths', () => {
    const result = run(level, [repeat(3, 'right')]);
    expect(result.steps.map((s) => [s.path, s.iteration, s.state.cell.x])).toEqual([
      [[0, 0], 1, 1],
      [[0, 0], 2, 2],
      [[0, 0], 3, 3],
    ]);
  });

  it('runs a multi-tile body in order inside each iteration', () => {
    const stairs = parseLevel(['S...', '....', '...*']);
    const result = run(stairs, [repeat(2, 'right', 'down'), ...tiles('right')]);
    expect(result.steps.map((s) => [s.path, s.iteration, s.kind])).toEqual([
      [[0, 0], 1, 'right'],
      [[0, 1], 1, 'down'],
      [[0, 0], 2, 'right'],
      [[0, 1], 2, 'down'],
      [[1], undefined, 'right'],
    ]);
    expect(result.final.cell).toEqual({ x: 3, y: 2 });
    expect(result.outcome).toBe('success');
  });

  it('tiles after a repeat get their own top-level index', () => {
    const result = run(level, [...tiles('right'), repeat(2, 'right'), ...tiles('right')]);
    expect(result.steps.map((s) => s.path)).toEqual([[0], [1, 0], [1, 0], [2]]);
    expect(result.final.cell.x).toBe(4);
  });

  it('turns inside a repeat keep rotating over the iterations', () => {
    const square = parseLevel(['S..', '...', '...', '..*']);
    const result = run(square, [repeat(4, 'turn-right')]);
    expect(result.final.heading).toBe('right');
    expect(result.steps.map((s) => s.state.heading)).toEqual(['down', 'left', 'up', 'right']);
  });

  it('succeeds with a loop that reaches the end', () => {
    expect(run(level, [repeat(5, 'right')]).outcome).toBe('success');
  });

  it('an empty body does nothing', () => {
    const empty: Tile = { kind: 'repeat', times: 3, body: [] };
    expect(run(level, [empty]).steps).toEqual([]);
  });

  it('refuses a repeat inside a repeat', () => {
    const nested: Tile = { kind: 'repeat', times: 2, body: [repeat(2, 'right')] };
    expect(() => run(level, [nested])).toThrow('inside a repeat');
  });
});
