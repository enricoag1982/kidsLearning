// W3 times-table facts (docs/subjects/math/curriculum.md §3): `fact` ("7 × 6": type the answer), `fact-missing` ("6 × ? = 42"),
// `fact-choice` (pick the answer of three) and `fact-tf` ("4 × 8 = 32": true or false). A fact is `a × b`: a from the lesson's
// `tables`, b from the range `b`. Bugs: `add-factors` (a + b), `neighbour` (the fact one step along the table, a × (b − 1) or, when
// that is taken, a × (b + 1); `bugs.ts`), `digit-swap` (a 2-digit answer the wrong way round). Every drawn fact is one the
// template's `viable` rule accepts, picked uniformly from all the facts of the tables and the b range.
import { pick, randomInt, shuffle, type Random } from '@learn/platform-core/domain/random';
import type { ExerciseTemplate } from '@learn/platform-content/generate/template';
import type { Where } from '@learn/platform-content/subject';
import { z } from 'zod';
import { addFactors, bugRef, neighbourFact, neighbourFactor, swapDigits } from './bugs.ts';
import type { BugId } from './bugs.ts';
import { fail, sameEntries } from './draw.ts';
import type {
  BigOption,
  ChoiceItem,
  NumberEntryItem,
  TrueFalseItem,
  ValueReason,
} from './items.ts';

const TIMES = '×';

interface Fact {
  readonly a: number;
  readonly b: number;
}

/** The table and b ranges. `fact` takes the 0 table too (the ×0 / ×1 lesson); the others need a non-zero factor. */
function paramsFor(minTable: 0 | 1, viable?: (fact: Fact) => boolean, rule?: string) {
  const table = z.number().int().min(minTable).max(10);
  const bound = z.number().int().min(1).max(10);
  return z
    .object({
      tables: z
        .array(table)
        .min(1)
        .refine((list) => new Set(list).size === list.length, { message: 'tables repeat a table' }),
      b: z
        .tuple([bound, bound])
        .refine(([low, high]) => low <= high, { message: 'b must be [lowest, highest]' })
        .default([1, 10]),
    })
    .strict()
    .superRefine((params, ctx) => {
      if (viable !== undefined && factsOf(params).filter(viable).length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['tables'],
          message: `no fact of tables ${params.tables.join(', ')} with b ${params.b.join('-')} ${rule ?? 'fits'}`,
        });
      }
    });
}

/** The facts a template draws from: the tables and the range of b. */
interface FactRange {
  readonly tables: readonly number[];
  readonly b: readonly [number, number];
}

/** Every fact of the tables, b from lowest to highest, in the order the params list them. */
function factsOf({ tables, b: [low, high] }: FactRange): readonly Fact[] {
  return tables.flatMap((a) =>
    Array.from({ length: high - low + 1 }, (_unused, index) => ({ a, b: low + index })),
  );
}

/** The fact a template draws: one of `facts` it accepts, uniformly. */
function drawFact(params: FactRange, viable: (fact: Fact) => boolean, random: Random): Fact {
  return pick(random, factsOf(params).filter(viable));
}

/** "7 × 6". */
function factText({ a, b }: Fact): string {
  return `${String(a)} ${TIMES} ${String(b)}`;
}

/** The fact of a card text "7 × 6", or `null`. */
function readFact(text: string): Fact | null {
  const found = new RegExp(`^(\\d+) ${TIMES} (\\d+)$`).exec(text);
  return found === null ? null : { a: Number(found[1]), b: Number(found[2]) };
}

/** a × b by adding a, b times (the checks do not trust the product `generate` used). */
function timesBySum(a: number, b: number): number {
  let total = 0;
  for (let step = 0; step < b; step += 1) total += a;
  return total;
}

function fitsTables(fact: Fact, params: FactRange): boolean {
  const [low, high] = params.b;
  return params.tables.includes(fact.a) && fact.b >= low && fact.b <= high;
}

