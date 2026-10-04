import type { ExerciseKind } from '../../kind.ts';
import { errorHintStars } from '../../stars.ts';
import type {
  NumberEntryAction,
  NumberEntryDef,
  NumberEntryHint,
  NumberEntryOutcome,
  NumberEntryState,
} from './def.ts';
import { enterDigit, eraseDigit, numberEntryHint, submitNumber } from './engine.ts';

/** The `number-entry` kind for a subject's def and state; `init` builds the subject's fresh state. */
export function createNumberEntryKind<D extends NumberEntryDef, S extends NumberEntryState<D>, Ctx>(
  init: (def: D) => S,
): ExerciseKind<D, S, NumberEntryAction, NumberEntryOutcome, NumberEntryHint, Ctx> {
  return {
    type: 'number-entry',
    input: 'answer',
    init,

    /** Every action is ignored once solved, so a late tap never rescores the exercise. */
    act(state, action) {
      switch (action.type) {
        case 'enter-digit':
          return enterDigit(state, action.digit);
        case 'erase-digit':
          return eraseDigit(state);
        case 'submit-number':
          return submitNumber(state);
      }
    },

    hint(state, level) {
      return numberEntryHint({ ...state, hintLevel: level }, level);
    },

    stars(state) {
      return errorHintStars(state.hintLevel, state.errors);
    },
  };
}
