/**
 * `@learn/subject-coding/testing`: the exercise-solving drivers (the card kit's and the coding kinds'). Never imported from the
 * package barrel, so none of it reaches the app bundle.
 */
export { CODING_SOLUTIONS, solutionOf, type AnyCodingSolution } from '../kinds/solutions.ts';
export { play, playSolution, playWrongThenSolve, starsFor } from './play.ts';
export { CODING_SAMPLES } from './samples.ts';
// The card-only drivers (`cardStars`, ...) play the card kit's four kinds through `cardKindOf`; they cannot play a coding kind.
export {
  CARD_SOLUTIONS,
  cardSolutionOf,
} from '@learn/platform-core/domain/exercise/kinds/cards/solutions';
export { cardStars, playCardSolution, playCardWrongThenSolve } from '@learn/platform-core/testing';
