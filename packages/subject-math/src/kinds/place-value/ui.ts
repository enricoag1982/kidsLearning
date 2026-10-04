import type { ExerciseKindUI, PlayAreaProps } from '@learn/platform-web/kinds/kind-ui.ts';
import type { BuildAction, PlaceValueDef, PlaceValueOutcome, PlaceValueState } from './def.ts';
import { PlayArea } from './PlayArea.tsx';

export type PlaceValuePlayAreaProps = PlayAreaProps<PlaceValueDef, PlaceValueState, BuildAction>;

/** `place-value`: the columns of blocks with their Add / Take away buttons, Check and Hint. The blocks being built are the
 * PlayArea's draft; the engine hears them when Check is tapped. A wrong build speaks the reason of its value when it has one. */
export const placeValueUi: ExerciseKindUI<
  PlaceValueDef,
  PlaceValueState,
  BuildAction,
  PlaceValueOutcome
> = {
  type: 'place-value',

  initUi: () => ({}),

  clearWrongUi: () => ({}),

  toUi(outcome, _action, next) {
    if (outcome.kind === 'wrong') {
      // A built value with a reason speaks it instead of the default note.
      const reasonKey = next.def.reasons?.find(
        (reason) => reason.value === outcome.value,
      )?.reasonKey;
      return {
        feedback: reasonKey === undefined ? { kind: 'pv-wrong' } : { kind: 'pv-wrong', reasonKey },
        hint: null,
      };
    }
    if (outcome.kind === 'solved' || outcome.kind === 'ignored') {
      return { feedback: { kind: 'solved' }, hint: null };
    }
    // `invalid`: nothing counted (the columns' buttons never build one).
    return { feedback: { kind: 'instruction' } };
  },

  PlayArea,
};
