import { describe, expect, it } from 'vitest';
import {
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
  type SudokuSize,
  type Unit,
} from './sudoku.ts';

const SOLVED_4 = ['1234', '3412', '2143', '4321'];

describe('parse / format', () => {
  it('round trips 4 × 4 and 6 × 6 grids', () => {
    for (const rows of [
      ['1.3.', '.4.2', '2.4.', '.3.1'],
      ['......', '123456', '.2.4.6', '654321', '1.....', '.....6'],
    ]) {
      const { size, grid } = parseSudoku(rows);
      expect(size).toBe(rows.length);
      expect(grid).toHaveLength(rows.length * rows.length);
      expect(formatSudoku(size, grid)).toEqual(rows);
    }
  });

  it('reads `.` as 0 and digits as themselves, row-major', () => {
    expect(parseSudoku(['12.4', '....', '3...', '...1']).grid).toEqual([
      1, 2, 0, 4, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 1,
    ]);
  });

  it('throws on a bad shape or character', () => {
    expect(() => parseSudoku(['123', '231', '312'])).toThrow(/3 rows/);
    expect(() => parseSudoku(['1234', '3412', '214', '4321'])).toThrow(/row 2/);
    expect(() => parseSudoku(['1234', '3412', '2143', '432x'])).toThrow(/"x"/);
    expect(() => parseSudoku(['1234', '3412', '2143', '4325'])).toThrow(/"5"/);
    expect(() => parseSudoku(['1234', '3412', '2143', '4320'])).toThrow(/"0"/);
    expect(() => parseSudoku(['123456', '......', '......', '......', '......', '.....7'])).toThrow(
      /"7"/,
    );
    expect(() => formatSudoku(4, [1, 2, 3])).toThrow(/3 cells/);
  });
});

describe('units', () => {
  const sizes: SudokuSize[] = [4, 6];

  it('4 × 4 has 12 units and 6 × 6 has 18, each of `size` cells', () => {
    for (const size of sizes) {
      const units = new Map<string, Unit>();
      for (let cell = 0; cell < size * size; cell += 1) {
        for (const unit of unitsOf(size, cell)) {
          units.set(`${unit.kind}${String(unit.index)}`, unit);
        }
      }
      expect(units.size).toBe(size * 3);
      for (const unit of units.values()) {
        expect(unitCells(size, unit)).toHaveLength(size);
      }
    }
  });

  it('every cell is in its row, column and box (in that order), and every unit lists it', () => {
    for (const size of sizes) {
      for (let cell = 0; cell < size * size; cell += 1) {
        const [row, column, box] = unitsOf(size, cell);
        expect([row.kind, column.kind, box.kind]).toEqual(['row', 'column', 'box']);
        expect(row.index).toBe(Math.floor(cell / size));
        expect(column.index).toBe(cell % size);
        for (const unit of [row, column, box]) {
          expect(unitCells(size, unit)).toContain(cell);
        }
      }
    }
  });

  it('box shapes: 2 × 2 for 4, 2 rows × 3 columns for 6', () => {
    expect(boxShape(4)).toEqual({ rows: 2, cols: 2 });
    expect(boxShape(6)).toEqual({ rows: 2, cols: 3 });
  });

  it('boxes are numbered row-major', () => {
    expect(unitCells(4, { kind: 'box', index: 1 })).toEqual([2, 3, 6, 7]);
    expect(unitCells(4, { kind: 'box', index: 2 })).toEqual([8, 9, 12, 13]);
    // 6 × 6, box 1 = rows 0–1, columns 3–5.
    expect(unitCells(6, { kind: 'box', index: 1 })).toEqual([3, 4, 5, 9, 10, 11]);
    expect(unitCells(6, { kind: 'box', index: 2 })).toEqual([12, 13, 14, 18, 19, 20]);
    expect(unitCells(6, { kind: 'box', index: 5 })).toEqual([27, 28, 29, 33, 34, 35]);
    expect(unitCells(6, { kind: 'row', index: 2 })).toEqual([12, 13, 14, 15, 16, 17]);
    expect(unitCells(6, { kind: 'column', index: 4 })).toEqual([4, 10, 16, 22, 28, 34]);
  });

  it('throws for a cell outside the grid', () => {
    expect(() => unitsOf(4, 16)).toThrow(/outside/);
  });
});

