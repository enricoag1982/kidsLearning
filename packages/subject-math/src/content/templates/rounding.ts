// W1 rounding templates (docs/subjects/math/curriculum.md §3): `round-ten` (pick the nearer ten; the card draws the number between its
// two tens on a small number line), `round-hundred` (type the nearer hundred), `round-tf` ("47 → 50": is that the nearest ten / hundred?).
// Exactly half-way goes up. Reasons: `truncate` (always rounding down) and `five-down` (a half-way number rounded down). With
// `five: false` no number is half-way; `five: true` it always is.
import { pick, randomInt } from '@learn/platform-core/domain/random';
import type { ExerciseTemplate } from '@learn/platform-content/generate/template';
import { z } from 'zod';
import { bugRef, floorTo, nearestTo, roundDownBug } from './bugs.ts';
import { fail, sameEntries } from './draw.ts';
import type {
  BigOption,
  LineChoiceItem,
  NumberEntryItem,
  TrueFalseItem,
  ValueReason,
} from './items.ts';
import { numeral, parseNumeral } from './numeral.ts';
import { checkLine, wholeNumberLine } from './pictures.ts';

const ARROW = '→';

/** The ones digits of a number that is not a multiple of 10 and not half-way. */
const NOT_HALF_ONES = [1, 2, 3, 4, 6, 7, 8, 9] as const;

/** The reason spoken for rounding `n` down to `lower` when the answer is the upper neighbour, worked out from the digits as text: a
 * number that ends in half a `unit` is `five-down`, any other `truncate`. */
function downReasonOf(n: number, unit: number): 'bugs.five-down' | 'bugs.truncate' {
  const rest = String(n % unit).padStart(String(unit).length - 1, '0');
  return rest === `5${'0'.repeat(String(unit).length - 2)}` ? 'bugs.five-down' : 'bugs.truncate';
}

/** The nearest multiple of `unit` to `n`, half-way up (`Math.round`, not the floor arithmetic of `generate`). */
function nearestOf(n: number, unit: number): number {
  return Math.round(n / unit) * unit;
}

// ---------------------------------------------------------------------------------------------------------------------
// round-ten

const roundTenParams = z
  .object({
    max: z.union([z.literal(100), z.literal(1000)]),
    five: z.boolean().default(false),
  })
  .strict();

export type RoundTenParams = z.output<typeof roundTenParams>;

/** Round 47 to the nearest ten: the card shows the number and a line from the ten below to the ten above with a dot at the number
 * (never a hint at the answer: the dot sits where the number is), the options the ten below and the ten above. */
export const roundTen: ExerciseTemplate<RoundTenParams, LineChoiceItem> = {
  params: roundTenParams,
  generate({ max, five }, ctx) {
    const lower = randomInt(ctx.random, 1, max / 10 - 1) * 10;
    const ones = five ? 5 : pick(ctx.random, NOT_HALF_ONES);
    const n = lower + ones;
    const answerUp = nearestTo(n, 10) !== floorTo(n, 10);
    const down: BigOption = {
      id: 'down',
      big: numeral(lower),
      ...(answerUp ? { reason: bugRef(roundDownBug(n, 10)) } : {}),
    };
    return {
      id: ctx.id,
      type: 'choice',
      text: ctx.text('text', 'templates.round-ten', { n }),
      prompt: { big: numeral(n), line: wholeNumberLine(lower, lower + 10, [n]) },
      options: [down, { id: 'up', big: numeral(lower + 10) }],
      answer: answerUp ? 'up' : 'down',
    };
  },
  check(item, params, at) {
    const n = parseNumeral(item.prompt.big);
    if (n === null) {
      fail(at, `cannot read the prompt "${item.prompt.big}" as a number`);
      return;
    }
    if (n % 10 === 0 || n < 11 || n >= params.max || (n % 10 === 5) !== params.five) {
      fail(at, `${String(n)} does not fit max ${String(params.max)} / five ${String(params.five)}`);
    }
    const [low, high] = item.options.map((option) => parseNumeral(option.big));
    if (
      item.options.length !== 2 ||
      low === null ||
      high === null ||
      low === undefined ||
      high === undefined
    ) {
      fail(
        at,
        `the options ${JSON.stringify(item.options.map((option) => option.big))} are not 2 numerals`,
      );
      return;
    }
    if (high - low !== 10 || n < low || n > high) {
      fail(at, `${String(low)} and ${String(high)} are not the tens either side of ${String(n)}`);
    } else {
      // The picture is the same stretch, from the ten below to the ten above, with one dot where the number is.
      checkLine(item.prompt.line, wholeNumberLine(low, high, [n]), at);
    }
    const nearest = nearestOf(n, 10);
    const right = item.options.filter((_option, index) => (index === 0 ? low : high) === nearest);
    if (right.length !== 1 || right[0]?.id !== item.answer) {
      fail(
        at,
        `the nearest ten of ${String(n)} is ${String(nearest)}: option "${item.answer}" should be the only one`,
      );
    }
    const found = item.options.flatMap((option) =>
      option.reason === undefined ? [] : [`${option.big} ${option.reason}`],
    );
    const expected = nearest === high ? [`${String(low)} ${downReasonOf(n, 10)}`] : [];
    if (JSON.stringify(found) !== JSON.stringify(expected)) {
      fail(at, `reasons ${JSON.stringify(found)} should be ${JSON.stringify(expected)}`);
    }
  },
};

// ---------------------------------------------------------------------------------------------------------------------
// round-hundred

