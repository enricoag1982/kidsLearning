// Hand-built `grid-fill` defs for tests and the dev playground (World 3, m14.11, ships its own generated and drawn ones).
// They cover what the kind and its UI must handle: a 4 x 4 sudoku per focus (last cell, only place, only number, all), a 6 x 6, and two
// pictures (full lines only; one that needs `combine`). Built through the same parsers as content; the tests check that each has
// exactly one solution and that the solver finishes it with its focus's techniques. The instruction is the kind's default text.
// Never imported by app code (the playground is a dev-only chunk).
import {
  parsePicture,
  parseSudoku,
  pictureClues,
  type SudokuFocus,
} from '../../core/puzzles/index.ts';
import type { GridFillDef } from './def.ts';

const SUDOKU_TEXT = 'common:grid.instruction.sudoku';
const CROSS_TEXT = 'common:grid.instruction.cross';

function sudoku(
  id: string,
  givens: readonly string[],
  solved: readonly string[],
  focus: SudokuFocus,
): GridFillDef {
  const start = parseSudoku(givens);
  return {
    id,
    concept: 'grid-fill',
    textKey: SUDOKU_TEXT,
    type: 'grid-fill',
    puzzle: {
      rules: 'sudoku',
      size: start.size,
      givens: start.grid,
      solution: parseSudoku(solved).grid,
      focus,
    },
  };
}

function picture(
  id: string,
  rows: readonly string[],
  maxLevel: 1 | 2 | 3,
  reveal: string,
): GridFillDef {
  const { size, solution } = parsePicture(rows);
  const clues = pictureClues(size, solution);
  return {
    id,
    concept: 'grid-fill',
    textKey: CROSS_TEXT,
    type: 'grid-fill',
    puzzle: {
      rules: 'picture-cross',
      size,
      rows: clues.rows,
      cols: clues.cols,
      solution,
      maxLevel,
      reveal,
    },
  };
}

/** 4 x 4, 5 empty cells: every step is a unit with one empty cell. */
const lastCell = sudoku(
  'fx-grid-last',
  ['3412', '12.3', '.32.', '2..4'],
  ['3412', '1243', '4321', '2134'],
  'last-cell',
);

/** 4 x 4, 6 empty cells: one step is an only place. */
const hiddenSingle = sudoku(
  'fx-grid-place',
  ['.231', '3124', '24..', '.3..'],
  ['4231', '3124', '2413', '1342'],
  'hidden-single',
);

/** 4 x 4, 8 empty cells: one step is an only number. */
const nakedSingle = sudoku(
  'fx-grid-number',
  ['...4', '241.', '1.42', '...1'],
  ['3124', '2413', '1342', '4231'],
  'naked-single',
);

/** 4 x 4, 7 empty cells, every technique allowed. */
const all = sudoku(
  'fx-grid-all',
  ['13.4', '423.', '3.4.', '..1.'],
  ['1324', '4231', '3142', '2413'],
  'all',
);

/** 6 x 6 (boxes 2 rows x 3 columns), 12 empty cells. */
const six = sudoku(
  'fx-grid-six',
  ['246.13', '351...', '1.5624', '6...35', '4..3.1', '5.3462'],
  ['246513', '351246', '135624', '624135', '462351', '513462'],
  'naked-single',
);

/** 5 x 5, every row is a full line: level 1 solves it. */
const castle = picture('fx-grid-castle', ['#.#.#', '#####', '##.##', '#####', '#.#.#'], 1, '🏰');

/** 5 x 5, needs full lines, overlap, cross-out and `combine`. */
const cat = picture('fx-grid-cat', ['.#.#.', '#####', '#####', '.###.', '..#..'], 3, '🐱');

export const GRID_FILL_SAMPLES = {
  lastCell,
  hiddenSingle,
  nakedSingle,
  all,
  six,
  castle,
  cat,
} as const satisfies Readonly<Record<string, GridFillDef>>;
