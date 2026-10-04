import { describe, expect, it } from 'vitest';
import { VENN_ZONES } from '@learn/platform-core';
import type { VennZone } from '@learn/platform-core';
import { percentOf, VENN_CIRCLES, VENN_LABELS, VENN_RECTS, VENN_VIEW } from './venn-geometry.ts';
import type { VennRect } from './venn-geometry.ts';

const [A, B] = VENN_CIRCLES;
const inside = (circle: (typeof VENN_CIRCLES)[number], x: number, y: number): boolean =>
  (x - circle.cx) ** 2 + (y - circle.cy) ** 2 < circle.r ** 2;
const corners = (rect: VennRect): readonly (readonly [number, number])[] => [
  [rect.x, rect.y],
  [rect.x + rect.width, rect.y],
  [rect.x, rect.y + rect.height],
  [rect.x + rect.width, rect.y + rect.height],
];

/** Which circles contain a point: the region it is in. */
function regionOf(x: number, y: number): VennZone {
  const a = inside(A, x, y);
  const b = inside(B, x, y);
  if (a && b) return 'both';
  if (a) return 'only-a';
  return b ? 'only-b' : 'neither';
}

describe('Venn geometry', () => {
  it('every zone button lies inside its own region: all four corners and the centre', () => {
    for (const zone of VENN_ZONES) {
      const rect = VENN_RECTS[zone];
      const points = [
        ...corners(rect),
        [rect.x + rect.width / 2, rect.y + rect.height / 2],
      ] as const;
      for (const [x, y] of points)
        expect(regionOf(x, y), `${zone} at ${String(x)},${String(y)}`).toBe(zone);
    }
  });

  it('no two zone buttons overlap', () => {
    const rects = VENN_ZONES.map((zone) => VENN_RECTS[zone]);
    for (const [index, one] of rects.entries()) {
      for (const other of rects.slice(index + 1)) {
        const apart =
          one.x + one.width <= other.x ||
          other.x + other.width <= one.x ||
          one.y + one.height <= other.y ||
          other.y + other.height <= one.y;
        expect(apart).toBe(true);
      }
    }
  });

  it('everything stays inside the frame, the circles under the label band', () => {
    for (const rect of [...VENN_ZONES.map((zone) => VENN_RECTS[zone]), ...VENN_LABELS]) {
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(VENN_VIEW.width);
      expect(rect.y + rect.height).toBeLessThanOrEqual(VENN_VIEW.height);
    }
    const bandBottom = Math.max(...VENN_LABELS.map((label) => label.y + label.height));
    for (const circle of VENN_CIRCLES) {
      expect(circle.cy - circle.r).toBeGreaterThanOrEqual(bandBottom);
      expect(circle.cy + circle.r).toBeLessThanOrEqual(VENN_RECTS.neither.y);
    }
  });

  it('every zone button is at least 64 px on a phone (390 px screen: 358 px board) and on a 320 px panel', () => {
    for (const board of [358, 320]) {
      const scale = board / VENN_VIEW.width;
      for (const zone of VENN_ZONES) {
        const { width, height } = VENN_RECTS[zone];
        expect(width * scale, `${zone} wide at ${String(board)}`).toBeGreaterThanOrEqual(64);
        expect(height * scale, `${zone} tall at ${String(board)}`).toBeGreaterThanOrEqual(64);
      }
    }
  });

  it('percentOf maps drawing units to percent of the board', () => {
    expect(percentOf({ x: 0, y: 0, width: VENN_VIEW.width, height: VENN_VIEW.height })).toEqual({
      left: '0%',
      top: '0%',
      width: '100%',
      height: '100%',
    });
    const half = percentOf({ x: 90, y: 85, width: 180, height: 170 });
    expect(half).toEqual({ left: '25%', top: '25%', width: '50%', height: '50%' });
  });
});
