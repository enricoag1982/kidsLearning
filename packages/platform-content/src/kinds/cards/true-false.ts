import type { TrueFalseDef } from '@learn/platform-core/domain/exercise/kinds/true-false/def';
import { z } from 'zod';
import type { ExerciseKindContent } from '../kind-content.ts';
import { cardExerciseFields } from './prompt.ts';

const trueFalseSchema = z
  .object({ ...cardExerciseFields, type: z.literal('true-false'), answer: z.boolean() })
  .strict();

/** Say whether the statement (the exercise's text, with its prompt) is true. */
export const trueFalse: ExerciseKindContent<TrueFalseDef, typeof trueFalseSchema> = {
  type: 'true-false',
  schema: trueFalseSchema,
  compile: (raw, ctx) => ctx.build<TrueFalseDef>({ type: 'true-false', answer: raw.answer }),
};
