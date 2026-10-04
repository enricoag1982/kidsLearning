// The exercise-kind registry: the only place exercise-type dispatch happens. The card kit's four kinds plus the three coding
// kinds, one plain object.
import type {
  CardAction,
  CardHint,
  CardOutcome,
  CardState,
} from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { CARD_KINDS } from '@learn/platform-core/domain/exercise/kinds/cards/kinds';
import type { ExerciseKind } from '@learn/platform-core/domain/exercise/kind';
import type {
  CodingExerciseDef,
  CodingKindState,
  FindBugHint,
  PredictHint,
  ProgramHint,
} from '../core/types.ts';
import { findBugKind } from './find-bug/kind.ts';
import type { FindBugOutcome, PickTileAction } from './find-bug/kind.ts';
import { predictKind } from './predict/kind.ts';
import type { PickCellAction, PredictOutcome } from './predict/kind.ts';
import { programKind } from './program/kind.ts';
import type { ProgramAction, ProgramOutcome } from './program/kind.ts';

export type ExerciseType = CodingExerciseDef['type'];
export type DefOf<T extends ExerciseType> = Extract<CodingExerciseDef, { readonly type: T }>;

export type CodingAction = CardAction | ProgramAction | PickCellAction | PickTileAction;
export type CodingOutcome = CardOutcome | ProgramOutcome | PredictOutcome | FindBugOutcome;
export type CodingHint = CardHint | ProgramHint | PredictHint | FindBugHint;
export type CodingState = CardState | CodingKindState;

export type AnyCodingKind = ExerciseKind<
  CodingExerciseDef,
  CodingState,
  CodingAction,
  CodingOutcome,
  CodingHint,
  null
>;

export const CODING_KINDS = {
  ...CARD_KINDS,
  program: programKind,
  predict: predictKind,
  'find-bug': findBugKind,
} as const satisfies { readonly [T in ExerciseType]: AnyCodingKind & { readonly type: T } };

export function kindOf(def: { readonly type: ExerciseType }): AnyCodingKind {
  return CODING_KINDS[def.type];
}

export function startExercise(def: CodingExerciseDef): CodingState {
  return kindOf(def).init(def);
}
