// The pure arithmetic of the place-value kind, shared by its engine, solution, content checks, notes and UI: which place each column
// holds, the value of a build, a number's digits.
import type { PlaceValueDef } from './def.ts';

/** The place of each column from the left of a 4-column build; a 3-column build leaves the thousands off. */
export type PlaceName = 'thousands' | 'hundreds' | 'tens' | 'ones';
const PLACES: readonly PlaceName[] = ['thousands', 'hundreds', 'tens', 'ones'];

/** The most blocks a column holds (at 10 the child would exchange them for one block of the next place: not in v1.2). */
export const MAX_COUNT = 9;

/** The places of `columns` columns, high to low. */
export function placesOf(columns: number): readonly PlaceName[] {
  return PLACES.slice(PLACES.length - columns);
}

/** The value of a build: counts high to low, one per column. */
export function valueOf(counts: readonly number[]): number {
  return counts.reduce((sum, count) => sum * 10 + count, 0);
}

/** `value`'s digits in `columns` columns, high to low (`305` in 4 columns: 0, 3, 0, 5). */
export function digitsOf(value: number, columns: number): readonly number[] {
  return Array.from(
    { length: columns },
    (_unused, index) => Math.floor(value / 10 ** (columns - 1 - index)) % 10,
  );
}

/** The counts of a fresh exercise: its `start`, else all 0. */
export function startCounts(def: Pick<PlaceValueDef, 'columns' | 'start'>): readonly number[] {
  return def.start ?? Array.from({ length: def.columns }, () => 0);
}

/** Whether `counts` is a build the exercise can hear: one count per column, a whole number 0-9 each. */
export function validCounts(columns: number, counts: readonly number[]): boolean {
  return (
    counts.length === columns &&
    counts.every((count) => Number.isInteger(count) && count >= 0 && count <= MAX_COUNT)
  );
}

/** The index of the target's highest column that is not 0: where hint 3 puts blocks. */
export function highestColumn(def: Pick<PlaceValueDef, 'target' | 'columns'>): number {
  return digitsOf(def.target, def.columns).findIndex((digit) => digit !== 0);
}
