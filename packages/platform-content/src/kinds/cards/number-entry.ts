import type { NumberEntryDef } from '@learn/platform-core/domain/exercise/kinds/number-entry/def';
import { z } from 'zod';
import type { ExerciseKindContent } from '../kind-content.ts';
import { cardExerciseFields } from './prompt.ts';

/** The pad's most digits, and so the largest answer (9999). */
const MAX_PAD_DIGITS = 4;

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
    }),
  verify(def, where, issues) {
    const digits = String(def.answer).length;
    if (digits > def.maxDigits) {
      issues.push(
        `${where}: answer ${String(def.answer)} has ${String(digits)} digits but maxDigits is ${String(def.maxDigits)}`,
      );
    }
  },
};
