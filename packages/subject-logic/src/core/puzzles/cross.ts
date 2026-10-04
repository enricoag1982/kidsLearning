// Picture cross (nonogram) on a square grid: clues, a line solver and a human-style solver. Pure TypeScript: the `grid-fill` kind's
// hints use it at runtime (`nextCrossStep` names the technique and the line to look at). The solution counter is build-time code in
// `src/content/puzzles/cross-count.ts`.

/** A cell the player has decided: filled, or crossed out (known empty). Undecided = `undefined`. */
export type CrossCell = 'fill' | 'cross';
/** Row-major, length `size²`. */
export type CrossCells = readonly (CrossCell | undefined)[];
export type CrossTechnique = 'full-line' | 'overlap' | 'cross-out' | 'combine';

/** The level a technique belongs to: a lesson allows the techniques up to its level. */
export const CROSS_LEVEL: Readonly<Record<CrossTechnique, 1 | 2 | 3>> = {
  'full-line': 1,
  overlap: 2,
  'cross-out': 2,
  combine: 3,
};

export interface CrossLine {
  readonly kind: 'row' | 'column';
  readonly index: number;
}

export interface CrossStep {
  readonly technique: CrossTechnique;
  readonly line: CrossLine;
  /** Only the cells this step newly decides (row-major cell indices). */
  readonly cells: readonly { readonly cell: number; readonly value: CrossCell }[];
}

export interface CrossSolveResult {
  readonly solved: boolean;
  readonly cells: CrossCells;
  readonly steps: readonly CrossStep[];
  readonly counts: Readonly<Record<CrossTechnique, number>>;
}

type Clues = readonly (readonly number[])[];

/** Rows of `#` (filled) and `.` (empty); square only. */
export function parsePicture(rows: readonly string[]): {
  readonly size: number;
  readonly solution: readonly boolean[];
} {
  const size = rows.length;
  if (size === 0) {
    throw new Error('picture: no rows');
  }
  const solution: boolean[] = [];
  rows.forEach((row, r) => {
    if (row.length !== size) {
      throw new Error(
        `picture: row ${String(r)} has ${String(row.length)} cells (${String(size)} expected)`,
      );
    }
    for (const char of row) {
      if (char !== '#' && char !== '.') {
        throw new Error(`picture: "${char}" in row ${String(r)} ("#" or ".")`);
      }
      solution.push(char === '#');
    }
  });
  return { size, solution };
}

/** Lengths of the runs of filled cells, in order; `[]` for an empty line. */
export function lineClue(line: readonly boolean[]): readonly number[] {
  const clue: number[] = [];
  let run = 0;
  for (const filled of line) {
    if (filled) {
      run += 1;
    } else if (run > 0) {
      clue.push(run);
      run = 0;
    }
  }
  if (run > 0) {
    clue.push(run);
  }
  return clue;
}

/** Row and column clues of a picture. */
export function pictureClues(
  size: number,
  solution: readonly boolean[],
): { readonly rows: Clues; readonly cols: Clues } {
  if (solution.length !== size * size) {
    throw new Error(`picture: ${String(solution.length)} cells (${String(size * size)} expected)`);
  }
  const rows = Array.from({ length: size }, (_, r) =>
    lineClue(solution.slice(r * size, (r + 1) * size)),
  );
  const cols = Array.from({ length: size }, (_, c) =>
    lineClue(Array.from({ length: size }, (_, r) => solution[r * size + c] === true)),
  );
  return { rows, cols };
}

/**
 * What every placement of `clue` that fits the known cells of `line` agrees on: a cell that is filled in all of them is `fill`, one
 * that is empty in all of them `cross`, any other `undefined`. Known cells stay as they are. `undefined` = no placement fits
 * (contradiction).
 */
export function solveLine(
  clue: readonly number[],
  line: readonly (CrossCell | undefined)[],
): readonly (CrossCell | undefined)[] | undefined {
  const length = line.length;
  const canFill = new Array<boolean>(length).fill(false);
  const canCross = new Array<boolean>(length).fill(false);
  const filled = new Array<boolean>(length).fill(false);
  // `tail[k]` = cells the runs from `k` on need at least (their lengths and the gaps between them).
  const tail = new Array<number>(clue.length + 1).fill(0);
  for (let k = clue.length - 1; k >= 0; k -= 1) {
    tail[k] = (clue[k] ?? 0) + (k < clue.length - 1 ? 1 : 0) + (tail[k + 1] ?? 0);
  }
  const mayFill = (i: number): boolean => line[i] !== 'cross';
  const mayCross = (i: number): boolean => line[i] !== 'fill';
  const found = { any: false };

  const place = (k: number, from: number): void => {
    if (k === clue.length) {
      for (let i = from; i < length; i += 1) {
        if (!mayCross(i)) {
          return;
        }
      }
      for (let i = 0; i < length; i += 1) {
        if (filled[i]) {
          canFill[i] = true;
        } else {
          canCross[i] = true;
        }
      }
      found.any = true;
      return;
    }
    const run = clue[k] ?? 0;
    for (let start = from; start + (tail[k] ?? 0) <= length; start += 1) {
      // Moving the start on crosses cell `start - 1`; a known fill there ends the search.
      if (start > from && !mayCross(start - 1)) {
        return;
      }
      let fits = true;
      for (let i = start; i < start + run && fits; i += 1) {
        fits = mayFill(i);
      }
      if (!fits || (start + run < length && !mayCross(start + run))) {
        continue;
      }
      for (let i = start; i < start + run; i += 1) {
        filled[i] = true;
      }
      place(k + 1, Math.min(start + run + 1, length));
      for (let i = start; i < start + run; i += 1) {
        filled[i] = false;
      }
    }
  };
  place(0, 0);

  if (!found.any) {
    return undefined;
  }
  return line.map((_, i) => {
    if (canFill[i] && canCross[i]) {
      return undefined;
    }
    return canFill[i] ? 'fill' : 'cross';
  });
}

