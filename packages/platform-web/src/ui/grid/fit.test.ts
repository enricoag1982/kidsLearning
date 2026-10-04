import { describe, expect, it } from 'vitest';
import { GRID_FRAME_PX, fitCellSize } from './fit.ts';

describe('fitCellSize', () => {
  it('is bound by the width or the height, whichever is smaller, in whole pixels', () => {
    const frame = 2 * GRID_FRAME_PX;
    expect(fitCellSize({ cols: 5, rows: 5 }, { width: 500, height: 900 })).toBe(
      Math.floor((500 - frame) / 5),
    );
    expect(fitCellSize({ cols: 5, rows: 5 }, { width: 900, height: 500 })).toBe(
      Math.floor((500 - frame) / 5),
    );
    expect(fitCellSize({ cols: 10, rows: 4 }, { width: 1000, height: 400 })).toBe(
      Math.floor((400 - frame) / 4),
    );
    expect(fitCellSize({ cols: 10, rows: 4 }, { width: 400, height: 1000 })).toBe(
      Math.floor((400 - frame) / 10),
    );
  });

  it('keeps cells tappable (≥ 48 px) for a 6 x 6 grid on a 1024 x 768 tablet, and a 10 x 10 one still ≥ 48 px', () => {
    // Landscape: the board area is the height the lesson chrome leaves (docs/screens.md §1: 566 px measured).
    expect(fitCellSize({ cols: 6, rows: 6 }, { width: 566, height: 566 })).toBeGreaterThanOrEqual(
      48,
    );
    expect(fitCellSize({ cols: 10, rows: 10 }, { width: 566, height: 566 })).toBeGreaterThanOrEqual(
      48,
    );
    // Portrait 768 x 954: width-bound.
    expect(fitCellSize({ cols: 6, rows: 6 }, { width: 736, height: 537 })).toBeGreaterThanOrEqual(
      48,
    );
  });

  it('is 0 for an area with no room', () => {
    expect(fitCellSize({ cols: 6, rows: 6 }, { width: 0, height: 0 })).toBe(0);
    expect(fitCellSize({ cols: 6, rows: 6 }, { width: 20, height: 500 })).toBe(0);
  });
});
