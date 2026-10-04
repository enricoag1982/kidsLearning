import type { JSX } from 'react';
import type { DuelSide } from '@learn/platform-core';

/** What the duel step hands a subject's board: the game state (the `TurnGame`'s own, opaque to the platform), the moves the kid may
 * play now, and the moves to draw attention to. A board draws the state and calls `onMove` with one of `legalMoves`; it renders
 * each move as a button carrying `data-move="<JSON of the move>"` so the e2e driver can play it. */
export interface DuelBoardProps {
  readonly state: unknown;
  /** The kid's legal moves; empty when it is not the kid's turn or the game is over. */
  readonly legalMoves: readonly unknown[];
  /** True off the kid's turn (the bot is thinking, or the game is over): the board does not react to taps. */
  readonly disabled: boolean;
  /** The hint's best moves, shown until the next move. */
  readonly hintMoves?: readonly unknown[];
  readonly lastMove?: { readonly side: DuelSide; readonly move: unknown };
  readonly onMove: (move: unknown) => void;
}

/** One game's board, by the `TurnGame` id it draws (`createDuelModeUi({ <id>: Board })`). */
export type DuelBoard = (props: DuelBoardProps) => JSX.Element;
