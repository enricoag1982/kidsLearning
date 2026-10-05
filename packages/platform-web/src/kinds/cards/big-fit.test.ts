import { describe, expect, it } from 'vitest';
import { bigFitCqi } from './big-fit.ts';

describe('bigFitCqi', () => {
  it('is 100 over (0.6 em x the character count), to 2 decimals', () => {
    expect(bigFitCqi('16 20 21 25 26 ?')).toBe(10.42);
    expect(bigFitCqi('3 7 11 15 19 ?')).toBe(11.9);
    expect(bigFitCqi('288 ? 217')).toBe(18.52);
  });

  it('shrinks as the text grows', () => {
    expect(bigFitCqi('7')).toBeGreaterThan(bigFitCqi('7 + 5'));
    expect(bigFitCqi('7 + 5')).toBeGreaterThan(bigFitCqi('16 20 21 25 26 ?'));
  });

  it('counts a character once however many UTF-16 units it takes, and treats an empty text as one', () => {
    expect(bigFitCqi('🍎')).toBe(bigFitCqi('7'));
    expect(bigFitCqi('')).toBe(bigFitCqi('7'));
  });
});
