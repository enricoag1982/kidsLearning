// Plays a def with its own kind's `solution()` / `wrongAction()`: proves the engine accepts the authored answer end to end.
import type { LogicExerciseDef } from '../core/types.ts';
import { kindOf } from '../kinds/index.ts';
import type { LogicAction, LogicState } from '../kinds/index.ts';
import { solutionOf } from '../kinds/solutions.ts';

/** The kind's own `act` folded over `actions`, from `from` (default a fresh state). */
export function play(
  def: LogicExerciseDef,
  actions: readonly LogicAction[],
  from: LogicState = kindOf(def).init(def),
): LogicState {
  const kind = kindOf(def);
  return actions.reduce((state, action) => kind.act(state, action, null).state, from);
}

/** Plays `def`'s `solution()` from a fresh state to a solved end. */
export function playSolution(def: LogicExerciseDef): LogicState {
  return play(def, solutionOf(def).solution(def, null));
}

/** Plays `def`'s `wrongAction()`, then its `solution()`: a wrong try costs exactly 1 error and never blocks solving. */
export function playWrongThenSolve(def: LogicExerciseDef): LogicState {
  const solution = solutionOf(def);
  const afterWrong = play(def, solution.wrongAction?.(def, null) ?? []);
  return play(def, solution.solution(def, null), afterWrong);
}

/** Stars earned so far; `0` until solved. */
export function starsFor(state: LogicState): 0 | 1 | 2 | 3 {
  return state.solved ? kindOf(state.def).stars(state) : 0;
}
