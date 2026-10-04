import { errorHintStars } from '@learn/platform-core/domain/exercise/stars';
import type { PlaceValueKind } from './def.ts';
import { digitsOf, highestColumn, valueOf, validCounts } from './model.ts';

export type { BuildAction, PlaceValueOutcome } from './def.ts';

/** `place-value`: the child's build, checked as a whole. A build of the target solves; any other valid build costs an error and
 * reports its value (the UI speaks its reason when it has one); a build that does not fit the exercise is `invalid` and counts
 * nothing. Every action is ignored once solved, so a late tap never rescores the exercise. */
export const placeValueKind: PlaceValueKind = {
  type: 'place-value',
  input: 'place',

  init: (def) => ({ def, moves: 0, solved: false, errors: 0, hintLevel: 0 }),

  act(state, action) {
    if (state.solved) {
      return { state, outcome: { kind: 'ignored' } };
    }
    const { target, columns } = state.def;
    if (!validCounts(columns, action.counts)) {
      return { state, outcome: { kind: 'invalid' } };
    }
    const value = valueOf(action.counts);
    if (value === target) {
      return {
        state: { ...state, solved: true, moves: state.moves + 1 },
        outcome: { kind: 'solved' },
      };
    }
    return {
      state: { ...state, errors: state.errors + 1, moves: state.moves + 1 },
      outcome: { kind: 'wrong', value },
    };
  },

  /** 1: the column labels; 2: the numeral beside the blocks; 3: the target's digit for its highest column (the child finishes the
   * rest and taps Check). */
  hint(state, level) {
    const bumped = { ...state, hintLevel: level };
    if (level < 3) {
      return { state: bumped, hint: { kind: 'place-value', level } };
    }
    const top = highestColumn(state.def);
    const fill = digitsOf(state.def.target, state.def.columns).map((digit, column) =>
      column === top ? digit : 0,
    );
    return { state: bumped, hint: { kind: 'place-value', level, fill } };
  },

  stars(state) {
    return errorHintStars(state.hintLevel, state.errors);
  },
};
