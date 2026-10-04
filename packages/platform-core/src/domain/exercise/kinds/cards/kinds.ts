// The card kit's kind registry: the only place exercise-type dispatch happens for it.
import type { ExerciseKind } from '../../kind.ts';
import { createChoiceKind } from '../choice/kind.ts';
import type { NumberEntryDef } from '../number-entry/def.ts';
import { createNumberEntryKind } from '../number-entry/kind.ts';
import type { OrderDef } from '../order/def.ts';
import { createOrderKind } from '../order/kind.ts';
import type { TrueFalseDef } from '../true-false/def.ts';
import { createTrueFalseKind } from '../true-false/kind.ts';
import { initCardState } from './def.ts';
import type {
  CardAction,
  CardChoiceDef,
  CardDefOf,
  CardExerciseDef,
  CardHint,
  CardOutcome,
  CardState,
  CardType,
} from './def.ts';

export type CardKind<
  D extends CardExerciseDef,
  A extends { readonly type: string },
  O,
  H,
> = ExerciseKind<D, CardState<D>, A, O, H, null>;

export const CARD_KINDS = {
  choice: createChoiceKind<CardChoiceDef, CardState<CardChoiceDef>, null>(initCardState),
  'true-false': createTrueFalseKind<TrueFalseDef, CardState<TrueFalseDef>, null>(initCardState),
  'number-entry': createNumberEntryKind<NumberEntryDef, CardState<NumberEntryDef>, null>(
    initCardState,
  ),
  order: createOrderKind<OrderDef, CardState<OrderDef>, null>(initCardState),
} as const satisfies {
  readonly [T in CardType]: CardKind<CardDefOf<T>, CardAction, CardOutcome, CardHint>;
};

export type AnyCardKind = CardKind<CardExerciseDef, CardAction, CardOutcome, CardHint>;

export function cardKindOf(def: CardExerciseDef): AnyCardKind {
  return CARD_KINDS[def.type];
}
