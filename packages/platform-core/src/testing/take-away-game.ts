// The duel mode's fixture `TurnGame`: a pile, take 1 or 2, taking the last one wins (a subtraction game: the mover wins
// exactly when the pile is not a multiple of 3). What the platform's own duel tests and the card fixture subject play.
import type { DuelSide, TurnGame } from '../domain/exercise/modes/duel/def.ts';

export interface TakeAwayParams {
  readonly pile: number;
}

export interface TakeAwayState {
  readonly pile: number;
  readonly turn: DuelSide;
}

/** How many to take. */
export type TakeAwayMove = 1 | 2;

function other(side: DuelSide): DuelSide {
  return side === 'kid' ? 'bot' : 'kid';
}

export const takeAwayGame: TurnGame<TakeAwayParams, TakeAwayState, TakeAwayMove> = {
  id: 'take-away-fixture',
  start: ({ pile }, first) => ({ pile, turn: first }),
  toMove: (state) => state.turn,
  moves: ({ pile }) => ([1, 2] as const).filter((take) => take <= pile),
  play(state, move) {
    if (move > state.pile) {
      throw new Error(`take-away: cannot take ${String(move)} from ${String(state.pile)}`);
    }
    return { pile: state.pile - move, turn: other(state.turn) };
  },
  // Whoever took the last one moved just before `turn`.
  result: (state) => (state.pile === 0 ? other(state.turn) : undefined),
  bestMoves: ({ pile }) => (pile % 3 === 0 ? [] : [(pile % 3) as TakeAwayMove]),
  sameMove: (a, b) => a === b,
};
