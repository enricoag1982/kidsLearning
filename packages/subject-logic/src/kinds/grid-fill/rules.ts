// The rules of the `grid-fill` puzzles, one entry per `puzzle.rules` (the kind itself never branches on the puzzle): what a right entry
// is, which unit shows why an entry is wrong, when the exercise is solved, and the next step a hint points at. Pure TypeScript over
// the solvers in `core/puzzles/`.
import {
  LESSON_TECHNIQUES,
  conflictUnit,
  nextCrossStep,
  nextSudokuStep,
  solveLine,
  type CrossCell,
  type CrossLine,
  type CrossTechnique,
  type SudokuGrid,
  type SudokuTechnique,
} from '../../core/puzzles/index.ts';
import type {
  CellValue,
  CrossPuzzle,
  GridFillState,
  GridPuzzle,
  GridUnit,
  SudokuPuzzle,
} from './def.ts';

type Cells = GridFillState['cells'];

/** What a hint points at: the technique, the units to look at, and the entry that follows from them. */
export interface GridStep {
  readonly technique: SudokuTechnique | CrossTechnique;
  readonly units: readonly GridUnit[];
  readonly cell: number;
  readonly value: CellValue;
}

/** One puzzle type's rules. Method syntax is deliberate: bivariant parameters let a precise `GridRules<SudokuPuzzle>` widen to
 * `GridRules<GridPuzzle>` (`rulesOf`) with no cast. */
export interface GridRules<P extends GridPuzzle> {
  /** Whether a hint names the step's cell (sudoku) or only its units (a picture: the line is the unit). */
  readonly pointsAtCell: boolean;
  /** The cells a fresh exercise starts with (the givens). */
  initial(p: P): Cells;
  /** The cells the child fills when the def names none: every empty sudoku cell, every filled picture cell. */
  targets(p: P): readonly number[];
  /** Whether `value` is a value the puzzle has a use for (a digit 1..size; `fill` / `cross`): anything else is ignored, never an error. */
  accepts(p: P, value: CellValue): boolean;
  /** Cross: `cross` is right on an empty picture cell, `fill` on a filled one. */
  isRight(p: P, cell: number, value: CellValue): boolean;
  /** Sudoku: the first row, column or box that already holds the number. Cross: the row, else the column, whose clue has no placement
   * left with this value in the cell. `undefined` = nothing shows the error (a right-looking number in the wrong place). */
  conflict(p: P, cells: Cells, cell: number, value: CellValue): GridUnit | undefined;
  isSolved(p: P, cells: Cells, targets: readonly number[]): boolean;
  /** Sudoku: `nextSudokuStep` over the lesson's techniques, the focus technique first. Cross: `nextCrossStep` up to the picture's
   * level, its first new filled cell (else its first new cross). `undefined` = no step left. */
  nextStep(p: P, cells: Cells): GridStep | undefined;
}

function sudokuGrid(cells: Cells): SudokuGrid {
  return cells.map((value) => (typeof value === 'number' ? value : 0));
}

function crossCells(cells: Cells): readonly (CrossCell | undefined)[] {
  return cells.map((value) => (value === 'fill' || value === 'cross' ? value : undefined));
}

const sudokuRules: GridRules<SudokuPuzzle> = {
  pointsAtCell: true,

  initial: (p) => p.givens.map((value) => (value === 0 ? undefined : value)),

  targets: (p) => p.givens.flatMap((value, cell) => (value === 0 ? [cell] : [])),

  accepts: (p, value) =>
    typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= p.size,

  isRight: (p, cell, value) => typeof value === 'number' && p.solution[cell] === value,

  conflict: (p, cells, cell, value) =>
    typeof value === 'number' ? conflictUnit(p.size, sudokuGrid(cells), cell, value) : undefined,

  isSolved: (p, cells, targets) => targets.every((cell) => cells[cell] === p.solution[cell]),

  nextStep(p, cells) {
    const grid = sudokuGrid(cells);
    const step = nextSudokuStep(
      p.size,
      grid,
      LESSON_TECHNIQUES[p.focus],
      p.focus === 'all' ? undefined : p.focus,
    );
    if (!step) {
      return undefined;
    }
    return {
      technique: step.technique,
      units: step.units,
      cell: step.cell,
      value: step.value,
    };
  },
};

/** The cells of a picture line, row-major indices. */
export function lineCells(size: number, line: CrossLine): readonly number[] {
  return Array.from({ length: size }, (_, k) =>
    line.kind === 'row' ? line.index * size + k : k * size + line.index,
  );
}

const crossRules: GridRules<CrossPuzzle> = {
  pointsAtCell: false,

  initial: (p) => new Array<CellValue | undefined>(p.size * p.size).fill(undefined),

  targets: (p) => p.solution.flatMap((filled, cell) => (filled ? [cell] : [])),

  accepts: (_p, value) => value === 'fill' || value === 'cross',

  isRight: (p, cell, value) => {
    if (value === 'fill') {
      return p.solution[cell] === true;
    }
    return value === 'cross' && p.solution[cell] === false;
  },

  conflict(p, cells, cell, value) {
    if (value !== 'fill' && value !== 'cross') {
      return undefined;
    }
    const known = crossCells(cells);
    const lines: readonly CrossLine[] = [
      { kind: 'row', index: Math.floor(cell / p.size) },
      { kind: 'column', index: cell % p.size },
    ];
    return lines.find((line) => {
      const clue = (line.kind === 'row' ? p.rows : p.cols)[line.index] ?? [];
      const current = lineCells(p.size, line).map((at) => (at === cell ? value : known[at]));
      return solveLine(clue, current) === undefined;
    });
  },

  isSolved: (_p, cells, targets) => targets.every((cell) => cells[cell] === 'fill'),

  nextStep(p, cells) {
    const known = crossCells(cells);
    // Entries the child made on their own can turn a line's next deduction into a higher technique than the lesson allows
    // (a half-filled full line becomes a `combine`): then the hint still names that step instead of running dry.
    const step =
      nextCrossStep(p.size, p.rows, p.cols, known, p.maxLevel) ??
      (p.maxLevel < 3 ? nextCrossStep(p.size, p.rows, p.cols, known, 3) : undefined);
    if (!step) {
      return undefined;
    }
    const entry = step.cells.find((candidate) => candidate.value === 'fill') ?? step.cells[0];
    if (!entry) {
      return undefined;
    }
    return {
      technique: step.technique,
      units: [step.line],
      cell: entry.cell,
      value: entry.value,
    };
  },
};

/** The rules by `puzzle.rules`. */
export const GRID_RULES: {
  readonly sudoku: GridRules<SudokuPuzzle>;
  readonly 'picture-cross': GridRules<CrossPuzzle>;
} = { sudoku: sudokuRules, 'picture-cross': crossRules };

/** The rules of a puzzle, widened to any puzzle (the one lookup the kind makes). */
export function rulesOf(puzzle: GridPuzzle): GridRules<GridPuzzle> {
  return GRID_RULES[puzzle.rules];
}

/** The cells the child must fill: the def's `targets`, else the rules' default. */
export function targetsOf(def: {
  readonly puzzle: GridPuzzle;
  readonly targets?: readonly number[];
}): readonly number[] {
  return def.targets ?? rulesOf(def.puzzle).targets(def.puzzle);
}

/** The cell count of a puzzle's grid. */
export function cellCount(puzzle: GridPuzzle): number {
  return puzzle.size * puzzle.size;
}
