// The exercise-kind registry: the only place exercise-type dispatch happens. The card kit's four kinds as one plain object; logic's
// own kinds (`group`, `grid-fill`) join it with one line each.
import type {
  CardAction,
  CardHint,
  CardOutcome,
  CardState,
} from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { CARD_KINDS } from '@learn/platform-core/domain/exercise/kinds/cards/kinds';
import type { ExerciseKind } from '@learn/platform-core/domain/exercise/kind';
import type { LogicExerciseDef } from '../core/types.ts';

export type ExerciseType = LogicExerciseDef['type'];
export type DefOf<T extends ExerciseType> = Extract<LogicExerciseDef, { readonly type: T }>;

export type LogicAction = CardAction;
export type LogicOutcome = CardOutcome;
export type LogicHint = CardHint;
export type LogicState = CardState;

export type AnyLogicKind = ExerciseKind<
  LogicExerciseDef,
  LogicState,
  LogicAction,
  LogicOutcome,
  LogicHint,
  null
>;

export const LOGIC_KINDS = {
  ...CARD_KINDS,
} as const satisfies { readonly [T in ExerciseType]: AnyLogicKind & { readonly type: T } };

export function kindOf(def: { readonly type: ExerciseType }): AnyLogicKind {
  return LOGIC_KINDS[def.type];
}

export function startExercise(def: LogicExerciseDef): LogicState {
  return kindOf(def).init(def);
}
