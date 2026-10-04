import { describe, expect, it } from 'vitest';
import { seededRandom } from '@learn/platform-core/domain/random';
import {
  CROSS_LEVEL,
  humanSolveCross,
  lineClue,
  nextCrossStep,
  parsePicture,
  pictureClues,
  solveLine,
  type CrossCell,
  type CrossCells,
} from './cross.ts';

const F: CrossCell = 'fill';
const X: CrossCell = 'cross';
const U = undefined;

describe('parsePicture / pictureClues / lineClue', () => {
  it('parses `#` and `.` row-major; square only', () => {
    expect(parsePicture(['#.', '.#'])).toEqual({ size: 2, solution: [true, false, false, true] });
    expect(() => parsePicture([])).toThrow(/no rows/);
    expect(() => parsePicture(['#.#', '.#.'])).toThrow(/row 0/);
    expect(() => parsePicture(['#.', '.#.'])).toThrow(/row 1/);
    expect(() => parsePicture(['#.', '.x'])).toThrow(/"x"/);
  });

  it('lineClue: run lengths; [] for an empty line', () => {
    expect(lineClue([false, false, false])).toEqual([]);
    expect(lineClue([])).toEqual([]);
    expect(lineClue([true, true, true, true, true])).toEqual([5]);
    expect(lineClue('#.##.'.split('').map((char) => char === '#'))).toEqual([1, 2]);
    expect(lineClue('##.#.'.split('').map((char) => char === '#'))).toEqual([2, 1]);
    expect(lineClue('.#.##'.split('').map((char) => char === '#'))).toEqual([1, 2]);
    expect(lineClue('#.#.#'.split('').map((char) => char === '#'))).toEqual([1, 1, 1]);
  });

  it('pictureClues: row and column clues', () => {
    const { size, solution } = parsePicture(['#.#', '###', '...']);
    expect(pictureClues(size, solution)).toEqual({
      rows: [[1, 1], [3], []],
      cols: [[2], [1], [2]],
    });
    expect(() => pictureClues(3, [true])).toThrow(/1 cells/);
  });
});

describe('solveLine', () => {
  it('a full line is decided: clue sum + gaps = size', () => {
    expect(solveLine([5], [U, U, U, U, U])).toEqual([F, F, F, F, F]);
    expect(solveLine([2, 2], [U, U, U, U, U])).toEqual([F, F, X, F, F]);
    expect(solveLine([1, 1, 1], [U, U, U, U, U])).toEqual([F, X, F, X, F]);
    expect(solveLine([], [U, U, U, U, U])).toEqual([X, X, X, X, X]);
  });

  it('overlap: a run of 4 in 5 fills the middle 3', () => {
    expect(solveLine([4], [U, U, U, U, U])).toEqual([U, F, F, F, U]);
    expect(solveLine([3], [U, U, U, U, U])).toEqual([U, U, F, U, U]);
    expect(solveLine([2], [U, U, U, U, U])).toEqual([U, U, U, U, U]);
    expect(solveLine([3, 1], [U, U, U, U, U])).toEqual([F, F, F, X, F]);
    expect(solveLine([2, 1], [U, U, U, U, U])).toEqual([U, F, U, U, U]);
    expect(solveLine([2], [U, U, U, U, U])).toEqual([U, U, U, U, U]);
  });

  it('cross-out: once the run is known, every other cell is crossed', () => {
    expect(solveLine([2], [U, F, F, U, U])).toEqual([X, F, F, X, X]);
    expect(solveLine([1, 1], [F, X, U, F, U])).toEqual([F, X, X, F, X]);
    expect(solveLine([3], [U, U, F, U, U])).toEqual([U, U, F, U, U]);
  });

  it('combine: known cells and the clue together decide more', () => {
    // The run of 3 must reach the filled last cell.
    expect(solveLine([3], [U, U, U, U, F])).toEqual([X, X, F, F, F]);
    // The first 1 is at 0, so the second 1 cannot touch it.
    expect(solveLine([1, 1], [F, U, U, U, U])).toEqual([F, X, U, U, U]);
    // A cross in the middle splits the line.
    expect(solveLine([2, 2], [U, U, X, U, U])).toEqual([F, F, X, F, F]);
  });

  it('keeps the known cells and does not change its input', () => {
    const line: (CrossCell | undefined)[] = [F, U, X, U, U];
    const result = solveLine([1, 2], line);
    expect(result?.[0]).toBe(F);
    expect(result?.[2]).toBe(X);
    expect(line).toEqual([F, U, X, U, U]);
  });

  it('agrees with brute force on every partly known line of up to 6 cells', () => {
    for (const length of [1, 2, 3, 4, 5, 6]) {
      // Every filling of the line, with its clue.
      const fillings = Array.from({ length: 1 << length }, (_, bits) =>
        Array.from({ length }, (_, i) => (bits & (1 << i)) !== 0),
      );
      const clues = new Map(
        fillings.map((filling) => [lineClue(filling).join(','), lineClue(filling)]),
      );
      for (const clue of clues.values()) {
        const fits = fillings.filter((filling) => lineClue(filling).join(',') === clue.join(','));
        // Every partial knowledge: each cell unknown, filled or crossed.
        for (let code = 0; code < 3 ** length; code += 1) {
          const line = Array.from({ length }, (_, i): CrossCell | undefined => {
            const digit = Math.floor(code / 3 ** i) % 3;
            return digit === 0 ? undefined : digit === 1 ? F : X;
          });
          const consistent = fits.filter((filling) =>
            filling.every((filled, i) => line[i] === undefined || (line[i] === F) === filled),
          );
          const expected =
            consistent.length === 0
              ? undefined
              : line.map((_, i): CrossCell | undefined => {
                  if (consistent.every((filling) => filling[i])) {
                    return F;
                  }
                  return consistent.every((filling) => !filling[i]) ? X : undefined;
                });
          expect(solveLine(clue, line)).toEqual(expected);
        }
      }
    }
  });

  it('a contradiction gives undefined', () => {
    expect(solveLine([3], [F, U, U, U, F])).toBeUndefined();
    expect(solveLine([5], [U, X, U, U, U])).toBeUndefined();
    expect(solveLine([], [U, F, U, U, U])).toBeUndefined();
    expect(solveLine([2, 2], [U, U, U, U])).toBeUndefined();
    expect(solveLine([1], [X, X, X])).toBeUndefined();
    expect(solveLine([2], [F, X, F, U, U])).toBeUndefined();
  });
});

