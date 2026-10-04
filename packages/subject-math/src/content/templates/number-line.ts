// W1 number-line templates (docs/subjects/math/curriculum.md §3): `nl-place` (put an inner tick on a fixed line), `nl-estimate` (put a
// number between ticks, accepted within half an interval) and `nl-half` (type the number halfway between two). Each `check`
// re-reads the numeral on the card and the line against the params.
import { pick, randomInt } from '@learn/platform-core/domain/random';
import type { ExerciseTemplate } from '@learn/platform-content/generate/template';
import { z } from 'zod';
import { bugRef } from './bugs.ts';
import { fail, sameEntries } from './draw.ts';
import type { LineLabels, NumberEntryItem, NumberLineItem, ValueReason } from './items.ts';
import { numeral, parseNumeral } from './numeral.ts';

/** The line's fewest and most gaps (the `number-line` kind's `MIN_GAPS` / `MAX_GAPS`: ticks stay readable on a phone). */
const MIN_GAPS = 2;
const MAX_GAPS = 10;

const wholeNumber = z.number().int().min(0);

/** A fixed line: its ends, the step between ticks and which ticks show their number (`ends`, `all` or a list of ticks). */
const lineFields = {
  from: wholeNumber,
  to: wholeNumber,
  step: z.number().int().min(1),
  labels: z.union([z.enum(['ends', 'all']), z.array(wholeNumber).min(1)]),
};

interface Line {
  readonly from: number;
  readonly to: number;
  readonly step: number;
  readonly labels: LineLabels;
}

/** Every tick, left to right (both ends included). */
function ticksOf({ from, to, step }: Line): readonly number[] {
  return Array.from(
    { length: Math.floor((to - from) / step) + 1 },
    (_unused, i) => from + i * step,
  );
}

/** The ticks between the ends. */
function innerTicks(line: Line): readonly number[] {
  return ticksOf(line).slice(1, -1);
}

/** What is wrong with the line, if anything: it needs a whole number of 2-10 steps, and every labelled number is a tick. */
function lineProblems(
  line: Line,
): readonly { readonly path: string[]; readonly message: string }[] {
  const { from, to, step, labels } = line;
  if (to <= from)
    return [{ path: ['to'], message: `to ${String(to)} is not right of from ${String(from)}` }];
  const gaps = (to - from) / step;
  if (!Number.isInteger(gaps) || gaps < MIN_GAPS || gaps > MAX_GAPS) {
    return [
      {
        path: ['step'],
        message: `${String(from)}-${String(to)} in steps of ${String(step)} is not a whole number of ${String(MIN_GAPS)}-${String(MAX_GAPS)} gaps`,
      },
    ];
  }
  const ticks = ticksOf(line);
  return typeof labels === 'string'
    ? []
    : labels.flatMap((label, index) =>
        ticks.includes(label)
          ? []
          : [{ path: ['labels', String(index)], message: `label ${String(label)} is not a tick` }],
      );
}

