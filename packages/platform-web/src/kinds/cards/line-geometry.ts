// The geometry of the card kit's number-line picture (`LinePicture.tsx`): one drawing box, where a value sits on it, which numbers
// get a label. Pure, so the picture's layout is testable without a browser.
import type { CardLine } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';

/** The drawing box (user units; the SVG scales it to the card's width) and the line's own left / right ends and height in it. The
 * side padding leaves room for a dot and a 3-digit label at either end. */
export const LINE_BOX = { width: 400, height: 80, left: 28, right: 372, y: 46 } as const;

/** Half the height of a tick and of an end tick (the ends stand out), the dot's radius, and the text baselines of the marks (above the
 * line) and of the end labels (below it). */
export const LINE_TICK = {
  half: 6,
  endHalf: 11,
  dot: 9,
  markBaseline: 24,
  endBaseline: 76,
} as const;

/** The x of `value` on the line: `from` at the left end, `to` at the right end. */
export function lineX(line: CardLine, value: number): number {
  const fraction = (value - line.from) / (line.to - line.from);
  return LINE_BOX.left + fraction * (LINE_BOX.right - LINE_BOX.left);
}

/** Every tick value, left to right (both ends included). */
export function lineTicks(line: CardLine): readonly number[] {
  const gaps = Math.round((line.to - line.from) / line.step);
  return Array.from({ length: gaps + 1 }, (_unused, index) => line.from + index * line.step);
}

/** The ends that get their own label: an end with a dot is labelled by the dot's number, so its number is not written twice. */
export function endLabels(line: CardLine): readonly number[] {
  return [line.from, line.to].filter((end) => !line.marks.includes(end));
}
