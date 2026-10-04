// The Venn board in drawing units (the SVG's viewBox): two overlapping circles in a frame, a label band above them, a strip below
// for "neither", and the four zone buttons laid over their regions as rectangles that stay inside them. The buttons are placed in
// percent of the board, so they scale with the SVG; at a phone's 358 px board every one stays above 64 px.
import type { VennZone } from '@learn/platform-core';

export const VENN_VIEW = { width: 360, height: 340 } as const;

/** The two circles: A on the left, B on the right, overlapping by 100 units. */
export const VENN_CIRCLES = [
  { cx: 130, cy: 140, r: 100 },
  { cx: 230, cy: 140, r: 100 },
] as const;

/** The label band above the circles: where each circle's name sits (the centre of its visible crescent, in x). */
export const VENN_LABELS = [
  { x: 10, width: 160, y: 2, height: 36 },
  { x: 190, width: 160, y: 2, height: 36 },
] as const;

export interface VennRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Each zone's button, in drawing units: inside the lens, the two crescents, and the strip under the circles. */
export const VENN_RECTS: Readonly<Record<VennZone, VennRect>> = {
  'only-a': { x: 40, y: 102, width: 82, height: 76 },
  both: { x: 140, y: 102, width: 80, height: 76 },
  'only-b': { x: 238, y: 102, width: 82, height: 76 },
  neither: { x: 20, y: 252, width: 320, height: 78 },
};

/** A rectangle as CSS percentages of the board. */
export function percentOf(rect: VennRect): {
  readonly left: string;
  readonly top: string;
  readonly width: string;
  readonly height: string;
} {
  const pct = (value: number, whole: number): string => `${String((value / whole) * 100)}%`;
  return {
    left: pct(rect.x, VENN_VIEW.width),
    top: pct(rect.y, VENN_VIEW.height),
    width: pct(rect.width, VENN_VIEW.width),
    height: pct(rect.height, VENN_VIEW.height),
  };
}
