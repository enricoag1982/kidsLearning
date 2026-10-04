// Build-time sudoku generator for the `generate:` templates: a random full grid, then clues removed in a random order while the
// puzzle stays unique and solvable with the lesson's allowed techniques. Deterministic for a seed. Not part of the app bundle.
import { shuffle, type Random } from '@learn/platform-core/domain/random';
import {
  LESSON_TECHNIQUES,
  candidates,
  formatSudoku,
  humanSolveSudoku,
  type SudokuFocus,
  type SudokuGrid,
  type SudokuSize,
  type SudokuTechnique,
} from '../../core/puzzles/sudoku.ts';
import { countSudokuSolutions } from './sudoku-count.ts';

export interface SudokuSpec {
  readonly size: SudokuSize;
  /** Empty cells of the puzzle (exactly). */
  readonly empty: number;
  /** The puzzle is solvable with `LESSON_TECHNIQUES[focus]`. */
  readonly focus: SudokuFocus;
  /** The puzzle needs this technique at least `minCount` times (strictly cheapest-first, so `counts` say what it needs). */
  readonly require?: SudokuTechnique;
  /** Default 1 when `require` is set. */
  readonly minCount?: number;
}

export interface GeneratedSudoku {
  readonly givens: readonly string[];
  readonly solution: readonly string[];
  /** What the puzzle needs (cheapest allowed technique first). */
  readonly counts: Readonly<Record<SudokuTechnique, number>>;
  /** The tries it took (1 = the first). */
  readonly tries: number;
}

// A random full grid: cells in order, digits in a shuffled order, backtracking on a dead end.
function randomSolution(size: SudokuSize, random: Random): SudokuGrid {
  const grid = new Array<number>(size * size).fill(0);
  const fill = (cell: number): boolean => {
    if (cell === grid.length) {
      return true;
    }
    for (const digit of shuffle(candidates(size, grid, cell), random)) {
      grid[cell] = digit;
      if (fill(cell + 1)) {
        return true;
      }
    }
    grid[cell] = 0;
    return false;
  };
  fill(0);
  return grid;
}

/** A puzzle for the spec, or `undefined` when no try within `maxTries` ends with exactly `spec.empty` empty cells (and `require` when set). */
export function generateSudoku(
  spec: SudokuSpec,
  random: Random,
  maxTries = 200,
): GeneratedSudoku | undefined {
  const { size, empty, require } = spec;
  const minCount = spec.minCount ?? 1;
  const allowed = LESSON_TECHNIQUES[spec.focus];
  const cellCount = size * size;
  if (!Number.isInteger(empty) || empty < 0 || empty > cellCount) {
    throw new RangeError(
      `sudoku: ${String(empty)} empty cells in a ${String(cellCount)}-cell grid`,
    );
  }
  for (let tries = 1; tries <= maxTries; tries += 1) {
    const solution = randomSolution(size, random);
    const puzzle = [...solution];
    let empties = 0;
    for (const cell of shuffle(
      Array.from({ length: cellCount }, (_, index) => index),
      random,
    )) {
      if (empties === empty) {
        break;
      }
      puzzle[cell] = 0;
      if (
        countSudokuSolutions(size, puzzle) === 1 &&
        humanSolveSudoku(size, puzzle, allowed).solved
      ) {
        empties += 1;
      } else {
        puzzle[cell] = solution[cell] ?? 0;
      }
    }
    if (empties !== empty) {
      continue;
    }
    const { counts } = humanSolveSudoku(size, puzzle, allowed);
    if (require === undefined || counts[require] >= minCount) {
      return {
        givens: formatSudoku(size, puzzle),
        solution: formatSudoku(size, solution),
        counts,
        tries,
      };
    }
  }
  return undefined;
}
