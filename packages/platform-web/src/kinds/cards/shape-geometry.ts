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

/** The largest side of a token box and the gap between boxes. A prompt row holds at most 8 tokens, so a row of 6 or more keeps boxes of at
 * most 4 rem (8 tokens fit one line at 390 px); a row of at most `ROOMY_ROW_MAX` tokens has room for 7 rem, so a group of shapes or a
 * pattern reads at the size of the card (the box side is `min(cap, (row width − gaps) / count)`, so it follows the card's width). The
 * Story step's compact row stays small. */
export const ROOMY_ROW_MAX = 5;
const BOX_MAX = { normal: '4rem', roomy: '7rem', compact: '2.25rem' } as const;
const BOX_GAP = { normal: '0.5rem', clusters: '0.75rem', compact: '0.25rem' } as const;

/** The gap between the boxes of a row: wider (0.75 rem) when a token is a cluster (it sits on its own tile, and the tiles read as groups),
 * 0.5 rem otherwise, 0.25 rem in the compact row. */
export function shapeBoxGap(compact: boolean, clusters: boolean): string {
  return BOX_GAP[compact ? 'compact' : clusters ? 'clusters' : 'normal'];
}

/** The side of every token box of a row of `count`: `min(cap, calc((row width − the gaps) / count))`, so the row never wraps (8 tokens fit
 * one line at 390 px) and the boxes stay square and alike. Plain `calc` / `min` (no container units: iOS 15 has none): the percentage
 * resolves against the row, which is as wide as the card's content. `clusters`: the row has a cluster (a token with a `count` above 1). */
export function shapeBoxSide(count: number, compact: boolean, clusters = false): string {
  const cap = BOX_MAX[compact ? 'compact' : count <= ROOMY_ROW_MAX ? 'roomy' : 'normal'];
  return `min(${cap}, calc((100% - ${shapeBoxGap(compact, clusters)} * ${String(count - 1)}) / ${String(count)}))`;
}
