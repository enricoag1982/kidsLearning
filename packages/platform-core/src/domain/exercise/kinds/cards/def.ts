import type { ExerciseStateBase } from '../../../subject.ts';
import type { AnswerChoiceAction, ChoiceDefBase, ChoiceHint } from '../choice/def.ts';
import type {
  NumberEntryAction,
  NumberEntryDef,
  NumberEntryHint,
  NumberEntryOutcome,
} from '../number-entry/def.ts';
import type { OrderDef, OrderHint, OrderOutcome, PlaceItemAction } from '../order/def.ts';
import type { AnswerTrueFalseAction, TrueFalseDef, TrueFalseHint } from '../true-false/def.ts';
import type { AnswerOutcome } from '../../answer.ts';
import type { CardDefBase, CardItem } from './prompt.ts';

/** An intersection, not `extends`: `CardDefBase.type` is any string, `ChoiceDefBase.type` is `'choice'`. */
export type CardChoiceDef = ChoiceDefBase<CardItem> & CardDefBase;

/** The four exercise kinds of the card kit. */
export type CardExerciseDef = CardChoiceDef | TrueFalseDef | NumberEntryDef | OrderDef;

export type CardType = CardExerciseDef['type'];

export type CardDefOf<T extends CardType> = Extract<CardExerciseDef, { readonly type: T }>;

export type CardAction =
  AnswerChoiceAction | AnswerTrueFalseAction | NumberEntryAction | PlaceItemAction;

export type CardOutcome = AnswerOutcome | NumberEntryOutcome | OrderOutcome;

export type CardHint = ChoiceHint | TrueFalseHint | NumberEntryHint | OrderHint;

/** One state shape for every card kind (each reads its own fields): `entry` = digits typed (number-entry), `placed` /
 * `wrongItemId` / `ruledOut` = the order game, `wrongOptions` = buttons ruled out (choice, true-false). */
export interface CardState<
  D extends CardExerciseDef = CardExerciseDef,
> extends ExerciseStateBase<D> {
  readonly entry: string;
  readonly placed: readonly string[];
  readonly ruledOut: readonly string[];
  readonly wrongOptions?: readonly string[];
  readonly wrongItemId?: string;
}

/** A fresh state; every card kind's `init`. */
export function initCardState<D extends CardExerciseDef>(def: D): CardState<D> {
  return {
    def,
    moves: 0,
    solved: false,
    errors: 0,
    hintLevel: 0,
    entry: '',
    placed: [],
    ruledOut: [],
  };
}
