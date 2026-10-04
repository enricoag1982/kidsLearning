import type { ExerciseStateBase } from '../../../subject.ts';
import type {
  AnswerChoiceAction,
  ChoiceDefBase,
  ChoiceHint,
  ChoiceOptionBase,
} from '../choice/def.ts';
import type {
  NumberEntryAction,
  NumberEntryDef,
  NumberEntryHint,
  NumberEntryOutcome,
} from '../number-entry/def.ts';
import type { OrderDef, OrderHint, OrderOutcome, PlaceItemAction } from '../order/def.ts';
import type { AnswerTrueFalseAction, TrueFalseDef, TrueFalseHint } from '../true-false/def.ts';
import type { AnswerOutcome } from '../../answer.ts';
import type { CardDefBase, CardItem, CardPrompt } from './prompt.ts';

/** A pickable card that may carry the reason spoken when it is picked wrong. */
export type CardChoiceOption = CardItem & ChoiceOptionBase;

/** An intersection, not `extends`: `CardDefBase.type` is any string, `ChoiceDefBase.type` is `'choice'`. */
export type CardChoiceDef = ChoiceDefBase<CardChoiceOption> & CardDefBase;

/** The four exercise kinds of the card kit. */
export type CardExerciseDef = CardChoiceDef | TrueFalseDef | NumberEntryDef | OrderDef;

export type CardType = CardExerciseDef['type'];

/** A lesson's demo: its spoken text and, optionally, the card shown with it. */
export interface CardDemo {
  readonly textKey: string;
  readonly prompt?: CardPrompt;
}

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
