/**
 * `@learn/subject-coding/testing`: the exercise-solving drivers (they play the card kit's four kinds and the three coding kinds
 * through one registry) and one sample def per coding kind. Never imported from the package barrel, so none of it reaches the app
 * bundle.
 */
export { CODING_SOLUTIONS, solutionOf, type AnyCodingSolution } from '../kinds/solutions.ts';
export { play, playSolution, playWrongThenSolve, starsFor } from './play.ts';
export { CODING_SAMPLES } from './samples.ts';
