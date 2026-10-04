import type { TrueFalseDef } from '@learn/platform-core/domain/exercise/kinds/true-false/def';
import type { TextKeyRef } from '@learn/platform-core';
import { z } from 'zod';
import { textRefSchema } from '../../schema.ts';
import type { ExerciseKindContent } from '../kind-content.ts';
import { cardExerciseFields } from './prompt.ts';

const trueFalseSchema = z
  .object({
    ...cardExerciseFields,
    type: z.literal('true-false'),
    answer: z.boolean(),
    /** Text ref of the reason spoken on the wrong pick (instead of the default wrong note). */
    reason: textRefSchema.optional(),
  })
  .strict();

/** Say whether the statement (the exercise's text, with its prompt) is true. */
export const trueFalse: ExerciseKindContent<TrueFalseDef, typeof trueFalseSchema> = {
  type: 'true-false',
  schema: trueFalseSchema,
  compile: (raw, ctx) =>
    ctx.build<TrueFalseDef>({
      type: 'true-false',
      answer: raw.answer,
      ...(raw.reason === undefined ? {} : { reasonKey: `lessons:${raw.reason}` }),
    }),
  textKeys: (def): readonly TextKeyRef[] =>
    def.reasonKey === undefined ? [] : [{ key: def.reasonKey, label: 'reason' }],
};
