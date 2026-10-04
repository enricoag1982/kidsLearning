// W2 number-bond templates (docs/subjects/math/curriculum.md §3): `bond-missing` ("64 + ? = 100", type the missing number),
// `bond-pairs` (pick the pair that makes the total) and `equals-balance` ("7 + 5 = 6 + ?"). Reasons: `digit-tens` (each digit taken
// to 10, so the partner of 64 comes out 46) for the bonds to 100, `answer-next` (the sum written after the equals sign).
import { pick, randomInt, shuffle, type Random } from '@learn/platform-core/domain/random';
import type { ExerciseTemplate } from '@learn/platform-content/generate/template';
import { z } from 'zod';
import { checkReasons, entryItem, type WrongValue } from './arithmetic.ts';
import { bugRef, digitTensPartner } from './bugs.ts';
import { fail } from './draw.ts';
import type { BigOption, ChoiceItem, NumberEntryItem } from './items.ts';
import { numeral, parseNumeral } from './numeral.ts';

const totalParam = z.union([z.literal(10), z.literal(20), z.literal(100)]);

type Total = z.output<typeof totalParam>;

/** The first addend of a bond to `total`: a multiple of 10 (`tensOnly`) or a number with neither digit 0 (11-89, so its partner and
 * the partner ± 10 stay 11-89) for 100; for 10 and 20 any number up to `most`. */
function drawFirst(random: Random, total: Total, tensOnly: boolean, most: number): number {
  if (total !== 100) return randomInt(random, 1, most);
  return tensOnly
    ? randomInt(random, 1, 9) * 10
    : randomInt(random, 1, 8) * 10 + randomInt(random, 1, 9);
}

/** Whether `a` can be the first addend of a `bond-missing` item of these params. */
function missingFirstFits(a: number, total: Total, tensOnly: boolean): boolean {
  if (total !== 100) return a >= 1 && a <= total - 1;
  return tensOnly ? a >= 10 && a <= 90 && a % 10 === 0 : a >= 11 && a <= 89 && a % 10 !== 0;
}

/** The `digit-tens` reason of a bond to 100 that starts with `a`: the partner with each digit taken to 10, when `a` has such a
 * partner and it is not the right one. */
function digitTensReason(a: number, total: number): readonly WrongValue[] {
  const partner = total === 100 ? digitTensPartner(a) : null;
  return partner === null || partner === total - a ? [] : [{ value: partner, bug: 'digit-tens' }];
}

// ---------------------------------------------------------------------------------------------------------------------
// bond-missing

const bondMissingParams = z
  .object({ total: totalParam, tensOnly: z.boolean().default(false) })
  .strict()
  .superRefine((params, ctx) => {
    if (params.tensOnly && params.total !== 100) {
      ctx.addIssue({
        code: 'custom',
        path: ['tensOnly'],
        message: `tensOnly is for the total 100, not ${String(params.total)}`,
      });
    }
  });

export type BondMissingParams = z.output<typeof bondMissingParams>;

/** "64 + ? = 100": type the missing number. The bonds to 100 speak `digit-tens` for the partner with each digit taken to 10; with
 * `tensOnly` the first addend is a multiple of 10 (30 + ? = 100), where no such partner exists. */
export const bondMissing: ExerciseTemplate<BondMissingParams, NumberEntryItem> = {
  params: bondMissingParams,
  generate({ total, tensOnly }, ctx) {
    const a = drawFirst(ctx.random, total, tensOnly, total - 1);
    return entryItem(
      {
        id: ctx.id,
        text: ctx.text('text', 'templates.bond-missing', { total }),
        big: `${numeral(a)} + ? = ${String(total)}`,
        answer: total - a,
      },
      digitTensReason(a, total),
    );
  },
  check(item, params, at) {
    const match = /^(\S+) \+ \? = (\S+)$/.exec(item.prompt.big);
    const [a, total] = [parseNumeral(match?.[1] ?? ''), parseNumeral(match?.[2] ?? '')];
    if (a === null || total === null) {
      fail(at, `cannot read the prompt "${item.prompt.big}" as "a + ? = total"`);
      return;
    }
    if (total !== params.total || !missingFirstFits(a, params.total, params.tensOnly)) {
      fail(
        at,
        `"${item.prompt.big}" does not fit total ${String(params.total)} / tensOnly ${String(params.tensOnly)}`,
      );
    }
    if (item.answer !== total - a) {
      fail(
        at,
        `${String(a)} + ? = ${String(total)}: the missing number is ${String(total - a)}, not ${String(item.answer)}`,
      );
    }
    checkReasons(item, digitTensReason(a, total), at);
  },
};

// ---------------------------------------------------------------------------------------------------------------------
// bond-pairs

const bondPairsParams = z.object({ total: totalParam }).strict();

export type BondPairsParams = z.output<typeof bondPairsParams>;

/** The sums the three options of a total make: the right one and the two near misses (± 10 for the bonds to 100, ± 1 below). */
function pairSums(total: number): readonly number[] {
  const near = total === 100 ? 10 : 1;
  return [total - near, total, total + near];
}

const OPTION_IDS = ['a', 'b', 'c'] as const;

/** "Which two numbers make 100?": three pairs with the same first number, one summing to the total. For 100 the others add 110 (the
 * partner with each digit taken to 10: `digit-tens`, spoken when picked) and 90; for 10 and 20 they add one more and one less. */
