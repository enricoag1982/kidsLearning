// Numerals as the cards print them (`prompt.big`, option / item `big`): plain digits up to 4 digits, from 5 digits groups of 3 split
// by a thin space (`10 000`; docs/subjects/math/curriculum.md §1 "Numbers"). Pure; shared by every W1 template and its check.

/** The thin space (U+2009) between digit groups: it breaks nowhere and reads as one number on a card. */
const THIN_SPACE = ' ';

/** `n` as a card shows it: `305`, `9999`, `10 000`, `123 456` (thin spaces). Throws on anything but a whole number from 0 up. */
export function numeral(n: number): string {
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new RangeError(`numeral: ${String(n)} is not a whole number from 0 up`);
  }
  const digits = String(n);
  if (digits.length <= 4) return digits;
  const groups: string[] = [];
  for (let end = digits.length; end > 0; end -= 3) {
    groups.unshift(digits.slice(Math.max(0, end - 3), end));
  }
  return groups.join(THIN_SPACE);
}

/** The inverse of {@link numeral}: the number a card text shows, or `null` for any text `numeral` would not print (a plain space,
 * a comma, a 5-digit number without its thin space, a sign, an exponent). */
export function parseNumeral(text: string): number | null {
  const n = Number(text.replaceAll(THIN_SPACE, ''));
  return Number.isSafeInteger(n) && n >= 0 && numeral(n) === text ? n : null;
}

/** `n`'s digits in `columns` columns, high to low (`305` in 4 columns: 0, 3, 0, 5). Throws when `n` does not fit. */
export function digitsOf(n: number, columns: number): readonly number[] {
  if (!Number.isSafeInteger(n) || n < 0 || n >= 10 ** columns) {
    throw new RangeError(`digitsOf: ${String(n)} does not fit ${String(columns)} columns`);
  }
  return String(n).padStart(columns, '0').split('').map(Number);
}
