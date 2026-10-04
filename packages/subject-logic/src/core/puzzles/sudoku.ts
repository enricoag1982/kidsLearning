// Sudoku model and a human-style solver for 4 × 4 (boxes 2 × 2) and 6 × 6 (boxes 2 rows × 3 columns) grids. Pure TypeScript:
// the `grid-fill` kind's hints use it at runtime (`nextSudokuStep` names the technique and the unit to look at). The solution
// counter and the generator are build-time code in `src/content/puzzles/`.

export type SudokuSize = 4 | 6;
/** Row-major, length `size²`; 0 = empty, 1..size = a digit. */
export type SudokuGrid = readonly number[];
export type UnitKind = 'row' | 'column' | 'box';
/** A row, a column or a box; boxes are numbered row-major. */
export interface Unit {
  readonly kind: UnitKind;
  readonly index: number;
}
export type SudokuTechnique = 'last-cell' | 'hidden-single' | 'naked-single';

/** The order techniques are tried in: cheapest to spot first. */
export const SUDOKU_ORDER: readonly SudokuTechnique[] = [
  'last-cell',
  'hidden-single',
  'naked-single',
];

/**
 * The techniques a lesson allows, by what it teaches (its focus). Sets, not levels: strictly lowest-first, a 4 × 4 puzzle never needs
 * `naked-single` once `hidden-single` is allowed, so the "Only number" lessons leave `hidden-single` out.
 */
export const LESSON_TECHNIQUES = {
  'last-cell': ['last-cell'],
  'hidden-single': ['last-cell', 'hidden-single'],
  'naked-single': ['last-cell', 'naked-single'],
  all: ['last-cell', 'hidden-single', 'naked-single'],
} as const satisfies Record<string, readonly SudokuTechnique[]>;
export type SudokuFocus = keyof typeof LESSON_TECHNIQUES;

export interface SudokuStep {
  readonly technique: SudokuTechnique;
  readonly cell: number;
  readonly value: number;
  /** The units that show the step: the one unit for `last-cell` and `hidden-single`, the cell's row, column and box for `naked-single`. */
  readonly units: readonly Unit[];
}

export interface SudokuSolveResult {
  readonly solved: boolean;
  readonly grid: SudokuGrid;
  readonly steps: readonly SudokuStep[];
  readonly counts: Readonly<Record<SudokuTechnique, number>>;
}

/** Box size (cells per box row × box column) of a grid size. */
export function boxShape(size: SudokuSize): { readonly rows: number; readonly cols: number } {
  return size === 4 ? { rows: 2, cols: 2 } : { rows: 2, cols: 3 };
}

function isSize(value: number): value is SudokuSize {
  return value === 4 || value === 6;
}

/** Rows of `.` (empty) and the digits `1`..size, e.g. `["12.4", ...]`; throws on a size other than 4 / 6, a ragged row or a bad character. */
export function parseSudoku(rows: readonly string[]): {
  readonly size: SudokuSize;
  readonly grid: SudokuGrid;
} {
  const size = rows.length;
  if (!isSize(size)) {
    throw new Error(`sudoku: ${String(size)} rows (4 or 6 expected)`);
  }
  const grid: number[] = [];
  rows.forEach((row, r) => {
    if (row.length !== size) {
      throw new Error(
        `sudoku: row ${String(r)} has ${String(row.length)} cells (${String(size)} expected)`,
      );
    }
    for (const char of row) {
      if (char === '.') {
        grid.push(0);
        continue;
      }
      const digit = Number(char);
      if (!Number.isInteger(digit) || digit < 1 || digit > size) {
        throw new Error(
          `sudoku: "${char}" in row ${String(r)} (".", or a digit 1 to ${String(size)})`,
        );
      }
      grid.push(digit);
    }
  });
  return { size, grid };
}

/** The inverse of {@link parseSudoku}. */
export function formatSudoku(size: SudokuSize, grid: SudokuGrid): readonly string[] {
  checkGrid(size, grid);
  return Array.from({ length: size }, (_, r) =>
    grid
      .slice(r * size, (r + 1) * size)
      .map((value) => (value === 0 ? '.' : String(value)))
      .join(''),
  );
}

// Units of a size, in scan order: rows 0.., columns 0.., boxes 0.. (index = kind offset + unit index).
interface Layout {
  readonly size: SudokuSize;
  readonly units: readonly Unit[];
  readonly cells: readonly (readonly number[])[];
  /** Per cell: the indices (into `units`) of its row, column and box. */
  readonly cellUnits: readonly (readonly [number, number, number])[];
}

