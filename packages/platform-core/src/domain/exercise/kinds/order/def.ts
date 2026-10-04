import type { ExerciseStateBase, HintBase } from '../../../subject.ts';
import type { CardDefBase, CardItem } from '../cards/prompt.ts';

/** Tap the cards in the right order. */
export interface OrderDef extends CardDefBase {
  readonly type: 'order';
  /** The cards in display order. */
  readonly items: readonly CardItem[];
  /** Every item id once, in the correct order (content: differs from the display order). */
  readonly answer: readonly string[];
}

export interface OrderState<D extends OrderDef = OrderDef> extends ExerciseStateBase<D> {
  /** Item ids placed so far, in order: always a prefix of `def.answer`. */
  readonly placed: readonly string[];
  /** The last wrong tap (cleared by the next right one): the UI flashes that card. */
  readonly wrongItemId?: string;
  /** Items a level-2 hint marked wrong for the slot being filled (cleared when it is filled). */
  readonly ruledOut: readonly string[];
}

export interface PlaceItemAction {
  readonly type: 'place-item';
  readonly itemId: string;
}

export type OrderOutcome =
  | { readonly kind: 'placed' | 'solved' | 'ignored' }
  | { readonly kind: 'wrong'; readonly itemId: string };

/** Level 1 flags the next slot (`nextSlot`, 0-based), level 2 marks one wrong card (`ruledOutId`), level 3 places the next
 * right card (`placedId`). */
export interface OrderHint extends HintBase {
  readonly kind: 'order';
  readonly reveal: boolean;
  readonly nextSlot: number;
  readonly ruledOutId?: string;
  readonly placedId?: string;
}
