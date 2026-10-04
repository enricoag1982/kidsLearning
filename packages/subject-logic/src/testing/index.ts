/**
 * `@learn/subject-logic/testing`: the card kit's exercise-solving drivers. Never imported from the package barrel, so none of
 * it reaches the app bundle.
 */
export {
  CARD_SOLUTIONS,
  cardSolutionOf,
} from '@learn/platform-core/domain/exercise/kinds/cards/solutions';
export { cardStars, playCardSolution, playCardWrongThenSolve } from '@learn/platform-core/testing';
