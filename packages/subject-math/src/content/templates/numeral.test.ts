import { describe, expect, it } from 'vitest';
import { digitsOf, numeral, parseNumeral } from './numeral.ts';

const THIN = ' ';

describe('numeral', () => {
  it('prints plain digits up to 4 digits and thin-space groups of 3 from 5 digits', () => {
    expect(numeral(0)).toBe('0');
    expect(numeral(305)).toBe('305');
    expect(numeral(9999)).toBe('9999');
    expect(numeral(10000)).toBe(`10${THIN}000`);
    expect(numeral(12345)).toBe(`12${THIN}345`);
    expect(numeral(123456)).toBe(`123${THIN}456`);
    expect(numeral(10002005)).toBe(`10${THIN}002${THIN}005`);
  });

  it('refuses what is not a whole number from 0 up', () => {
    for (const bad of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => numeral(bad), String(bad)).toThrow(RangeError);
    }
  });

  it('parseNumeral is its inverse', () => {
    for (const n of [0, 7, 305, 1000, 9999, 10000, 12345, 99999, 123456, 10002005]) {
      expect(parseNumeral(numeral(n)), String(n)).toBe(n);
    }
  });

  it('parseNumeral reads nothing numeral would not print', () => {
    for (const text of [
      '',
      ' ',
      '12345',
      '10 000',
      '10,000',
      '-5',
      '1e3',
      '0305',
      '3.5',
      '10  000',
      `1${THIN}000`,
      'a',
    ]) {
      expect(parseNumeral(text), JSON.stringify(text)).toBeNull();
    }
  });
});

describe('digitsOf', () => {
  it('lists the digits high to low in the columns given, zeros first', () => {
    expect(digitsOf(305, 3)).toEqual([3, 0, 5]);
    expect(digitsOf(305, 4)).toEqual([0, 3, 0, 5]);
    expect(digitsOf(0, 3)).toEqual([0, 0, 0]);
    expect(digitsOf(4072, 4)).toEqual([4, 0, 7, 2]);
  });

  it('throws when the number does not fit', () => {
    expect(() => digitsOf(1000, 3)).toThrow(RangeError);
    expect(() => digitsOf(-1, 3)).toThrow(RangeError);
    expect(() => digitsOf(2.5, 3)).toThrow(RangeError);
  });
});