describe('candidates / conflictUnit', () => {
  // 1 2 . .
  // . . . .
  // . . . .
  // . . . 3
  const { grid } = parseSudoku(['12..', '....', '....', '...3']);

  it('candidates: digits not in the cell row, column or box; [] for a filled cell', () => {
    expect(candidates(4, grid, 0)).toEqual([]);
    expect(candidates(4, grid, 2)).toEqual([3, 4]); // row 1, 2
    expect(candidates(4, grid, 4)).toEqual([3, 4]); // box 1, 2; column 1
    expect(candidates(4, grid, 5)).toEqual([3, 4]); // box 1, 2; column 2
    expect(candidates(4, grid, 14)).toEqual([1, 2, 4]); // row 3
    expect(candidates(4, grid, 10)).toEqual([1, 2, 4]); // box 3
    expect(candidates(4, parseSudoku(['....', '....', '....', '....']).grid, 5)).toEqual([
      1, 2, 3, 4,
    ]);
  });

  it('conflictUnit: the first of row, column, box that holds the value', () => {
    expect(conflictUnit(4, grid, 3, 1)).toEqual({ kind: 'row', index: 0 });
    expect(conflictUnit(4, grid, 12, 1)).toEqual({ kind: 'column', index: 0 });
    expect(conflictUnit(4, grid, 5, 1)).toEqual({ kind: 'box', index: 0 });
    // Row 0 and box 0 both hold 2; the row comes first.
    expect(conflictUnit(4, grid, 2, 2)).toEqual({ kind: 'row', index: 0 });
    expect(conflictUnit(4, grid, 4, 4)).toBeUndefined();
    expect(conflictUnit(4, grid, 12, 3)).toEqual({ kind: 'row', index: 3 });
  });

  it('a cell never conflicts with itself', () => {
    expect(conflictUnit(4, grid, 0, 1)).toBeUndefined();
  });
});

// Puzzles with one technique each; `solution` is the full grid. The hidden-single and naked-single ones were found with the
// generator and checked against the solver here.
const LAST_CELL = {
  size: 4 as const,
  givens: ['.234', '3.12', '21.3', '432.'],
  solution: SOLVED_4,
};
const HIDDEN_SINGLE = {
  size: 4 as const,
  givens: ['..3.', '..1.', '4123', '3241'],
  solution: ['1432', '2314', '4123', '3241'],
};
const NAKED_SINGLE = {
  size: 6 as const,
  givens: ['42....', '..64.2', '634...', '25....', '.63...', '54..13'],
  solution: ['425136', '316452', '634521', '251364', '163245', '542613'],
};