const LAYOUTS = new Map<SudokuSize, Layout>();

function layoutOf(size: SudokuSize): Layout {
  const cached = LAYOUTS.get(size);
  if (cached) {
    return cached;
  }
  const { rows: boxRows, cols: boxCols } = boxShape(size);
  const boxesAcross = size / boxCols;
  const units: Unit[] = [];
  const cells: number[][] = [];
  for (let index = 0; index < size; index += 1) {
    units.push({ kind: 'row', index });
    cells.push(Array.from({ length: size }, (_, c) => index * size + c));
  }
  for (let index = 0; index < size; index += 1) {
    units.push({ kind: 'column', index });
    cells.push(Array.from({ length: size }, (_, r) => r * size + index));
  }
  for (let index = 0; index < size; index += 1) {
    units.push({ kind: 'box', index });
    const top = Math.floor(index / boxesAcross) * boxRows;
    const left = (index % boxesAcross) * boxCols;
    cells.push(
      Array.from(
        { length: size },
        (_, k) => (top + Math.floor(k / boxCols)) * size + left + (k % boxCols),
      ),
    );
  }
  const cellUnits = Array.from({ length: size * size }, (_, cell): [number, number, number] => {
    const r = Math.floor(cell / size);
    const c = cell % size;
    const box = Math.floor(r / boxRows) * boxesAcross + Math.floor(c / boxCols);
    return [r, size + c, 2 * size + box];
  });
  const layout: Layout = { size, units, cells, cellUnits };
  LAYOUTS.set(size, layout);
  return layout;
}

function checkGrid(size: SudokuSize, grid: SudokuGrid): void {
  if (grid.length !== size * size) {
    throw new Error(`sudoku: ${String(grid.length)} cells (${String(size * size)} expected)`);
  }
}

/** The cells of a unit, ascending. */
export function unitCells(size: SudokuSize, unit: Unit): readonly number[] {
  const layout = layoutOf(size);
  const offset = unit.kind === 'row' ? 0 : unit.kind === 'column' ? size : 2 * size;
  return layout.cells[offset + unit.index] ?? [];
}

/** The row, the column and the box of a cell. */
export function unitsOf(size: SudokuSize, cell: number): readonly [Unit, Unit, Unit] {
  const layout = layoutOf(size);
  const indices = layout.cellUnits[cell];
  const row = indices ? layout.units[indices[0]] : undefined;
  const column = indices ? layout.units[indices[1]] : undefined;
  const box = indices ? layout.units[indices[2]] : undefined;
  if (!row || !column || !box) {
    throw new Error(
      `sudoku: cell ${String(cell)} is outside the ${String(size)} × ${String(size)} grid`,
    );
  }
  return [row, column, box];
}

/** Bit `d` set = digit `d` stands in a unit of the cell (bit 0 collects empty cells, never read). */
function usedMask(layout: Layout, grid: SudokuGrid, cell: number): number {
  let used = 0;
  for (const unit of layout.cellUnits[cell] ?? []) {
    for (const peer of layout.cells[unit] ?? []) {
      used |= 1 << (grid[peer] ?? 0);
    }
  }
  return used;
}

/** The digits that fit an empty cell (none in its row, column or box); `[]` for a filled cell. */
export function candidates(size: SudokuSize, grid: SudokuGrid, cell: number): readonly number[] {
  checkGrid(size, grid);
  if (grid[cell] !== 0) {
    return [];
  }
  const used = usedMask(layoutOf(size), grid, cell);
  return digitsOf(size, ~used);
}

function digitsOf(size: number, mask: number): number[] {
  const digits: number[] = [];
  for (let digit = 1; digit <= size; digit += 1) {
    if (mask & (1 << digit)) {
      digits.push(digit);
    }
  }
  return digits;
}

/** The first of the cell's row, column and box (in that order) that already holds `value` in another cell. */
export function conflictUnit(
  size: SudokuSize,
  grid: SudokuGrid,
  cell: number,
  value: number,
): Unit | undefined {
  checkGrid(size, grid);
  const layout = layoutOf(size);
  for (const unit of layout.cellUnits[cell] ?? []) {
    for (const peer of layout.cells[unit] ?? []) {
      if (peer !== cell && grid[peer] === value) {
        return layout.units[unit];
      }
    }
  }
  return undefined;
}

type Finder = (layout: Layout, grid: SudokuGrid) => SudokuStep | undefined;

