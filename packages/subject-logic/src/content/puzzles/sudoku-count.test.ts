import { describe, expect, it } from 'vitest';
import { parseSudoku } from '../../core/puzzles/sudoku.ts';
import { countSudokuSolutions, findSudokuSolution } from './sudoku-count.ts';

describe('countSudokuSolutions', () => {
  it('the empty 4 × 4 grid has 288 solutions', () => {
    const { size, grid } = parseSudoku(['....', '....', '....', '....']);
    expect(countSudokuSolutions(size, grid, Infinity)).toBe(288);
  });

  it('stops at the limit (default 2)', () => {
    const { size, grid } = parseSudoku(['....', '....', '....', '....']);
    expect(countSudokuSolutions(size, grid)).toBe(2);
    expect(countSudokuSolutions(size, grid, 5)).toBe(5);
    expect(countSudokuSolutions(size, grid, 1)).toBe(1);
  });

  it('a unique puzzle has 1 solution', () => {
    for (const rows of [
      ['..3.', '..1.', '4123', '3241'],
      ['.234', '3.12', '21.3', '432.'],
      ['1234', '3412', '2143', '4321'],
    ]) {
      const { size, grid } = parseSudoku(rows);
      expect(countSudokuSolutions(size, grid, Infinity)).toBe(1);
    }
    const six = parseSudoku(['42....', '..64.2', '634...', '25....', '.63...', '54..13']);
    expect(countSudokuSolutions(six.size, six.grid, Infinity)).toBe(1);
  });

  it('a puzzle with a deadly rectangle has 2 solutions', () => {
    // Cells (0,0), (0,2), (1,0), (1,2) hold 1 3 / 3 1 and may swap to 3 1 / 1 3: both fill the grid.
    const { size, grid } = parseSudoku(['.2.4', '.4.2', '2143', '4321']);
    expect(countSudokuSolutions(size, grid, Infinity)).toBe(2);
  });

  it('a puzzle with no solution has 0, however it fails', () => {
    // Clashing givens (two 1s in row 0).
    expect(countSudokuSolutions(4, parseSudoku(['11..', '....', '....', '....']).grid)).toBe(0);
    // No clash, but cell 0 has no candidate left (1 and 2 in its row, 3 in its column, 4 in its box).
    expect(countSudokuSolutions(4, parseSudoku(['.12.', '4...', '3...', '....']).grid)).toBe(0);
  });

  it('counts 6 × 6 puzzles (boxes 2 rows × 3 columns)', () => {
    const empty = parseSudoku(['......', '......', '......', '......', '......', '......']);
    expect(countSudokuSolutions(empty.size, empty.grid, 3)).toBe(3);
    // Two 1s in column 0 clash.
    const clash = parseSudoku(['1.....', '1.....', '......', '......', '......', '......']);
    expect(countSudokuSolutions(clash.size, clash.grid)).toBe(0);
  });

  it('throws on a grid of the wrong length', () => {
    expect(() => countSudokuSolutions(4, [0, 0, 0])).toThrow(/3 cells/);
  });
});

describe('findSudokuSolution', () => {
  it('returns the solution of a unique puzzle, and leaves the givens alone', () => {
    const { size, grid } = parseSudoku(['..3.', '..1.', '4123', '3241']);
    const before = [...grid];
    const solution = findSudokuSolution(size, grid);
    expect(solution).toEqual(parseSudoku(['1432', '2314', '4123', '3241']).grid);
    expect(grid).toEqual(before);
    const six = parseSudoku(['42....', '..64.2', '634...', '25....', '.63...', '54..13']);
    const sixSolution = findSudokuSolution(six.size, six.grid);
    expect(sixSolution).toHaveLength(36);
    expect(sixSolution).not.toContain(0);
    expect(countSudokuSolutions(six.size, sixSolution ?? [], Infinity)).toBe(1);
    six.grid.forEach((value, cell) => {
      if (value !== 0) expect(sixSolution?.[cell]).toBe(value);
    });
  });

  it('returns one of the solutions of an ambiguous puzzle: a full grid that keeps the givens', () => {
    const { size, grid } = parseSudoku(['.2.4', '.4.2', '2143', '4321']);
    const solution = findSudokuSolution(size, grid);
    expect(solution).toBeDefined();
    expect(countSudokuSolutions(size, solution ?? [], Infinity)).toBe(1);
    grid.forEach((value, cell) => {
      if (value !== 0) expect(solution?.[cell]).toBe(value);
    });
  });

  it('returns nothing when there is no solution, however it fails', () => {
    expect(
      findSudokuSolution(4, parseSudoku(['11..', '....', '....', '....']).grid),
    ).toBeUndefined();
    expect(
      findSudokuSolution(4, parseSudoku(['.12.', '4...', '3...', '....']).grid),
    ).toBeUndefined();
  });

  it('throws on a grid of the wrong length', () => {
    expect(() => findSudokuSolution(4, [0, 0, 0])).toThrow(/3 cells/);
  });
});
