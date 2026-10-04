// The exercise-kind registry: the only place exercise-type dispatch happens. Today the card kit's four kinds, one plain object
// that math's own kinds join (m13.6-m13.8).
import type {
  CardAction,
  CardHint,
  CardOutcome,
  CardState,
} from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { CARD_KINDS } from '@learn/platform-core/domain/exercise/kinds/cards/kinds';
import type { ExerciseKind } from '@learn/platform-core/domain/exercise/kind';
import type { MathExerciseDef } from '../core/types.ts';

export type ExerciseType = MathExerciseDef['type'];
export type DefOf<T extends ExerciseType> = Extract<MathExerciseDef, { readonly type: T }>;

export type MathAction = CardAction;
export type MathOutcome = CardOutcome;
export type MathHint = CardHint;
export type MathState = CardState;

export type AnyMathKind = ExerciseKind<
  MathExerciseDef,
  MathState,
  MathAction,
  MathOutcome,
  MathHint,
  null
>;

export const MATH_KINDS = {
  ...CARD_KINDS,
} as const satisfies { readonly [T in ExerciseType]: AnyMathKind & { readonly type: T } };

export function kindOf(def: { readonly type: ExerciseType }): AnyMathKind {
  return MATH_KINDS[def.type];
}

export function startExercise(def: MathExerciseDef): MathState {
  return kindOf(def).init(def);
}
