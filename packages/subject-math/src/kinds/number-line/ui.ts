import type { ExerciseKindUI, PlayAreaProps } from '@learn/platform-web/kinds/kind-ui.ts';
import type { NumberLineDef, NumberLineOutcome, NumberLineState, PlaceAction } from './def.ts';
import { PlayArea } from './PlayArea.tsx';

/** `wrongValue`: where the last wrong Check was; the marker shakes there and Check waits for it to move. */
export interface NumberLineExtra {
  readonly wrongValue?: number | undefined;
}

export type NumberLinePlayAreaProps = PlayAreaProps<
  NumberLineDef,
  NumberLineState,
  PlaceAction,
  NumberLineExtra
>;

/** `number-line`: the prompt card, the line with the marker, a Hint button and Check. The marker is the UI's own draft until Check
 * sends it to the engine. */
export const numberLineUi: ExerciseKindUI<
  NumberLineDef,
  NumberLineState,
  PlaceAction,
  NumberLineOutcome,
  NumberLineExtra
> = {
  type: 'number-line',

  initUi: () => ({}),

  clearWrongUi: () => ({ wrongValue: undefined }),

  toUi(outcome, _action, next) {
    if (outcome.kind === 'wrong') {
      // A value with a reason speaks it instead of the default note.
      const reasonKey = next.def.reasons?.find(
        (reason) => reason.value === outcome.value,
      )?.reasonKey;
      return {
        feedback:
          reasonKey === undefined ? { kind: 'line-wrong' } : { kind: 'line-wrong', reasonKey },
        hint: null,
        wrongValue: outcome.value,
      };
    }
    // `solved`, or `ignored` (a Check after it was solved).
    return { feedback: { kind: 'solved' }, hint: null, wrongValue: undefined };
  },

  PlayArea,
};