/** The item's line fields as the params give them (an array of labels compared by value). */
function sameLine(item: Line, params: Line): boolean {
  return (
    item.from === params.from &&
    item.to === params.to &&
    item.step === params.step &&
    JSON.stringify(item.labels) === JSON.stringify(params.labels)
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// nl-place

const nlPlaceParams = z
  .object({
    ...lineFields,
    /** Fixed targets in order (a guided try): each an inner tick. */
    values: z.array(wholeNumber).min(1).optional(),
  })
  .strict()
  .superRefine((params, ctx) => {
    const problems = lineProblems(params);
    for (const { path, message } of problems) ctx.addIssue({ code: 'custom', path, message });
    if (problems.length > 0) return;
    const inner = innerTicks(params);
    for (const [index, value] of (params.values ?? []).entries()) {
      if (!inner.includes(value)) {
        ctx.addIssue({
          code: 'custom',
          path: ['values', index],
          message: `${String(value)} is not a tick between the ends of the line`,
        });
      }
    }
  });

export type NlPlaceParams = z.output<typeof nlPlaceParams>;

/** The wrong tick of counting marks instead of jumps: one step short of the target, when that is not the left end. */
function placeReasons(target: number, { from, step }: Line): readonly ValueReason[] {
  return target - step > from ? [{ value: target - step, text: bugRef('ticks-not-gaps') }] : [];
}

/** Put the number on a fixed line: the target is any tick between the ends (labelled or not), exact. Reason `ticks-not-gaps`: one
 * tick left of the target. */
export const nlPlace: ExerciseTemplate<NlPlaceParams, NumberLineItem> = {
  params: nlPlaceParams,
  generate(params, ctx) {
    const { from, to, step, labels, values } = params;
    const fixed = values?.[ctx.index];
    if (values !== undefined && fixed === undefined) {
      throw new Error(
        `values has ${String(values.length)} entries, item ${String(ctx.index + 1)} has none`,
      );
    }
    const target = fixed ?? pick(ctx.random, innerTicks(params));
    const reasons = placeReasons(target, params);
    return {
      id: ctx.id,
      type: 'number-line',
      text: ctx.text('text', 'templates.nl-place', { n: target }),
      prompt: { big: numeral(target) },
      from,
      to,
      step,
      labels,
      target,
      ...(reasons.length === 0 ? {} : { reasons }),
    };
  },
  check(item, params, at) {
    const shown = parseNumeral(item.prompt.big);
    if (shown === null) {
      fail(at, `cannot read the prompt "${item.prompt.big}" as a number`);
      return;
    }
    if (shown !== item.target) {
      fail(at, `the prompt shows ${String(shown)} but the target is ${String(item.target)}`);
    }
    if (!sameLine(item, params)) fail(at, 'the line is not the params’ line');
    const onTick = (item.target - item.from) % item.step === 0;
    if (!onTick || item.target <= item.from || item.target >= item.to) {
      fail(at, `${String(item.target)} is not a tick between the ends`);
    }
    if (item.estimate === true) fail(at, 'a placed tick is an exact item, not an estimate');
    if (params.values !== undefined && !params.values.includes(item.target)) {
      fail(at, `${String(item.target)} is not one of the values`);
    }
    const expected: readonly ValueReason[] =
      item.target - item.step > item.from
        ? [{ value: item.target - item.step, text: 'bugs.ticks-not-gaps' }]
        : [];
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
// nl-estimate

/** The whole numbers strictly between two ticks that are at least a quarter step from both. */
function estimateOffsets(step: number): readonly number[] {
  return Array.from({ length: Math.max(0, step - 1) }, (_unused, i) => i + 1).filter(
    (offset) => offset * 4 >= step && offset * 4 <= step * 3,
  );
}

const nlEstimateParams = z
  .object(lineFields)
  .strict()
  .superRefine((params, ctx) => {
    for (const { path, message } of lineProblems(params)) {
      ctx.addIssue({ code: 'custom', path, message });
    }
    if (estimateOffsets(params.step).length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['step'],
        message: `step ${String(params.step)} leaves no whole number a quarter step from both ticks`,
      });
    }
  });

export type NlEstimateParams = z.output<typeof nlEstimateParams>;

/** About where is 340? The target lies between two ticks, at least a quarter step from each; Check accepts within half an interval. */
export const nlEstimate: ExerciseTemplate<NlEstimateParams, NumberLineItem> = {
  params: nlEstimateParams,
  generate(params, ctx) {
    const { from, to, step, labels } = params;
    const gap = randomInt(ctx.random, 0, (to - from) / step - 1);
    const target = from + gap * step + pick(ctx.random, estimateOffsets(step));
    return {
      id: ctx.id,
      type: 'number-line',
      text: ctx.text('text', 'templates.nl-estimate', { n: target }),
      prompt: { big: numeral(target) },
      from,
      to,
      step,
      labels,
      target,
      estimate: true,
    };
  },
  check(item, params, at) {
    const shown = parseNumeral(item.prompt.big);
    if (shown === null) {
      fail(at, `cannot read the prompt "${item.prompt.big}" as a number`);
      return;
    }
    if (shown !== item.target) {
      fail(at, `the prompt shows ${String(shown)} but the target is ${String(item.target)}`);
    }
    if (!sameLine(item, params)) fail(at, 'the line is not the params’ line');
    const offset = (item.target - item.from) % item.step;
    if (
      item.target <= item.from ||
      item.target >= item.to ||
      offset * 4 < item.step ||
      offset * 4 > item.step * 3
    ) {
      fail(at, `${String(item.target)} is not between ticks and a quarter step from both`);
    }
    if (item.estimate !== true) fail(at, 'an estimate item must say estimate: true');
    if (item.reasons !== undefined) fail(at, 'an estimate has no known wrong answer to explain');
  },
};

// ---------------------------------------------------------------------------------------------------------------------
// nl-half

const nlHalfParams = z
  .object({ unit: z.union([z.literal(10), z.literal(100), z.literal(1000)]) })
  .strict();

export type NlHalfParams = z.output<typeof nlHalfParams>;

const ELLIPSIS = '…';

/** What number is halfway between 300 and 400? `a` is 1-8 units, `b` one unit more; the card shows "300 … 400". */
export const nlHalf: ExerciseTemplate<NlHalfParams, NumberEntryItem> = {
  params: nlHalfParams,
  generate({ unit }, ctx) {
    const a = randomInt(ctx.random, 1, 8) * unit;
    const b = a + unit;
    return {
      id: ctx.id,
      type: 'number-entry',
      text: ctx.text('text', 'templates.nl-half', { a, b }),
      prompt: { big: `${numeral(a)} ${ELLIPSIS} ${numeral(b)}` },
      answer: a + unit / 2,
    };
  },
  check(item, params, at) {
    const [left, right, ...extra] = item.prompt.big.split(` ${ELLIPSIS} `);
    const [a, b] = [parseNumeral(left ?? ''), parseNumeral(right ?? '')];
    if (a === null || b === null || extra.length > 0) {
      fail(at, `cannot read the prompt "${item.prompt.big}" as "a ${ELLIPSIS} b"`);
      return;
    }
    if (b - a !== params.unit || a % params.unit !== 0 || a < params.unit || a > 8 * params.unit) {
      fail(
        at,
        `${String(a)} and ${String(b)} are not 1-8 units of ${String(params.unit)} and the next one`,
      );
    }
    if (item.answer * 2 !== a + b) {
      fail(
        at,
        `halfway between ${String(a)} and ${String(b)} is ${String((a + b) / 2)}, not ${String(item.answer)}`,
      );
    }
    if (item.reasons !== undefined) fail(at, 'no known wrong answer to explain');
  },
};