// A unit with exactly one empty cell: the unit's missing digit goes there.
const findLastCell: Finder = (layout, grid) => {
  for (const [index, unit] of layout.units.entries()) {
    const cells = layout.cells[index] ?? [];
    let empty = -1;
    let emptyCount = 0;
    let present = 0;
    for (const cell of cells) {
      const value = grid[cell] ?? 0;
      if (value === 0) {
        empty = cell;
        emptyCount += 1;
      } else {
        present |= 1 << value;
      }
    }
    if (emptyCount !== 1) {
      continue;
    }
    const missing = digitsOf(layout.size, ~present);
    const [digit] = missing;
    if (missing.length === 1 && digit !== undefined) {
      return { technique: 'last-cell', cell: empty, value: digit, units: [unit] };
    }
  }
  return undefined;
};

// A digit missing from a unit that fits in exactly one of the unit's empty cells.
const findHiddenSingle: Finder = (layout, grid) => {
  const masks = grid.map((value, cell) => (value === 0 ? usedMask(layout, grid, cell) : 0));
  for (const [index, unit] of layout.units.entries()) {
    const cells = layout.cells[index] ?? [];
    let present = 0;
    for (const cell of cells) {
      present |= 1 << (grid[cell] ?? 0);
    }
    for (let digit = 1; digit <= layout.size; digit += 1) {
      if (present & (1 << digit)) {
        continue;
      }
      let place = -1;
      let places = 0;
      for (const cell of cells) {
        if (grid[cell] === 0 && !((masks[cell] ?? 0) & (1 << digit))) {
          place = cell;
          places += 1;
        }
      }
      if (places === 1) {
        return { technique: 'hidden-single', cell: place, value: digit, units: [unit] };
      }
    }
  }
  return undefined;
};

// An empty cell where all digits but one appear in its row, column or box.
const findNakedSingle: Finder = (layout, grid) => {
  for (const [cell, value] of grid.entries()) {
    if (value !== 0) {
      continue;
    }
    const fits = digitsOf(layout.size, ~usedMask(layout, grid, cell));
    const [digit] = fits;
    if (fits.length === 1 && digit !== undefined) {
      return { technique: 'naked-single', cell, value: digit, units: unitsOf(layout.size, cell) };
    }
  }
  return undefined;
};

const FINDERS: Readonly<Record<SudokuTechnique, Finder>> = {
  'last-cell': findLastCell,
  'hidden-single': findHiddenSingle,
  'naked-single': findNakedSingle,
};

/**
 * The next deducible step with one of the `allowed` techniques: `prefer` first (when allowed), then the allowed ones in
 * {@link SUDOKU_ORDER}; within a technique the scan is fixed (units: rows, columns, boxes, digits ascending; cells ascending).
 * `undefined` = none (solved or stuck).
 */
export function nextSudokuStep(
  size: SudokuSize,
  grid: SudokuGrid,
  allowed: readonly SudokuTechnique[],
  prefer?: SudokuTechnique,
): SudokuStep | undefined {
  checkGrid(size, grid);
  const layout = layoutOf(size);
  const order = SUDOKU_ORDER.filter((technique) => allowed.includes(technique));
  if (prefer !== undefined && allowed.includes(prefer)) {
    order.unshift(prefer);
  }
  for (const technique of order) {
    const step = FINDERS[technique](layout, grid);
    if (step) {
      return step;
    }
  }
  return undefined;
}

function isSolved(layout: Layout, grid: SudokuGrid): boolean {
  const all = ((1 << layout.size) - 1) << 1;
  return layout.cells.every((cells) => {
    let present = 0;
    for (const cell of cells) {
      present |= 1 << (grid[cell] ?? 0);
    }
    return present === all;
  });
}

/** Applies {@link nextSudokuStep} (cheapest allowed technique first, no preference) until solved or stuck: `counts` say what the puzzle needs. */
export function humanSolveSudoku(
  size: SudokuSize,
  grid: SudokuGrid,
  allowed: readonly SudokuTechnique[],
): SudokuSolveResult {
  checkGrid(size, grid);
  const current = [...grid];
  const steps: SudokuStep[] = [];
  const counts: Record<SudokuTechnique, number> = {
    'last-cell': 0,
    'hidden-single': 0,
    'naked-single': 0,
  };
  for (;;) {
    const step = nextSudokuStep(size, current, allowed);
    if (!step) {
      break;
    }
    current[step.cell] = step.value;
    steps.push(step);
    counts[step.technique] += 1;
  }
  return { solved: isSolved(layoutOf(size), current), grid: current, steps, counts };
}
