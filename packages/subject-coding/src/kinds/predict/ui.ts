import type { Cell } from '@learn/platform-core/domain/grid';
import type { ExerciseKindUI, PlayAreaProps } from '@learn/platform-web/kinds/kind-ui.ts';
import type { CodingKindState, PredictDef } from '../../core/types.ts';
import type { PickCellAction, PredictOutcome } from './kind.ts';
import { PlayArea } from './PlayArea.tsx';

/** `wrongCell`: the cell of the last wrong tap, marked "not right" until the next action or hint. */
export interface PredictExtra {
  readonly wrongCell?: Cell | undefined;
}

export type PredictPlayAreaProps = PlayAreaProps<
  PredictDef,
  CodingKindState<PredictDef>,
  PickCellAction,
  PredictExtra
>;

/** `predict`: the read-only program beside the grid whose cells are buttons. A right tap shows the run to the answer before the
 * engine hears of it (the PlayArea sends the action when the animation ends). */
export const predictUi: ExerciseKindUI<
  PredictDef,
  CodingKindState<PredictDef>,
  PickCellAction,
  PredictOutcome,
  PredictExtra
> = {
  type: 'predict',

  initUi: () => ({}),

  clearWrongUi: () => ({ wrongCell: undefined }),

  toUi(outcome) {
    if (outcome.kind === 'wrong') {
      return { feedback: { kind: 'predict-wrong' }, wrongCell: outcome.cell };
    }
    // `solved`, or `ignored` (a tap after it was solved).
    return { feedback: { kind: 'solved' }, hint: null, wrongCell: undefined };
  },

  PlayArea,
};
