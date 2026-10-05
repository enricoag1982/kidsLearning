import { useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { GridSize } from '@learn/platform-core';

/** Padding between the board's outer frame and its cells, in px. */
export const GRID_FRAME_PX = 12;

/** Clue lanes along the top and left edges, in px (0 = no lane). */
export interface GridLanes {
  readonly top: number;
  readonly left: number;
}

export const NO_LANES: GridLanes = { top: 0, left: 0 };

/** Lane text metrics (px): an 18 px bold label on a 22 px line; a character is estimated wide (11 px) so a label never
 * overruns its lane; words in a left label stand 8 px apart ("1 1" must not read as "11"); the pad is the room around the
 * text, half of it the gap to the cells. */
export const LANE_FONT_PX = 18;
export const LANE_LINE_PX = 22;
export const LANE_CHAR_PX = 11;
export const LANE_WORD_GAP_PX = 8;
export const LANE_PAD_PX = 8;

/** The sizes a board is laid out with: the frame around the cells and the clue lanes' text. */
export interface BoardMetrics {
  /** Padding between the outer frame and the cells. */
  readonly frame: number;
  readonly laneFont: number;
  readonly laneLine: number;
  /** Estimated width of one character of a left label. */
  readonly laneChar: number;
  readonly laneWordGap: number;
  readonly lanePad: number;
  /** Room between a left label's last digit and the cells. */
  readonly laneInset: number;
}

export const REGULAR_METRICS: BoardMetrics = {
  frame: GRID_FRAME_PX,
  laneFont: LANE_FONT_PX,
  laneLine: LANE_LINE_PX,
  laneChar: LANE_CHAR_PX,
  laneWordGap: LANE_WORD_GAP_PX,
  lanePad: LANE_PAD_PX,
  laneInset: 8,
};

/** A board with clue lanes on a phone (picture cross: its 5 cells must stay ≥ 48 px in the height the lesson leaves): an 8 px frame
 * and 14 px labels on 16 px lines, closer together. */
export const COMPACT_METRICS: BoardMetrics = {
  frame: 8,
  laneFont: 14,
  laneLine: 16,
  laneChar: 9,
  laneWordGap: 6,
  lanePad: 4,
  laneInset: 4,
};

/** The words of a clue label, one per line in a top lane ("1 1" is two lines); empty for a blank label. */
export function clueLines(label: string): readonly string[] {
  return label.split(/\s+/).filter((word) => word !== '');
}

/** The lanes `edgeLabels` need: the top lane is as tall as its label with the most lines, the left lane as wide as its
 * longest label (a label's words stand on one line there). */
export function laneSizes(
  edgeLabels?: {
    readonly top?: readonly string[];
    readonly left?: readonly string[];
  },
  metrics: BoardMetrics = REGULAR_METRICS,
): GridLanes {
  const lines = Math.max(0, ...(edgeLabels?.top ?? []).map((label) => clueLines(label).length));
  const text = Math.max(
    0,
    ...(edgeLabels?.left ?? []).map((label) => {
      const words = clueLines(label);
      const chars = words.reduce((sum, word) => sum + Array.from(word).length, 0);
      return words.length === 0
        ? 0
        : chars * metrics.laneChar + (words.length - 1) * metrics.laneWordGap;
    }),
  );
  return {
    top: lines > 0 ? lines * metrics.laneLine + metrics.lanePad : 0,
    left: text > 0 ? text + 2 * metrics.lanePad : 0,
  };
}

/** The largest whole-pixel cell side such that `size` cells, the frame and the clue `lanes` fit `area`; 0 for an area with
 * no room. */
export function fitCellSize(
  size: GridSize,
  area: { readonly width: number; readonly height: number },
  lanes: GridLanes = NO_LANES,
  frame: number = GRID_FRAME_PX,
): number {
  const byWidth = (area.width - 2 * frame - lanes.left) / size.cols;
  const byHeight = (area.height - 2 * frame - lanes.top) / size.rows;
  return Math.max(0, Math.floor(Math.min(byWidth, byHeight)));
}

/** Measures the element behind the returned ref (the board's sizing area) and returns the cell side that fits it, or `null`
 * until measured (and always in jsdom, which has no `ResizeObserver`): the board then falls back to CSS-only sizing. Unlike
 * the chess board's `FitSquare` it follows its area in both directions. */
export function useGridFit(
  size: GridSize,
  lanes: GridLanes = NO_LANES,
  frame: number = GRID_FRAME_PX,
): {
  readonly areaRef: RefObject<HTMLDivElement | null>;
  readonly cell: number | null;
} {
  const areaRef = useRef<HTMLDivElement | null>(null);
  const [cell, setCell] = useState<number | null>(null);
  const { cols, rows } = size;
  const { top, left } = lanes;

  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area || typeof ResizeObserver === 'undefined') return;
    const measure = (): void => {
      const rect = area.getBoundingClientRect();
      const fitted = fitCellSize({ cols, rows }, rect, { top, left }, frame);
      setCell(fitted > 0 ? fitted : null);
    };
    // First size now, before paint: the observer's first callback lands a frame later.
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(area);
    return () => {
      observer.disconnect();
    };
  }, [cols, rows, top, left, frame]);

  return { areaRef, cell };
}
