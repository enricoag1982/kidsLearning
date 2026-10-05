// W1 growing-picture template (docs/subjects/logic/curriculum.md §3): `grow-next`. Steps 1-3 are clusters of one shape (a count
// each, growing by 1 or 2 every step); the child picks the next picture (`choice`: the right count and the counts one step either
// side) or types how many are in a step further on (`entry`: step 3 + `ahead`). Reason `grow-off`: the count one step off.
import { pick, shuffle } from '@learn/platform-core/domain/random';
import {
  SHAPE_COLOURS,
  SHAPE_KINDS,
  type CardShape,
  type ShapeColour,
  type ShapeKind,
} from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import type { ExerciseTemplate } from '@learn/platform-content/generate/template';
import { z } from 'zod';
import { bugRef } from './bugs.ts';
import { fail, range } from './draw.ts';
import type {
  PromptToken,
  ShapeChoiceItem,
  ShapeEntryItem,
  ShapeOption,
  ValueReason,
} from './items.ts';

/** A cluster holds at most 3 x 3 shapes. */
const MAX_COUNT = 9;

/** The largest number an entry item asks the child to type. */
const MAX_ENTRY = 30;

const startNumber = z.number().int().min(1).max(3);

const growParams = z
  .object({
    mode: z.enum(['choice', 'entry']),
    step: z.number().int().min(1).max(2),
    /** The count of step 1, from `[min, max]`. */
    start: z
      .tuple([startNumber, startNumber])
      .refine(([least, most]) => least <= most, {
        message: 'start must go from the smaller to the larger',
      })
      .default([1, 3]),
    /** `entry`: how many steps past step 3 the question asks about. */
    ahead: z.number().int().min(1).max(3).optional(),
  })
  .strict()
  .superRefine((params, ctx) => {
    if (params.mode === 'choice' && params.ahead !== undefined) {
      ctx.addIssue({ code: 'custom', path: ['ahead'], message: 'ahead is for entry only' });
    }
    if (starts(params).length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['start'],
        message: 'no start fits: the options (right ± step) must stay within 1-9',
      });
    }
  });

export type GrowParams = z.output<typeof growParams>;

/** The counts of step 1 the item may start from: a choice needs right + step within 9 (right = start + 3 steps). */
function starts({ mode, step, start: [least, most] }: GrowParams): readonly number[] {
  return range(least, most).filter((count) => mode === 'entry' || count + 4 * step <= MAX_COUNT);
}

/** The count at step `n` (from 1). */
function countAt(start: number, step: number, n: number): number {
  return start + (n - 1) * step;
}

/** A cluster of `count` of one shape. */
function cluster(kind: ShapeKind, colour: ShapeColour, count: number): CardShape {
  return { kind, colour, count };
}

/** The counts of the shown clusters (steps 1-3) and the answer: the next count (choice) or the count `ahead` steps past step 3. */
function answerOf(params: GrowParams, start: number): number {
  return countAt(start, params.step, 3 + (params.mode === 'entry' ? (params.ahead ?? 1) : 1));
}

/** The wrong counts: one step under and one step over the answer. */
function offBy(answer: number, step: number): readonly number[] {
  return [answer - step, answer + step];
}

