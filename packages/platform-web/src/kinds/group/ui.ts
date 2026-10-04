import type { GroupDef, GroupOutcome, GroupState, PutItemAction } from '@learn/platform-core';
import type { ExerciseKindUI, PlayAreaProps } from '../kind-ui.ts';
import { PlayArea } from './PlayArea.tsx';

export type GroupPlayAreaProps = PlayAreaProps<GroupDef, GroupState, PutItemAction>;

/** The opt-in `group` kind's UI (a subject adds `group: GROUP_KIND_UI` to its `SubjectWeb.kinds`): the prompt card (if any), the boxes
 * of its layout and the pool of cards to sort. A wrong put speaks what it got half right (`miss`); the right one goes back to the
 * instruction. */
export const GROUP_KIND_UI: ExerciseKindUI<GroupDef, GroupState, PutItemAction, GroupOutcome> = {
  type: 'group',

  initUi: () => ({}),

  clearWrongUi: () => ({}),

  toUi(outcome) {
    if (outcome.kind === 'wrong') {
      return {
        feedback: {
          kind: 'group-wrong',
          ...(outcome.miss === undefined ? {} : { miss: outcome.miss }),
        },
        hint: null,
      };
    }
    if (outcome.kind === 'solved') return { feedback: { kind: 'solved' }, hint: null };
    // 'placed', or 'ignored' (a card already placed): back to the instruction.
    return { feedback: { kind: 'instruction' }, hint: null };
  },

  PlayArea,
};
