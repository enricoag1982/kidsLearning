import { describe, expect, it } from 'vitest';
import { seededRandom } from '@learn/platform-core/domain/random';
import { LESSON_TECHNIQUES, humanSolveSudoku, parseSudoku } from '../../core/puzzles/sudoku.ts';
import { countSudokuSolutions } from './sudoku-count.ts';
import { generateSudoku } from './sudoku-generate.ts';
import { GENERATOR_SETS, checkSet } from './sudoku-generate-sets.ts';

const SEEDS = 200;

describe('generateSudoku', () => {
  for (const set of GENERATOR_SETS) {
    for (const empty of set.empties) {
      const name = `${String(set.size)} × ${String(set.size)} ${set.focus} (require ${set.require}), ${String(empty)} empty`;
      it(`${name}: ${String(SEEDS)} seeds give unique, human-solvable puzzles`, () => {
        const stats = checkSet(set, empty, SEEDS);
        expect(stats.ok).toBe(SEEDS);
      });
    }
  }

  it('different seeds give different puzzles', () => {
    const spec = { size: 6, empty: 12, focus: 'naked-single', require: 'naked-single' } as const;
    const seen = new Set<string>();
    for (let seed = 1; seed <= 20; seed += 1) {
      seen.add(generateSudoku(spec, seededRandom(seed))?.givens.join('/') ?? '');
    }
    expect(seen.size).toBeGreaterThan(15);
  });

  it('`require` is optional: any unique puzzle the focus solves', () => {
    const spec = { size: 6, empty: 14, focus: 'all' } as const;
    for (let seed = 1; seed <= 20; seed += 1) {
      const puzzle = generateSudoku(spec, seededRandom(seed));
      expect(puzzle?.tries).toBe(1);
      const givens = parseSudoku(puzzle?.givens ?? []);
      expect(humanSolveSudoku(6, givens.grid, LESSON_TECHNIQUES.all).solved).toBe(true);
    }
  });

  it('minCount: the required technique occurs at least that many times', () => {
    const spec = { size: 4, empty: 6, focus: 'hidden-single', require: 'hidden-single' } as const;
    const puzzle = generateSudoku({ ...spec, minCount: 2 }, seededRandom(13));
    expect(puzzle).toBeDefined();
    expect(puzzle?.counts['hidden-single']).toBeGreaterThanOrEqual(2);
    // The default (1) accepts any puzzle that needs one.
    const easier = generateSudoku(spec, seededRandom(13));
    expect(easier?.counts['hidden-single']).toBeGreaterThanOrEqual(1);
  });

  it('a spec the grid cannot meet returns undefined after maxTries', () => {
    // A 4 × 4 puzzle needs at least 4 givens to be unique, so 15 empty cells never work.
    expect(
      generateSudoku({ size: 4, empty: 15, focus: 'all' }, seededRandom(1), 5),
    ).toBeUndefined();
    // No 4 × 4 puzzle needs a naked single once hidden singles are allowed (`sudoku.slow.test.ts`): hence allowed sets.
    expect(
      generateSudoku(
        { size: 4, empty: 8, focus: 'all', require: 'naked-single' },
        seededRandom(1),
        5,
      ),
    ).toBeUndefined();
    // A technique outside the focus never occurs.
    expect(
      generateSudoku(
        { size: 4, empty: 6, focus: 'last-cell', require: 'hidden-single' },
        seededRandom(1),
        5,
      ),
    ).toBeUndefined();
  });

  it('the last-cell puzzles are solved by last-cell steps alone', () => {
    const puzzle = generateSudoku(
      { size: 4, empty: 6, focus: 'last-cell', require: 'last-cell' },
      seededRandom(7),
    );
    expect(puzzle).toBeDefined();
    const givens = parseSudoku(puzzle?.givens ?? []);
    expect(humanSolveSudoku(4, givens.grid, LESSON_TECHNIQUES['last-cell']).solved).toBe(true);
    expect(countSudokuSolutions(4, givens.grid)).toBe(1);
  });

  it('throws on an impossible empty count', () => {
    expect(() =>
      generateSudoku({ size: 4, empty: 17, focus: 'last-cell' }, seededRandom(1)),
    ).toThrow(/17 empty/);
    expect(() =>
      generateSudoku({ size: 4, empty: -1, focus: 'last-cell' }, seededRandom(1)),
    ).toThrow(RangeError);
  });
});
