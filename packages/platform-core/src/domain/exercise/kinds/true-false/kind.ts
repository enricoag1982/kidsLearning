import { deriveAnswerOutcome } from '../../answer.ts';
import type { AnswerOutcome } from '../../answer.ts';
import type { ExerciseKind } from '../../kind.ts';
import { errorHintStars } from '../../stars.ts';
import type { AnswerTrueFalseAction, TrueFalseDef, TrueFalseHint, TrueFalseState } from './def.ts';
import { answerTrueFalse, trueFalseHint } from './engine.ts';

/** The `true-false` kind for a subject's def and state; `init` builds the subject's fresh state. */
export function createTrueFalseKind<D extends TrueFalseDef, S extends TrueFalseState<D>, Ctx>(
  init: (def: D) => S,
): ExerciseKind<D, S, AnswerTrueFalseAction, AnswerOutcome, TrueFalseHint, Ctx> {
  return {
    type: 'true-false',
    input: 'answer',
    init,

    act(state, action) {
      const next = answerTrueFalse(state, action.value);
      return { state: next, outcome: deriveAnswerOutcome(state, next) };
    },

    hint(state, level) {
      return { state: { ...state, hintLevel: level }, hint: trueFalseHint(level) };
    },

    stars(state) {
      return errorHintStars(state.hintLevel, state.errors);
    },
  };
}