describe('human solver', () => {
  it('last-cell: solves with last-cell steps only', () => {
    const { size, grid } = parseSudoku(LAST_CELL.givens);
    const result = humanSolveSudoku(size, grid, LESSON_TECHNIQUES['last-cell']);
    expect(result.solved).toBe(true);
    expect(formatSudoku(size, result.grid)).toEqual(LAST_CELL.solution);
    expect(result.counts).toEqual({ 'last-cell': 4, 'hidden-single': 0, 'naked-single': 0 });
    // Rows 0.. in order; the unit of a step is the one with the single empty cell.
    expect(result.steps.map((step) => [step.cell, step.value])).toEqual([
      [0, 1],
      [5, 4],
      [10, 4],
      [15, 1],
    ]);
    expect(result.steps[0]).toEqual({
      technique: 'last-cell',
      cell: 0,
      value: 1,
      units: [{ kind: 'row', index: 0 }],
    });
  });

  it('hidden-single: last-cell alone is stuck, the hidden-single set solves', () => {
    const { size, grid } = parseSudoku(HIDDEN_SINGLE.givens);
    const stuck = humanSolveSudoku(size, grid, LESSON_TECHNIQUES['last-cell']);
    expect(stuck.solved).toBe(false);
    expect(stuck.steps).toHaveLength(0);
    expect(stuck.grid).toEqual(grid);

    const result = humanSolveSudoku(size, grid, LESSON_TECHNIQUES['hidden-single']);
    expect(result.solved).toBe(true);
    expect(formatSudoku(size, result.grid)).toEqual(HIDDEN_SINGLE.solution);
    expect(result.counts).toEqual({ 'last-cell': 4, 'hidden-single': 2, 'naked-single': 0 });
    const first = result.steps[0];
    expect(first?.technique).toBe('hidden-single');
    expect(first?.units).toHaveLength(1);
  });

  it('naked-single: the naked-single set (no hidden-single) solves the same 4 × 4 puzzle', () => {
    const { size, grid } = parseSudoku(HIDDEN_SINGLE.givens);
    const result = humanSolveSudoku(size, grid, LESSON_TECHNIQUES['naked-single']);
    expect(result.solved).toBe(true);
    expect(formatSudoku(size, result.grid)).toEqual(HIDDEN_SINGLE.solution);
    expect(result.counts).toEqual({ 'last-cell': 4, 'hidden-single': 0, 'naked-single': 2 });
    const first = result.steps[0];
    expect(first?.technique).toBe('naked-single');
    expect(first?.units.map((unit) => unit.kind)).toEqual(['row', 'column', 'box']);
  });

  it('all techniques: the hidden-single set is stuck, the full set solves (6 × 6)', () => {
    const { size, grid } = parseSudoku(NAKED_SINGLE.givens);
    const stuck = humanSolveSudoku(size, grid, LESSON_TECHNIQUES['hidden-single']);
    expect(stuck.solved).toBe(false);
    expect(stuck.counts['naked-single']).toBe(0);
    expect(stuck.steps.length).toBeGreaterThan(0);
    // The naked-single set solves it too, with more naked singles (it has no hidden-single step to use).
    const nakedOnly = humanSolveSudoku(size, grid, LESSON_TECHNIQUES['naked-single']);
    expect(nakedOnly.solved).toBe(true);
    expect(nakedOnly.counts).toEqual({ 'last-cell': 13, 'hidden-single': 0, 'naked-single': 7 });

    const result = humanSolveSudoku(size, grid, LESSON_TECHNIQUES.all);
    expect(result.solved).toBe(true);
    expect(formatSudoku(size, result.grid)).toEqual(NAKED_SINGLE.solution);
    expect(result.counts).toEqual({ 'last-cell': 13, 'hidden-single': 6, 'naked-single': 1 });
    const naked = result.steps.find((step) => step.technique === 'naked-single');
    expect(naked?.units).toEqual(unitsOf(size, naked?.cell ?? 0));
    expect(naked?.units.map((unit) => unit.kind)).toEqual(['row', 'column', 'box']);
  });

  it('every step of every puzzle puts the solution value in an empty cell', () => {
    for (const [puzzle, allowed] of [
      [LAST_CELL, LESSON_TECHNIQUES['last-cell']],
      [HIDDEN_SINGLE, LESSON_TECHNIQUES['hidden-single']],
      [HIDDEN_SINGLE, LESSON_TECHNIQUES['naked-single']],
      [NAKED_SINGLE, LESSON_TECHNIQUES['naked-single']],
      [NAKED_SINGLE, LESSON_TECHNIQUES.all],
    ] as const) {
      const { size, grid } = parseSudoku(puzzle.givens);
      const solution = parseSudoku(puzzle.solution).grid;
      const result = humanSolveSudoku(size, grid, allowed);
      const current = [...grid];
      for (const step of result.steps) {
        expect(current[step.cell]).toBe(0);
        expect(step.value).toBe(solution[step.cell]);
        current[step.cell] = step.value;
      }
      expect(current).toEqual(solution);
      expect(result.steps).toHaveLength(grid.filter((value) => value === 0).length);
    }
  });

  it('does not change the input grid', () => {
    const { size, grid } = parseSudoku(HIDDEN_SINGLE.givens);
    const copy = [...grid];
    humanSolveSudoku(size, grid, SUDOKU_ORDER);
    expect(grid).toEqual(copy);
  });

  it('a solved grid has no step; an empty grid is stuck', () => {
    const solved = parseSudoku(SOLVED_4);
    expect(nextSudokuStep(4, solved.grid, SUDOKU_ORDER)).toBeUndefined();
    expect(humanSolveSudoku(4, solved.grid, SUDOKU_ORDER)).toMatchObject({
      solved: true,
      steps: [],
    });
    const empty = parseSudoku(['....', '....', '....', '....']);
    expect(humanSolveSudoku(4, empty.grid, SUDOKU_ORDER)).toMatchObject({
      solved: false,
      steps: [],
    });
  });

  it('a contradictory grid is never reported solved', () => {
    // A full grid with a repeated digit in a row.
    const { size, grid } = parseSudoku(['1134', '3412', '2143', '4321']);
    expect(humanSolveSudoku(size, grid, SUDOKU_ORDER).solved).toBe(false);
  });

  it('the order and the lesson sets', () => {
    expect(SUDOKU_ORDER).toEqual(['last-cell', 'hidden-single', 'naked-single']);
    expect(LESSON_TECHNIQUES).toEqual({
      'last-cell': ['last-cell'],
      'hidden-single': ['last-cell', 'hidden-single'],
      'naked-single': ['last-cell', 'naked-single'],
      all: ['last-cell', 'hidden-single', 'naked-single'],
    });
  });
});

