import { describe, expect, it } from 'vitest';
import { parseLevel } from '../../core/level.ts';
import type { Tile } from '../../core/tiles.ts';
import { firstMoveCell, ghostSlots, slotPathOf } from './view-model.ts';

const right: Tile = { kind: 'right' };
const down: Tile = { kind: 'down' };
const up: Tile = { kind: 'up' };

describe('slotPathOf', () => {
  it('maps a step of the program (no empty slots) to the slot it came from', () => {
    const slots = [right, null, down, null, up];
    expect(slotPathOf(slots, [0])).toEqual([0]);
    expect(slotPathOf(slots, [1])).toEqual([2]);
    expect(slotPathOf(slots, [2])).toEqual([4]);
  });

  it('keeps the tile inside a repeat', () => {
    const slots = [null, { kind: 'repeat', times: 2, body: [right, down] } as Tile];
    expect(slotPathOf(slots, [0, 1])).toEqual([1, 1]);
  });

  it('leaves a path that has no slot as it is', () => {
    expect(slotPathOf([right], [3])).toEqual([3]);
    expect(slotPathOf([right], [])).toEqual([]);
  });
});

describe('ghostSlots', () => {
  const solution = [right, right, down, down];

  it("is the solution's tile for each of the first two empty slots", () => {
    expect(ghostSlots([null, null, null, null], solution)).toEqual({ 0: right, 1: right });
    expect(ghostSlots([right, null, null, null], solution)).toEqual({ 1: right, 2: down });
    expect(ghostSlots([right, right, null, null], solution)).toEqual({ 2: down, 3: down });
  });

  it('skips filled slots and leaves a slot bare when the solution has no tile there', () => {
    expect(ghostSlots([null, down, null, null], solution)).toEqual({ 0: right, 2: down });
    expect(ghostSlots([null, null, null, null], [right])).toEqual({ 0: right });
  });

  it('is empty for a full strip', () => {
    expect(ghostSlots([right, down], solution)).toEqual({});
  });
});

describe('firstMoveCell', () => {
  const level = parseLevel(['S..', '..F']);

  it('is where an absolute arrow takes the animal', () => {
    expect(firstMoveCell(level, 'right')).toEqual({ x: 1, y: 0 });
    expect(firstMoveCell(level, 'down')).toEqual({ x: 0, y: 1 });
  });

  it('forward goes along the heading, a jump two cells', () => {
    expect(firstMoveCell(level, 'forward')).toEqual({ x: 1, y: 0 });
    expect(firstMoveCell(level, 'jump')).toEqual({ x: 2, y: 0 });
  });

  it('a turn: the cell the animal then faces', () => {
    expect(firstMoveCell(level, 'turn-right')).toEqual({ x: 0, y: 1 });
    expect(firstMoveCell(parseLevel(['S..', '..F'], 'down'), 'turn-left')).toEqual({ x: 1, y: 0 });
  });
});
