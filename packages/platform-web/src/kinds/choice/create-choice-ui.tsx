import type { JSX } from 'react';
import type { ExerciseStateBase } from '@learn/platform-core';
import type { AnswerOutcome } from '@learn/platform-core/domain/exercise/answer';
import type {
  AnswerChoiceAction,
  ChoiceDefBase,
  ChoiceState,
} from '@learn/platform-core/domain/exercise/kinds/choice/def';
import { ExerciseControls } from '../ExerciseControls.tsx';
import { ExerciseFrame } from '../ExercisePlay.tsx';
import type { ExerciseKindUI, PlayAreaProps } from '../kind-ui.ts';
import { centredPanelBody, panelBody } from '../panel-body.tsx';
import { ChoiceOptions } from './ChoiceOptions.tsx';
import type { ChoiceLook } from './ChoiceOptions.tsx';

export interface ChoiceUiSpec<
  D extends ChoiceDefBase,
  S extends ExerciseStateBase<D> & ChoiceState<D>,
  Extra extends object,
> {
  initUi(def: D): Extra;
  /** Extras a hint request clears: the kind's own "wrong" markers. */
  clearWrongUi(): Partial<Extra>;
  /** What the options answer (chess: the board); called as a function, so it may use hooks. `null` makes the
   * options the whole exercise: full width, large tiles centred between the instruction and the Hint row. */
  stimulus(props: PlayAreaProps<D, S, AnswerChoiceAction, Extra>): JSX.Element | null;
  readonly look: ChoiceLook<D['options'][number]>;
}

/** The `choice` kind's UI: the stimulus beside a Hint button and the option tiles; without a stimulus the large tiles fill the
 * panel above the Hint row. */
export function createChoiceUi<
  D extends ChoiceDefBase,
  S extends ExerciseStateBase<D> & ChoiceState<D>,
  Extra extends object,
>(spec: ChoiceUiSpec<D, S, Extra>): ExerciseKindUI<D, S, AnswerChoiceAction, AnswerOutcome, Extra> {
  return {
    type: 'choice',

    initUi: (def) => spec.initUi(def),

    clearWrongUi: () => spec.clearWrongUi(),

    toUi(outcome, action, next) {
      // 'ignored' (already solved): the tiles are hidden by then, unreachable in the UI.
      if (outcome.kind !== 'wrong') {
        return { feedback: { kind: 'solved' }, hint: null, ...spec.clearWrongUi() };
      }
      // A wrong option with a reason speaks it instead of the default note.
      const reasonKey = next.def.options.find((option) => option.id === action.optionId)?.reasonKey;
      return {
        feedback:
          reasonKey === undefined ? { kind: 'wrong-answer' } : { kind: 'wrong-answer', reasonKey },
        hint: null,
        ...spec.clearWrongUi(),
      };
    },

    PlayArea(props) {
      const { def, state, dispatch, showHint, top, done, actions } = props;
      const board = spec.stimulus(props);
      const large = board === null;
      const hintRow = (
        <ExerciseControls
          showHint={showHint}
          onHint={() => {
            dispatch({ type: 'hint' });
          }}
          extras={actions}
        />
      );
      const options = (
        <ChoiceOptions
          options={def.options}
          wrongOptionIds={state.core.wrongOptions ?? []}
          onPick={(optionId) => {
            dispatch({ type: 'answer-choice', optionId });
          }}
          look={spec.look}
          size={large ? 'large' : 'normal'}
        />
      );
      return (
        <ExerciseFrame
          board={board}
          panel={
            large
              ? centredPanelBody(top, state.core.solved, done, options, hintRow)
              : panelBody(
                  top,
                  state.core.solved,
                  done,
                  <>
                    {hintRow}
                    {options}
                  </>,
                )
          }
        />
      );
    },
  };
}
