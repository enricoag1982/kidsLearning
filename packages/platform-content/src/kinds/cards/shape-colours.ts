// Colour-blind rule of the card kit's shape tokens: two colours of one pair are hard to tell apart for a child with a common
// colour-vision deficiency (red-green, and green-orange next to it), and blue / purple blur at small sizes. Inside one exercise
// two tokens may not differ only by such a pair: another fact (kind, size or count) must tell them apart too.
import type { ShapeColour } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';

/** The confusable colour pairs (unordered). */
export const CONFUSABLE_COLOUR_PAIRS: readonly (readonly [ShapeColour, ShapeColour])[] = [
  ['red', 'green'],
  ['green', 'orange'],
  ['blue', 'purple'],
];

/** True when `a` and `b` are the two colours of one confusable pair, in either order. */
export function confusableColours(a: ShapeColour, b: ShapeColour): boolean {
  return CONFUSABLE_COLOUR_PAIRS.some(
    ([first, second]) => (a === first && b === second) || (a === second && b === first),
  );
}