const anyFact = (): boolean => true;
/** `fact-choice` needs the added factors and a neighbour as two more distinct options. */
const threeOptions = ({ a, b }: Fact): boolean =>
  addFactors(a, b) !== a * b && neighbourFact(a, b) !== null;
/** `fact-tf` needs a neighbour to claim. */
const hasNeighbour = ({ a, b }: Fact): boolean => neighbourFact(a, b) !== null;

/** The wrong answers of `a × b` with their bugs, in the order `add-factors`, `neighbour`, `digit-swap`: each only when it exists and
 * is no other wrong answer's value (a 2-digit swap that is the neighbour is the neighbour). */
function wrongAnswers(
  a: number,
  b: number,
): readonly { readonly value: number; readonly bug: BugId }[] {
  const answer = a * b;
  const found: { value: number; bug: BugId }[] = [];
  const add = (value: number | null, bug: BugId): void => {
    if (value !== null && value !== answer && !found.some((entry) => entry.value === value)) {
      found.push({ value, bug });
    }
  };
  add(addFactors(a, b), 'add-factors');
  add(neighbourFact(a, b), 'neighbour');
  add(swapDigits(answer), 'digit-swap');
  return found;
}

/** The same list worked out again the long way (by adding, with the digits as text), as a list of "value bug" lines for the checks. */
function expectedWrongs(a: number, b: number): readonly string[] {
  const answer = timesBySum(a, b);
  const lines = new Map<number, string>();
  const claim = (value: number, bug: string): void => {
    if (value !== answer && !lines.has(value)) lines.set(value, bug);
  };
  claim(a + b, 'bugs.add-factors');
  // One step along the table: the fact with one group fewer, else one more; never the added factors.
  for (const groups of [b - 1, b + 1]) {
    if (groups >= 1 && timesBySum(a, groups) !== answer && timesBySum(a, groups) !== a + b) {
      claim(timesBySum(a, groups), 'bugs.neighbour');
      break;
    }
  }
  const digits = String(answer);
  if (digits.length === 2 && !digits.endsWith('0')) {
    claim(Number(digits.split('').reverse().join('')), 'bugs.digit-swap');
  }
  return [...lines].map(([value, bug]) => `${String(value)} ${bug}`);
}

/** The check shared by the four: the card is a fact of the tables and b range. */
function readFactOf(text: string, params: FactRange, at: Where): Fact | null {
  const fact = readFact(text);
  if (fact === null) {
    fail(at, `cannot read the prompt "${text}" as "a ${TIMES} b"`);
    return null;
  }
  if (!fitsTables(fact, params)) {
    fail(
      at,
      `${text} is not a fact of tables ${params.tables.join(', ')} with b ${params.b.join('-')}`,
    );
  }
  return fact;
}

// ---------------------------------------------------------------------------------------------------------------------
// fact

const factParams = paramsFor(0);

export type FactItemParams = z.output<typeof factParams>;

/** "7 × 6": type the answer. Every wrong answer of the bugs has its reason (`wrongAnswers`). */
export const fact: ExerciseTemplate<FactItemParams, NumberEntryItem> = {
  params: factParams,
  generate(params, ctx) {
    const drawn = drawFact(params, anyFact, ctx.random);
    const reasons: readonly ValueReason[] = wrongAnswers(drawn.a, drawn.b).map(
      ({ value, bug }) => ({ value, text: bugRef(bug) }),
    );
    return {
      id: ctx.id,
      type: 'number-entry',
      text: ctx.text('text', 'templates.fact', { a: drawn.a, b: drawn.b }),
      prompt: { big: factText(drawn) },
      answer: drawn.a * drawn.b,
      ...(reasons.length === 0 ? {} : { reasons }),
    };
  },
  check(item, params, at) {
    const read = readFactOf(item.prompt.big, params, at);
    if (read === null) return;
    const answer = timesBySum(read.a, read.b);
    if (item.answer !== answer) {
      fail(at, `${item.prompt.big} is ${String(answer)}, not ${String(item.answer)}`);
    }
    const expected = expectedWrongs(read.a, read.b);
    const found = (item.reasons ?? []).map((reason) => `${String(reason.value)} ${reason.text}`);
    if (!sameEntries(found, expected, (line) => line)) {
      fail(at, `reasons ${JSON.stringify(found)} should be ${JSON.stringify(expected)}`);
    }
  },
};