const PICTURES: Record<
  string,
  { rows: string[]; rowClues: number[][]; colClues: number[][]; needs: number }
> = {
  plus: {
    rows: ['..#..', '..#..', '#####', '..#..', '..#..'],
    rowClues: [[1], [1], [5], [1], [1]],
    colClues: [[1], [1], [5], [1], [1]],
    needs: 3,
  },
  heart: {
    rows: ['.#.#.', '#####', '#####', '.###.', '..#..'],
    rowClues: [[1, 1], [5], [5], [3], [1]],
    colClues: [[2], [4], [4], [4], [2]],
    needs: 3,
  },
  house: {
    rows: ['..#..', '.###.', '#####', '#####', '##.##'],
    rowClues: [[1], [3], [5], [5], [2, 2]],
    colClues: [[3], [4], [4], [4], [3]],
    needs: 3,
  },
  duck: {
    rows: ['.##..', '.###.', '.##..', '####.', '.###.'],
    rowClues: [[2], [3], [2], [4], [3]],
    colClues: [[1], [5], [5], [1, 2], []],
    needs: 3,
  },
};

describe('humanSolveCross on hand-drawn 5 × 5 pictures', () => {
  for (const [name, picture] of Object.entries(PICTURES)) {
    describe(name, () => {
      const { size, solution } = parsePicture(picture.rows);
      const { rows, cols } = pictureClues(size, solution);

      it('has the drawn clues', () => {
        expect(rows).toEqual(picture.rowClues);
        expect(cols).toEqual(picture.colClues);
      });

      it('is solved at level 3, every step matching the solution', () => {
        const result = humanSolveCross(size, rows, cols, 3);
        expect(result.solved).toBe(true);
        expect(result.cells).toEqual(solution.map((filled) => (filled ? F : X)));
        const known: (CrossCell | undefined)[] = new Array<CrossCell | undefined>(size * size).fill(
          undefined,
        );
        for (const step of result.steps) {
          expect(step.cells.length).toBeGreaterThan(0);
          for (const { cell, value } of step.cells) {
            // Only new cells, each on the step's line, each equal to the solution.
            expect(known[cell]).toBeUndefined();
            expect(value).toBe(solution[cell] ? F : X);
            const inLine =
              step.line.kind === 'row'
                ? Math.floor(cell / size) === step.line.index
                : cell % size === step.line.index;
            expect(inLine).toBe(true);
            known[cell] = value;
          }
        }
        expect(known).toEqual(result.cells);
        const total = Object.values(result.counts).reduce((sum, count) => sum + count, 0);
        expect(total).toBe(result.steps.length);
      });

      it('needs combine: level 2 gets stuck', () => {
        const result = humanSolveCross(size, rows, cols, 2);
        expect(result.solved).toBe(false);
        expect(result.counts.combine).toBe(0);
        expect(result.cells.some((cell) => cell === undefined)).toBe(true);
        expect(humanSolveCross(size, rows, cols, 3).counts.combine).toBeGreaterThan(0);
      });

      it('level 1 solves only the full lines', () => {
        const result = humanSolveCross(size, rows, cols, 1);
        expect(result.solved).toBe(false);
        expect(result.steps.every((step) => step.technique === 'full-line')).toBe(true);
      });
    });
  }

  it('plus sign: the step sequence', () => {
    const { size, solution } = parsePicture(PICTURES.plus?.rows ?? []);
    const { rows, cols } = pictureClues(size, solution);
    const result = humanSolveCross(size, rows, cols, 3);
    expect(result.counts).toEqual({ 'full-line': 1, overlap: 0, 'cross-out': 4, combine: 4 });
    expect(result.steps.map((step) => [step.technique, step.line.kind, step.line.index])).toEqual([
      ['full-line', 'row', 2],
      ['cross-out', 'column', 0],
      ['cross-out', 'column', 1],
      ['cross-out', 'column', 3],
      ['cross-out', 'column', 4],
      ['combine', 'row', 0],
      ['combine', 'row', 1],
      ['combine', 'row', 3],
      ['combine', 'row', 4],
    ]);
    expect(result.steps[0]?.cells).toEqual(
      [0, 1, 2, 3, 4].map((c) => ({ cell: 10 + c, value: F })),
    );
    // Column cells are row-major indices.
    expect(result.steps[1]?.cells).toEqual([0, 5, 15, 20].map((cell) => ({ cell, value: X })));
  });

  it('a picture solved with full lines and cross-outs needs no combine', () => {
    // Two filled rows: both are full lines, and the columns' crosses follow without any combining.
    const { size, solution } = parsePicture(['#####', '.....', '#####', '.....', '.....']);
    const { rows, cols } = pictureClues(size, solution);
    const result = humanSolveCross(size, rows, cols, 1);
    expect(result.solved).toBe(true);
    expect(result.counts).toEqual({ 'full-line': 5, overlap: 0, 'cross-out': 0, combine: 0 });
  });
});

