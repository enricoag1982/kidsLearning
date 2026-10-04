// Every card kind's content-test-only `solution` / `wrongAction`, kept out of `CARD_KINDS` (and the app bundle): imported
// only by tests and the e2e drivers.
import type { ExerciseSolution } from '../../kind.ts';
import { choiceSolution, choiceWrongAction } from '../choice/solution.ts';
import { numberEntrySolution, numberEntryWrongAction } from '../number-entry/solution.ts';
import { orderSolution, orderWrongAction } from '../order/solution.ts';
import { trueFalseSolution, trueFalseWrongAction } from '../true-false/solution.ts';
import type { CardAction, CardChoiceDef, CardDefOf, CardExerciseDef, CardType } from './def.ts';
import type { AnswerChoiceAction } from '../choice/def.ts';
import type { AnswerTrueFalseAction } from '../true-false/def.ts';
import type { NumberEntryAction, NumberEntryDef } from '../number-entry/def.ts';
import type { OrderDef, PlaceItemAction } from '../order/def.ts';
import type { TrueFalseDef } from '../true-false/def.ts';

type CardSolution<D extends CardExerciseDef, A extends CardAction> = ExerciseSolution<D, A, null>;

export const CARD_SOLUTIONS = {
  choice: { solution: choiceSolution, wrongAction: choiceWrongAction } satisfies CardSolution<
    CardChoiceDef,
    AnswerChoiceAction
  >,
  'true-false': {
    solution: trueFalseSolution,
    wrongAction: trueFalseWrongAction,
  } satisfies CardSolution<TrueFalseDef, AnswerTrueFalseAction>,
  'number-entry': {
    solution: numberEntrySolution,
    wrongAction: numberEntryWrongAction,
  } satisfies CardSolution<NumberEntryDef, NumberEntryAction>,
  order: { solution: orderSolution, wrongAction: orderWrongAction } satisfies CardSolution<
    OrderDef,
    PlaceItemAction
  >,
} as const satisfies { readonly [T in CardType]: CardSolution<CardDefOf<T>, CardAction> };

export type AnyCardSolution = CardSolution<CardExerciseDef, CardAction>;

export function cardSolutionOf(def: { readonly type: CardType }): AnyCardSolution {
  return CARD_SOLUTIONS[def.type];
}