describe('nextSudokuStep', () => {
  // All three techniques are available in the first state of the 6 × 6 puzzle.
  const { size, grid } = parseSudoku(NAKED_SINGLE.givens);
  const solution = parseSudoku(NAKED_SINGLE.solution).grid;

  it('cheapest allowed technique first: last-cell while one exists', () => {
    expect(nextSudokuStep(size, grid, SUDOKU_ORDER)?.technique).toBe('last-cell');
    expect(nextSudokuStep(size, grid, ['naked-single', 'last-cell'])?.technique).toBe('last-cell');
  });

  it('only allowed techniques are used', () => {
    expect(nextSudokuStep(size, grid, ['hidden-single'])?.technique).toBe('hidden-single');
    expect(nextSudokuStep(size, grid, ['naked-single'])?.technique).toBe('naked-single');
    expect(nextSudokuStep(size, grid, [])).toBeUndefined();
    // Without last-cell the hidden single comes first (SUDOKU_ORDER), whatever the order of `allowed`.
    expect(nextSudokuStep(size, grid, ['naked-single', 'hidden-single'])?.technique).toBe(
      'hidden-single',
    );
  });

  it('`prefer` returns the preferred technique when it is available and allowed', () => {
    for (const prefer of SUDOKU_ORDER) {
      expect(nextSudokuStep(size, grid, SUDOKU_ORDER, prefer)?.technique).toBe(prefer);
    }
    expect(
      nextSudokuStep(size, grid, LESSON_TECHNIQUES['hidden-single'], 'hidden-single')?.technique,
    ).toBe('hidden-single');
  });

  it('every preferred step is a correct deduction in an empty cell', () => {
    for (const prefer of SUDOKU_ORDER) {
      const step = nextSudokuStep(size, grid, SUDOKU_ORDER, prefer);
      expect(grid[step?.cell ?? 0]).toBe(0);
      expect(step?.value).toBe(solution[step?.cell ?? 0]);
    }
  });

  it('`prefer` outside `allowed` is ignored', () => {
    expect(
      nextSudokuStep(size, grid, LESSON_TECHNIQUES['last-cell'], 'naked-single')?.technique,
    ).toBe('last-cell');
    expect(
      nextSudokuStep(size, grid, LESSON_TECHNIQUES['hidden-single'], 'naked-single')?.technique,
    ).toBe('last-cell');
  });

  it('an unavailable `prefer` falls back to the cheapest allowed technique', () => {
    // No unit of this 4 × 4 puzzle has one empty cell yet.
    const hidden = parseSudoku(HIDDEN_SINGLE.givens);
    expect(nextSudokuStep(4, hidden.grid, SUDOKU_ORDER, 'last-cell')?.technique).toBe(
      'hidden-single',
    );
    expect(
      nextSudokuStep(4, hidden.grid, LESSON_TECHNIQUES['last-cell'], 'hidden-single'),
    ).toBeUndefined();
  });

  it('a hidden single: a unit, a digit missing from it, its only place', () => {
    const step = nextSudokuStep(size, grid, SUDOKU_ORDER, 'hidden-single');
    expect(step?.units).toHaveLength(1);
    const [unit] = step?.units ?? [];
    if (!step || !unit) {
      throw new Error('no hidden single');
    }
    const cells = unitCells(size, unit);
    expect(cells.map((cell) => grid[cell])).not.toContain(step.value);
    const places = cells.filter(
      (cell) => grid[cell] === 0 && conflictUnit(size, grid, cell, step.value) === undefined,
    );
    expect(places).toEqual([step.cell]);
  });

  it('a preferred hidden single scans the boxes first, then the rows, then the columns; without `prefer` the scan is rows, columns, boxes', () => {
    const { size: four, grid: puzzle } = parseSudoku(['.4.3', '.1.4', '1.42', '4231']);
    const only = ['hidden-single'] as const;
    // Row 0 holds a hidden single (its 1 fits only the first cell), and so does the first box (its 3).
    const byDefault = nextSudokuStep(four, puzzle, only);
    expect(byDefault?.units).toEqual([{ kind: 'row', index: 0 }]);
    const preferred = nextSudokuStep(four, puzzle, only, 'hidden-single');
    expect(preferred?.units).toEqual([{ kind: 'box', index: 0 }]);
    expect(preferred).toMatchObject({ technique: 'hidden-single', cell: 4, value: 3 });
    // Both are correct deductions; the counts of `humanSolveSudoku` (no `prefer`) do not depend on the preferred scan.
    // Both are correct deductions; the steps of `humanSolveSudoku` (no `prefer`) keep the default scan.
    const solved = humanSolveSudoku(four, puzzle, SUDOKU_ORDER).grid;
    expect(byDefault?.value).toBe(solved[byDefault?.cell ?? 0]);
    expect(preferred?.value).toBe(solved[preferred?.cell ?? 0]);
    expect(
      humanSolveSudoku(four, puzzle, LESSON_TECHNIQUES['hidden-single']).steps[0]?.units,
    ).toEqual([{ kind: 'row', index: 2 }]);
    // With no hidden single in a box, the rows come next, then the columns.
    const rowOnly = parseSudoku(['.1..', '....', '..43', '....']).grid;
    expect(nextSudokuStep(four, rowOnly, only, 'hidden-single')?.units).toEqual([
      { kind: 'row', index: 2 },
    ]);
    const columnOnly = parseSudoku(['..4.', '....', '2.1.', '.12.']).grid;
    expect(nextSudokuStep(four, columnOnly, only, 'hidden-single')?.units).toEqual([
      { kind: 'column', index: 2 },
    ]);
  });

  it('a naked single: the only candidate of its cell, with the cell’s row, column and box', () => {
    const step = nextSudokuStep(size, grid, SUDOKU_ORDER, 'naked-single');
    if (!step) {
      throw new Error('no naked single');
    }
    expect(candidates(size, grid, step.cell)).toEqual([step.value]);
    expect(step.units).toEqual(unitsOf(size, step.cell));
  });
});
