// Every exercise kind's content-test-only `solution` / `wrongAction`, kept out of `LOGIC_KINDS` (and the app bundle): imported
// only by `/testing` and, through it, content tests.
import type { ExerciseSolution } from '@learn/platform-core/domain/exercise/kind';
import { CARD_SOLUTIONS } from '@learn/platform-core/domain/exercise/kinds/cards/solutions';
import type { GridFillAction, GridFillDef } from './grid-fill/def.ts';
import { gridFillSolution, gridFillWrongAction } from './grid-fill/solution.ts';
import type { DefOf, ExerciseType, LogicAction } from './index.ts';

type LogicSolution<
  D extends { readonly type: string; readonly id: string; readonly textKey: string },
  A extends LogicAction,
> = ExerciseSolution<D, A, null>;

export const LOGIC_SOLUTIONS = {
  ...CARD_SOLUTIONS,
  'grid-fill': {
    solution: gridFillSolution,
    wrongAction: gridFillWrongAction,
  } satisfies LogicSolution<GridFillDef, GridFillAction>,
} as const satisfies { readonly [T in ExerciseType]: LogicSolution<DefOf<T>, LogicAction> };

export type AnyLogicSolution = LogicSolution<DefOf<ExerciseType>, LogicAction>;

export function solutionOf(def: { readonly type: ExerciseType }): AnyLogicSolution {
  return LOGIC_SOLUTIONS[def.type];
}
