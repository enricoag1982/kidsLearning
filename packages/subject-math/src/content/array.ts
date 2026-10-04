// `array`: make a rows x columns array of dots on the 6 x 6 grid, then Check. `fixed-rows` (default true) says the text fixes which
// number is the rows; `false` also accepts columns x rows.
import type { TextKeyRef } from '@learn/platform-core';
import { cardExerciseFields } from '@learn/platform-content/kinds/cards/prompt';
import type { ExerciseKindContent } from '@learn/platform-content/kinds/kind-content';
import { textRefSchema } from '@learn/platform-content/schema';
import { z } from 'zod';
import type { ArrayDef } from '../kinds/array/def.ts';
import { ARRAY_MAX, inRange, isAccepted } from '../kinds/array/shape.ts';

const side = z.number().int().min(1).max(ARRAY_MAX);

/** A wrong shape and the text ref of the reason spoken when it is checked exactly (a known misconception). */
const reasonSchema = z.object({ rows: side, cols: side, text: textRefSchema }).strict();

const arraySchema = z
  .object({
    ...cardExerciseFields,
    type: z.literal('array'),
    rows: side,
    cols: side,
    /** `true` (default): the text fixes the rows ("3 rows of 4"), so only rows x cols counts; `false`: cols x rows also counts. */
    'fixed-rows': z.boolean().optional(),
    /** Wrong shapes with a spoken reason: distinct, on the grid, not accepted. */
    reasons: z.array(reasonSchema).min(1).optional(),
  })
  .strict();

export const array: ExerciseKindContent<ArrayDef, typeof arraySchema> = {
  type: 'array',
  schema: arraySchema,

  compile: (raw, ctx) =>
    ctx.build<ArrayDef>({
      type: 'array',
      rows: raw.rows,
      cols: raw.cols,
      fixedRows: raw['fixed-rows'] ?? true,
      ...(raw.reasons === undefined
        ? {}
        : {
            reasons: raw.reasons.map(({ rows, cols, text }) => ({
              rows,
              cols,
              reasonKey: `lessons:${text}`,
            })),
          }),
    }),

  verify(def, where, issues) {
    const { rows, cols } = def;
    for (const [name, value] of [
      ['rows', rows],
      ['cols', cols],
    ] as const) {
      if (!inRange(value)) {
        issues.push(
          `${where}: ${name} ${String(value)} is not a whole number from 1 to ${String(ARRAY_MAX)} (the grid is ${String(ARRAY_MAX)} x ${String(ARRAY_MAX)})`,
        );
      }
    }

    const seen = new Set<string>();
    for (const reason of def.reasons ?? []) {
      const shape = `${String(reason.rows)} x ${String(reason.cols)}`;
      if (!inRange(reason.rows) || !inRange(reason.cols)) {
        issues.push(
          `${where}: reason for ${shape} is not on the grid (1-${String(ARRAY_MAX)} rows and columns)`,
        );
      } else if (isAccepted(def, reason)) {
        issues.push(
          `${where}: reason for ${shape} is an answer Check accepts: a reason is for a wrong shape`,
        );
      }
      if (seen.has(shape)) {
        issues.push(`${where}: reason for ${shape} is given twice`);
      }
      seen.add(shape);
    }
  },

  textKeys: (def): readonly TextKeyRef[] =>
    (def.reasons ?? []).map(({ rows, cols, reasonKey }) => ({
      key: reasonKey,
      label: `reason for ${String(rows)} x ${String(cols)}`,
    })),
};
