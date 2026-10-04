// "Race to N": the child and the bot alternate adding 1..maxStep to a running total that starts at 0; whoever says `target` wins.
// A pure `TurnGame` for the platform's `duel` mode (state and moves are plain JSON). The mover wins exactly when `target - total` is
// not a multiple of `maxStep + 1`: it adds the step that leaves a multiple of `maxStep + 1` to go, and answers every reply of the
// other side with the step that completes the block (a times-table idea: 4 times table for 20 and 1..3).
import type { DuelSide, TurnGame } from '@learn/platform-core';

export interface RaceParams {
  /** The number that wins, 10..30. */
  readonly target: number;
  /** The biggest step, 2..4 (the steps are 1..maxStep). */
  readonly maxStep: number;
}

export interface RaceState {
  readonly total: number;
  readonly toMove: DuelSide;
  readonly target: number;
  readonly maxStep: number;
  /** The move that led here; absent at the start. */
  readonly last?: { readonly side: DuelSide; readonly step: number };
}

/** How much to add. */
export type RaceMove = number;

function other(side: DuelSide): DuelSide {
  return side === 'kid' ? 'bot' : 'kid';
}

export const race: TurnGame<RaceParams, RaceState, RaceMove> = {
  id: 'race',
  start: ({ target, maxStep }, first) => ({ total: 0, toMove: first, target, maxStep }),
  toMove: (state) => state.toMove,
  moves(state) {
    const left = state.target - state.total;
    return Array.from({ length: Math.min(state.maxStep, left) }, (_, index) => index + 1);
  },
  play(state, move) {
    if (!Number.isInteger(move) || move < 1 || move > state.maxStep) {
      throw new Error(`race: ${String(move)} is not a step of 1 to ${String(state.maxStep)}`);
    }
    if (state.total + move > state.target) {
      throw new Error(
        `race: ${String(state.total)} + ${String(move)} passes ${String(state.target)}`,
      );
    }
    return {
      total: state.total + move,
      toMove: other(state.toMove),
      target: state.target,
      maxStep: state.maxStep,
      last: { side: state.toMove, step: move },
    };
  },
  // The side that said `target` is the one that moved last.
  result: (state) => (state.total === state.target ? state.last?.side : undefined),
  bestMoves(state) {
    const left = (state.target - state.total) % (state.maxStep + 1);
    return state.total >= state.target || left === 0 ? [] : [left];
  },
  sameMove: (a, b) => a === b,
};
