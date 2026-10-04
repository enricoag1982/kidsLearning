import { errorHintStars } from '@learn/platform-core/domain/exercise/stars';
import type { ExerciseKind } from '@learn/platform-core/domain/exercise/kind';
import type { ArrayAction, ArrayDef, ArrayHint, ArrayOutcome, ArrayState } from './def.ts';
import { inRange, isAccepted } from './shape.ts';

/** A fresh state; the `array` kind's `init`. */
export function initArrayState(def: ArrayDef): ArrayState {
  return { def, moves: 0, solved: false, errors: 0, hintLevel: 0 };
}

export const arrayKind: ExerciseKind<
  ArrayDef,
  ArrayState,
  ArrayAction,
  ArrayOutcome,
  ArrayHint,
  null
> = {
  type: 'array',
  input: 'place',
  init: initArrayState,

  /** Check the array: a size off the grid is `invalid` (nothing counts); the accepted shape solves, any other is an error. Both
   * count a move. Every action is ignored once solved, so a late tap never rescores the exercise. */
  act(state, action) {
    if (state.solved) {
      return { state, outcome: { kind: 'ignored' } };
    }
    const { rows, cols } = action;
    if (!inRange(rows) || !inRange(cols)) {
      return { state, outcome: { kind: 'invalid' } };
    }
    if (isAccepted(state.def, { rows, cols })) {
      return {
        state: { ...state, solved: true, moves: state.moves + 1 },
        outcome: { kind: 'solved' },
      };
    }
    return {
      state: { ...state, errors: state.errors + 1, moves: state.moves + 1 },
      outcome: { kind: 'wrong', rows, cols },
    };
  },

  /** 1: rows go across; 2: how many dots a row has; 3: the rows outlined (the child still taps the corner and Check). */
  hint(state, level) {
    const bumped = { ...state, hintLevel: level };
    if (level === 3) {
      return { state: bumped, hint: { kind: 'array', level, fillRows: state.def.rows } };
    }
    if (level === 2) {
      return { state: bumped, hint: { kind: 'array', level, cols: state.def.cols } };
    }
    return { state: bumped, hint: { kind: 'array', level } };
  },

  stars(state) {
    return errorHintStars(state.hintLevel, state.errors);
  },
};
