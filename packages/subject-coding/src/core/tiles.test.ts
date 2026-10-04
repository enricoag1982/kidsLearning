import { describe, expect, it } from 'vitest';
import {
  MAX_REPEAT,
  MAX_REPEAT_BODY,
  MIN_REPEAT,
  PRIMITIVE_KINDS,
  isValidProgram,
  tileCount,
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
