// The exercise-kind registry: the only place exercise-type dispatch happens. The card kit's four kinds and logic's own as one plain
// object (`grid-fill` since m14.7); `group` joins it with one line.
import type {
  CardAction,
  CardHint,
  CardOutcome,
  CardState,
} from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { CARD_KINDS } from '@learn/platform-core/domain/exercise/kinds/cards/kinds';
import type { ExerciseKind } from '@learn/platform-core/domain/exercise/kind';
import type { LogicExerciseDef } from '../core/types.ts';
import type {
  GridFillAction,
  GridFillHint,
  GridFillOutcome,
  GridFillState,
} from './grid-fill/def.ts';
import { gridFillKind } from './grid-fill/kind.ts';

export type ExerciseType = LogicExerciseDef['type'];
export type DefOf<T extends ExerciseType> = Extract<LogicExerciseDef, { readonly type: T }>;

export type LogicAction = CardAction | GridFillAction;
export type LogicOutcome = CardOutcome | GridFillOutcome;
export type LogicHint = CardHint | GridFillHint;
export type LogicState = CardState | GridFillState;

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
  'grid-fill': gridFillKind,
} as const satisfies { readonly [T in ExerciseType]: AnyLogicKind & { readonly type: T } };

export function kindOf(def: { readonly type: ExerciseType }): AnyLogicKind {
  return LOGIC_KINDS[def.type];
}

export function startExercise(def: LogicExerciseDef): LogicState {
  return kindOf(def).init(def);
}
