// Plays a def with its own kind's `solution()` / `wrongAction()`: proves the engine accepts the authored answer end to end.
import type { CodingExerciseDef } from '../core/types.ts';
import { kindOf } from '../kinds/index.ts';
import type { CodingAction, CodingState } from '../kinds/index.ts';
import { solutionOf } from '../kinds/solutions.ts';

/** The kind's own `act` folded over `actions`, from `from` (default a fresh state). */
export function play(
  def: CodingExerciseDef,
  actions: readonly CodingAction[],
  from: CodingState = kindOf(def).init(def),
): CodingState {
  const kind = kindOf(def);
  return actions.reduce((state, action) => kind.act(state, action, null).state, from);
}

/** Plays `def`'s `solution()` from a fresh state to a solved end. */
export function playSolution(def: CodingExerciseDef): CodingState {
  return play(def, solutionOf(def).solution(def, null));
}

/** Plays `def`'s `wrongAction()`, then its `solution()`: a wrong try costs exactly 1 error and never blocks solving. */
export function playWrongThenSolve(def: CodingExerciseDef): CodingState {
  const solution = solutionOf(def);
  const afterWrong = play(def, solution.wrongAction?.(def, null) ?? []);
  return play(def, solution.solution(def, null), afterWrong);
}

/** Stars earned so far; `0` until solved. */
export function starsFor(state: CodingState): 0 | 1 | 2 | 3 {
  return state.solved ? kindOf(state.def).stars(state) : 0;
}