export const bondPairs: ExerciseTemplate<BondPairsParams, ChoiceItem> = {
  params: bondPairsParams,
  generate({ total }, ctx) {
    const a = drawFirst(ctx.random, total, false, total - 2);
    const pairs = shuffle(
      pairSums(total).map((sum) => ({ second: sum - a, sum })),
      ctx.random,
    );
    const options: readonly BigOption[] = pairs.map(({ second, sum }, index) => ({
      id: OPTION_IDS[index] ?? 'a',
      big: `${numeral(a)} + ${numeral(second)}`,
      ...(total === 100 && sum !== total && second === digitTensPartner(a)
        ? { reason: bugRef('digit-tens') }
        : {}),
    }));
    return {
      id: ctx.id,
      type: 'choice',
      text: ctx.text('text', 'templates.bond-pairs', { total }),
      options,
      answer: options[pairs.findIndex(({ sum }) => sum === total)]?.id ?? 'a',
    };
  },
  check(item, params, at) {
    const pairs = item.options.map((option) => {
      const match = /^(\S+) \+ (\S+)$/.exec(option.big);
      return [parseNumeral(match?.[1] ?? ''), parseNumeral(match?.[2] ?? '')] as const;
    });
    if (item.options.length !== 3 || pairs.some(([x, y]) => x === null || y === null)) {
      fail(
        at,
        `the options ${JSON.stringify(item.options.map((option) => option.big))} are not 3 sums "a + b"`,
      );
      return;
    }
    const read = pairs.map(([x, y]) => ({ x: x ?? 0, y: y ?? 0 }));
    if (new Set(item.options.map((option) => option.big)).size !== 3) {
      fail(at, 'two options are the same pair');
    }
    const sums = read.map(({ x, y }) => x + y).sort((p, q) => p - q);
    if (JSON.stringify(sums) !== JSON.stringify(pairSums(params.total))) {
      fail(at, `the sums ${sums.join(', ')} should be ${pairSums(params.total).join(', ')}`);
    }
    const right = item.options.filter((_option, index) => {
      const pair = read[index];
      return pair !== undefined && pair.x + pair.y === params.total;
    });
    if (right.length !== 1 || right[0]?.id !== item.answer) {
      fail(
        at,
        `exactly the pair that makes ${String(params.total)} should be the answer "${item.answer}"`,
      );
    }
    const found = item.options.flatMap((option) =>
      option.reason === undefined ? [] : [`${option.big} ${option.reason}`],
    );
    const expected = item.options.flatMap((option, index) => {
      const pair = read[index];
      const wrong = pair !== undefined && pair.x + pair.y !== params.total;
      return wrong && params.total === 100 && digitTensPartner(pair.x) === pair.y
        ? [`${option.big} ${bugRef('digit-tens')}`]
        : [];
    });
    if (JSON.stringify(found) !== JSON.stringify(expected)) {
      fail(at, `reasons ${JSON.stringify(found)} should be ${JSON.stringify(expected)}`);
    }
    if (params.total === 100 && expected.length !== 1) {
      fail(at, 'a bond to 100 needs exactly one digit-tens pair among the options');
    }
  },
};

// ---------------------------------------------------------------------------------------------------------------------
// equals-balance

const equalsBalanceParams = z.object({ max: z.number().int().min(10).max(20) }).strict();

export type EqualsBalanceParams = z.output<typeof equalsBalanceParams>;

/** "7 + 5 = 6 + ?": both sides are the same. The left sum is 4 to `max`, the number after the equals sign is neither addend, and the
 * sum written in the gap is the `answer-next` reason. */
export const equalsBalance: ExerciseTemplate<EqualsBalanceParams, NumberEntryItem> = {
  params: equalsBalanceParams,
  generate({ max }, ctx) {
    const a = randomInt(ctx.random, 2, max - 2);
    const b = randomInt(ctx.random, 2, max - a);
    const sum = a + b;
    const others = Array.from({ length: sum - 1 }, (_unused, index) => index + 1).filter(
      (c) => c !== a && c !== b,
    );
    const c = pick(ctx.random, others);
    return entryItem(
      {
        id: ctx.id,
        text: ctx.text('text', 'templates.equals-balance'),
        big: `${String(a)} + ${String(b)} = ${String(c)} + ?`,
        answer: sum - c,
      },
      [{ value: sum, bug: 'answer-next' }],
    );
  },
  check(item, params, at) {
    const match = /^(\d+) \+ (\d+) = (\d+) \+ \?$/.exec(item.prompt.big);
    const [a, b, c] = [1, 2, 3].map((group) => Number(match?.[group]));
    if (match === null || a === undefined || b === undefined || c === undefined) {
      fail(at, `cannot read the prompt "${item.prompt.big}" as "a + b = c + ?"`);
      return;
    }
    const sum = a + b;
    if (a < 2 || b < 2 || sum > params.max || c < 1 || c >= sum || c === a || c === b) {
      fail(at, `"${item.prompt.big}" does not fit max ${String(params.max)}`);
    }
    if (item.answer !== sum - c) {
      fail(
        at,
        `both sides make ${String(sum)}: the gap is ${String(sum - c)}, not ${String(item.answer)}`,
      );
    }
    checkReasons(item, [{ value: sum, bug: 'answer-next' }], at);
  },
};
