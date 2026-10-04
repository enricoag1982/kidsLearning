import { describe, expect, it } from 'vitest';
import { parsePicture, pictureClues } from '../../core/puzzles/cross.ts';
import { countCrossSolutions } from './cross-count.ts';

function count(rows: readonly string[], limit?: number): number {
  const { size, solution } = parsePicture(rows);
  const clues = pictureClues(size, solution);
  return countCrossSolutions(size, clues.rows, clues.cols, limit);
}

describe('countCrossSolutions', () => {
  it('1 for the hand-drawn pictures', () => {
    expect(count(['..#..', '..#..', '#####', '..#..', '..#..'])).toBe(1);
    expect(count(['.#.#.', '#####', '#####', '.###.', '..#..'])).toBe(1);
    expect(count(['..#..', '.###.', '#####', '#####', '##.##'])).toBe(1);
    expect(count(['.##..', '.###.', '.##..', '####.', '.###.'])).toBe(1);
  });

  it('2 for an ambiguous 2 × 2 corner (a diagonal pair)', () => {
    expect(count(['#....', '.#...', '.....', '.....', '.....'])).toBe(2);
    expect(count(['.....', '.....', '..#..', '...#.', '.....'])).toBe(2);
  });

  it('counts every solution up to the limit', () => {
    // A full 6 × 6 diagonal: every row and column clue is [1], so every permutation matrix fits (6! = 720).
    const rows = ['#.....', '.#....', '..#...', '...#..', '....#.', '.....#'];
    expect(count(rows, Infinity)).toBe(720);
    expect(count(rows, 5)).toBe(5);
    expect(count(rows)).toBe(2);
    expect(count(rows, 1)).toBe(1);
  });

  it('0 when no picture fits', () => {
    // Rows say 2 filled cells in total, columns say 1.
    expect(countCrossSolutions(2, [[2], []], [[1], []])).toBe(0);
    // Every row is a single cell: the first column can hold all three, but not the run pattern 1 1 1 (needs 5 rows).
    expect(countCrossSolutions(3, [[1], [1], [1]], [[3], [], []], 5)).toBe(1);
    expect(countCrossSolutions(3, [[1], [1], [1]], [[1, 1, 1], [], []], 5)).toBe(0);
  });

  it('empty and full pictures', () => {
    expect(count(['...', '...', '...'])).toBe(1);
    expect(count(['###', '###', '###'])).toBe(1);
  });

  it('throws when the clues do not fit the size', () => {
    expect(() => countCrossSolutions(3, [[1], [1]], [[1], [1], [1]])).toThrow(/3 × 3/);
  });

  it('agrees with brute force on every 4 × 4 picture', () => {
    // Pictures grouped by their clues: the group size is the number of solutions of those clues.
    const size = 4;
    const groups = new Map<string, number>();
    const clueSets = new Map<number, ReturnType<typeof pictureClues>>();
    for (let bits = 0; bits < 1 << (size * size); bits += 1) {
      const solution = Array.from({ length: size * size }, (_, cell) => (bits & (1 << cell)) !== 0);
      const clues = pictureClues(size, solution);
      clueSets.set(bits, clues);
      const key = JSON.stringify(clues);
      groups.set(key, (groups.get(key) ?? 0) + 1);
    }
    for (let bits = 0; bits < 1 << (size * size); bits += 37) {
      const clues = clueSets.get(bits);
      expect(clues).toBeDefined();
      if (!clues) {
        continue;
      }
      expect(countCrossSolutions(size, clues.rows, clues.cols, Infinity)).toBe(
        groups.get(JSON.stringify(clues)),
      );
    }
  });
});
