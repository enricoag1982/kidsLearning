// The runtime puzzle API (hints in `grid-fill`). Build-time counters and generators live in `src/content/puzzles/`.
export type {
  SudokuFocus,
  SudokuGrid,
  SudokuSize,
  SudokuSolveResult,
  SudokuStep,
  SudokuTechnique,
  Unit,
  UnitKind,
} from './sudoku.ts';
export {
  LESSON_TECHNIQUES,
  SUDOKU_ORDER,
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
export type {
  CrossCell,
  CrossCells,
  CrossLine,
  CrossSolveResult,
  CrossStep,
  CrossTechnique,
} from './cross.ts';
export {
  CROSS_LEVEL,
  humanSolveCross,
  lineClue,
  nextCrossStep,
  parsePicture,
  pictureClues,
  solveLine,
} from './cross.ts';