// ---------------------------------------------------------------------------------------------------------------------
// fact-missing

const factMissingParams = paramsFor(1);

export type FactMissingParams = z.output<typeof factMissingParams>;

/** "6 × ? = 42": type the missing number (b). The reason `neighbour` is one step out (b − 1, or b + 1 for b = 1). */
export const factMissing: ExerciseTemplate<FactMissingParams, NumberEntryItem> = {
  params: factMissingParams,
  generate(params, ctx) {
    const drawn = drawFact(params, anyFact, ctx.random);
    return {
      id: ctx.id,
      type: 'number-entry',
      text: ctx.text('text', 'templates.fact-missing'),
      prompt: { big: `${String(drawn.a)} ${TIMES} ? = ${String(drawn.a * drawn.b)}` },
      answer: drawn.b,
      reasons: [{ value: neighbourFactor(drawn.b), text: bugRef('neighbour') }],
    };
  },
  check(item, params, at) {
    const found = new RegExp(`^(\\d+) ${TIMES} \\? = (\\d+)$`).exec(item.prompt.big);
    if (found === null) {
      fail(at, `cannot read the prompt "${item.prompt.big}" as "a ${TIMES} ? = p"`);
      return;
    }
    const [a, product] = [Number(found[1]), Number(found[2])];
    // The missing b: the count of a's that makes `product`.
    let b = 0;
    for (let total = 0; total < product && a > 0; total += a) b += 1;
    if (a < 1 || timesBySum(a, b) !== product) {
      fail(at, `${item.prompt.big} has no whole number that is missing`);
      return;
    }
    if (!fitsTables({ a, b }, params)) {
      fail(
        at,
        `${String(a)} ${TIMES} ${String(b)} is not a fact of tables ${params.tables.join(', ')} with b ${params.b.join('-')}`,
      );
    }
    if (item.answer !== b) {
      fail(
        at,
        `the missing number of ${item.prompt.big} is ${String(b)}, not ${String(item.answer)}`,
      );
    }
    const expected: readonly ValueReason[] = [
      { value: b >= 2 ? b - 1 : b + 1, text: 'bugs.neighbour' },
    ];
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
// fact-choice

const factChoiceParams = paramsFor(1, threeOptions, 'has three distinct answers');

export type FactChoiceParams = z.output<typeof factChoiceParams>;

const OPTION_IDS = ['a', 'b', 'c'] as const;

/** "8 × 7": the answer, the neighbour and the added factors among three numerals, shuffled. */
export const factChoice: ExerciseTemplate<FactChoiceParams, ChoiceItem> = {
  params: factChoiceParams,
  generate(params, ctx) {
    const drawn = drawFact(params, threeOptions, ctx.random);
    const entries = shuffle(
      [
        { value: drawn.a * drawn.b, bug: undefined },
        ...wrongAnswers(drawn.a, drawn.b)
          .filter(({ bug }) => bug !== 'digit-swap')
          .map(({ value, bug }) => ({ value, bug })),
      ],
      ctx.random,
    );
    const options: readonly BigOption[] = entries.map(({ value, bug }, index) => ({
      id: OPTION_IDS[index] ?? 'x',
      big: String(value),
      ...(bug === undefined ? {} : { reason: bugRef(bug) }),
    }));
    return {
      id: ctx.id,
      type: 'choice',
      text: ctx.text('text', 'templates.fact-choice'),
      prompt: { big: factText(drawn) },
      options,
      answer: options[entries.findIndex((entry) => entry.bug === undefined)]?.id ?? 'a',
    };
  },
  check(item, params, at) {
    const read = readFactOf(item.prompt?.big ?? '', params, at);
    if (read === null) return;
    const values = item.options.map((option) => Number(option.big));
    if (
      item.options.length !== 3 ||
      values.some((value) => !Number.isInteger(value)) ||
      new Set(values).size !== 3
    ) {
      fail(
        at,
        `the options ${JSON.stringify(item.options.map((option) => option.big))} are not 3 distinct numbers`,
      );
      return;
    }
    const answer = timesBySum(read.a, read.b);
    const right = item.options.filter((_option, index) => values[index] === answer);
    if (right.length !== 1 || right[0]?.id !== item.answer) {
      fail(
        at,
        `exactly the option "${item.answer}" should be ${String(answer)}, found ${String(right.length)} that are`,
      );
    }
    if (right[0]?.reason !== undefined) {
      fail(at, `the right option ${item.answer} has a reason`);
    }
    const expected = expectedWrongs(read.a, read.b).filter(
      (line) => !line.endsWith('bugs.digit-swap'),
    );
    const found = item.options
      .filter((option) => option.id !== item.answer)
      .map((option) => `${option.big} ${option.reason ?? '(none)'}`);
    if (!sameEntries(found, expected, (line) => line)) {
      fail(at, `the wrong options ${JSON.stringify(found)} should be ${JSON.stringify(expected)}`);
    }
  },
};

// ---------------------------------------------------------------------------------------------------------------------
// fact-tf

const factTfParams = paramsFor(1, hasNeighbour, 'has a neighbour fact');

export type FactTfParams = z.output<typeof factTfParams>;

/** "4 × 8 = 32": true half the time; the false claim is the neighbour fact (`neighbour`, spoken when it is called true). */
export const factTf: ExerciseTemplate<FactTfParams, TrueFalseItem> = {
  params: factTfParams,
  generate(params, ctx) {
    const drawn = drawFact(params, hasNeighbour, ctx.random);
    const answer = randomInt(ctx.random, 0, 1) === 0;
    const claim = answer ? drawn.a * drawn.b : (neighbourFact(drawn.a, drawn.b) ?? 0);
    return {
      id: ctx.id,
      type: 'true-false',
      text: ctx.text('text', 'templates.fact-tf'),
      prompt: { big: `${factText(drawn)} = ${String(claim)}` },
      answer,
      ...(answer ? {} : { reason: bugRef('neighbour') }),
    };
  },
  check(item, params, at) {
    const found = new RegExp(`^(\\d+ ${TIMES} \\d+) = (\\d+)$`).exec(item.prompt.big);
    if (found === null) {
      fail(at, `cannot read the prompt "${item.prompt.big}" as "a ${TIMES} b = n"`);
      return;
    }
    const read = readFactOf(found[1] ?? '', params, at);
    if (read === null) return;
    const claim = Number(found[2]);
    const answer = timesBySum(read.a, read.b);
    if (item.answer !== (claim === answer)) {
      fail(at, `"${item.prompt.big}" is ${String(claim === answer)}, not ${String(item.answer)}`);
    }
    // A false claim is always the neighbour fact; a true one has no reason.
    const neighbour = expectedWrongs(read.a, read.b).find((line) =>
      line.endsWith('bugs.neighbour'),
    );
    if (!item.answer && neighbour !== `${String(claim)} bugs.neighbour`) {
      fail(at, `the false claim ${String(claim)} is not the neighbour fact of ${found[1] ?? ''}`);
    }
    const expected = item.answer ? undefined : 'bugs.neighbour';
    if (item.reason !== expected) {
      fail(at, `reason ${item.reason ?? '(none)'} should be ${expected ?? '(none)'}`);
    }
  },
};
