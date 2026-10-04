// The known misconceptions ("bugs") of the W1, W2 and W3 templates (docs/subjects/math/curriculum.md §3 "Bugs"): each bug id is an
// authoring name and a `lessons:` text `bugs.<id>` (the one sentence spoken when the wrong answer matches), and each has a pure model
// of the wrong answer it produces, so a template can offer it as a distractor / reason. Numbers are digit lists, high to low
// (`numeral.ts`).

export const W1_BUG_IDS = [
  'append',
  'swap',
  'drop-zero',
  'ones-first',
  'ticks-not-gaps',
  'truncate',
  'five-down',
] as const;

export const W2_BUG_IDS = [
  'digit-tens',
  'tens-only',
  'halve-tens-only',
  'off-by-one',
  'off-by-ten',
  'wrong-place',
  'forgot-adjust',
  'answer-next',
  'wrong-op',
] as const;

export const W3_BUG_IDS = ['add-factors', 'neighbour', 'digit-swap'] as const;

export const BUG_IDS = [...W1_BUG_IDS, ...W2_BUG_IDS, ...W3_BUG_IDS] as const;

export type BugId = (typeof BUG_IDS)[number];

/** The text ref of a bug's reason (`lessons.yaml` `bugs.<id>`), as a YAML `reason` / `reasons[].text` writes it. */
export function bugRef(id: BugId): string {
  return `bugs.${id}`;
}

/** The value of a digit list, high to low. */
export function valueOf(digits: readonly number[]): number {
  return digits.reduce((sum, digit) => sum * 10 + digit, 0);
}

/** `digits` with the places `i` and `j` exchanged. */
function exchanged(digits: readonly number[], i: number, j: number): number {
  const copy = [...digits];
  const first = copy[i];
  const second = copy[j];
  if (first === undefined || second === undefined) {
    throw new RangeError(`no places ${String(i)} and ${String(j)} in ${digits.join('')}`);
  }
  copy[i] = second;
  copy[j] = first;
  return valueOf(copy);
}

/** `swap`: the tens and the ones read the wrong way round (205 → 250). */
export function swapTensOnes(digits: readonly number[]): number {
  return exchanged(digits, digits.length - 2, digits.length - 1);
}

/** `swap`, one place up: the hundreds and the tens exchanged (2 1 5 → 1 2 5), for numbers whose tens and ones are alike. */
export function swapHundredsTens(digits: readonly number[]): number {
  return exchanged(digits, digits.length - 3, digits.length - 2);
}

/** `append`: the place values written one after another, a zero place left out (2 H 0 T 5 O: 200 then 5 → 2005). `null` when no
 * place is zero (nothing is left out, the bug does not show). The result can be long: the caller checks that it fits. */
export function appendPlaces(digits: readonly number[]): number | null {
  if (!digits.includes(0)) return null;
  return Number(
    digits
      .flatMap((digit, index) =>
        digit === 0 ? [] : [String(digit * 10 ** (digits.length - 1 - index))],
      )
      .join(''),
  );
}

/** `drop-zero`: the digits of the parts joined without the zero place (3000 + 400 + 5 → 345). */
export function dropZero(digits: readonly number[]): number {
  return valueOf(digits.filter((digit) => digit !== 0));
}

/** `ones-first`: the sign a child gets comparing from the ones place up and stopping at the first difference (406 ? 460: 6 > 0). */
export function onesFirstSign(a: number, b: number): '<' | '=' | '>' {
  const left = String(a);
  const right = String(b);
  const width = Math.max(left.length, right.length);
  const [x, y] = [left.padStart(width, '0'), right.padStart(width, '0')];
  for (let i = width - 1; i >= 0; i -= 1) {
    const [p, q] = [x.charAt(i), y.charAt(i)];
    if (p !== q) return p < q ? '<' : '>';
  }
  return '=';
}

/** The multiple of `unit` at or below `n`. */
export function floorTo(n: number, unit: number): number {
  return Math.floor(n / unit) * unit;
}