const roundHundredParams = z
  .object({
    max: z.union([z.literal(1000), z.literal(10000)]),
    five: z.boolean().default(false),
  })
  .strict();

export type RoundHundredParams = z.output<typeof roundHundredParams>;

/** Round 367 to the nearest hundred: type it (the answer can be 10 000). */
export const roundHundred: ExerciseTemplate<RoundHundredParams, NumberEntryItem> = {
  params: roundHundredParams,
  generate({ max, five }, ctx) {
    const lower = randomInt(ctx.random, 1, max / 100 - 1) * 100;
    // Exactly half-way (50), or 1-99 without 50: draw 1-98 and step over 50.
    const drawn = five ? 50 : randomInt(ctx.random, 1, 98);
    const n = lower + (!five && drawn >= 50 ? drawn + 1 : drawn);
    const answer = nearestTo(n, 100);
    const reasons: readonly ValueReason[] =
      answer === lower ? [] : [{ value: lower, text: bugRef(roundDownBug(n, 100)) }];
    return {
      id: ctx.id,
      type: 'number-entry',
      text: ctx.text('text', 'templates.round-hundred', { n }),
      prompt: { big: numeral(n) },
      answer,
      ...(reasons.length === 0 ? {} : { reasons }),
    };
  },
  check(item, params, at) {
    const n = parseNumeral(item.prompt.big);
    if (n === null) {
      fail(at, `cannot read the prompt "${item.prompt.big}" as a number`);
      return;
    }
    if (n % 100 === 0 || n < 101 || n >= params.max || (n % 100 === 50) !== params.five) {
      fail(at, `${String(n)} does not fit max ${String(params.max)} / five ${String(params.five)}`);
    }
    const nearest = nearestOf(n, 100);
    if (item.answer !== nearest) {
      fail(
        at,
        `the nearest hundred of ${String(n)} is ${String(nearest)}, not ${String(item.answer)}`,
      );
    }
    const lower = n - (n % 100);
    const expected: readonly ValueReason[] =
      nearest === lower ? [] : [{ value: lower, text: downReasonOf(n, 100) }];
    if (
      !sameEntries(
        item.reasons ?? [],
        expected,
        (reason) => `${String(reason.value)} ${reason.text}`,
      )
    ) {
      fail(
        at,
        `reasons ${JSON.stringify(item.reasons ?? [])} should be ${JSON.stringify(expected)}`,
      );
    }
  },
};

// ---------------------------------------------------------------------------------------------------------------------
// round-tf

const roundTfParams = z
  .object({
    to: z.union([z.literal(10), z.literal(100)]),
    max: z.union([z.literal(100), z.literal(1000), z.literal(10000)]),
  })
  .strict()
  .superRefine((params, ctx) => {
    if (params.max < params.to * 10) {
      ctx.addIssue({
        code: 'custom',
        path: ['max'],
        message: `max ${String(params.max)} leaves no number to round to the nearest ${String(params.to)}`,
      });
    }
  });

export type RoundTfParams = z.output<typeof roundTfParams>;

/** "47 → 50": is this the nearest ten (hundred)? True half the time; the false claim is the other neighbour, and when that is the
 * ten below the right one, its reason (`truncate`, `five-down` half-way) is spoken on the wrong pick. */
export const roundTf: ExerciseTemplate<RoundTfParams, TrueFalseItem> = {
  params: roundTfParams,
  generate({ to, max }, ctx) {
    const lower = randomInt(ctx.random, 1, max / to - 1) * to;
    const n = lower + randomInt(ctx.random, 1, to - 1);
    const nearest = nearestTo(n, to);
    const other = nearest === lower ? lower + to : lower;
    const claim = randomInt(ctx.random, 0, 1) === 0 ? nearest : other;
    const answer = claim === nearest;
    return {
      id: ctx.id,
      type: 'true-false',
      text: ctx.text('text', 'templates.round-tf', { unit: to === 10 ? 'ten' : 'hundred' }),
      prompt: { big: `${numeral(n)} ${ARROW} ${numeral(claim)}` },
      answer,
      ...(!answer && claim === lower && nearest !== lower
        ? { reason: bugRef(roundDownBug(n, to)) }
        : {}),
    };
  },
  check(item, params, at) {
    const [left, right, ...extra] = item.prompt.big.split(` ${ARROW} `);
    const [n, claim] = [parseNumeral(left ?? ''), parseNumeral(right ?? '')];
    if (n === null || claim === null || extra.length > 0) {
      fail(at, `cannot read the prompt "${item.prompt.big}" as "n ${ARROW} m"`);
      return;
    }
    const lower = n - (n % params.to);
    if (
      n % params.to === 0 ||
      n < params.to + 1 ||
      n >= params.max ||
      (claim !== lower && claim !== lower + params.to)
    ) {
      fail(
        at,
        `"${item.prompt.big}" is not a number below ${String(params.max)} and a neighbouring ${String(params.to)}`,
      );
      return;
    }
    const nearest = nearestOf(n, params.to);
    if (item.answer !== (claim === nearest)) {
      fail(
        at,
        `the nearest ${String(params.to)} of ${String(n)} is ${String(nearest)}: "${item.prompt.big}" is ${String(claim === nearest)}`,
      );
    }
    const expected = claim === lower && nearest !== lower ? downReasonOf(n, params.to) : undefined;
    if (item.reason !== expected) {
      fail(at, `reason ${item.reason ?? '(none)'} should be ${expected ?? '(none)'}`);
    }
  },
};
