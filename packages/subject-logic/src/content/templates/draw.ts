// Small helpers the W1 templates share.
import type { Where } from '@learn/platform-content/subject';

/** Pushes `message` as an issue of this item. */
export function fail(at: Where, message: string): void {
  at.issues.push(`${at.where}: ${message}`);
}

/** The integers `from` … `to`, both included (empty when `to < from`). */
export function range(from: number, to: number): readonly number[] {
  return Array.from({ length: Math.max(0, to - from + 1) }, (_unused, index) => from + index);
}
