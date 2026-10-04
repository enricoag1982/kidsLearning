import type { ExerciseKindUI, PlayAreaProps } from '@learn/platform-web/kinds/kind-ui.ts';
import type { ArrayAction, ArrayDef, ArrayOutcome, ArrayState } from './def.ts';
import { PlayArea } from './PlayArea.tsx';
import { isSwapped, reasonKeyOf } from './shape.ts';
import type { ArrayShape } from './shape.ts';

/** `wrongShape`: the shape of the last wrong Check; its corner is marked "not right" and Check waits for another corner (or a
 * hint). */
export interface ArrayExtra {
  readonly wrongShape?: ArrayShape | undefined;
}

export type ArrayPlayAreaProps = PlayAreaProps<ArrayDef, ArrayState, ArrayAction, ArrayExtra>;

/** `array`: the dot grid (a tap picks the bottom-right corner of the array), a Hint button and Check. The corner is the UI's own
 * draft until Check sends it to the engine. */
export const arrayUi: ExerciseKindUI<ArrayDef, ArrayState, ArrayAction, ArrayOutcome, ArrayExtra> =
  {
    type: 'array',

    initUi: () => ({}),

    clearWrongUi: () => ({ wrongShape: undefined }),

    toUi(outcome, _action, next) {
      if (outcome.kind === 'wrong') {
        const shape: ArrayShape = { rows: outcome.rows, cols: outcome.cols };
        // The shape's own reason first, else the right array turned round (rows fixed), else the plain count note.
        const reasonKey = reasonKeyOf(next.def, shape);
        const feedback =
          reasonKey !== undefined
            ? { kind: 'array-wrong', reasonKey }
            : isSwapped(next.def, shape)
              ? { kind: 'array-wrong', swapped: true }
              : { kind: 'array-wrong' };
        return { feedback, hint: null, wrongShape: shape };
      }
      if (outcome.kind === 'invalid') {
        // The grid has no cell for a size off 1-6, so the UI never sends one.
        return { feedback: { kind: 'instruction' } };
      }
      // `solved`, or `ignored` (a Check after it was solved).
      return { feedback: { kind: 'solved' }, hint: null, wrongShape: undefined };
    },

    PlayArea,
  };
