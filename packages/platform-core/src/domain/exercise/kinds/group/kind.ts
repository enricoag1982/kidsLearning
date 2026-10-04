import type { ExerciseKind } from '../../kind.ts';
import { errorHintStars } from '../../stars.ts';
import type { GroupDef, GroupHint, GroupOutcome, GroupState, PutItemAction } from './def.ts';
import { groupHint, putItem } from './engine.ts';

/** A fresh state; the `group` kind's `init`. */
export function initGroupState(def: GroupDef): GroupState {
  return { def, moves: 0, solved: false, errors: 0, hintLevel: 0, placed: {}, ruledOut: [] };
}

/** The opt-in `group` kind (sort cards into boxes): not part of `CARD_KINDS`; a subject adds `group: GROUP_KIND` to its core's
 * `kinds` (with `GROUP_NOTES` in its note table). */
export const GROUP_KIND: ExerciseKind<
  GroupDef,
  GroupState,
  PutItemAction,
  GroupOutcome,
  GroupHint,
  null
> = {
  type: 'group',
  input: 'place',
  init: initGroupState,

  act(state, action) {
    return putItem(state, action.itemId, action.boxId);
  },

  hint(state, level) {
    return groupHint({ ...state, hintLevel: level }, level);
  },

  stars(state) {
    return errorHintStars(state.hintLevel, state.errors);
  },
};
