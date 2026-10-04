// The line's arithmetic, shared by the engine, the content checks, the voice inventory and the UI. Pure: no UI, no content.
import type { NumberLineDef } from './def.ts';

type Line = Pick<NumberLineDef, 'from' | 'to' | 'step'>;

/** How many gaps the line has: a whole number for a valid line (the content checks vouch for that). */
export function gapCount({ from, to, step }: Line): number {
  return (to - from) / step;
}

/** Every tick, left to right (both ends included). */
export function tickValues(line: Line): readonly number[] {
  const count = Math.max(0, Math.floor(gapCount(line)));
  return Array.from({ length: count + 1 }, (_unused, index) => line.from + index * line.step);
}

/** `value` sits exactly on a tick of the line. */
export function isTick({ from, to, step }: Line, value: number): boolean {
  return value >= from && value <= to && (value - from) % step === 0;
}

/** The tick nearest `raw`, ends included (a half-way point goes right). */
export function nearestTick({ from, to, step }: Line, raw: number): number {
  const clamped = Math.min(to, Math.max(from, raw));
  const tick = from + Math.round((clamped - from) / step) * step;
  return Math.min(to, tick);
}

/** The whole number nearest `raw` on the line. */
export function nearestInteger({ from, to }: Line, raw: number): number {
  return Math.min(to, Math.max(from, Math.round(raw)));
}

/** The value Check accepts: exactly the target, or (an estimate) within +- `tolerance` of it, both ends inclusive. */
export function isAccepted(
  def: Pick<NumberLineDef, 'target' | 'tolerance'>,
  value: number,
): boolean {
  return Math.abs(value - def.target) <= def.tolerance;
}

/** Hint 1's tick: the middle of the line, rounded to a tick (a line of an odd number of gaps has none exactly: the right one). */
export function benchmarkOf({ from, to, step }: Line): number {
  return from + Math.round((to - from) / 2 / step) * step;
}

/** The ticks that show their number, before any hint. */
export function labelledTicks(
  def: Pick<NumberLineDef, 'from' | 'to' | 'step' | 'labels'>,
): readonly number[] {
  if (def.labels === 'all') return tickValues(def);
  if (def.labels === 'ends') return [def.from, def.to];
  return def.labels;
}

/** Where a key moves the marker from `current` (clamped to the line), or `undefined` for a key that does not move it: an arrow goes one
 * tick (an exact item) or one whole number (an estimate item), Page Up / Down one interval, Home / End the ends. */
export function keyTarget(
  def: Pick<NumberLineDef, 'from' | 'to' | 'step' | 'tolerance'>,
  current: number,
  key: string,
): number | undefined {
  const arrow = def.tolerance > 0 ? 1 : def.step;
  const moved = ((): number | undefined => {
    switch (key) {
      case 'ArrowRight':
      case 'ArrowUp':
        return current + arrow;
      case 'ArrowLeft':
      case 'ArrowDown':
        return current - arrow;
      case 'PageUp':
        return current + def.step;
      case 'PageDown':
        return current - def.step;
      case 'Home':
        return def.from;
      case 'End':
        return def.to;
      default:
        return undefined;
    }
  })();
  return moved === undefined ? undefined : Math.min(def.to, Math.max(def.from, moved));
}