/** The nearest multiple of `unit`; exactly half-way goes up. */
export function nearestTo(n: number, unit: number): number {
  return floorTo(n + unit / 2, unit);
}

/** The bug behind rounding down when the answer is the upper neighbour: `five-down` when `n` is exactly half-way, else `truncate`. */
export function roundDownBug(n: number, unit: number): 'truncate' | 'five-down' {
  return n % unit === unit / 2 ? 'five-down' : 'truncate';
}

// ---------------------------------------------------------------------------------------------------------------------
// W2 (mental math): numbers are plain integers

/** `digit-tens`: the partner of `a` to 100 with each digit taken to 10 instead of the tens to 9 (64 → 46, not 36). `null` unless `a`
 * has a tens digit and a ones digit and neither is 0 (the bug needs a digit to take to 10). */
export function digitTensPartner(a: number): number | null {
  const [tens, ones] = [Math.floor(a / 10), a % 10];
  if (a < 11 || a > 99 || ones === 0) return null;
  return (10 - tens) * 10 + (10 - ones);
}

/** `tens-only` (doubling): the tens doubled and the ones left as they are (34 → 60 + 4 = 64, not 68). */
export function doubleTensOnly(n: number): number {
  return 20 * Math.floor(n / 10) + (n % 10);
}

/** `halve-tens-only`: the tens halved and the ones left as they are (74 → 35 + 4 = 39, not 37). */
export function halveTensOnly(n: number): number {
  return 5 * Math.floor(n / 10) + (n % 10);
}

/** `wrong-place`: the place below the one that changes is changed instead: ± 1 for ± 10, ± 10 for ± 100. */
export function wrongPlace(n: number, step: 10 | 100, op: '+' | '-'): number {
  return op === '+' ? n + step / 10 : n - step / 10;
}

/** `forgot-adjust`: the round number used and the 1 never put back (46 + 99 → 46 + 100 = 146; 146 − 99 → 146 − 100 = 46). */
export function forgotAdjust(n: number, near: 9 | 99, op: '+' | '-'): number {
  return op === '+' ? n + near + 1 : n - near - 1;
}

/** `wrong-op`: the other operation done on the story's two numbers: the difference of an addition story (the larger minus the
 * smaller), the sum of a subtraction story. */
export function wrongOperation(a: number, b: number, adds: boolean): number {
  return adds ? Math.abs(a - b) : a + b;
}

// W3 (m13.14): the times-table bugs. A fact is `a × b` (a the table, b how many of it).

/** `add-factors`: the factors added instead of multiplied (3 × 4 → 7). */
export function addFactors(a: number, b: number): number {
  return a + b;
}

/** `neighbour`: the fact one step along the table, never the right answer or the added factors (those are other wrong answers): the
 * one under the answer (a × (b − 1)) when there is one, else the one over (a × (b + 1)). `null` when no such fact exists (a = 0, or
 * 1 × 1: every neighbour is the answer or the sum). */
export function neighbourFact(a: number, b: number): number | null {
  for (const steps of [b - 1, b + 1]) {
    const value = a * steps;
    if (steps >= 1 && value !== a * b && value !== addFactors(a, b)) return value;
  }
  return null;
}

/** The wrong number a child types for the missing factor of `a × ? = a × b`: one step under (b − 1), or over at b = 1. */
export function neighbourFactor(b: number): number {
  return b >= 2 ? b - 1 : b + 1;
}

/** `digit-swap`: the digits of a 2-digit answer the wrong way round (42 → 24). `null` for any other number, one that ends in 0 (its swap
 * is no 2-digit number: 40 → 04) and one whose digits are alike (33). */
export function swapDigits(n: number): number | null {
  if (!Number.isInteger(n) || n < 10 || n > 99 || n % 10 === 0) return null;
  const swapped = (n % 10) * 10 + Math.floor(n / 10);
  return swapped === n ? null : swapped;
}
