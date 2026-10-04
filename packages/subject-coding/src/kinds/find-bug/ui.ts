import type { ExerciseKindUI, PlayAreaProps } from '@learn/platform-web/kinds/kind-ui.ts';
import type { CodingKindState, FindBugDef } from '../../core/types.ts';
import type { FindBugOutcome, PickTileAction } from './kind.ts';
import { PlayArea } from './PlayArea.tsx';

/** `wrongPath`: the tile of the last wrong tap, shaking until the next action or hint. */
export interface FindBugExtra {
  readonly wrongPath?: readonly number[] | undefined;
}

export type FindBugPlayAreaProps = PlayAreaProps<
  FindBugDef,
  CodingKindState<FindBugDef>,
  PickTileAction,
  FindBugExtra
>;

/** `find-bug`: the read-only program whose tiles are buttons, and Watch to see the failing run. A right tap marks the bug, then
 * shows the fixed run before the engine hears of it (the PlayArea sends the action when the animation ends). */
export const findBugUi: ExerciseKindUI<
  FindBugDef,
  CodingKindState<FindBugDef>,
  PickTileAction,
  FindBugOutcome,
  FindBugExtra
> = {
  type: 'find-bug',

  initUi: () => ({}),

  clearWrongUi: () => ({ wrongPath: undefined }),

  toUi(outcome) {
    if (outcome.kind === 'wrong') {
      return { feedback: { kind: 'bug-wrong' }, wrongPath: outcome.path };
    }
    // `solved`, or `ignored` (a tap after it was solved).
    return { feedback: { kind: 'solved' }, hint: null, wrongPath: undefined };
  },

  PlayArea,
};
