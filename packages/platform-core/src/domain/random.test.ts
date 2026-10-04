import { describe, expect, it } from 'vitest';

import { pick, randomInt, seededRandom } from './random.ts';

describe('seededRandom', () => {
  it('is deterministic for a fixed seed', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('differs across seeds', () => {
    const a = Array.from({ length: 5 }, () => seededRandom(1).next());
    const b = Array.from({ length: 5 }, () => seededRandom(2).next());
    expect(a).not.toEqual(b);
  });

  it('stays within [0, 1)', () => {
    const random = seededRandom(7);
    for (let i = 0; i < 2000; i += 1) {
      const value = random.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('randomInt', () => {
  it('stays within [min, max], both ends reachable', () => {
    const random = seededRandom(3);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i += 1) {
      const value = randomInt(random, -2, 2);
      expect(Number.isInteger(value)).toBe(true);
      seen.add(value);
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([-2, -1, 0, 1, 2]);
  });

  it('returns the only value of a single-value range', () => {
    expect(randomInt(seededRandom(1), 5, 5)).toBe(5);
  });

  it('is deterministic for a fixed seed', () => {
    const draw = (seed: number): number[] => {
      const random = seededRandom(seed);
      return Array.from({ length: 20 }, () => randomInt(random, 0, 1000));
    };
    expect(draw(9)).toEqual(draw(9));
    expect(draw(9)).not.toEqual(draw(10));
  });

  it('throws when min > max or a bound is not an integer', () => {
    const random = seededRandom(1);
    expect(() => randomInt(random, 3, 2)).toThrow('greater than max');
    expect(() => randomInt(random, 1.5, 3)).toThrow('integers');
    expect(() => randomInt(random, 1, Number.NaN)).toThrow('integers');
  });
});

describe('pick', () => {
  it('returns every item over many draws, never one outside the list', () => {
    const random = seededRandom(5);
    const items = ['a', 'b', 'c'] as const;
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      seen.add(pick(random, items));
    }
    expect([...seen].sort()).toEqual(['a', 'b', 'c']);
  });

  it('is deterministic for a fixed seed', () => {
    const items = [10, 20, 30, 40];
    const a = seededRandom(8);
    const b = seededRandom(8);
    expect(Array.from({ length: 10 }, () => pick(a, items))).toEqual(
      Array.from({ length: 10 }, () => pick(b, items)),
    );
  });

  it('throws on an empty list', () => {
    expect(() => pick(seededRandom(1), [])).toThrow('empty');
  });
});
