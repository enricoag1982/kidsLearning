/**
 * `@learn/subject-math/testing`: the exercise-solving drivers (they play every kind of `MATH_KINDS` through one registry). Never
 * imported from the package barrel, so none of it reaches the app bundle.
 */
export { MATH_SOLUTIONS, solutionOf, type AnyMathSolution } from '../kinds/solutions.ts';
export { play, playSolution, playWrongThenSolve, starsFor } from './play.ts';
export { NUMBER_LINE_SAMPLES, NUMBER_LINE_SAMPLE_TEXTS } from '../kinds/number-line/samples.ts';
