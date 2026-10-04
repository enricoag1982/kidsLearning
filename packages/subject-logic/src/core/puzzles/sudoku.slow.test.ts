// `pnpm test:slow`: the exhaustive claim behind the naked-single generator sets (M14.6). 288 solutions × 2^16 clue sets ≈ 19 M states.
import { describe, expect, it } from 'vitest';
import { candidates, nextSudokuStep } from './sudoku.ts';

// Every full 4 × 4 grid (288 of them).
function allSolutions(): number[][] {
  const found: number[][] = [];
  const grid = new Array<number>(16).fill(0);
  const fill = (cell: number): void => {
    if (cell === 16) {
      found.push([...grid]);
      return;
    }
    for (const digit of candidates(4, grid, cell)) {
      grid[cell] = digit;
      fill(cell + 1);
    }
    grid[cell] = 0;
  };
  fill(0);
  return found;
}

describe('4 × 4 sudoku and naked singles', () => {
  it('whenever a naked single exists, a last cell or a hidden single exists too', () => {
    const solutions = allSolutions();
    expect(solutions).toHaveLength(288);
    let withNaked = 0;
    for (const solution of solutions) {
      for (let keep = 0; keep < 1 << 16; keep += 1) {
        const grid = solution.map((digit, cell) => (keep & (1 << cell) ? digit : 0));
        if (nextSudokuStep(4, grid, 3, 'naked-single')?.technique !== 'naked-single') {
          continue;
        }
        withNaked += 1;
        // Strictly lowest-first, a 4 × 4 puzzle never needs `naked-single`: the level-2 scan always finds something first.
        if (nextSudokuStep(4, grid, 2) === undefined) {
          expect.fail(`no level-1/2 step but a naked single: ${grid.join('')}`);
        }
      }
    }
    expect(withNaked).toBeGreaterThan(1_000_000);
  }, 300_000);
});
