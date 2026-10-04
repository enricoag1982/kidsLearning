import { useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { GridSize } from '@learn/platform-core';

/** Padding between the board's outer frame and its cells, in px. */
export const GRID_FRAME_PX = 12;

/** The largest whole-pixel cell side such that `size` cells plus the frame fit `area`; 0 for an area with no room. */
export function fitCellSize(
  size: GridSize,
  area: { readonly width: number; readonly height: number },
): number {
  const byWidth = (area.width - 2 * GRID_FRAME_PX) / size.cols;
  const byHeight = (area.height - 2 * GRID_FRAME_PX) / size.rows;
  return Math.max(0, Math.floor(Math.min(byWidth, byHeight)));
}

/** Measures the element behind the returned ref (the board's sizing area) and returns the cell side that fits it, or `null`
 * until measured (and always in jsdom, which has no `ResizeObserver`): the board then falls back to CSS-only sizing. Unlike
 * the chess board's `FitSquare` it follows its area in both directions. */
export function useGridFit(size: GridSize): {
  readonly areaRef: RefObject<HTMLDivElement | null>;
  readonly cell: number | null;
} {
  const areaRef = useRef<HTMLDivElement | null>(null);
  const [cell, setCell] = useState<number | null>(null);
  const { cols, rows } = size;

  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area || typeof ResizeObserver === 'undefined') return;
    const measure = (): void => {
      const rect = area.getBoundingClientRect();
      const fitted = fitCellSize({ cols, rows }, rect);
      setCell(fitted > 0 ? fitted : null);
    };
    // First size now, before paint: the observer's first callback lands a frame later.
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(area);
    return () => {
      observer.disconnect();
    };
  }, [cols, rows]);

  return { areaRef, cell };
}
