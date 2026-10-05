import { describe, expect, it } from 'vitest';
import { infoPillClass, infoPillSize } from './primitives-styles.ts';

describe('info pill styles', () => {
  it('a regular pill has 16 px side padding and is 56 px tall', () => {
    expect(infoPillClass()).toContain(' px-4');
    expect(infoPillClass()).not.toContain('px-0');
    expect(infoPillSize()).toBe('h-14 text-lg');
  });

  it('a dense pill has no side padding on a phone (16 px from sm) and is a 36 px line there (56 px from sm)', () => {
    expect(infoPillClass('', '', true)).toContain('px-0 sm:px-4');
    expect(infoPillSize(true)).toBe('h-9 text-base sm:h-14 sm:text-lg');
  });

  it('keeps tint and extra classes in both', () => {
    expect(infoPillClass('bg-card', 'w-full', true)).toMatch(/bg-card w-full$/);
  });
});