describe('nextCrossStep', () => {
  const none: CrossCells = new Array<CrossCell | undefined>(25).fill(undefined);
  const threes = [[3], [3], [3], [3], [3]];

  it('levels: full-line 1, overlap 2, cross-out 2, combine 3', () => {
    expect(CROSS_LEVEL).toEqual({ 'full-line': 1, overlap: 2, 'cross-out': 2, combine: 3 });
  });

  it('full-line: no known cell and the line is decided (also an empty clue)', () => {
    const rows = [[], [3], [3], [3], [3]];
    const step = nextCrossStep(5, rows, threes, none, 1);
    expect(step).toEqual({
      technique: 'full-line',
      line: { kind: 'row', index: 0 },
      cells: [0, 1, 2, 3, 4].map((cell) => ({ cell, value: X })),
    });
    expect(nextCrossStep(5, [[5], ...threes.slice(1)], threes, none, 1)?.technique).toBe(
      'full-line',
    );
  });

  it('overlap: no known cell and only some cells decided', () => {
    expect(nextCrossStep(5, threes, threes, none, 1)).toBeUndefined();
    expect(nextCrossStep(5, threes, threes, none, 2)).toEqual({
      technique: 'overlap',
      line: { kind: 'row', index: 0 },
      cells: [{ cell: 2, value: F }],
    });
  });

  it('cross-out: the clue’s filled cells are all known and the new cells are crosses', () => {
    const cells = [...none];
    [0, 1, 2].forEach((cell) => (cells[cell] = F));
    const step = nextCrossStep(5, threes, threes, cells, 2);
    expect(step).toEqual({
      technique: 'cross-out',
      line: { kind: 'row', index: 0 },
      cells: [3, 4].map((cell) => ({ cell, value: X })),
    });
    // At level 1 nothing is allowed.
    expect(nextCrossStep(5, threes, threes, cells, 1)).toBeUndefined();
  });

  it('combine: known cells and the clue together', () => {
    // No line decides anything on its own (2 in 5 has no overlap), so the filled last cell of row 0 gives the first step.
    const rows = [[3], [2], [2], [2], [2]];
    const twos = [[2], [2], [2], [2], [2]];
    const cells = [...none];
    cells[4] = F;
    const step = nextCrossStep(5, rows, twos, cells, 3);
    expect(step?.technique).toBe('combine');
    expect(step?.line).toEqual({ kind: 'row', index: 0 });
    expect(step?.cells).toEqual([
      { cell: 0, value: X },
      { cell: 1, value: X },
      { cell: 2, value: F },
      { cell: 3, value: F },
    ]);
    expect(nextCrossStep(5, rows, twos, cells, 2)).toBeUndefined();
  });

  it('lowest level first, then rows before columns', () => {
    // Row 4 is a full line (level 1) although earlier rows give overlap (level 2).
    const rows = [[3], [3], [3], [3], [5]];
    expect(nextCrossStep(5, rows, threes, none, 3)?.line).toEqual({ kind: 'row', index: 4 });
    // Same level: the row comes before the column.
    expect(nextCrossStep(5, threes, threes, none, 3)?.line).toEqual({ kind: 'row', index: 0 });
    // Only a column has an overlap here.
    const ones = [[1], [1], [1], [1], [1]];
    const cols = [[2], [2], [4], [2], [2]];
    expect(nextCrossStep(5, ones, cols, none, 3)?.line).toEqual({ kind: 'column', index: 2 });
  });

  it('a line in contradiction is skipped; nothing new gives undefined', () => {
    // Row 0 wants a run of 3 between two filled cells 4 apart; column 0 still gives a step.
    const cells = [...none];
    cells[0] = F;
    cells[4] = F;
    const twos = [[2], [2], [2], [2], [2]];
    const step = nextCrossStep(5, [[3], [2], [2], [2], [2]], twos, cells, 3);
    expect(step?.line).toEqual({ kind: 'column', index: 0 });
    const solved = parsePicture(PICTURES.plus?.rows ?? []);
    const { rows, cols } = pictureClues(solved.size, solved.solution);
    const full = solved.solution.map((filled) => (filled ? F : X));
    expect(nextCrossStep(5, rows, cols, full, 3)).toBeUndefined();
  });

  it('throws when clues or cells do not fit the size', () => {
    expect(() => nextCrossStep(5, threes.slice(1), threes, none, 3)).toThrow(/5 × 5/);
    expect(() => nextCrossStep(5, threes, threes, none.slice(1), 3)).toThrow(/5 × 5/);
    expect(() => humanSolveCross(5, threes, threes.slice(1), 3)).toThrow(/5 × 5/);
  });
});

