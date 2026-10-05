// What the W2 sorting templates draw their cards from (docs/subjects/logic/curriculum.md §3): the four attributes a card can differ in
// (colour, kind, size, count), the values of each that a child tells apart at a glance and that never look alike (the W1 palette
// rules: no confusable colour pair, no square with a diamond, sizes only tiny / medium / huge), a full token and its drawn shape,
// and the text refs of the box / axis / rule words (`templates.label|not|same.<attr>-<value>` in `lessons.yaml`).
import {
  DEFAULT_SHAPE_COUNT,
  DEFAULT_SHAPE_SIZE,
  SHAPE_COLOURS,
  SHAPE_KINDS,
  type CardShape,
  type ShapeColour,
  type ShapeKind,
  type ShapeSize,
} from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import { pick, shuffle, type Random } from '@learn/platform-core/domain/random';
import { z } from 'zod';
import { colourSets, kindSets, subsetsOf } from './shapes.ts';

/** Every attribute a sorting card can differ in. */
export const CLASS_ATTRS = ['colour', 'kind', 'size', 'count'] as const;
export type ClassAttr = (typeof CLASS_ATTRS)[number];
export const classAttrParam = z.enum(CLASS_ATTRS);

/** The attributes a rule can name without counting ("They are all red", boxes, odd-rule). */
export const SORT_ATTRS = ['colour', 'kind', 'size'] as const;
export type SortAttr = (typeof SORT_ATTRS)[number];
export const sortAttrParam = z.enum(SORT_ATTRS);

/** The sizes a sorting card takes: far enough apart to tell at a glance (as in W1 patterns). */
export const CLASS_SIZES = ['tiny', 'medium', 'huge'] as const satisfies readonly ShapeSize[];

/** The counts a card takes: 1-6. */
const COUNT_VALUES = [1, 2, 3, 4, 5, 6] as const;

/** A value of an attribute: a colour, a kind or a size word, or a count. */
export type ClassValue = string | number;

/** A whole card, every attribute filled in. */
export interface Token {
  readonly kind: ShapeKind;
  readonly colour: ShapeColour;
  readonly size: ShapeSize;
  readonly count: number;
}

/** The sets of `size` counts at least 2 apart (a cluster of 3 is told from a cluster of 4 only by counting). */
function countSets(size: number): readonly (readonly number[])[] {
  return subsetsOf(COUNT_VALUES, size).filter((set) =>
    set.every((a, index) => set.slice(index + 1).every((b) => Math.abs(a - b) >= 2)),
  );
}

/** `n` different values of `attr`, in a random order, that never look alike (n = 1 … 3). */
export function drawValues(random: Random, attr: ClassAttr, n: number): readonly ClassValue[] {
  if (attr === 'colour') return shuffle(pick(random, colourSets(n)), random);
  if (attr === 'kind') return shuffle(pick(random, kindSets(n)), random);
  if (attr === 'size') return shuffle(pick(random, subsetsOf(CLASS_SIZES, n)), random);
  return shuffle(pick(random, countSets(n)), random);
}

/** The value `token` has for `attr`. */
export function valueOf(token: Token, attr: ClassAttr): ClassValue {
  return token[attr];
}

/** `token` with `attr` set to `value`. */
export function withValue(token: Token, attr: ClassAttr, value: ClassValue): Token {
  return { ...token, [attr]: value };
}

/** A token whose attributes outside `varying` are fixed: a random kind and colour, the default size, one shape. The caller sets the
 * attributes it varies. */
export function plainToken(random: Random, varying: ReadonlySet<ClassAttr>): Token {
  return {
    kind: varying.has('kind') ? 'circle' : pick(random, SHAPE_KINDS),
    colour: varying.has('colour') ? 'red' : pick(random, SHAPE_COLOURS),
    size: DEFAULT_SHAPE_SIZE,
    count: DEFAULT_SHAPE_COUNT,
  };
}

/** The drawn shape of a token (the default size and count are left out, as an author would write them). */
export function shapeOf(token: Token): CardShape {
  return {
    kind: token.kind,
    colour: token.colour,
    ...(token.size === DEFAULT_SHAPE_SIZE ? {} : { size: token.size }),
    ...(token.count === DEFAULT_SHAPE_COUNT ? {} : { count: token.count }),
  };
}

/** What a card says about itself, as a rule reads it: `colour:red`. */
export function factOf(attr: ClassAttr, value: ClassValue): string {
  return `${attr}:${String(value)}`;
}

/** A token as one string (two cards with the same key look the same). */
export function tokenId(token: Token): string {
  return `${token.kind}/${token.colour}/${token.size}/${String(token.count)}`;
}

/** The axis value to ask about: a size axis names an end ("Tiny" / "Huge"), never "Medium"; the first of `values` otherwise. Returns
 * `values` with the asked-about value first. */
export function yesFirst(attr: ClassAttr, values: readonly ClassValue[]): readonly ClassValue[] {
  if (attr !== 'size' || values[0] !== 'medium') return values;
  const [, ...rest] = values;
  return [...rest, 'medium'];
}

/** The text refs of an attribute value's words (authored in `lessons.yaml`, `templates.*`). */
export const labelRef = (attr: ClassAttr, value: ClassValue): string =>
  `templates.label.${attr}-${String(value)}`;
export const notRef = (attr: ClassAttr, value: ClassValue): string =>
  `templates.not.${attr}-${String(value)}`;
export const sameRef = (attr: ClassAttr, value: ClassValue): string =>
  `templates.same.${attr}-${String(value)}`;

/** The letters of a choice's options, in the order shown. */
export const LETTERS = ['a', 'b', 'c', 'd'] as const;

/** `c1`, `c2`, … : the ids of the cards of a sorting exercise. */
export function cardId(index: number): string {
  return `c${String(index + 1)}`;
}

/** Every distinct card of `attrs` values (the rest of the token as in `base`): the pool a sorting exercise draws from. */
export function cardPool(
  base: Token,
  columns: readonly { readonly attr: ClassAttr; readonly values: readonly ClassValue[] }[],
): readonly Token[] {
  return columns.reduce<readonly Token[]>(
    (tokens, { attr, values }) =>
      tokens.flatMap((token) => values.map((value) => withValue(token, attr, value))),
    [base],
  );
}

/** One card of a sorting exercise and the box / zone it belongs in. */
export interface Placed<Z extends string> {
  readonly zone: Z;
  readonly token: Token;
}

/** `count` different cards drawn from the cards of each zone (`pools`): one card in every zone of `zones` first, then more from a
 * zone drawn at random that still has a card; shown in a random order. A zone left without cards is skipped. */
export function drawCards<Z extends string>(
  random: Random,
  pools: Readonly<Record<Z, readonly Token[]>>,
  zones: readonly Z[],
  count: number,
): readonly Placed<Z>[] {
  const left = Object.fromEntries(
    zones.map((zone) => [zone, shuffle(pools[zone], random)] as const),
  ) as Record<Z, Token[]>;
  const placed: Placed<Z>[] = [];
  const take = (zone: Z): void => {
    const token = left[zone].pop();
    if (token === undefined) throw new Error(`zone "${zone}" has no card left`);
    placed.push({ zone, token });
  };
  for (const zone of shuffle(zones, random)) take(zone);
  while (placed.length < count) {
    take(
      pick(
        random,
        zones.filter((zone) => left[zone].length > 0),
      ),
    );
  }
  return shuffle(placed, random);
}
