import { errorHintStars } from '@learn/platform-core/domain/exercise/stars';
import { sameCell } from '@learn/platform-core/domain/grid';
import type { Cell } from '@learn/platform-core/domain/grid';
import { run } from '../../core/simulator.ts';
import { initCodingState } from '../../core/state.ts';
import type { CodingKind, PredictDef, PredictHint } from '../../core/types.ts';

/** Tap the square where the animal ends. */
export interface PickCellAction {
  readonly type: 'pick-cell';
  readonly cell: Cell;
}

export type PredictOutcome =
  { readonly kind: 'solved' | 'ignored' } | { readonly kind: 'wrong'; readonly cell: Cell };

export const predictKind: CodingKind<PredictDef, PickCellAction, PredictOutcome, PredictHint> = {
  type: 'predict',
  input: 'select',

  init: initCodingState,

  act(state, action) {
    if (state.solved) {
      return { state, outcome: { kind: 'ignored' } };
    }
    if (sameCell(action.cell, state.def.answer)) {
      return {
        state: { ...state, solved: true, moves: state.moves + 1 },
        outcome: { kind: 'solved' },
      };
    }
    return {
      state: { ...state, errors: state.errors + 1, moves: state.moves + 1 },
      outcome: { kind: 'wrong', cell: action.cell },
    };
  },

  /** 1: replay the first 2 steps; 2: replay up to the last step (the child works out only that one); 3: the answer cell. The
   * replay counts never go down the ladder and never past the run. */
  hint(state, level) {
    const bumped = { ...state, hintLevel: level };
    if (level === 3) {
      return { state: bumped, hint: { kind: 'predict', level, reveal: state.def.answer } };
    }
    const length = run(state.def.level, state.def.program).steps.length;
    const first = Math.min(2, length);
    const replaySteps = level === 1 ? first : Math.min(length, Math.max(first, length - 1));
    return { state: bumped, hint: { kind: 'predict', level, replaySteps } };
  },

  stars(state) {
    return errorHintStars(state.hintLevel, state.errors);
  },
};
