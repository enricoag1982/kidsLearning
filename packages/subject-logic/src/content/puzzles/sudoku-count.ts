// Build-time solution counter for the sudoku puzzles (content checks: "exactly one solution"). Not part of the app bundle.
import { unitCells, unitsOf, type SudokuGrid, type SudokuSize } from '../../core/puzzles/sudoku.ts';

// Per cell: the other cells that share a row, a column or a box with it.
const PEERS = new Map<SudokuSize, readonly (readonly number[])[]>();

function peersOf(size: SudokuSize): readonly (readonly number[])[] {
  const cached = PEERS.get(size);
  if (cached) {
    return cached;
  }
  const peers = Array.from({ length: size * size }, (_, cell) => {
    const shared = new Set<number>();
    for (const unit of unitsOf(size, cell)) {
      for (const peer of unitCells(size, unit)) {
        if (peer !== cell) {
          shared.add(peer);
        }
      }
    }
    return [...shared];
  });
  PEERS.set(size, peers);
  return peers;
}

/**
 * The number of solutions of a grid, counted by backtracking on the cell with the fewest candidates; stops once `limit` is reached
 * (so `2` answers "unique?"). Givens that already clash count 0.
 */
export function countSudokuSolutions(size: SudokuSize, grid: SudokuGrid, limit = 2): number {
  if (grid.length !== size * size) {
    throw new Error(`sudoku: ${String(grid.length)} cells (${String(size * size)} expected)`);
  }
  const peers = peersOf(size);
  const work = [...grid];
  const allowed = (cell: number): number => {
    let used = 0;
    for (const peer of peers[cell] ?? []) {
      used |= 1 << (work[peer] ?? 0);
    }
    return ~used;
  };
  for (const [cell, value] of work.entries()) {
    if (value !== 0 && (allowed(cell) & (1 << value)) === 0) {
      return 0;
    }
  }
  let count = 0;
  const search = (): void => {
    let best = -1;
    let bestMask = 0;
    let bestSize = size + 1;
    for (const [cell, value] of work.entries()) {
      if (value !== 0) {
        continue;
      }
      const mask = allowed(cell);
      let fits = 0;
      for (let digit = 1; digit <= size; digit += 1) {
        if (mask & (1 << digit)) {
          fits += 1;
        }
      }
      if (fits === 0) {
        return;
      }
      if (fits < bestSize) {
        best = cell;
        bestMask = mask;
        bestSize = fits;
      }
    }
    if (best === -1) {
      count += 1;
      return;
    }
    for (let digit = 1; digit <= size && count < limit; digit += 1) {
      if (bestMask & (1 << digit)) {
        work[best] = digit;
        search();
        work[best] = 0;
      }
    }
  };
  search();
  return count;
}
