// The duel mode's fixture board: the pile as stones and a "Take 1" / "Take 2" button per move (`data-move` carries the move, as a
// duel board must). Never imported by app code.
import type { JSX } from 'react';
import type { TakeAwayState } from '@learn/platform-core/testing';
import type { DuelBoard } from '../modes/duel/board.ts';

function isTakeAwayState(state: unknown): state is TakeAwayState {
  return typeof state === 'object' && state !== null && 'pile' in state && 'turn' in state;
}

export const TakeAwayBoard: DuelBoard = ({
  state,
  legalMoves,
  disabled,
  hintMoves,
  lastMove,
  bot,
  onMove,
}): JSX.Element => {
  const pile = isTakeAwayState(state) ? state.pile : 0;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4" data-bot={bot}>
      <div role="img" aria-label={`${String(pile)} stones`} className="text-4xl">
        {'●'.repeat(pile)}
      </div>
      {lastMove !== undefined && (
        <p data-testid="last-move">{`${lastMove.side} took ${String(lastMove.move)}`}</p>
      )}
      <div className="flex gap-3">
        {([1, 2] as const).map((take) => (
          <button
            key={take}
            type="button"
            data-move={JSON.stringify(take)}
            data-hint={hintMoves?.includes(take) === true ? 'true' : undefined}
            disabled={disabled || !legalMoves.includes(take)}
            onClick={() => {
              onMove(take);
            }}
            className={hintMoves?.includes(take) === true ? 'ring-4 ring-amber-400' : undefined}
          >
            {`Take ${String(take)}`}
          </button>
        ))}
      </div>
    </div>
  );
};
