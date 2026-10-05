// What the W1 pattern templates draw their tokens from: the values of one attribute (a colour, a kind, a size, or a kind and a colour
// together) chosen so that no two tokens of an exercise look alike to a child: colours never form a confusable pair (the kit's
// colour-blind rule, `shape-colours.ts`: red-green, green-orange, blue-purple), a square and a diamond never share an exercise, and
// sizes are only tiny / medium / huge (the steps between are too small to tell apart in a row).
import {
  SHAPE_COLOURS,
  SHAPE_KINDS,
  shapeFacts,
  type CardShape,
  type ShapeColour,
  type ShapeKind,
  type ShapeSize,
} from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import { pick, shuffle, type Random } from '@learn/platform-core/domain/random';
import { confusableColours } from '@learn/platform-content/kinds/cards/shape-colours';
import { z } from 'zod';

/** What a pattern varies: one attribute, or two together (every token its own kind and its own colour). */
export const ATTRS = ['colour', 'kind', 'size', 'kind+colour'] as const;
export const attrParam = z.enum(ATTRS);
export type Attr = z.output<typeof attrParam>;

/** The sizes a pattern uses: far enough apart to tell at a glance. */
export const PATTERN_SIZES = ['tiny', 'medium', 'huge'] as const satisfies readonly ShapeSize[];

/** A token as a card compares it: its facts, defaults filled in. */
export function tokenKey(shape: CardShape): string {
  return shapeFacts(shape).join('|');
}

/** Every `size`-element subset of `items`, in list order. */
function subsetsOf<T>(items: readonly T[], size: number): readonly (readonly T[])[] {
  if (size === 0) return [[]];
  return items.flatMap((item, index) =>
    subsetsOf(items.slice(index + 1), size - 1).map((rest) => [item, ...rest]),
  );
}

/** The sets of `size` colours with no confusable pair. */
function colourSets(size: number): readonly (readonly ShapeColour[])[] {
  return subsetsOf(SHAPE_COLOURS, size).filter((set) =>
    set.every((a, index) => set.slice(index + 1).every((b) => !confusableColours(a, b))),
  );
}

/** The sets of `size` kinds that do not hold both a square and a diamond. */
function kindSets(size: number): readonly (readonly ShapeKind[])[] {
  return subsetsOf(SHAPE_KINDS, size).filter(
    (set) => !(set.includes('square') && set.includes('diamond')),
  );
}

/** The values of one attribute that a pattern's tokens take, and one more token outside the pattern when the attribute has a value
 * left over (sizes with three values in the unit have none). */
export interface Palette {
  /** One token per distinct symbol of the unit (A, B, C), in that order. */
  readonly values: readonly CardShape[];
  /** A token that is not in the pattern: the same attribute with a value the unit does not use. */
  readonly outside?: CardShape;
}

/** Tokens for `valueCount` (2 or 3) distinct symbols over `attr`, and an `outside` token when `wantOutside` and one exists. Draws a
 * fixed number of times per attribute, in a fixed order. */
export function drawPalette(
  random: Random,
  attr: Attr,
  valueCount: number,
  wantOutside: boolean,
): Palette {
  const total = valueCount + (wantOutside ? 1 : 0);
  if (attr === 'size') {
    const kind = pick(random, SHAPE_KINDS);
    const colour = pick(random, SHAPE_COLOURS);
    const sizes = shuffle(PATTERN_SIZES, random);
    const tokens = sizes.map((size): CardShape => ({ kind, colour, size }));
    return outsideOf(tokens, valueCount, wantOutside);
  }
  if (attr === 'colour') {
    const kind = pick(random, SHAPE_KINDS);
    const colours = shuffle(pick(random, colourSets(total)), random);
    return outsideOf(
      colours.map((colour): CardShape => ({ kind, colour })),
      valueCount,
      wantOutside,
    );
  }
  if (attr === 'kind') {
    const colour = pick(random, SHAPE_COLOURS);
    const kinds = shuffle(pick(random, kindSets(total)), random);
    return outsideOf(
      kinds.map((kind): CardShape => ({ kind, colour })),
      valueCount,
      wantOutside,
    );
  }
  const kinds = shuffle(pick(random, kindSets(total)), random);
  const colours = shuffle(pick(random, colourSets(total)), random);
  return outsideOf(
    kinds.map((kind, index): CardShape => ({ kind, colour: colours[index] ?? 'red' })),
    valueCount,
    wantOutside,
  );
}

/** The first `valueCount` tokens are the pattern's values, the next one (when asked for and there is one) the outside token. */
function outsideOf(
  tokens: readonly CardShape[],
  valueCount: number,
  wantOutside: boolean,
): Palette {
  const outside = wantOutside ? tokens[valueCount] : undefined;
  return {
    values: tokens.slice(0, valueCount),
    ...(outside === undefined ? {} : { outside }),
  };
}
