// Build-time sudoku generator for the `generate:` templates: a random full grid, then clues removed in a random order while the
// puzzle stays unique and solvable with the lesson's technique level. Deterministic for a seed. Not part of the app bundle.
import { shuffle, type Random } from '@learn/platform-core/domain/random';
import {
  SUDOKU_LEVEL,
  candidates,
  formatSudoku,
  humanSolveSudoku,
  type SudokuGrid,
  type SudokuSize,
  type SudokuTechnique,
} from '../../core/puzzles/sudoku.ts';
import { countSudokuSolutions } from './sudoku-count.ts';

export interface SudokuSpec {
  readonly size: SudokuSize;
  /** Empty cells of the puzzle (exactly). */
  readonly empty: number;
  /** The puzzle is solvable with the techniques up to this one's level, and needs this one at least `minCount` times. */
  readonly technique: SudokuTechnique;
  /** Default 1. */
  readonly minCount?: number;
}

export interface GeneratedSudoku {
  readonly givens: readonly string[];
  readonly solution: readonly string[];
  /** What the puzzle needs (lowest technique first). */
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

/** A puzzle for the spec, or `undefined` when no try within `maxTries` ends with exactly `spec.empty` empty cells and the technique. */
export function generateSudoku(
  spec: SudokuSpec,
  random: Random,
  maxTries = 200,
): GeneratedSudoku | undefined {
  const { size, empty, technique } = spec;
  const minCount = spec.minCount ?? 1;
  const level = SUDOKU_LEVEL[technique];
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
        humanSolveSudoku(size, puzzle, level).solved
      ) {
        empties += 1;
      } else {
        puzzle[cell] = solution[cell] ?? 0;
      }
    }
    if (empties !== empty) {
      continue;
    }
    const { counts } = humanSolveSudoku(size, puzzle, level);
    if (counts[technique] >= minCount) {
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
