// The short-lived feedback of the `grid-fill` play area: a ring that fades after a moment, the cells the engine filled for a level-3
// hint, and the shake of a rejected cell. The core state keeps a wrong entry (`wrong`) until the next accepted action; what the child
// sees lasts `FEEDBACK_MS`.
import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import { prefersReducedMotion } from '@learn/platform-web/ui/useMediaQuery.ts';
import { cellAt, changedCells } from '../kinds/grid-fill/board-model.ts';
import type { GridFillState, GridPuzzle } from '../kinds/grid-fill/def.ts';

/** How long the conflict unit's `bad` ring and a hint-filled cell's `good` flash stay on the board. */
export const FEEDBACK_MS = 1200;

/** `value` for `ms` after it last changed (by identity), then `undefined` until it changes again. The value at mount is not fresh. */
export function useFresh<T>(value: T | undefined, ms: number): T | undefined {
  const [seen, setSeen] = useState(value);
  const [fresh, setFresh] = useState(false);
  // A new value shows at once: adjusting state to a changed input during render, React's way without an effect.
  if (seen !== value) {
    setSeen(value);
    setFresh(value !== undefined);
  }
  useEffect(() => {
    if (!fresh) {
      return;
    }
    const timer = setTimeout(() => {
      setFresh(false);
    }, ms);
    return () => {
      clearTimeout(timer);
    };
  }, [fresh, seen, ms]);
  return fresh ? value : undefined;
}

/** The cells a level-3 hint filled (the engine placed them, the child did not), for `FEEDBACK_MS` after the hint. A picture's hint has
 * no `cell` of its own, so they are the cells that changed with it. */
export function useEngineFilled(core: GridFillState): readonly number[] | undefined {
  const hint = core.hint?.level === 3 ? core.hint : undefined;
  const [seen, setSeen] = useState({ hint, cells: core.cells });
  const [filled, setFilled] = useState<readonly number[] | undefined>(undefined);
  if (seen.hint !== hint || seen.cells !== core.cells) {
    setSeen({ hint, cells: core.cells });
    if (hint !== undefined && hint !== seen.hint) {
      setFilled(changedCells(seen.cells, core.cells));
    }
  }
  return useFresh(filled, FEEDBACK_MS);
}

/** Shakes the rejected cell once (`card-shake`, the order game's wrong card): the class goes on the board's own cell button and off
 * again when the animation ends. Reduced motion: no class at all. `board` is the element around the `GridBoard`. */
export function useCellShake(
  board: RefObject<HTMLElement | null>,
  puzzle: GridPuzzle,
  wrong: GridFillState['wrong'],
): void {
  useEffect(() => {
    if (wrong === undefined || prefersReducedMotion()) {
      return;
    }
    const { x, y } = cellAt(puzzle, wrong.cell);
    const cell = board.current?.querySelector<HTMLElement>(
      `[data-testid="grid-cell-${String(x)}-${String(y)}"]`,
    );
    if (!cell) {
      return;
    }
    const stop = (): void => {
      cell.classList.remove('card-shake');
    };
    // Off, reflow, on: the same cell shakes again when it is rejected twice in a row.
    stop();
    cell.getBoundingClientRect();
    cell.classList.add('card-shake');
    cell.addEventListener('animationend', stop, { once: true });
    return () => {
      cell.removeEventListener('animationend', stop);
      stop();
    };
  }, [board, puzzle, wrong]);
}
