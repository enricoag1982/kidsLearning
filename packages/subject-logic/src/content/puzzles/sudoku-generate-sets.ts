// The parameter sets of the generator tests (`docs/subjects/logic/curriculum.md` §3: `sdk-last`, `sdk-place`, `sdk-number`,
// `sdk-six`) and the checks both the fast test (200 seeds per set) and the slow one (1 000) run on every puzzle. Test support only.
import { expect } from 'vitest';
import { seededRandom } from '@learn/platform-core/domain/random';
import {
  SUDOKU_LEVEL,
  humanSolveSudoku,
  parseSudoku,
  type SudokuSize,
  type SudokuTechnique,
} from '../../core/puzzles/sudoku.ts';
import { countSudokuSolutions } from './sudoku-count.ts';
import { generateSudoku, type SudokuSpec } from './sudoku-generate.ts';

export interface GeneratorSet {
  readonly size: SudokuSize;
  readonly technique: SudokuTechnique;
  readonly empties: readonly number[];
  /**
   * What `counts[technique]` must reach. 0 for the naked-single sets: with hidden singles allowed, a 4 × 4 puzzle never needs a
   * naked single (exhaustive: 288 grids × 2^16 clue sets, 0 hits) and a 6 × 6 one from about 20 empties on, so `minCount: 1` fails
   * those sets (M14.6 report).
   */
  readonly minCount: number;
}

export const GENERATOR_SETS: readonly GeneratorSet[] = [
  { size: 4, technique: 'last-cell', empties: [3, 4, 5, 6], minCount: 1 },
  { size: 4, technique: 'hidden-single', empties: [5, 6, 7, 8], minCount: 1 },
  { size: 4, technique: 'naked-single', empties: [7, 8, 9, 10], minCount: 0 },
  { size: 6, technique: 'naked-single', empties: [6, 8, 10, 12, 14, 16], minCount: 0 },
];

export interface SetStats {
  readonly label: string;
  readonly seeds: number;
  readonly ok: number;
  readonly meanTries: number;
  readonly meanMs: number;
  readonly maxMs: number;
}

/** Draws `seeds` puzzles for one parameter set (seed 1..seeds), checks each, and times the generator. */
export function checkSet(set: GeneratorSet, empty: number, seeds: number): SetStats {
  const spec: SudokuSpec = {
    size: set.size,
    empty,
    technique: set.technique,
    minCount: set.minCount,
  };
  const level = SUDOKU_LEVEL[set.technique];
  let ok = 0;
  let tries = 0;
  let totalMs = 0;
  let maxMs = 0;
  for (let seed = 1; seed <= seeds; seed += 1) {
    const started = performance.now();
    const puzzle = generateSudoku(spec, seededRandom(seed));
    const ms = performance.now() - started;
    totalMs += ms;
    maxMs = Math.max(maxMs, ms);
    if (!puzzle) {
      continue;
    }
    ok += 1;
    tries += puzzle.tries;

    const givens = parseSudoku(puzzle.givens);
    const solution = parseSudoku(puzzle.solution);
    expect(givens.size).toBe(set.size);
    expect(givens.grid.filter((value) => value === 0)).toHaveLength(empty);
    // Givens agree with the solution, which is a full grid.
    expect(solution.grid).not.toContain(0);
    givens.grid.forEach((value, cell) => {
      if (value !== 0) {
        expect(value).toBe(solution.grid[cell]);
      }
    });
    expect(countSudokuSolutions(set.size, givens.grid)).toBe(1);
    const solved = humanSolveSudoku(set.size, givens.grid, level);
    expect(solved.solved).toBe(true);
    expect(solved.grid).toEqual(solution.grid);
    expect(solved.counts).toEqual(puzzle.counts);
    expect(puzzle.counts[set.technique]).toBeGreaterThanOrEqual(set.minCount);
    expect(puzzle.tries).toBeGreaterThanOrEqual(1);
    // The same seed gives the same puzzle.
    expect(generateSudoku(spec, seededRandom(seed))).toEqual(puzzle);
  }
  return {
    label: `${String(set.size)}x${String(set.size)} ${set.technique} empty ${String(empty)}`,
    seeds,
    ok,
    meanTries: ok === 0 ? 0 : tries / ok,
    meanMs: totalMs / seeds,
    maxMs,
  };
}
