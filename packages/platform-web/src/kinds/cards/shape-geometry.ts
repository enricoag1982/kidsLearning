// The geometry of the card kit's shape tokens (`ShapeToken.tsx`): paths, size scale, cluster layout, the side of a row's token boxes.
import type { ShapeKind, ShapeSize } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';

/** One path per kind in a 100 × 100 box (a little inside it, so the outline is never clipped). */
export const SHAPE_PATHS: Readonly<Record<ShapeKind, string>> = {
  circle: 'M8 50A42 42 0 1 0 92 50A42 42 0 1 0 8 50Z',
  square: 'M20 10H80Q90 10 90 20V80Q90 90 80 90H20Q10 90 10 80V20Q10 10 20 10Z',
  triangle: 'M50 9L93 87H7Z',
  star: 'M50 7L61.2 37.6L93.7 38.8L68.1 58.9L77 90.2L50 72L23 90.2L31.9 58.9L6.3 38.8L38.8 37.6Z',
  heart:
    'M50 90C20 68 8 50 8 33C8 19 19 10 30 10C40 10 47 16 50 25C53 16 60 10 70 10C81 10 92 19 92 33C92 50 80 68 50 90Z',
  diamond: 'M50 6L90 50L50 94L10 50Z',
};

/** How much of the box the drawing fills, by size. */
export const SHAPE_SIZE_SCALE: Readonly<Record<ShapeSize, number>> = {
  tiny: 0.5,
  small: 0.62,
  medium: 0.75,
  big: 0.88,
  huge: 1,
};

/** A cluster's columns by count: 1 → 1, 2–4 → 2, 5–9 → 3 (never more than 3 × 3). */
export function clusterColumns(count: number): number {
  if (count <= 1) return 1;
  return count <= 4 ? 2 : 3;
}

/** The largest side of a token box (a row shows at most 8 tokens: 4 rem wide at most, 2.25 rem compact) and the gap between boxes. */
const BOX_MAX = { normal: '4rem', compact: '2.25rem' } as const;
const BOX_GAP = { normal: '0.5rem', compact: '0.25rem' } as const;

/** The side of every token box of a row of `count`: `min(max, (row width − the gaps) / count)`, so the row never wraps (8 tokens fit one
 * line at 390 px) and the boxes stay square and alike. Plain `calc` / `min` (no container units: iOS 15 has none). */
export function shapeBoxSide(count: number, compact: boolean): string {
  const size = compact ? 'compact' : 'normal';
  return `min(${BOX_MAX[size]}, calc((100% - ${BOX_GAP[size]} * ${String(count - 1)}) / ${String(count)}))`;
}
