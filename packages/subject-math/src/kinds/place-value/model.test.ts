import { describe, expect, it } from 'vitest';
import {
  MAX_COUNT,
  digitsOf,
  highestColumn,
  placesOf,
  startCounts,
  validCounts,
  valueOf,
} from './model.ts';

describe('place-value model', () => {
  it('names the places of 3 and 4 columns, high to low', () => {
    expect(placesOf(3)).toEqual(['hundreds', 'tens', 'ones']);
    expect(placesOf(4)).toEqual(['thousands', 'hundreds', 'tens', 'ones']);
  });

  it('values a build: the counts read as digits, whatever their number', () => {
    expect(valueOf([3, 0, 5])).toBe(305);
    expect(valueOf([4, 0, 7, 2])).toBe(4072);
    expect(valueOf([0, 0, 0])).toBe(0);
    expect(valueOf([9, 9, 9, 9])).toBe(9999);
  });

  it('gives a number its digits in the columns, a zero first when the number is short', () => {
    expect(digitsOf(305, 3)).toEqual([3, 0, 5]);
    expect(digitsOf(305, 4)).toEqual([0, 3, 0, 5]);
    expect(digitsOf(4072, 4)).toEqual([4, 0, 7, 2]);
    expect(digitsOf(9999, 4)).toEqual([9, 9, 9, 9]);
    for (const value of [1, 10, 99, 100, 305, 999]) {
      expect(valueOf(digitsOf(value, 3))).toBe(value);
    }
  });

  it('starts with the prefilled counts, else all 0', () => {
    expect(startCounts({ columns: 3 })).toEqual([0, 0, 0]);
    expect(startCounts({ columns: 4 })).toEqual([0, 0, 0, 0]);
    expect(startCounts({ columns: 3, start: [2, 5, 9] })).toEqual([2, 5, 9]);
  });

  it('accepts a build with one whole count 0-9 per column and nothing else', () => {
    expect(MAX_COUNT).toBe(9);
    expect(validCounts(3, [0, 0, 0])).toBe(true);
    expect(validCounts(3, [9, 9, 9])).toBe(true);
    expect(validCounts(3, [1, 2])).toBe(false);
    expect(validCounts(3, [1, 2, 3, 4])).toBe(false);
    expect(validCounts(3, [1, 2, 10])).toBe(false);
    expect(validCounts(3, [1, -1, 3])).toBe(false);
    expect(validCounts(3, [1, 2.5, 3])).toBe(false);
    expect(validCounts(3, [1, Number.NaN, 3])).toBe(false);
    expect(validCounts(4, [1, 2, 3, 4])).toBe(true);
  });

  it('finds the highest column of the target that is not 0', () => {
    expect(highestColumn({ target: 305, columns: 3 })).toBe(0);
    expect(highestColumn({ target: 305, columns: 4 })).toBe(1);
    expect(highestColumn({ target: 42, columns: 3 })).toBe(1);
    expect(highestColumn({ target: 7, columns: 3 })).toBe(2);
    expect(highestColumn({ target: 4072, columns: 4 })).toBe(0);
  });
});
