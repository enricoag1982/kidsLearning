import type { ExerciseKind } from '../../kind.ts';
import { errorHintStars } from '../../stars.ts';
import type { OrderDef, OrderHint, OrderOutcome, OrderState, PlaceItemAction } from './def.ts';
import { orderHint, placeItem } from './engine.ts';

/** The `order` kind for a subject's def and state; `init` builds the subject's fresh state. */
export function createOrderKind<D extends OrderDef, S extends OrderState<D>, Ctx>(
  init: (def: D) => S,
): ExerciseKind<D, S, PlaceItemAction, OrderOutcome, OrderHint, Ctx> {
  return {
    type: 'order',
    input: 'place',
    init,

    act(state, action) {
      return placeItem(state, action.itemId);
    },

    hint(state, level) {
      return orderHint({ ...state, hintLevel: level }, level);
    },

    stars(state) {
      return errorHintStars(state.hintLevel, state.errors);
    },
  };
}