export const growNext: ExerciseTemplate<GrowParams, ShapeChoiceItem | ShapeEntryItem> = {
  params: growParams,
  generate(params, ctx) {
    const start = pick(ctx.random, starts(params));
    const kind = pick(ctx.random, SHAPE_KINDS);
    const colour = pick(ctx.random, SHAPE_COLOURS);
    const shown: readonly PromptToken[] = [1, 2, 3].map((n) =>
      cluster(kind, colour, countAt(start, params.step, n)),
    );
    const answer = answerOf(params, start);
    if (params.mode === 'entry') {
      const n = 3 + (params.ahead ?? 1);
      const reasons = offBy(answer, params.step).map((value): ValueReason => ({
        value,
        text: bugRef('grow-off'),
      }));
      return {
        id: ctx.id,
        type: 'number-entry',
        text: ctx.text('text', 'templates.grow-next-entry', { n }),
        prompt: { shapes: shown },
        answer,
        reasons,
      };
    }
    const counts = shuffle([answer, ...offBy(answer, params.step)], ctx.random);
    const options = counts.map((count, index): ShapeOption => ({
      id: ['a', 'b', 'c'][index] ?? 'x',
      shape: cluster(kind, colour, count),
      ...(count === answer ? {} : { reason: bugRef('grow-off') }),
    }));
    return {
      id: ctx.id,
      type: 'choice',
      text: ctx.text('text', 'templates.grow-next-choice'),
      prompt: { shapes: [...shown, 'gap'] },
      options,
      answer: options.find((option) => option.shape.count === answer)?.id ?? 'a',
    };
  },
  check(item, params, at) {
    const row = item.prompt.shapes;
    const clusters = row.filter((token): token is CardShape => token !== 'gap');
    const counts = clusters.map((token) => token.count ?? 1);
    const [first = 0, second = 0, third = 0] = counts;
    const [head] = clusters;
    const sameShape = clusters.every(
      (token) =>
        token.kind === head?.kind && token.colour === head.colour && token.size === undefined,
    );
    if (clusters.length !== 3 || !sameShape) {
      fail(at, `the row needs 3 clusters of one shape, has ${JSON.stringify(row)}`);
      return;
    }
    if (second - first !== params.step || third - second !== params.step) {
      fail(at, `the counts ${counts.join(', ')} do not grow by ${String(params.step)} each step`);
    }
    if (counts.some((count) => count < 1 || count > MAX_COUNT)) {
      fail(at, `a shown count is outside 1-${String(MAX_COUNT)}: ${counts.join(', ')}`);
    }
    if (first < params.start[0] || first > params.start[1]) {
      fail(at, `the first count ${String(first)} is outside start ${params.start.join('-')}`);
    }
    const answer = answerOf(params, first);
    const wrong = offBy(answer, params.step);
    if (item.type === 'number-entry') {
      checkEntry(item, params, answer, wrong, row.length === 3, at);
      return;
    }
    checkChoice(
      item,
      params,
      { kind: head?.kind, colour: head?.colour },
      answer,
      wrong,
      row.at(-1) === 'gap' && row.length === 4,
      at,
    );
  },
};

function checkEntry(
  item: ShapeEntryItem,
  params: GrowParams,
  answer: number,
  wrong: readonly number[],
  noGap: boolean,
  at: Parameters<typeof fail>[0],
): void {
  if (params.mode !== 'entry' || !noGap) {
    fail(at, 'an entry item shows 3 clusters, no gap, and the params say mode entry');
  }
  if (item.answer !== answer) {
    fail(
      at,
      `step ${String(3 + (params.ahead ?? 1))} has ${String(answer)}, not ${String(item.answer)}`,
    );
  }
  if (answer > MAX_ENTRY) fail(at, `the answer ${String(answer)} is over ${String(MAX_ENTRY)}`);
  const found = (item.reasons ?? [])
    .map((reason) => `${String(reason.value)} ${reason.text}`)
    .sort();
  const wanted = wrong.map((value) => `${String(value)} ${bugRef('grow-off')}`).sort();
  if (JSON.stringify(found) !== JSON.stringify(wanted)) {
    fail(at, `reasons ${JSON.stringify(found)} should be ${JSON.stringify(wanted)}`);
  }
}

function checkChoice(
  item: ShapeChoiceItem,
  params: GrowParams,
  shape: { readonly kind: ShapeKind | undefined; readonly colour: ShapeColour | undefined },
  answer: number,
  wrong: readonly number[],
  gapLast: boolean,
  at: Parameters<typeof fail>[0],
): void {
  if (params.mode !== 'choice' || !gapLast) {
    fail(at, 'a choice item shows 3 clusters and a gap last, and the params say mode choice');
  }
  const counts = item.options.map((option) => option.shape.count ?? 1);
  const sameKind = item.options.every(
    (option) =>
      option.shape.kind === shape.kind &&
      option.shape.colour === shape.colour &&
      option.shape.size === undefined,
  );
  if (!sameKind) fail(at, "every option must be a cluster of the row's shape");
  if (
    counts.length !== 3 ||
    new Set(counts).size !== 3 ||
    counts.some((count) => count < 1 || count > MAX_COUNT) ||
    JSON.stringify([...counts].sort((x, y) => x - y)) !==
      JSON.stringify([answer, ...wrong].sort((x, y) => x - y))
  ) {
    fail(
      at,
      `the options ${counts.join(', ')} should be ${String(answer)}, ${wrong.join(' and ')} (distinct, 1-${String(MAX_COUNT)})`,
    );
    return;
  }
  const picked = item.options.find((option) => option.id === item.answer);
  if (picked?.shape.count !== answer) {
    fail(
      at,
      `the answer card has ${String(picked?.shape.count)}, the next picture has ${String(answer)}`,
    );
  }
  const reasons = item.options
    .flatMap((option) =>
      option.reason === undefined ? [] : [`${String(option.shape.count)} ${option.reason}`],
    )
    .sort();
  const wanted = wrong.map((count) => `${String(count)} ${bugRef('grow-off')}`).sort();
  if (JSON.stringify(reasons) !== JSON.stringify(wanted)) {
    fail(at, `reasons ${JSON.stringify(reasons)} should be ${JSON.stringify(wanted)}`);
  }
}
