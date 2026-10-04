// Every exercise kind's content-test-only `solution` / `wrongAction`, kept out of `CODING_KINDS` (and the app bundle): imported
// only by `/testing` and, through it, content tests.
import type { ExerciseSolution } from '@learn/platform-core/domain/exercise/kind';
import { CARD_SOLUTIONS } from '@learn/platform-core/domain/exercise/kinds/cards/solutions';
import type { FindBugDef, PredictDef, ProgramDef } from '../core/types.ts';
import type { PickTileAction } from './find-bug/kind.ts';
import { findBugSolution, findBugWrongAction } from './find-bug/solution.ts';
import type { CodingAction, DefOf, ExerciseType } from './index.ts';
import type { PickCellAction } from './predict/kind.ts';
import { predictSolution, predictWrongAction } from './predict/solution.ts';
import type { ProgramAction } from './program/kind.ts';
import { programSolution, programWrongAction } from './program/solution.ts';

type CodingSolution<
  D extends { readonly type: string; readonly id: string; readonly textKey: string },
  A extends CodingAction,
> = ExerciseSolution<D, A, null>;

export const CODING_SOLUTIONS = {
  ...CARD_SOLUTIONS,
  program: {
    solution: programSolution,
    wrongAction: programWrongAction,
  } satisfies CodingSolution<ProgramDef, ProgramAction>,
  predict: {
    solution: predictSolution,
    wrongAction: predictWrongAction,
  } satisfies CodingSolution<PredictDef, PickCellAction>,
  'find-bug': {
    solution: findBugSolution,
    wrongAction: findBugWrongAction,
  } satisfies CodingSolution<FindBugDef, PickTileAction>,
} as const satisfies { readonly [T in ExerciseType]: CodingSolution<DefOf<T>, CodingAction> };

export type AnyCodingSolution = CodingSolution<DefOf<ExerciseType>, CodingAction>;

export function solutionOf(def: { readonly type: ExerciseType }): AnyCodingSolution {
  return CODING_SOLUTIONS[def.type];
}
