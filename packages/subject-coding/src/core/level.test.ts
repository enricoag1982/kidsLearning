import { describe, expect, it } from 'vitest';
import { parseLevel } from './level.ts';

describe('parseLevel', () => {
  it('reads the size, start, flag, stars and rocks, heading right by default', () => {
    expect(parseLevel(['S.*', '.#.', '..F'])).toEqual({
      size: { cols: 3, rows: 3 },
      rocks: [{ x: 1, y: 1 }],
      stars: [{ x: 2, y: 0 }],
      goal: { x: 2, y: 2 },
      start: { x: 0, y: 0 },
      heading: 'right',
    });
  });

  it('takes the heading it is given', () => {
    expect(parseLevel(['S*'], 'down').heading).toBe('down');
  });

  it('lists stars and rocks row by row, left to right', () => {
    const level = parseLevel(['*#S', '#*.', '.*#']);
    expect(level.stars).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ]);
    expect(level.rocks).toEqual([
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 2, y: 2 },
    ]);
  });

  it('allows stars without a flag, and a flag without stars', () => {
    expect(parseLevel(['S*']).goal).toBeUndefined();
    expect(parseLevel(['S*'])).not.toHaveProperty('goal');
    expect(parseLevel(['SF']).stars).toEqual([]);
    expect(parseLevel(['SF']).goal).toEqual({ x: 1, y: 0 });
  });

  it('throws without a start', () => {
    expect(() => parseLevel(['.*'])).toThrow('exactly one start "S" (found 0)');
  });

  it('throws with two starts', () => {
    expect(() => parseLevel(['S*S'])).toThrow('exactly one start "S" (found 2)');
  });

  it('throws with two flags', () => {
    expect(() => parseLevel(['SFF'])).toThrow('at most one flag "F" (found 2)');
  });

  it('throws without a star or a flag', () => {
    expect(() => parseLevel(['S.#'])).toThrow('at least one star "*" or a flag "F"');
  });

  it('throws on a char that is not on the list', () => {
    expect(() => parseLevel(['Sx*'])).toThrow('unknown "x"');
    expect(() => parseLevel(['s.*'])).toThrow('unknown "s"');
  });

  it('throws on no rows, ragged rows and a grid over 10 × 10 (the platform map errors)', () => {
    expect(() => parseLevel([])).toThrow('at least one row');
    expect(() => parseLevel(['S*', '.'])).toThrow('Ragged');
    expect(() => parseLevel(['S' + '.'.repeat(10) + '*'])).toThrow('too large');
  });
});
