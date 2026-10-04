// W2 tens / hundreds templates (docs/subjects/math/curriculum.md §3): `tens-hundreds` ("347 + 10": one digit changes) and `compensate`
// ("46 + 99": use the round number, then fix the 1). Reasons: `wrong-place` (the place below the one that changes), `forgot-adjust`
// (the round number used, the 1 never put back).
import { randomInt, type Random } from '@learn/platform-core/domain/random';
import type { ExerciseTemplate } from '@learn/platform-content/generate/template';
import { z } from 'zod';
import {
  checkAnswer,
  checkReasons,
  entryItem,
  operationBig,
  readOperationOf,
  resultOf,
  signOf,
} from './arithmetic.ts';
import { forgotAdjust, wrongPlace } from './bugs.ts';
import { fail } from './draw.ts';
import type { NumberEntryItem } from './items.ts';

const opParam = z.enum(['+', '-']);

// ---------------------------------------------------------------------------------------------------------------------
// tens-hundreds

const tensHundredsParams = z
  .object({ step: z.union([z.literal(10), z.literal(100)]), op: opParam })
  .strict();

export type TensHundredsParams = z.output<typeof tensHundredsParams>;

/** The digit `step` changes must not carry or borrow: 0-8 to add, 1-9 to take 10 away, 2-9 to take 100 away (the result keeps a
 * hundreds digit). */
function changingDigits(step: 10 | 100, op: '+' | '-'): readonly [number, number] {
  if (op === '+') return [0, 8];
  return [step === 100 ? 2 : 1, 9];
}

/** "347 + 10": a 3-digit number and 10 or 100 more or less, no digit carries. Changing the next place down (348, 357) is the
 * `wrong-place` reason. */
export const tensHundreds: ExerciseTemplate<TensHundredsParams, NumberEntryItem> = {
  params: tensHundredsParams,
  generate({ step, op }, ctx) {
    const [low, high] = changingDigits(step, op);
    const hundreds =
      step === 100 ? randomInt(ctx.random, Math.max(low, 1), high) : randomInt(ctx.random, 1, 9);
    const tens = step === 10 ? randomInt(ctx.random, low, high) : randomInt(ctx.random, 0, 9);
    const n = hundreds * 100 + tens * 10 + randomInt(ctx.random, 0, 9);
    const answer = op === '+' ? n + step : n - step;
    return entryItem(
      {
        id: ctx.id,
        text: ctx.text('text', 'templates.tens-hundreds'),
        big: operationBig(n, signOf(op), step),
        answer,
      },
      [{ value: wrongPlace(n, step, op), bug: 'wrong-place' }],
    );
  },
  check(item, params, at) {
    const operation = readOperationOf(item, [signOf(params.op)], at);
    if (operation === null) return;
    const { a: n, b: step } = operation;
    const [low, high] = changingDigits(params.step, params.op);
    const digit = Math.floor(n / params.step) % 10;
    if (step !== params.step || n < 100 || n > 999 || digit < low || digit > high) {
      fail(
        at,
        `"${item.prompt.big}" is not a 3-digit number ${params.op} ${String(params.step)} that changes one digit`,
      );
    }
    checkAnswer(item, resultOf(operation), item.prompt.big, at);
    checkReasons(item, [{ value: wrongPlace(n, params.step, params.op), bug: 'wrong-place' }], at);
  },
};

// ---------------------------------------------------------------------------------------------------------------------
// compensate

const compensateParams = z
  .object({ near: z.union([z.literal(9), z.literal(99)]), op: opParam })
  .strict();

export type CompensateParams = z.output<typeof compensateParams>;

/** The ones digit of the number: 2-8, so adding / taking away 9 crosses a ten. */
const ONES_FROM = 2;
const ONES_TO = 8;

/** The first number: 12-98 (2 digits), or 102-998 (3 digits) when taking away 99. */
function drawNumber(random: Random, near: 9 | 99, op: '+' | '-'): number {
  const hundreds = near === 99 && op === '-' ? randomInt(random, 1, 9) * 100 : 0;
  const tens = hundreds > 0 ? randomInt(random, 0, 9) : randomInt(random, 1, 9);
  return hundreds + tens * 10 + randomInt(random, ONES_FROM, ONES_TO);
}

/** Whether `n` is a first number of these params. */
function numberFits(n: number, near: 9 | 99, op: '+' | '-'): boolean {
  const ones = n % 10;
  const range = near === 99 && op === '-' ? [102, 998] : [12, 98];
  return ones >= ONES_FROM && ones <= ONES_TO && n >= (range[0] ?? 0) && n <= (range[1] ?? 0);
}

/** "46 + 99": a number and 9 / 99 more or less, with the text that names the round number. Using the round number and leaving the
 * 1 out (146, 46 + 100) is the `forgot-adjust` reason. */
export const compensate: ExerciseTemplate<CompensateParams, NumberEntryItem> = {
  params: compensateParams,
  generate({ near, op }, ctx) {
    const n = drawNumber(ctx.random, near, op);
    const round = near + 1;
    return entryItem(
      {
        id: ctx.id,
        text: ctx.text(
          'text',
          op === '+' ? 'templates.compensate-add' : 'templates.compensate-take',
          { round },
        ),
        big: operationBig(n, signOf(op), near),
        answer: op === '+' ? n + near : n - near,
      },
      [{ value: forgotAdjust(n, near, op), bug: 'forgot-adjust' }],
    );
  },
  check(item, params, at) {
    const operation = readOperationOf(item, [signOf(params.op)], at);
    if (operation === null) return;
    const { a: n, b: near } = operation;
    if (near !== params.near || !numberFits(n, params.near, params.op)) {
      fail(at, `"${item.prompt.big}" does not fit near ${String(params.near)} / op ${params.op}`);
    }
    checkAnswer(item, resultOf(operation), item.prompt.big, at);
    // The round number's result, then the 1 that was never put back.
    const rounded = params.op === '+' ? n + (params.near + 1) : n - (params.near + 1);
    checkReasons(item, [{ value: rounded, bug: 'forgot-adjust' }], at);
  },
};
