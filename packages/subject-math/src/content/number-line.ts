// `number-line`: place a marker on a number line, then Check. Exact items (the target is a tick) and estimate items (between two
// ticks, accepted within half an interval).
import type { TextKeyRef } from '@learn/platform-core';
import { cardExerciseFields } from '@learn/platform-content/kinds/cards/prompt';
import type { ExerciseKindContent } from '@learn/platform-content/kinds/kind-content';
import { textRefSchema } from '@learn/platform-content/schema';
import { z } from 'zod';
import type { NumberLineDef } from '../kinds/number-line/def.ts';
import { gapCount, isAccepted, isTick } from '../kinds/number-line/ticks.ts';

/** The line's gaps: fewer is no line, more crowd the ticks (and their numbers) on a phone. */
const MIN_GAPS = 2;
const MAX_GAPS = 10;

const wholeNumber = z.number().int().min(0);

/** A wrong value and the text ref of the reason spoken when the marker is checked exactly there (a known misconception). */
const reasonSchema = z.object({ value: wholeNumber, text: textRefSchema }).strict();

const numberLineSchema = z
  .object({
    ...cardExerciseFields,
    type: z.literal('number-line'),
    from: wholeNumber,
    to: wholeNumber,
    step: z.number().int().min(1),
    /** `ends`, `all`, or the ticks to number (each on a tick: checked by `verify`). */
    labels: z.union([z.enum(['ends', 'all']), z.array(wholeNumber).min(1)]),
    target: wholeNumber,
    /** `true`: the target lies between ticks and Check accepts within half an interval; default `false`: the target is a tick. */
    estimate: z.boolean().optional(),
    /** Wrong values with a spoken reason: distinct, not accepted, on the line. */
    reasons: z.array(reasonSchema).min(1).optional(),
  })
  .strict();

function isWhole(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

export const numberLine: ExerciseKindContent<NumberLineDef, typeof numberLineSchema> = {
  type: 'number-line',
  schema: numberLineSchema,

  compile: (raw, ctx) =>
    ctx.build<NumberLineDef>({
      type: 'number-line',
      from: raw.from,
      to: raw.to,
      step: raw.step,
      labels: typeof raw.labels === 'string' ? raw.labels : [...raw.labels],
      target: raw.target,
      tolerance: raw.estimate === true ? raw.step / 2 : 0,
      ...(raw.reasons === undefined
        ? {}
        : {
            reasons: raw.reasons.map(({ value, text }) => ({
              value,
              reasonKey: `lessons:${text}`,
            })),
          }),
    }),

  verify(def, where, issues) {
    const { from, to, step, target, tolerance } = def;
    const numbers: readonly (readonly [string, number])[] = [
      ['from', from],
      ['to', to],
      ['target', target],
    ];
    const notWhole = numbers.filter(([, value]) => !isWhole(value));
    for (const [name, value] of notWhole) {
      issues.push(`${where}: ${name} ${String(value)} is not a whole number from 0 up`);
    }
    if (!Number.isInteger(step) || step < 1) {
      issues.push(`${where}: step ${String(step)} is not a whole number from 1 up`);
    }
    if (notWhole.length > 0 || !Number.isInteger(step) || step < 1) {
      return;
    }

    if (from >= to) {
      issues.push(`${where}: from ${String(from)} is not left of to ${String(to)}`);
      return;
    }
    const gaps = gapCount(def);
    if (!Number.isInteger(gaps)) {
      issues.push(
        `${where}: the line from ${String(from)} to ${String(to)} is not a whole number of steps of ${String(step)}`,
      );
      return;
    }
    if (gaps < MIN_GAPS || gaps > MAX_GAPS) {
      issues.push(
        `${where}: the line has ${String(gaps)} gaps, but ${String(MIN_GAPS)}-${String(MAX_GAPS)} fit the screen`,
      );
    }

    if (typeof def.labels !== 'string') {
      for (const label of def.labels) {
        if (!isTick(def, label)) {
          issues.push(`${where}: label ${String(label)} is not a tick on the line`);
        }
      }
    }

    if (target < from || target > to) {
      issues.push(
        `${where}: target ${String(target)} is not on the line (${String(from)}-${String(to)})`,
      );
    } else if (tolerance === 0) {
      if (!isTick(def, target)) {
        issues.push(
          `${where}: target ${String(target)} is not on a tick (an exact item needs one; use estimate: true for a target between ticks)`,
        );
      }
    } else if (tolerance !== step / 2) {
      issues.push(
        `${where}: tolerance ${String(tolerance)} is neither 0 (exact) nor half a step (${String(step / 2)}, an estimate)`,
      );
    } else if (isTick(def, target)) {
      issues.push(
        `${where}: target ${String(target)} is on a tick (an estimate needs a target between ticks)`,
      );
    }

    const seen = new Set<number>();
    for (const { value } of def.reasons ?? []) {
      if (!isWhole(value) || value < from || value > to) {
        issues.push(
          `${where}: reason for ${String(value)} is not on the line (${String(from)}-${String(to)})`,
        );
      } else if (value === target) {
        issues.push(
          `${where}: reason for ${String(value)} is the target: a reason is for a wrong value`,
        );
      } else if (isAccepted(def, value)) {
        issues.push(
          `${where}: reason for ${String(value)} is within ${String(tolerance)} of the target ${String(target)}, so Check accepts it: a reason is for a wrong value`,
        );
      }
      if (seen.has(value)) {
        issues.push(`${where}: reason for ${String(value)} is given twice`);
      }
      seen.add(value);
    }
  },

  textKeys: (def): readonly TextKeyRef[] =>
    (def.reasons ?? []).map(({ value, reasonKey }) => ({
      key: reasonKey,
      label: `reason for ${String(value)}`,
    })),
};
