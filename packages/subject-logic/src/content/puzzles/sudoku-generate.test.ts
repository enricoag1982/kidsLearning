import { describe, expect, it } from 'vitest';
import { seededRandom } from '@learn/platform-core/domain/random';
import { humanSolveSudoku, parseSudoku } from '../../core/puzzles/sudoku.ts';
import { countSudokuSolutions } from './sudoku-count.ts';
import { generateSudoku } from './sudoku-generate.ts';
import { GENERATOR_SETS, checkSet } from './sudoku-generate-sets.ts';

const SEEDS = 200;

describe('generateSudoku', () => {
  for (const set of GENERATOR_SETS) {
    for (const empty of set.empties) {
      const name = `${String(set.size)} × ${String(set.size)} ${set.technique}, ${String(empty)} empty`;
      it(`${name}: ${String(SEEDS)} seeds give unique, human-solvable puzzles`, () => {
        const stats = checkSet(set, empty, SEEDS);
        expect(stats.ok).toBe(SEEDS);
      });
    }
  }

  it('different seeds give different puzzles', () => {
    const spec = { size: 6, empty: 12, technique: 'naked-single', minCount: 0 } as const;
    const seen = new Set<string>();
    for (let seed = 1; seed <= 20; seed += 1) {
      seen.add(generateSudoku(spec, seededRandom(seed))?.givens.join('/') ?? '');
    }
    expect(seen.size).toBeGreaterThan(15);
  });

  it('minCount: the technique occurs at least that many times', () => {
    const spec = { size: 4, empty: 6, technique: 'hidden-single', minCount: 2 } as const;
    const puzzle = generateSudoku(spec, seededRandom(13));
    expect(puzzle).toBeDefined();
    expect(puzzle?.counts['hidden-single']).toBeGreaterThanOrEqual(2);
    // The same spec with the default (1) accepts any puzzle that needs one.
    const easier = generateSudoku({ ...spec, minCount: undefined }, seededRandom(13));
    expect(easier?.counts['hidden-single']).toBeGreaterThanOrEqual(1);
  });

  it('a spec the grid cannot meet returns undefined after maxTries', () => {
    // A 4 × 4 puzzle needs at least 4 givens to be unique, so 15 empty cells never work.
    expect(
      generateSudoku(
        { size: 4, empty: 15, technique: 'naked-single', minCount: 0 },
        seededRandom(1),
        5,
      ),
    ).toBeUndefined();
    // No 4 × 4 puzzle needs a naked single once hidden singles are allowed.
    expect(
      generateSudoku({ size: 4, empty: 8, technique: 'naked-single' }, seededRandom(1), 5),
    ).toBeUndefined();
  });

  it('the last-cell puzzles are solved by last-cell steps alone', () => {
    const puzzle = generateSudoku({ size: 4, empty: 6, technique: 'last-cell' }, seededRandom(7));
    expect(puzzle).toBeDefined();
    const givens = parseSudoku(puzzle?.givens ?? []);
    expect(humanSolveSudoku(4, givens.grid, 1).solved).toBe(true);
    expect(countSudokuSolutions(4, givens.grid)).toBe(1);
  });

  it('throws on an impossible empty count', () => {
    expect(() =>
      generateSudoku({ size: 4, empty: 17, technique: 'last-cell' }, seededRandom(1)),
    ).toThrow(/17 empty/);
    expect(() =>
      generateSudoku({ size: 4, empty: -1, technique: 'last-cell' }, seededRandom(1)),
    ).toThrow(RangeError);
  });
});
