// W2 line-up template (docs/subjects/logic/curriculum.md §3): `line-up` ("Put them in order, smallest first." / "fewest first."): 3-5
// shape cards of one kind and colour that differ only in size (tiny … huge) or only in how many there are (1-9), shown in a mixed
// order. The answer is the strict order, smallest or fewest first; the `check` reads the cards back and sorts them again.
import {
  DEFAULT_SHAPE_COUNT,
  DEFAULT_SHAPE_SIZE,
  SHAPE_COLOURS,
  SHAPE_KINDS,
  SHAPE_SIZES,
  type CardShape,
} from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import { pick, shuffle } from '@learn/platform-core/domain/random';
import type { ExerciseTemplate } from '@learn/platform-content/generate/template';
import { z } from 'zod';
import { CLASS_SIZES } from './classify.ts';
import { fail, range } from './draw.ts';
import type { OrderShapesItem } from './items.ts';
import { subsetsOf } from './shapes.ts';

const lineUpParams = z
  .object({ by: z.enum(['size', 'count']), items: z.number().int().min(3).max(5) })
  .strict();

export type LineUpParams = z.output<typeof lineUpParams>;

/** The card ids: `s-tiny` … for sizes, `n-3` … for counts. */
function cardIdOf(by: 'size' | 'count', value: string | number): string {
  return `${by === 'size' ? 's' : 'n'}-${String(value)}`;
}

/** The sizes of an exercise of `n` cards: 3 take the three far apart (tiny, medium, huge), 4 leave one of the five out, 5 take all. */
function drawSizes(random: Parameters<typeof pick>[0], n: number): readonly string[] {
  if (n === 3) return CLASS_SIZES;
  if (n === 5) return SHAPE_SIZES;
  return pick(random, subsetsOf(SHAPE_SIZES, n));
}

export const lineUp: ExerciseTemplate<LineUpParams, OrderShapesItem> = {
  params: lineUpParams,
  generate({ by, items }, ctx) {
    const { random } = ctx;
    const kind = pick(random, SHAPE_KINDS);
    const colour = pick(random, SHAPE_COLOURS);
    const values: readonly (string | number)[] =
      by === 'size' ? drawSizes(random, items) : [...pick(random, subsetsOf(range(1, 9), items))];
    const cards = values.map((value) => ({
      id: cardIdOf(by, value),
      shape: {
        kind,
        colour,
        ...(by === 'size' && value !== DEFAULT_SHAPE_SIZE
          ? { size: value as CardShape['size'] }
          : {}),
        ...(by === 'count' && value !== DEFAULT_SHAPE_COUNT ? { count: value as number } : {}),
      } satisfies CardShape,
    }));
    // The answer is the cards as drawn (smallest / fewest first); the display order is a shuffle that is not the answer.
    let shown = shuffle(cards, random);
    while (shown.every((card, index) => card.id === cards[index]?.id))
      shown = shuffle(cards, random);
    return {
      id: ctx.id,
      type: 'order',
      text: ctx.text('text', `templates.line-up-${by}`),
      items: shown,
      answer: cards.map((card) => card.id),
    };
  },
  check(item, params, at) {
    if (item.items.length !== params.items) {
      fail(at, `${String(item.items.length)} cards, ${String(params.items)} expected`);
      return;
    }
    const first = item.items[0]?.shape;
    if (first === undefined) return;
    if (
      item.items.some(({ shape }) => shape.kind !== first.kind || shape.colour !== first.colour)
    ) {
      fail(at, 'the cards must be of one kind and one colour');
    }
    const sizeRank = (shape: CardShape): number =>
      SHAPE_SIZES.indexOf(shape.size ?? DEFAULT_SHAPE_SIZE);
    const amount = (shape: CardShape): number =>
      params.by === 'size' ? sizeRank(shape) : (shape.count ?? DEFAULT_SHAPE_COUNT);
    const other = (shape: CardShape): number =>
      params.by === 'size' ? (shape.count ?? DEFAULT_SHAPE_COUNT) : sizeRank(shape);
    if (item.items.some(({ shape }) => other(shape) !== other(first))) {
      fail(at, `the cards may differ in ${params.by} only`);
    }
    const byId = new Map(item.items.map((card) => [card.id, card.shape] as const));
    const amounts = item.answer.map((id) => {
      const shape = byId.get(id);
      return shape === undefined ? Number.NaN : amount(shape);
    });
    if (amounts.some((value) => Number.isNaN(value))) {
      fail(at, 'the answer names a card that is not shown');
      return;
    }
    if (!amounts.every((value, index) => index === 0 || value > (amounts[index - 1] as number))) {
      fail(
        at,
        `the answer is not strictly ${params.by === 'size' ? 'smallest' : 'fewest'} first (${amounts.join(', ')})`,
      );
    }
    if (new Set(item.items.map(({ shape }) => amount(shape))).size !== item.items.length) {
      fail(at, 'two cards tie');
    }
    if (item.answer.length !== item.items.length) {
      fail(at, 'the answer must name every card once');
    }
    if (item.items.every((card, index) => card.id === item.answer[index])) {
      fail(at, 'the cards are shown in the answer order');
    }
  },
};