describe('a picture with two solutions', () => {
  it('lines alone cannot finish it', () => {
    // A diagonal pair: `#.` / `.#` and `.#` / `#.` give the same clues.
    const { size, solution } = parsePicture(['#....', '.#...', '.....', '.....', '.....']);
    const { rows, cols } = pictureClues(size, solution);
    const result = humanSolveCross(size, rows, cols, 3);
    expect(result.solved).toBe(false);
    expect(result.cells.some((cell) => cell === undefined)).toBe(true);
  });
});

describe('humanSolveCross is sound', () => {
  it('on 200 random 5 × 5 pictures every step is a correct deduction', () => {
    const random = seededRandom(5);
    let solvedCount = 0;
    for (let n = 0; n < 200; n += 1) {
      const rows = Array.from({ length: 5 }, () =>
        Array.from({ length: 5 }, () => (random.next() < 0.55 ? '#' : '.')).join(''),
      );
      const { size, solution } = parsePicture(rows);
      const clues = pictureClues(size, solution);
      const result = humanSolveCross(size, clues.rows, clues.cols, 3);
      for (const step of result.steps) {
        for (const { cell, value } of step.cells) {
          expect(value).toBe(solution[cell] ? F : X);
        }
      }
      if (result.solved) {
        solvedCount += 1;
        expect(result.cells).toEqual(solution.map((filled) => (filled ? F : X)));
      }
    }
    // Most random pictures are line-solvable; the rest (ambiguous or needing guesses) stay stuck.
    expect(solvedCount).toBeGreaterThan(100);
  });
});
