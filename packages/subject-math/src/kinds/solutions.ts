// Every exercise kind's content-test-only `solution` / `wrongAction`, kept out of `MATH_KINDS` (and the app bundle): imported
// only by `/testing` and, through it, content tests.
import type { ExerciseSolution } from '@learn/platform-core/domain/exercise/kind';
import { CARD_SOLUTIONS } from '@learn/platform-core/domain/exercise/kinds/cards/solutions';
import type { ArrayAction, ArrayDef } from './array/def.ts';
import { arraySolution, arrayWrongAction } from './array/solution.ts';
import type { NumberLineDef, PlaceAction } from './number-line/def.ts';
import { numberLineSolution, numberLineWrongAction } from './number-line/solution.ts';
import type { DefOf, ExerciseType, MathAction } from './index.ts';
import type { BuildAction } from './place-value/def.ts';
import { placeValueSolution, placeValueWrongAction } from './place-value/solution.ts';

type MathSolution<
  D extends { readonly type: string; readonly id: string; readonly textKey: string },
  A extends MathAction,
> = ExerciseSolution<D, A, null>;

export const MATH_SOLUTIONS = {
  ...CARD_SOLUTIONS,
  'number-line': {
    solution: numberLineSolution,
    wrongAction: numberLineWrongAction,
  } satisfies MathSolution<NumberLineDef, PlaceAction>,
  'place-value': {
    solution: placeValueSolution,
    wrongAction: placeValueWrongAction,
  } satisfies MathSolution<DefOf<'place-value'>, BuildAction>,
  array: {
    solution: arraySolution,
    wrongAction: arrayWrongAction,
  } satisfies MathSolution<ArrayDef, ArrayAction>,
} as const satisfies { readonly [T in ExerciseType]: MathSolution<DefOf<T>, MathAction> };

export type AnyMathSolution = MathSolution<DefOf<ExerciseType>, MathAction>;

export function solutionOf(def: { readonly type: ExerciseType }): AnyMathSolution {
  return MATH_SOLUTIONS[def.type];
}
