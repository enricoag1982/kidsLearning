import type { CardState } from '@learn/platform-core/domain/exercise/kinds/cards/def';
import type {
  OrderDef,
  OrderOutcome,
  PlaceItemAction,
} from '@learn/platform-core/domain/exercise/kinds/order/def';
import type { ExerciseKindUI, PlayAreaProps } from '../../kind-ui.ts';
import { PlayArea } from './PlayArea.tsx';

export type OrderPlayAreaProps = PlayAreaProps<OrderDef, CardState<OrderDef>, PlaceItemAction>;

/** `order`: the prompt card (if any) beside a Hint button, the empty slots and the cards still to place. */
export const orderUi: ExerciseKindUI<
  OrderDef,
  CardState<OrderDef>,
  PlaceItemAction,
  OrderOutcome
> = {
  type: 'order',

  initUi: () => ({}),

  clearWrongUi: () => ({}),

  toUi(outcome) {
    if (outcome.kind === 'wrong') return { feedback: { kind: 'order-wrong' }, hint: null };
    if (outcome.kind === 'solved') return { feedback: { kind: 'solved' }, hint: null };
    // 'placed', or 'ignored' (a card already placed): back to the instruction.
    return { feedback: { kind: 'instruction' }, hint: null };
  },

  PlayArea,
};
