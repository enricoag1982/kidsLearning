// W2 doubling templates (docs/subjects/math/curriculum.md §3): `double` ("Double 34." on the card "34 + 34"), `near-double` ("35 + 36":
// use the double of 35) and `halve` ("What is half of 68?"). Reasons: `tens-only` (the tens doubled, the ones left), `halve-tens-only`
// (the tens halved, the ones left), `off-by-one` (the plain double of a near double).
import { randomInt } from '@learn/platform-core/domain/random';
import type { ExerciseTemplate } from '@learn/platform-content/generate/template';
import { z } from 'zod';
import {
  checkAnswer,
  checkReasons,
  entryItem,
  readOperationOf,
  type WrongValue,
} from './arithmetic.ts';
import { doubleTensOnly, halveTensOnly } from './bugs.ts';
import { fail } from './draw.ts';
import type { NumberEntryItem } from './items.ts';
import { numeral, parseNumeral } from './numeral.ts';

/** The `tens-only` reason of doubling `n`: only when `n` has both a tens and a ones digit (a multiple of 10 doubles the same way, a
 * single digit has no tens to double). */
function doubleReason(n: number): readonly WrongValue[] {
  return n >= 10 && n % 10 !== 0 ? [{ value: doubleTensOnly(n), bug: 'tens-only' }] : [];
}

/** The `halve-tens-only` reason of halving the even `n`: only when its ones digit is not 0 (then halving the tens alone is wrong). */
function halveReason(n: number): readonly WrongValue[] {
  return n >= 10 && n % 10 !== 0 ? [{ value: halveTensOnly(n), bug: 'halve-tens-only' }] : [];
}

// ---------------------------------------------------------------------------------------------------------------------
// double

const doubleParams = z.object({ max: z.union([z.literal(20), z.literal(50)]) }).strict();

export type DoubleParams = z.output<typeof doubleParams>;

/** The smallest number doubled: 6 up to 20, 11 up to 50 (no single digits among the larger doubles). */
function doubleFrom(max: 20 | 50): number {
  return max === 20 ? 6 : 11;
}

/** "Double 34." with the card "34 + 34". */
export const double: ExerciseTemplate<DoubleParams, NumberEntryItem> = {
  params: doubleParams,
  generate({ max }, ctx) {
    const n = randomInt(ctx.random, doubleFrom(max), max);
    return entryItem(
      {
        id: ctx.id,
        text: ctx.text('text', 'templates.double', { n }),
        big: `${numeral(n)} + ${numeral(n)}`,
        answer: 2 * n,
      },
      doubleReason(n),
    );
  },
  check(item, params, at) {
    const operation = readOperationOf(item, ['+'], at);
    if (operation === null) return;
    const { a: n, b } = operation;
    if (n !== b) fail(at, `${String(n)} + ${String(b)} is not a double`);
    if (n < doubleFrom(params.max) || n > params.max) {
      fail(
        at,
        `${String(n)} is not from ${String(doubleFrom(params.max))} to ${String(params.max)}`,
      );
    }
    checkAnswer(item, n + b, `${String(n)} + ${String(b)}`, at);
    checkReasons(item, doubleReason(n), at);
  },
};

// ---------------------------------------------------------------------------------------------------------------------
// near-double

const nearDoubleParams = z.object({ max: z.number().int().min(10).max(50) }).strict();

export type NearDoubleParams = z.output<typeof nearDoubleParams>;

/** The smaller addend of a near double starts here. */
const NEAR_DOUBLE_FROM = 6;

/** "35 + 36": the double of the smaller number and 1 more. The plain double (35 + 35) is the `off-by-one` reason. */
export const nearDouble: ExerciseTemplate<NearDoubleParams, NumberEntryItem> = {
  params: nearDoubleParams,
  generate({ max }, ctx) {
    const n = randomInt(ctx.random, NEAR_DOUBLE_FROM, max - 1);
    return entryItem(
      {
        id: ctx.id,
        text: ctx.text('text', 'templates.near-double'),
        big: `${numeral(n)} + ${numeral(n + 1)}`,
        answer: 2 * n + 1,
      },
      [{ value: 2 * n, bug: 'off-by-one' }],
    );
  },
  check(item, params, at) {
    const operation = readOperationOf(item, ['+'], at);
    if (operation === null) return;
    const { a, b } = operation;
    if (b !== a + 1 || a < NEAR_DOUBLE_FROM || b > params.max) {
      fail(
        at,
        `${String(a)} + ${String(b)} is not a near double from ${String(NEAR_DOUBLE_FROM)} to ${String(params.max)}`,
      );
    }
    checkAnswer(item, a + b, `${String(a)} + ${String(b)}`, at);
    checkReasons(item, [{ value: a + a, bug: 'off-by-one' }], at);
  },
};

// ---------------------------------------------------------------------------------------------------------------------
// halve

const halveParams = z.object({ max: z.number().int().min(20).max(100) }).strict();

export type HalveParams = z.output<typeof halveParams>;

/** The smallest number halved. */
const HALVE_FROM = 12;

/** "What is half of 68?": an even number from 12 to `max`, on the card as a numeral. */
export const halve: ExerciseTemplate<HalveParams, NumberEntryItem> = {
  params: halveParams,
  generate({ max }, ctx) {
    const n = 2 * randomInt(ctx.random, HALVE_FROM / 2, Math.floor(max / 2));
    return entryItem(
      {
        id: ctx.id,
        text: ctx.text('text', 'templates.halve', { n }),
        big: numeral(n),
        answer: n / 2,
      },
      halveReason(n),
    );
  },
  check(item, params, at) {
    const n = parseNumeral(item.prompt.big);
    if (n === null) {
      fail(at, `cannot read the prompt "${item.prompt.big}" as a number`);
      return;
    }
    if (n % 2 !== 0 || n < HALVE_FROM || n > params.max) {
      fail(
        at,
        `${String(n)} is not an even number from ${String(HALVE_FROM)} to ${String(params.max)}`,
      );
    }
    checkAnswer(item, n / 2, `half of ${String(n)}`, at);
    checkReasons(item, halveReason(n), at);
  },
};
