import { errorHintStars } from '@learn/platform-core/domain/exercise/stars';
import type { ExerciseKind } from '@learn/platform-core/domain/exercise/kind';
import type {
  NumberLineDef,
  NumberLineHint,
  NumberLineOutcome,
  NumberLineState,
  PlaceAction,
} from './def.ts';
import { benchmarkOf, isAccepted } from './ticks.ts';

/** A fresh state; the `number-line` kind's `init`. */
export function initNumberLineState(def: NumberLineDef): NumberLineState {
  return { def, moves: 0, solved: false, errors: 0, hintLevel: 0 };
}

export const numberLineKind: ExerciseKind<
  NumberLineDef,
  NumberLineState,
  PlaceAction,
  NumberLineOutcome,
  NumberLineHint,
  null
> = {
  type: 'number-line',
  input: 'place',
  init: initNumberLineState,

  /** Check at `value`: accepted solves (exact: the target; estimate: within the tolerance), else an error. Both count a move. Every
   * action is ignored once solved, so a late tap never rescores the exercise. */
  act(state, action) {
    if (state.solved) {
      return { state, outcome: { kind: 'ignored' } };
    }
    if (isAccepted(state.def, action.value)) {
      return {
        state: { ...state, solved: true, moves: state.moves + 1 },
        outcome: { kind: 'solved' },
      };
    }
    return {
      state: { ...state, errors: state.errors + 1, moves: state.moves + 1 },
      outcome: { kind: 'wrong', value: action.value },
    };
  },

  /** 1: the tick in the middle gets its number; 2: every tick does; 3: the marker goes to the target (the child still taps Check). */
  hint(state, level) {
    const bumped = { ...state, hintLevel: level };
    if (level === 3) {
      return { state: bumped, hint: { kind: 'number-line', level, reveal: state.def.target } };
    }
    if (level === 2) {
      return { state: bumped, hint: { kind: 'number-line', level } };
    }
    return {
      state: bumped,
      hint: { kind: 'number-line', level, benchmark: benchmarkOf(state.def) },
    };
  },

  stars(state) {
    return errorHintStars(state.hintLevel, state.errors);
  },
};
