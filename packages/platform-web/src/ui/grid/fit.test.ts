import { describe, expect, it } from 'vitest';
import {
  GRID_FRAME_PX,
  LANE_CHAR_PX,
  LANE_LINE_PX,
  LANE_PAD_PX,
  LANE_WORD_GAP_PX,
  clueLines,
  fitCellSize,
  laneSizes,
} from './fit.ts';

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

describe('clue lanes', () => {
  it('splits a clue label into its words', () => {
    expect(clueLines('1 1')).toEqual(['1', '1']);
    expect(clueLines('  3  ')).toEqual(['3']);
    expect(clueLines('')).toEqual([]);
    expect(clueLines('  ')).toEqual([]);
  });

  it('is 0 without labels', () => {
    expect(laneSizes()).toEqual({ top: 0, left: 0 });
    expect(laneSizes({})).toEqual({ top: 0, left: 0 });
    expect(laneSizes({ top: ['', ' '], left: [] })).toEqual({ top: 0, left: 0 });
  });

  it('makes the top lane as tall as its label with the most words, the left lane as wide as its longest label', () => {
    expect(laneSizes({ top: ['1', '1 1', '2'] })).toEqual({
      top: 2 * LANE_LINE_PX + LANE_PAD_PX,
      left: 0,
    });
    expect(laneSizes({ top: ['1 1 1'], left: ['1', '1 1 1', '3'] })).toEqual({
      top: 3 * LANE_LINE_PX + LANE_PAD_PX,
      left: 3 * LANE_CHAR_PX + 2 * LANE_WORD_GAP_PX + 2 * LANE_PAD_PX,
    });
  });

  it('takes the lanes off the room: width by the left lane, height by the top lane', () => {
    const area = { width: 600, height: 400 };
    const size = { cols: 5, rows: 5 };
    const plain = fitCellSize(size, area);
    expect(fitCellSize(size, area, { top: 0, left: 0 })).toBe(plain);
    // Height-bound: 400 - 24 - 50 = 326 / 5 = 65.2.
    expect(fitCellSize(size, area, { top: 50, left: 30 })).toBe(65);
    // Width-bound: 600 - 24 - 300 = 276 / 5 = 55.2.
    expect(fitCellSize(size, area, { top: 50, left: 300 })).toBe(55);
    expect(fitCellSize(size, area, { top: 0, left: 9999 })).toBe(0);
  });

  it('keeps a 5 x 5 picture cross with lanes tappable on a 1024 x 768 tablet', () => {
    const lanes = laneSizes({
      top: ['1 1', '3', '1 1', '5', '2'],
      left: ['1 1', '3', '1 1', '5', '2'],
    });
    expect(
      fitCellSize({ cols: 5, rows: 5 }, { width: 566, height: 566 }, lanes),
    ).toBeGreaterThanOrEqual(48);
  });
});
