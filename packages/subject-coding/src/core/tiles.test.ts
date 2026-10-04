import { describe, expect, it } from 'vitest';
import {
  MAX_REPEAT,
  MAX_REPEAT_BODY,
  MIN_REPEAT,
  PRIMITIVE_KINDS,
  isValidProgram,
  replaceTile,
  sameTile,
  samePath,
  tileAt,
  tileCount,
  tilePaths,
} from './tiles.ts';
import type { Tile } from './tiles.ts';

const up: Tile = { kind: 'up' };
const right: Tile = { kind: 'right' };
const repeat = (times: number, body: readonly Tile[]): Tile => ({ kind: 'repeat', times, body });

describe('tile constants', () => {
  it('limits a repeat to 2-9 times over at most 4 tiles', () => {
    expect([MIN_REPEAT, MAX_REPEAT, MAX_REPEAT_BODY]).toEqual([2, 9, 4]);
  });

  it('lists the 8 primitives once each', () => {
    expect(new Set(PRIMITIVE_KINDS).size).toBe(8);
    expect(PRIMITIVE_KINDS).toContain('jump');
    expect(PRIMITIVE_KINDS).not.toContain('repeat');
  });
});

describe('tileCount', () => {
  it('is 0 for an empty program and 1 per primitive', () => {
    expect(tileCount([])).toBe(0);
    expect(tileCount([up, right, up])).toBe(3);
  });

  it('counts a repeat as 1 plus its body, once whatever the number of times', () => {
    expect(tileCount([repeat(3, [right])])).toBe(2);
    expect(tileCount([repeat(9, [right, up, right])])).toBe(4);
    expect(tileCount([up, repeat(2, [right, up]), right])).toBe(5);
  });
});

describe('isValidProgram', () => {
  it('accepts an empty program, primitives and a flat repeat', () => {
    expect(isValidProgram([])).toBe(true);
    expect(isValidProgram([up, right, { kind: 'turn-left' }, { kind: 'jump' }])).toBe(true);
    expect(isValidProgram([up, repeat(3, [right, up]), right])).toBe(true);
  });

  it('rejects a repeat inside a repeat', () => {
    expect(isValidProgram([repeat(2, [up, repeat(2, [right])])])).toBe(false);
  });

  it('rejects a repeat that runs fewer than 2 or more than 9 times, or not a whole number of times', () => {
    expect(isValidProgram([repeat(1, [up])])).toBe(false);
    expect(isValidProgram([repeat(0, [up])])).toBe(false);
    expect(isValidProgram([repeat(10, [up])])).toBe(false);
    expect(isValidProgram([repeat(2.5, [up])])).toBe(false);
    expect(isValidProgram([repeat(2, [up]), repeat(9, [up])])).toBe(true);
  });

  it('rejects an empty repeat body and one longer than 4 tiles', () => {
    expect(isValidProgram([repeat(3, [])])).toBe(false);
    expect(isValidProgram([repeat(3, [up, up, up, up])])).toBe(true);
    expect(isValidProgram([repeat(3, [up, up, up, up, up])])).toBe(false);
  });

  it('rejects an unknown primitive', () => {
    expect(isValidProgram([{ kind: 'sideways' } as unknown as Tile])).toBe(false);
  });
});

describe('sameTile / samePath', () => {
  it('compares kinds, and repeats by count and body', () => {
    expect(sameTile(up, { kind: 'up' })).toBe(true);
    expect(sameTile(up, right)).toBe(false);
    expect(sameTile(repeat(3, [up, right]), repeat(3, [up, right]))).toBe(true);
    expect(sameTile(repeat(3, [up, right]), repeat(4, [up, right]))).toBe(false);
    expect(sameTile(repeat(3, [up, right]), repeat(3, [right, up]))).toBe(false);
    expect(sameTile(repeat(3, [up]), repeat(3, [up, up]))).toBe(false);
    expect(sameTile(repeat(3, [up]), up)).toBe(false);
    expect(sameTile(up, repeat(3, [up]))).toBe(false);
  });

  it('compares paths element by element', () => {
    expect(samePath([1], [1])).toBe(true);
    expect(samePath([1, 0], [1, 0])).toBe(true);
    expect(samePath([1], [1, 0])).toBe(false);
    expect(samePath([1, 0], [1])).toBe(false);
    expect(samePath([0, 1], [1, 0])).toBe(false);
  });
});

describe('tilePaths / tileAt / replaceTile', () => {
  const program: Tile[] = [up, repeat(3, [right, up]), right];

  it('lists a repeat tile and each tile in its body, in display order', () => {
    expect(tilePaths(program)).toEqual([[0], [1], [1, 0], [1, 1], [2]]);
    expect(tilePaths([])).toEqual([]);
  });

  it('finds the tile at a path, or nothing', () => {
    expect(tileAt(program, [0])).toBe(up);
    expect(tileAt(program, [1, 1])).toEqual(up);
    expect(tileAt(program, [1])).toEqual(repeat(3, [right, up]));
    expect(tileAt(program, [3])).toBeUndefined();
    expect(tileAt(program, [0, 0])).toBeUndefined();
    expect(tileAt(program, [1, 2])).toBeUndefined();
    expect(tileAt(program, [])).toBeUndefined();
    expect(tileAt(program, [1, 0, 0])).toBeUndefined();
  });

  it('replaces a top-level tile, a repeat as a whole and a tile inside a repeat, leaving the input alone', () => {
    const down: Tile = { kind: 'down' };
    expect(replaceTile(program, [0], down)).toEqual([down, repeat(3, [right, up]), right]);
    expect(replaceTile(program, [1], down)).toEqual([up, down, right]);
    expect(replaceTile(program, [1, 1], down)).toEqual([up, repeat(3, [right, down]), right]);
    expect(program).toEqual([up, repeat(3, [right, up]), right]);
  });

  it('throws when there is no tile at the path', () => {
    expect(() => replaceTile(program, [5], up)).toThrow('No tile at path [5]');
    expect(() => replaceTile(program, [0, 0], up)).toThrow('No tile at path [0, 0]');
  });
});
