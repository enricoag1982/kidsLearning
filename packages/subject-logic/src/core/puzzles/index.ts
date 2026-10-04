// The runtime puzzle API (hints in `grid-fill`). Build-time counters and generators live in `src/content/puzzles/`.
export type {
  SudokuGrid,
  SudokuSize,
  SudokuSolveResult,
  SudokuStep,
  SudokuTechnique,
  Unit,
  UnitKind,
} from './sudoku.ts';
export {
  SUDOKU_LEVEL,
  boxShape,
  candidates,
  conflictUnit,
  formatSudoku,
  humanSolveSudoku,
  nextSudokuStep,
  parseSudoku,
  unitCells,
  unitsOf,
} from './sudoku.ts';
