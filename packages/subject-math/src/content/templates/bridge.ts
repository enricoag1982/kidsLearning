// W2 bridging templates (docs/subjects/math/curriculum.md §3): `bridge-add` ("38 + 7": make a ten first; the ones add to 11-18; the card
// draws the start and the next ten on a small number line, never the answer) and `count-up` ("82 − 76": count up from the smaller number
// across a ten). Reasons: `off-by-one` and `off-by-ten` for an addition that is a jump short, `off-by-ten` for a difference with the ten
// counted twice.
import type { CardLine } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import { pick, randomInt } from '@learn/platform-core/domain/random';
import type { ExerciseTemplate } from '@learn/platform-content/generate/template';
import { z } from 'zod';
import {
  checkAnswer,
  checkReasons,
  entryItem,
  MINUS,
  operationBig,
  readOperationOf,
  type WrongValue,
} from './arithmetic.ts';
import { fail } from './draw.ts';
import type { LineNumberEntryItem, NumberEntryItem } from './items.ts';
import { checkLine, lineOf, wholeNumberLine } from './pictures.ts';

// ---------------------------------------------------------------------------------------------------------------------
// bridge-add

const onesSumLimit = z.number().int().min(11).max(18);

const bridgeAddParams = z
  .object({
    onesSum: z.tuple([onesSumLimit, onesSumLimit]),
    max: z.number().int().min(20).max(100),
  })
  .strict()
  .superRefine((params, ctx) => {
    if (params.onesSum[0] > params.onesSum[1]) {
      ctx.addIssue({
        code: 'custom',
        path: ['onesSum'],
        message: `onesSum [${params.onesSum.join(', ')}] must go from the smaller to the larger`,
      });
    }
  });

export type BridgeAddParams = z.output<typeof bridgeAddParams>;

/** The ones digit of the first addend and the second addend each run 2-9 (so the ones cross a ten, and neither is 0 or 1). */
const DIGITS = [2, 3, 4, 5, 6, 7, 8, 9] as const;

/** The wrong values of a bridging sum: a jump short, a ten short. */
function bridgeReasons(answer: number): readonly WrongValue[] {
  return [
    { value: answer - 1, bug: 'off-by-one' },
    { value: answer - 10, bug: 'off-by-ten' },
  ];
}

/** The line of "38 + 7": from the first addend `a` to the ten after the total (38 to 50), a dot on `a` and one on the next ten (40).
 * The total (45) gets no dot: the child counts on from the ten. */
function bridgeLine(a: number, total: number): CardLine {
  const nextTen = a - (a % 10) + 10;
  return wholeNumberLine(a, total - (total % 10) + 10, [a, nextTen]);
}

/** "38 + 7": the first addend is 0 to 8 tens and a ones digit, the second a single digit, the ones adding to `onesSum` (a ten is
 * made first), the total at most `max`. */
export const bridgeAdd: ExerciseTemplate<BridgeAddParams, LineNumberEntryItem> = {
  params: bridgeAddParams,
  generate({ onesSum: [least, most], max }, ctx) {
    const pairs = DIGITS.flatMap((ones) =>
      DIGITS.map((b) => ({ ones, b })).filter(({ b }) => ones + b >= least && ones + b <= most),
    ).filter(({ ones, b }) => ones + b <= max);
    const { ones, b } = pick(ctx.random, pairs);
    const tens = randomInt(ctx.random, 0, Math.floor((max - ones - b) / 10));
    const a = tens * 10 + ones;
    const item = entryItem(
      {
        id: ctx.id,
        text: ctx.text('text', 'templates.bridge-add'),
        big: operationBig(a, '+', b),
        answer: a + b,
      },
      bridgeReasons(a + b),
    );
    return { ...item, prompt: { ...item.prompt, line: bridgeLine(a, a + b) } };
  },
  check(item, params, at) {
    const operation = readOperationOf(item, ['+'], at);
    if (operation === null) return;
    const { a, b } = operation;
    const ones = (a % 10) + b;
    if (
      b < 2 ||
      b > 9 ||
      a % 10 < 2 ||
      ones < params.onesSum[0] ||
      ones > params.onesSum[1] ||
      a + b > params.max
    ) {
      fail(
        at,
        `${String(a)} + ${String(b)} does not fit ones sum ${params.onesSum.join('-')} / max ${String(params.max)}`,
      );
    }
    checkAnswer(item, a + b, `${String(a)} + ${String(b)}`, at);
    checkReasons(item, bridgeReasons(a + b), at);
    // Re-derived from the card's numbers (the ten above the first addend, the ten above the total), not from `bridgeLine`.
    const line = lineOf(item);
    checkLine(
      line,
      wholeNumberLine(a, Math.ceil((a + b) / 10) * 10, [a, Math.ceil((a + 1) / 10) * 10]),
      at,
    );
    // The picture never shows the answer: no dot on it, and the line does not end on it.
    if (line?.marks.includes(item.answer) || line?.to === item.answer) {
      fail(at, `the number line shows the answer ${String(item.answer)}`);
    }
  },
};

// ---------------------------------------------------------------------------------------------------------------------
// count-up

/** The ones digit of the smaller number: any but 0. */
const ONES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

const countUpParams = z.object({ maxDiff: z.number().int().min(4).max(12) }).strict();

export type CountUpParams = z.output<typeof countUpParams>;

/** "82 − 76": the smaller number is 11-89 with a ones digit, the larger is in the next ten and not on it, the difference at most
 * `maxDiff`. */
export const countUp: ExerciseTemplate<CountUpParams, NumberEntryItem> = {
  params: countUpParams,
  generate({ maxDiff }, ctx) {
    // Every (ones digit of the smaller number, difference) that lands on the next ten's ones 1-9: 11 - ones <= d <= 19 - ones.
    const steps = ONES.flatMap((ones) =>
      Array.from({ length: maxDiff }, (_unused, index) => index + 1)
        .filter((d) => d >= 11 - ones && d <= 19 - ones)
        .map((d) => ({ ones, d })),
    );
    const { ones, d } = pick(ctx.random, steps);
    const small = randomInt(ctx.random, 1, 8) * 10 + ones;
    return entryItem(
      {
        id: ctx.id,
        text: ctx.text('text', 'templates.count-up'),
        big: operationBig(small + d, MINUS, small),
        answer: d,
      },
      [{ value: d + 10, bug: 'off-by-ten' }],
    );
  },
  check(item, params, at) {
    const operation = readOperationOf(item, [MINUS], at);
    if (operation === null) return;
    const { a: large, b: small } = operation;
    const difference = large - small;
    const crosses = Math.floor(large / 10) - Math.floor(small / 10) === 1;
    if (
      small < 11 ||
      large > 99 ||
      difference < 1 ||
      difference > params.maxDiff ||
      !crosses ||
      small % 10 === 0 ||
      large % 10 === 0
    ) {
      fail(
        at,
        `${String(large)} ${MINUS} ${String(small)} is not a difference of at most ${String(params.maxDiff)} across one ten`,
      );
    }
    checkAnswer(item, difference, `${String(large)} ${MINUS} ${String(small)}`, at);
    checkReasons(item, [{ value: difference + 10, bug: 'off-by-ten' }], at);
  },
};
