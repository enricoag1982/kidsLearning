// The exercise-kind registry: the only place exercise-type dispatch happens. The card kit's four kinds, the platform's opt-in `group`
// kind (since m14.10) and logic's own `grid-fill` (since m14.7) as one plain object.
import type {
  CardAction,
  CardHint,
  CardOutcome,
  CardState,
} from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { CARD_KINDS } from '@learn/platform-core/domain/exercise/kinds/cards/kinds';
import type {
  GroupHint,
  GroupOutcome,
  GroupState,
  PutItemAction,
} from '@learn/platform-core/domain/exercise/kinds/group/def';
import { GROUP_KIND } from '@learn/platform-core/domain/exercise/kinds/group/kind';
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

export type LogicAction = CardAction | PutItemAction | GridFillAction;
export type LogicOutcome = CardOutcome | GroupOutcome | GridFillOutcome;
export type LogicHint = CardHint | GroupHint | GridFillHint;
export type LogicState = CardState | GroupState | GridFillState;

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
  group: GROUP_KIND,
  'grid-fill': gridFillKind,
} as const satisfies { readonly [T in ExerciseType]: AnyLogicKind & { readonly type: T } };

export function kindOf(def: { readonly type: ExerciseType }): AnyLogicKind {
  return LOGIC_KINDS[def.type];
}

export function startExercise(def: LogicExerciseDef): LogicState {
  return kindOf(def).init(def);
}
