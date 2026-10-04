// Build-time solution counter for the picture-cross puzzles (content checks: "exactly one solution"). Not part of the app bundle.

type Clues = readonly (readonly number[])[];

// Every row of `size` cells (filled = true) with the given runs.
function rowsFor(size: number, clue: readonly number[]): boolean[][] {
  const found: boolean[][] = [];
  const row = new Array<boolean>(size).fill(false);
  const place = (k: number, from: number): void => {
    const run = clue[k];
    if (run === undefined) {
      found.push([...row]);
      return;
    }
    const tail = clue.slice(k + 1).reduce((total, other) => total + other + 1, 0);
    for (let start = from; start + run + tail <= size; start += 1) {
      for (let i = start; i < start + run; i += 1) {
        row[i] = true;
      }
      place(k + 1, start + run + 1);
      for (let i = start; i < start + run; i += 1) {
        row[i] = false;
      }
    }
  };
  place(0, 0);
  return found;
}

interface ColumnState {
  /** Runs completed above. */
  readonly runs: number;
  /** Length of the run that ends in the last row placed (0 = the last cell is empty). */
  readonly open: number;
}

/**
 * The number of pictures that fit the clues, counted row by row over each row's placements and pruned by the column prefixes (a
 * column's finished runs must be the start of its clue, and its remaining clue must still fit in the rows left); stops once `limit`
 * is reached (so `2` answers "unique?").
 */
export function countCrossSolutions(size: number, rows: Clues, cols: Clues, limit = 2): number {
  if (rows.length !== size || cols.length !== size) {
    throw new Error(`picture cross: clues must fit a ${String(size)} × ${String(size)} grid`);
  }
  const placements = rows.map((clue) => rowsFor(size, clue));

  // The state of a column after one more row, or `undefined` when its clue can no longer be met in the `left` rows below.
  const advance = (
    clue: readonly number[],
    state: ColumnState,
    filled: boolean,
    left: number,
  ): ColumnState | undefined => {
    let { runs, open } = state;
    if (filled) {
      open += 1;
      if (open > (clue[runs] ?? 0)) {
        return undefined;
      }
    } else if (open > 0) {
      if (open !== clue[runs]) {
        return undefined;
      }
      runs += 1;
      open = 0;
    }
    const todo = clue.slice(runs);
    const need =
      todo.length === 0 ? 0 : todo.reduce((total, run) => total + run, 0) - open + todo.length - 1;
    return need <= left ? { runs, open } : undefined;
  };

  let count = 0;
  const search = (r: number, states: readonly ColumnState[]): void => {
    if (r === size) {
      count += 1;
      return;
    }
    for (const row of placements[r] ?? []) {
      if (count >= limit) {
        return;
      }
      const next: ColumnState[] = [];
      for (const [c, filled] of row.entries()) {
        const state = states[c];
        const after =
          state === undefined ? undefined : advance(cols[c] ?? [], state, filled, size - r - 1);
        if (!after) {
          break;
        }
        next.push(after);
      }
      if (next.length === size) {
        search(r + 1, next);
      }
    }
  };
  search(
    0,
    cols.map(() => ({ runs: 0, open: 0 })),
  );
  return count;
}
