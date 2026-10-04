// The exercise-kind registry: the only place exercise-type dispatch happens. The card kit's four kinds and math's own, one plain
// object (`number-line` since m13.6, `place-value` since m13.7; `array` joins in m13.8).
import type {
  CardAction,
  CardHint,
  CardOutcome,
  CardState,
} from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { CARD_KINDS } from '@learn/platform-core/domain/exercise/kinds/cards/kinds';
import type { ExerciseKind } from '@learn/platform-core/domain/exercise/kind';
import type { MathExerciseDef } from '../core/types.ts';
import { numberLineKind } from './number-line/kind.ts';
import type {
  NumberLineHint,
  NumberLineOutcome,
  NumberLineState,
  PlaceAction,
} from './number-line/def.ts';
import type {
  BuildAction,
  PlaceValueHint,
  PlaceValueOutcome,
  PlaceValueState,
} from './place-value/def.ts';
import { placeValueKind } from './place-value/kind.ts';

export type ExerciseType = MathExerciseDef['type'];
export type DefOf<T extends ExerciseType> = Extract<MathExerciseDef, { readonly type: T }>;

export type MathAction = CardAction | PlaceAction | BuildAction;
export type MathOutcome = CardOutcome | NumberLineOutcome | PlaceValueOutcome;
export type MathHint = CardHint | NumberLineHint | PlaceValueHint;
export type MathState = CardState | NumberLineState | PlaceValueState;

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
  'number-line': numberLineKind,
  'place-value': placeValueKind,
} as const satisfies { readonly [T in ExerciseType]: AnyMathKind & { readonly type: T } };

export function kindOf(def: { readonly type: ExerciseType }): AnyMathKind {
  return MATH_KINDS[def.type];
}

export function startExercise(def: MathExerciseDef): MathState {
  return kindOf(def).init(def);
}
