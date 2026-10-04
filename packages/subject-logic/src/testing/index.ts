/**
 * `@learn/subject-logic/testing`: the exercise-solving drivers (they play every kind of `LOGIC_KINDS` through one registry). Never
 * imported from the package barrel, so none of it reaches the app bundle.
 */
export { LOGIC_SOLUTIONS, solutionOf, type AnyLogicSolution } from '../kinds/solutions.ts';
export { play, playSolution, playWrongThenSolve, starsFor } from './play.ts';
