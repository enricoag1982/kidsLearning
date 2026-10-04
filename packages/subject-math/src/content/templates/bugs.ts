// The known misconceptions ("bugs") of the W1 templates (docs/subjects/math/curriculum.md §3 "Bugs"): each bug id is an authoring name
// and a `lessons:` text `bugs.<id>` (the one sentence spoken when the wrong answer matches), and each has a pure model of the wrong
// answer it produces, so a template can offer it as a distractor / reason. Numbers are digit lists, high to low (`numeral.ts`).

export const BUG_IDS = [
  'append',
  'swap',
  'drop-zero',
  'ones-first',
  'ticks-not-gaps',
  'truncate',
  'five-down',
] as const;

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
