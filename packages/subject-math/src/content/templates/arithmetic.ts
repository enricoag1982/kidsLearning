// Shared by the W2 mental-math templates: the sums and differences they print on the card ("64 + ? = 100", "82 − 76"), the
// number-entry item they write (a wrong value with its spoken reason, the pad wide enough for it) and the reason comparison of
// their `check`. Operands are plain integers (W2 stays under 1 000).
import type { Where } from '@learn/platform-content/subject';
import { bugRef, type BugId } from './bugs.ts';
import { fail } from './draw.ts';
import type { NumberEntryItem, ValueReason } from './items.ts';
import { numeral, parseNumeral } from './numeral.ts';

/** The minus sign of a card (U+2212, as the curriculum writes it). */
export const MINUS = '−';

export type Sign = '+' | typeof MINUS;

export interface Operation {
  readonly a: number;
  readonly sign: Sign;
  readonly b: number;
}

/** `a + b` / `a − b` as a card prints it. */
export function operationBig(a: number, sign: Sign, b: number): string {
  return `${numeral(a)} ${sign} ${numeral(b)}`;
}

/** The operation a card text shows (`346 + 10`, `82 − 76`), or `null`. */
export function readOperation(big: string): Operation | null {
  const match = /^(\S+) ([+−]) (\S+)$/.exec(big);
  const [, left, sign, right] = match ?? [];
  if (left === undefined || sign === undefined || right === undefined) return null;
  const [a, b] = [parseNumeral(left), parseNumeral(right)];
  return a === null || b === null ? null : { a, sign: sign === '+' ? '+' : MINUS, b };
}

/** The sign a template's `op` param prints: `'+'` or `'-'` as the minus sign. */
export function signOf(op: '+' | '-'): Sign {
  return op === '+' ? '+' : MINUS;
}

/** The result of an operation. */
export function resultOf({ a, sign, b }: Operation): number {
  return sign === '+' ? a + b : a - b;
}

/** A wrong value and the bug it models. */
export interface WrongValue {
  readonly value: number;
  readonly bug: BugId;
}

/** The `answer`, `maxDigits` and `reasons` fields of a number-entry item, with a reason for each wrong value. The pad is the kind's
 * default (the answer's digits, at least 2), widened only when a wrong value is longer: it must be typeable. */
export function entryFields(
  answer: number,
  wrongs: readonly WrongValue[],
): Pick<NumberEntryItem, 'answer' | 'maxDigits' | 'reasons'> {
  const digits = Math.max(
    ...[answer, ...wrongs.map((wrong) => wrong.value)].map((n) => String(n).length),
  );
  return {
    answer,
    ...(digits > Math.max(2, String(answer).length) ? { maxDigits: digits } : {}),
    ...(wrongs.length === 0
      ? {}
      : {
          reasons: wrongs.map((wrong): ValueReason => ({
            value: wrong.value,
            text: bugRef(wrong.bug),
          })),
        }),
  };
}

/** The number-entry item with the big text `big` on its card, asking for `answer`. */
export function entryItem(
  head: {
    readonly id: string;
    readonly text: string;
    readonly big: string;
    readonly answer: number;
  },
  wrongs: readonly WrongValue[] = [],
): NumberEntryItem {
  return {
    id: head.id,
    type: 'number-entry',
    text: head.text,
    prompt: { big: head.big },
    ...entryFields(head.answer, wrongs),
  };
}

/** Pushes an issue unless the item's reasons are exactly `expected` (any order). */
export function checkReasons(
  item: Pick<NumberEntryItem, 'reasons'>,
  expected: readonly WrongValue[],
  at: Where,
): void {
  const found = (item.reasons ?? [])
    .map((reason) => `${String(reason.value)} ${reason.text}`)
    .sort();
  const wanted = expected.map((wrong) => `${String(wrong.value)} ${bugRef(wrong.bug)}`).sort();
  if (JSON.stringify(found) !== JSON.stringify(wanted)) {
    fail(at, `reasons ${JSON.stringify(found)} should be ${JSON.stringify(wanted)}`);
  }
}

/** Reads the card's operation with the sign it must have; pushes an issue and returns `null` otherwise. */
export function readOperationOf(
  item: NumberEntryItem,
  signs: readonly Sign[],
  at: Where,
): Operation | null {
  const operation = readOperation(item.prompt.big);
  if (operation === null || !signs.includes(operation.sign)) {
    fail(at, `cannot read the prompt "${item.prompt.big}" as "a ${signs.join('" or "')} b"`);
    return null;
  }
  return operation;
}

/** Pushes an issue unless `item.answer` is `expected`. */
export function checkAnswer(
  item: Pick<NumberEntryItem, 'answer'>,
  expected: number,
  what: string,
  at: Where,
): void {
  if (item.answer !== expected) {
    fail(at, `${what} is ${String(expected)}, not ${String(item.answer)}`);
  }
}
