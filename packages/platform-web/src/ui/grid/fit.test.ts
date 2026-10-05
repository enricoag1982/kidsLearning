import { describe, expect, it } from 'vitest';
import {
  COMPACT_METRICS,
  GRID_FRAME_PX,
  LANE_CHAR_PX,
  LANE_LINE_PX,
  LANE_PAD_PX,
  LANE_WORD_GAP_PX,
  REGULAR_METRICS,
  clueLines,
  fitCellSize,
  NO_LANES,
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

describe('compact metrics (a board with clue lanes on a phone)', () => {
  const THREE_LINES = {
    top: ['1 1 1', '1', '3', '1 1', '2'],
    left: ['1 1 1', '1', '3', '1 1', '2'],
  };
  const TWO_LINES = { top: ['2 1', '1', '3', '1 1', '2'], left: ['1 1', '3', '1', '1 1 1', '2'] };

  it('has the regular constants as its regular metrics', () => {
    expect(REGULAR_METRICS).toEqual({
      frame: GRID_FRAME_PX,
      laneFont: 18,
      laneLine: LANE_LINE_PX,
      laneChar: LANE_CHAR_PX,
      laneWordGap: LANE_WORD_GAP_PX,
      lanePad: LANE_PAD_PX,
      laneInset: 8,
    });
    expect(laneSizes(THREE_LINES, REGULAR_METRICS)).toEqual(laneSizes(THREE_LINES));
  });

  it('sizes the lanes with 16 px lines, 9 px characters, 6 px word gaps and a 4 px pad', () => {
    expect(laneSizes(THREE_LINES, COMPACT_METRICS)).toEqual({
      top: 3 * 16 + 4,
      left: 3 * 9 + 2 * 6 + 2 * 4,
    });
    expect(laneSizes(TWO_LINES, COMPACT_METRICS).top).toBe(2 * 16 + 4);
    expect(COMPACT_METRICS.laneFont).toBeGreaterThanOrEqual(14);
  });

  it('keeps the 5 x 5 picture cross cells at 48 px or more in the board heights a 390 x 844 phone leaves (318 px; 297 px with an Owl note and an Easier button)', () => {
    const size = { cols: 5, rows: 5 };
    for (const [labels, height] of [
      [THREE_LINES, 318],
      [TWO_LINES, 318],
      [TWO_LINES, 297],
    ] as const) {
      const lanes = laneSizes(labels, COMPACT_METRICS);
      const fitted = fitCellSize(size, { width: 366, height }, lanes, COMPACT_METRICS.frame);
      expect(fitted, `${String(labels.top[0])} ${String(height)}`).toBeGreaterThanOrEqual(48);
    }
  });

  it('is what the same phone gave before: 40 to 45 px cells in the regular metrics (302 px and 278 px board heights)', () => {
    const size = { cols: 5, rows: 5 };
    expect(fitCellSize(size, { width: 366, height: 302 }, laneSizes(THREE_LINES))).toBe(40);
    expect(fitCellSize(size, { width: 366, height: 302 }, laneSizes(TWO_LINES))).toBe(45);
    expect(fitCellSize(size, { width: 366, height: 278 }, laneSizes(TWO_LINES))).toBe(40);
  });

  it('takes the frame off the room: width and height by twice the frame', () => {
    const area = { width: 300, height: 200 };
    expect(fitCellSize({ cols: 5, rows: 5 }, area, NO_LANES, 8)).toBe(Math.floor((200 - 16) / 5));
    expect(fitCellSize({ cols: 5, rows: 5 }, area)).toBe(Math.floor((200 - 24) / 5));
  });
});
