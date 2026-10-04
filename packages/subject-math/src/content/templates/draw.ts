// Seeded draws the W1 templates share (`ctx.random`, in a fixed order: same seed, same items on every machine) and the param shapes
// two or more templates use. Digit lists are high to low, like `numeral.ts`'s `digitsOf`.
import { randomInt, type Random } from '@learn/platform-core/domain/random';
import type { Where } from '@learn/platform-content/subject';
import { z } from 'zod';

/** Place-value numbers have 3 (hundreds) or 4 (thousands) digits. */
export const digitsParam = z.union([z.literal(3), z.literal(4)]);

/** Where a number's one zero digit sits (never the leading digit): nowhere, the tens or the ones. */
export const zeroInParam = z.enum(['none', 'tens', 'ones']).default('none');

export type ZeroIn = z.output<typeof zeroInParam>;

/** Leading digits two compared numbers share before they differ (0 = they differ at once; the curriculum's "different hundreds"). */
export const sharedParam = z.union([z.literal(0), z.literal(1), z.literal(2)]);

/** The digits of a number of `count` digits: the leading digit 1-9, every other 1-9 too except the zero `zeroIn` asks for. */
export function drawDigits(random: Random, count: number, zeroIn: ZeroIn): readonly number[] {
  const zeroAt = zeroIn === 'tens' ? count - 2 : zeroIn === 'ones' ? count - 1 : -1;
  return Array.from({ length: count }, (_unused, index) =>
    index === zeroAt ? 0 : randomInt(random, 1, 9),
  );
}

/** A digit 0-9 (1-9 for the leading one). */
function drawFree(random: Random, leading: boolean): number {
  return randomInt(random, leading ? 1 : 0, 9);
}

/** Two numbers of `digits` digits that share exactly their first `shared` digits and differ at the next one; every digit after
 * that is free (so a comparison from the ones place can disagree with the right one). */
export function drawPair(
  random: Random,
  digits: number,
  shared: number,
): readonly [readonly number[], readonly number[]] {
  const prefix = Array.from({ length: shared }, (_unused, index) => drawFree(random, index === 0));
  const lowest = shared === 0 ? 1 : 0;
  const x = randomInt(random, lowest, 9);
  // Any other digit, uniformly: draw from the range without `x`'s slot, then step over it.
  const drawn = randomInt(random, lowest, 8);
  const y = drawn >= x ? drawn + 1 : drawn;
  const tail = (): readonly number[] =>
    Array.from({ length: digits - shared - 1 }, () => drawFree(random, false));
  const a = [...prefix, x, ...tail()];
  const b = [...prefix, y, ...tail()];
  return [a, b];
}

/** Pushes `message` as an issue of this item. */
export function fail(at: Where, message: string): void {
  at.issues.push(`${at.where}: ${message}`);
}

/** Two lists hold the same entries, in any order (compared as JSON, sorted by `key`). */
export function sameEntries<T>(
  a: readonly T[],
  b: readonly T[],
  key: (entry: T) => string,
): boolean {
  const sorted = (list: readonly T[]): string[] => list.map(key).sort();
  return JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));
}
