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
 * overruns its lane; the pad is the room around the text, half of it the gap to the cells. */
export const LANE_FONT_PX = 18;
export const LANE_LINE_PX = 22;
export const LANE_CHAR_PX = 11;
export const LANE_PAD_PX = 8;

/** The words of a clue label, one per line in a top lane ("1 1" is two lines); empty for a blank label. */
export function clueLines(label: string): readonly string[] {
  return label.split(/\s+/).filter((word) => word !== '');
}

/** The lanes `edgeLabels` need: the top lane is as tall as its label with the most lines, the left lane as wide as its
 * longest label (a label's words stand on one line there). */
export function laneSizes(edgeLabels?: {
  readonly top?: readonly string[];
  readonly left?: readonly string[];
}): GridLanes {
  const lines = Math.max(0, ...(edgeLabels?.top ?? []).map((label) => clueLines(label).length));
  const chars = Math.max(
    0,
    ...(edgeLabels?.left ?? []).map((label) => Array.from(clueLines(label).join(' ')).length),
  );
  return {
    top: lines > 0 ? lines * LANE_LINE_PX + LANE_PAD_PX : 0,
    left: chars > 0 ? chars * LANE_CHAR_PX + 2 * LANE_PAD_PX : 0,
  };
}

/** The largest whole-pixel cell side such that `size` cells, the frame and the clue `lanes` fit `area`; 0 for an area with
 * no room. */
export function fitCellSize(
  size: GridSize,
  area: { readonly width: number; readonly height: number },
  lanes: GridLanes = NO_LANES,
): number {
  const byWidth = (area.width - 2 * GRID_FRAME_PX - lanes.left) / size.cols;
  const byHeight = (area.height - 2 * GRID_FRAME_PX - lanes.top) / size.rows;
  return Math.max(0, Math.floor(Math.min(byWidth, byHeight)));
}

/** Measures the element behind the returned ref (the board's sizing area) and returns the cell side that fits it, or `null`
 * until measured (and always in jsdom, which has no `ResizeObserver`): the board then falls back to CSS-only sizing. Unlike
 * the chess board's `FitSquare` it follows its area in both directions. */
export function useGridFit(
  size: GridSize,
  lanes: GridLanes = NO_LANES,
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
      const fitted = fitCellSize({ cols, rows }, rect, { top, left });
      setCell(fitted > 0 ? fitted : null);
    };
    // First size now, before paint: the observer's first callback lands a frame later.
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(area);
    return () => {
      observer.disconnect();
    };
  }, [cols, rows, top, left]);

  return { areaRef, cell };
}
