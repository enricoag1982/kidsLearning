import type { NumberEntryDef } from '@learn/platform-core/domain/exercise/kinds/number-entry/def';
import type { TextKeyRef } from '@learn/platform-core';
import { z } from 'zod';
import { textRefSchema } from '../../schema.ts';
import type { ExerciseKindContent } from '../kind-content.ts';
import { cardExerciseFields } from './prompt.ts';

/** The pad's most digits, and so the largest answer (99 999). */
const MAX_PAD_DIGITS = 5;

/** A wrong value and the text ref of the reason spoken when it is typed (a known misconception). */
const reasonSchema = z
  .object({
    value: z
      .number()
      .int()
      .min(0)
      .max(10 ** MAX_PAD_DIGITS - 1),
    text: textRefSchema,
  })
  .strict();

const numberEntrySchema = z
  .object({
    ...cardExerciseFields,
    type: z.literal('number-entry'),
    answer: z
      .number()
      .int()
      .min(0)
      .max(10 ** MAX_PAD_DIGITS - 1),
    /** Default: the answer's own digits, at least 2 (so a one-digit answer does not give its length away). */
    maxDigits: z.number().int().min(1).max(MAX_PAD_DIGITS).optional(),
    /** Wrong values with a spoken reason: distinct, not the answer, each fits the pad. */
    reasons: z.array(reasonSchema).min(1).optional(),
  })
  .strict();

/** Type the answer on a number pad. */
export const numberEntry: ExerciseKindContent<NumberEntryDef, typeof numberEntrySchema> = {
  type: 'number-entry',
  schema: numberEntrySchema,
  compile: (raw, ctx) =>
    ctx.build<NumberEntryDef>({
      type: 'number-entry',
      answer: raw.answer,
      maxDigits: raw.maxDigits ?? Math.max(2, String(raw.answer).length),
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
    const digits = String(def.answer).length;
    if (digits > def.maxDigits) {
      issues.push(
        `${where}: answer ${String(def.answer)} has ${String(digits)} digits but maxDigits is ${String(def.maxDigits)}`,
      );
    }
    const seen = new Set<number>();
    for (const { value } of def.reasons ?? []) {
      if (value === def.answer) {
        issues.push(
          `${where}: reason for ${String(value)} is the answer: a reason is for a wrong value`,
        );
      } else if (seen.has(value)) {
        issues.push(`${where}: reason for ${String(value)} is given twice`);
      }
      seen.add(value);
      if (String(value).length > def.maxDigits) {
        issues.push(
          `${where}: reason for ${String(value)} has ${String(String(value).length)} digits but maxDigits is ${String(def.maxDigits)}`,
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