function lineCells(size: number, line: CrossLine): number[] {
  return Array.from({ length: size }, (_, k) =>
    line.kind === 'row' ? line.index * size + k : k * size + line.index,
  );
}

function sum(clue: readonly number[]): number {
  return clue.reduce((total, run) => total + run, 0);
}

// The step one line gives on the current cells, or `undefined` (no new cell, or a contradiction).
function lineStep(
  size: number,
  clue: readonly number[],
  line: CrossLine,
  cells: CrossCells,
): CrossStep | undefined {
  const indices = lineCells(size, line);
  const current = indices.map((cell) => cells[cell]);
  const result = solveLine(clue, current);
  if (!result) {
    return undefined;
  }
  const added: { cell: number; value: CrossCell }[] = [];
  result.forEach((value, k) => {
    const cell = indices[k];
    if (current[k] === undefined && value !== undefined && cell !== undefined) {
      added.push({ cell, value });
    }
  });
  if (added.length === 0) {
    return undefined;
  }
  const known = current.filter((value) => value !== undefined).length;
  let technique: CrossTechnique;
  if (known === 0) {
    technique = result.every((value) => value !== undefined) ? 'full-line' : 'overlap';
  } else {
    const knownFills = current.filter((value) => value === 'fill').length;
    technique =
      knownFills === sum(clue) && added.every((entry) => entry.value === 'cross')
        ? 'cross-out'
        : 'combine';
  }
  return { technique, line, cells: added };
}

function checkClues(size: number, rows: Clues, cols: Clues, cells?: CrossCells): void {
  if (rows.length !== size || cols.length !== size || (cells && cells.length !== size * size)) {
    throw new Error(
      `picture cross: clues and cells must fit a ${String(size)} × ${String(size)} grid`,
    );
  }
}

/**
 * The next step up to `maxLevel`: lowest level first; at a level, rows 0.. then columns 0.. A step is one line whose `solveLine`
 * result decides at least one more cell. `undefined` = none (solved or stuck).
 */
export function nextCrossStep(
  size: number,
  rows: Clues,
  cols: Clues,
  cells: CrossCells,
  maxLevel: 1 | 2 | 3,
): CrossStep | undefined {
  checkClues(size, rows, cols, cells);
  const steps: CrossStep[] = [];
  for (const [kind, clues] of [
    ['row', rows],
    ['column', cols],
  ] as const) {
    clues.forEach((clue, index) => {
      const step = lineStep(size, clue, { kind, index }, cells);
      if (step && CROSS_LEVEL[step.technique] <= maxLevel) {
        steps.push(step);
      }
    });
  }
  for (const level of [1, 2, 3] as const) {
    const step = steps.find((candidate) => CROSS_LEVEL[candidate.technique] === level);
    if (step) {
      return step;
    }
  }
  return undefined;
}

function matchesClues(size: number, rows: Clues, cols: Clues, cells: CrossCells): boolean {
  return (
    cells.every((value) => value !== undefined) &&
    [
      ...rows.map((clue, index) => ['row', clue, index] as const),
      ...cols.map((clue, index) => ['column', clue, index] as const),
    ].every(([kind, clue, index]) => {
      const line = lineCells(size, { kind, index }).map((cell) => cells[cell] === 'fill');
      const actual = lineClue(line);
      return actual.length === clue.length && actual.every((run, k) => run === clue[k]);
    })
  );
}

/** Applies {@link nextCrossStep} from an empty grid until solved or stuck: `counts` say what the picture needs. */
export function humanSolveCross(
  size: number,
  rows: Clues,
  cols: Clues,
  maxLevel: 1 | 2 | 3,
): CrossSolveResult {
  checkClues(size, rows, cols);
  const cells: (CrossCell | undefined)[] = new Array<CrossCell | undefined>(size * size).fill(
    undefined,
  );
  const steps: CrossStep[] = [];
  const counts: Record<CrossTechnique, number> = {
    'full-line': 0,
    overlap: 0,
    'cross-out': 0,
    combine: 0,
  };
  for (;;) {
    const step = nextCrossStep(size, rows, cols, cells, maxLevel);
    if (!step) {
      break;
    }
    for (const { cell, value } of step.cells) {
      cells[cell] = value;
    }
    steps.push(step);
    counts[step.technique] += 1;
  }
  return { solved: matchesClues(size, rows, cols, cells), cells, steps, counts };
}
