// `place-value`: build a number with base-ten blocks in place-value columns and tap Check.
import type { TextKeyRef } from '@learn/platform-core';
import { z } from 'zod';
import { cardExerciseFields } from '@learn/platform-content/kinds/cards/prompt';
import type { ExerciseKindContent } from '@learn/platform-content/kinds/kind-content';
import { textRefSchema } from '@learn/platform-content/schema';
import { MAX_COUNT, valueOf } from '../kinds/place-value/model.ts';
import type { PlaceValueDef } from '../kinds/place-value/def.ts';

/** The largest target (4 columns of 9). */
const MAX_TARGET = 9999;

/** A wrong built value and the text ref of the reason spoken when it is built (a known misconception, e.g. `305` built as `350`). */
const reasonSchema = z.object({ value: z.number().int(), text: textRefSchema }).strict();

const placeValueSchema = z
  .object({
    ...cardExerciseFields,
    type: z.literal('place-value'),
    /** Checked against the columns in `verify`: 1-9999, below `10 ** columns`. */
    target: z.number().int(),
    columns: z.union([z.literal(3), z.literal(4)]),
    /** Counts per column, high to low; checked in `verify`. */
    start: z.array(z.number().int()).optional(),
    /** Wrong values with a spoken reason: distinct, not the target, each buildable in the columns. */
    reasons: z.array(reasonSchema).min(1).optional(),
  })
  .strict();

/** Build the target with blocks: `columns` 3 (hundreds, tens, ones) or 4 (thousands too); `start` prefills the columns (a build to
 * change, not the target); `reasons` speak a known wrong build. */
export const placeValue: ExerciseKindContent<PlaceValueDef, typeof placeValueSchema> = {
  type: 'place-value',
  schema: placeValueSchema,

  compile: (raw, ctx) =>
    ctx.build<PlaceValueDef>({
      type: 'place-value',
      target: raw.target,
      columns: raw.columns,
      ...(raw.start === undefined ? {} : { start: raw.start }),
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
    const limit = 10 ** def.columns;
    if (def.target < 1 || def.target > MAX_TARGET) {
      issues.push(`${where}: target ${String(def.target)} is outside 1-${String(MAX_TARGET)}`);
    } else if (def.target >= limit) {
      issues.push(
        `${where}: target ${String(def.target)} does not fit ${String(def.columns)} columns (below ${String(limit)})`,
      );
    }
    const { start } = def;
    if (start !== undefined) {
      if (start.length !== def.columns) {
        issues.push(
          `${where}: start has ${String(start.length)} counts but there are ${String(def.columns)} columns`,
        );
      } else if (start.some((count) => count < 0 || count > MAX_COUNT)) {
        issues.push(`${where}: start counts must be 0-${String(MAX_COUNT)}`);
      } else if (valueOf(start) === def.target) {
        issues.push(`${where}: start already builds the target ${String(def.target)}`);
      }
    }
    const seen = new Set<number>();
    for (const { value } of def.reasons ?? []) {
      if (value === def.target) {
        issues.push(
          `${where}: reason for ${String(value)} is the target: a reason is for a wrong value`,
        );
      } else if (seen.has(value)) {
        issues.push(`${where}: reason for ${String(value)} is given twice`);
      }
      seen.add(value);
      if (value < 0 || value >= limit) {
        issues.push(
          `${where}: reason for ${String(value)} cannot be built in ${String(def.columns)} columns (0-${String(limit - 1)})`,
        );
      }
    }
  },

  textKeys: (def): readonly TextKeyRef[] =>
    (def.reasons ?? []).map(({ value, reasonKey }) => ({
      key: reasonKey,
      label: `reason for ${String(value)}`,
    })),
};
