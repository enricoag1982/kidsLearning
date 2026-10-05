// W2 odd-one-out templates (docs/subjects/logic/curriculum.md §3): `odd-one` ("Which one is different?": 3-4 shape cards, one differs
// in one attribute) and `odd-rule` ("What is the same about all of them?": a row of shapes that share one attribute, 3 rule
// sentences to pick from). Every other attribute is fixed (odd-one) or takes at least 2 values (odd-rule); a `noise` odd-one has a second
// attribute that splits the 4 cards 2-2, so no card is unique in it. The `check`s read the cards back and ask every attribute.
import { pick, randomInt, shuffle } from '@learn/platform-core/domain/random';
import type { CardShape } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import {
  DEFAULT_SHAPE_COUNT,
  DEFAULT_SHAPE_SIZE,
} from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import type { ExerciseTemplate } from '@learn/platform-content/generate/template';
import { z } from 'zod';
import {
  CLASS_ATTRS,
  LETTERS,
  SORT_ATTRS,
  classAttrParam,
  drawValues,
  plainToken,
  sameRef,
  shapeOf,
  sortAttrParam,
  tokenId,
  valueOf,
  withValue,
  type ClassAttr,
  type SortAttr,
  type Token,
} from './classify.ts';
import { fail, range } from './draw.ts';
import type { ShapeCardsItem, ShapeRuleItem, TextOption } from './items.ts';

/** A card as a token, defaults filled in (what the `check`s compare). */
function tokenOfShape(shape: CardShape): Token {
  return {
    kind: shape.kind,
    colour: shape.colour,
    size: shape.size ?? DEFAULT_SHAPE_SIZE,
    count: shape.count ?? DEFAULT_SHAPE_COUNT,
  };
}

/** How many cards have each value of `attr`. */
function tally(tokens: readonly Token[], attr: ClassAttr): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    const key = String(valueOf(token, attr));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Colours of one exercise that differ only in colour must not be a confusable pair (sorted names); the kit's rule, repeated for the `check`. */
const CONFUSABLE = new Set(['green|red', 'green|orange', 'blue|purple']);
function lookAlikes(tokens: readonly Token[]): readonly string[] {
  const found: string[] = [];
  for (const [index, a] of tokens.entries()) {
    for (const b of tokens.slice(index + 1)) {
      const sameButColour = a.kind === b.kind && a.size === b.size && a.count === b.count;
      if (sameButColour && CONFUSABLE.has([a.colour, b.colour].sort().join('|'))) {
        found.push(`${a.colour} and ${b.colour} ${a.kind} differ only in colour`);
      }
    }
  }
  return [
    ...found,
    ...(tokens.some((t) => t.kind === 'square') && tokens.some((t) => t.kind === 'diamond')
      ? ['a square and a diamond in one exercise']
      : []),
  ];
}

// ---------------------------------------------------------------------------------------------------------------------
// odd-one

const oddOneParams = z
  .object({
    attr: classAttrParam,
    items: z.union([z.literal(3), z.literal(4)]),
    noise: z.boolean().default(false),
  })
  .strict()
  .superRefine((params, ctx) => {
    if (params.noise && params.items !== 4) {
      ctx.addIssue({ code: 'custom', path: ['noise'], message: 'noise needs 4 items' });
    }
  });

export type OddOneParams = z.output<typeof oddOneParams>;

export const oddOne: ExerciseTemplate<OddOneParams, ShapeCardsItem> = {
  params: oddOneParams,
  generate({ attr, items, noise }, ctx) {
    const { random } = ctx;
    const noiseAttr = noise
      ? pick(
          random,
          CLASS_ATTRS.filter((other) => other !== attr),
        )
      : undefined;
    const varying = new Set<ClassAttr>(noiseAttr === undefined ? [attr] : [attr, noiseAttr]);
    const base = plainToken(random, varying);
    const [common, odd] = drawValues(random, attr, 2);
    const split = noiseAttr === undefined ? [] : drawValues(random, noiseAttr, 2);
    const oddIndex = randomInt(random, 0, items - 1);
    // The 2 cards that take the second value of the noise attribute.
    const flipped = new Set(noise ? shuffle([0, 1, 2, 3], random).slice(0, 2) : []);
    const tokens = range(0, items - 1).map((index): Token => {
      const one = withValue(base, attr, (index === oddIndex ? odd : common) as string | number);
      return noiseAttr === undefined
        ? one
        : withValue(one, noiseAttr, split[flipped.has(index) ? 1 : 0] as string | number);
    });
    return {
      id: ctx.id,
      type: 'choice',
      text: ctx.text('text', 'templates.odd-one'),
      options: tokens.map((token, index) => ({
        id: LETTERS[index] as string,
        shape: shapeOf(token),
      })),
      answer: LETTERS[oddIndex] as string,
    };
  },
  check(item, params, at) {
    const tokens = item.options.map((option) => tokenOfShape(option.shape));
    if (tokens.length !== params.items) {
      fail(at, `${String(tokens.length)} cards, ${String(params.items)} expected`);
      return;
    }
    if (new Set(item.options.map((option) => option.id)).size !== tokens.length) {
      fail(at, 'the option ids repeat');
    }
    const answer = item.options.findIndex((option) => option.id === item.answer);
    if (answer < 0) {
      fail(at, `"${item.answer}" is not one of the options`);
      return;
    }
    const uniqueIn: ClassAttr[] = [];
    const splitIn: ClassAttr[] = [];
    for (const attr of CLASS_ATTRS) {
      const counts = tally(tokens, attr);
      const unique = tokens.filter((token) => counts.get(String(valueOf(token, attr))) === 1);
      if (unique.length > 1) {
        fail(
          at,
          `${String(unique.length)} cards are unique in ${attr}: more than one is different`,
        );
      }
      if (unique.length === 1) {
        uniqueIn.push(attr);
        if (unique[0] !== tokens[answer]) {
          fail(at, `the card unique in ${attr} is not the answer`);
        }
      } else if (counts.size === 2 && [...counts.values()].every((n) => n === 2)) {
        // Two values, two cards each: no card is unique here.
        splitIn.push(attr);
      }
    }
    if (uniqueIn.length !== 1 || uniqueIn[0] !== params.attr) {
      fail(
        at,
        `the odd card must be unique in ${params.attr} only, it is in: ${uniqueIn.join(', ') || 'nothing'}`,
      );
    }
    if (splitIn.length !== (params.noise ? 1 : 0)) {
      fail(
        at,
        `${params.noise ? 'one' : 'no'} attribute may split the cards 2-2, ${String(splitIn.length)} do`,
      );
    }
    for (const problem of lookAlikes(tokens)) fail(at, problem);
  },
};

// ---------------------------------------------------------------------------------------------------------------------
// odd-rule

const oddRuleParams = z
  .object({ attr: sortAttrParam, items: z.union([z.literal(3), z.literal(4)]) })
  .strict();

export type OddRuleParams = z.output<typeof oddRuleParams>;

/** The id of a rule option: the attribute and the value it names (`colour-red`): the generated sentence is out of the `check`'s sight. */
export function ruleOptionId(attr: SortAttr, value: string | number): string {
  return `${attr}-${String(value)}`;
}

/** The attribute and value an option id names, or `undefined`. */
export function parseRuleOption(id: string): { attr: SortAttr; value: string } | undefined {
  const dash = id.indexOf('-');
  const attr = id.slice(0, dash);
  const value = id.slice(dash + 1);
  return dash > 0 && (SORT_ATTRS as readonly string[]).includes(attr) && value !== ''
    ? { attr: attr as SortAttr, value }
    : undefined;
}

export const oddRule: ExerciseTemplate<OddRuleParams, ShapeRuleItem> = {
  params: oddRuleParams,
  generate({ attr, items }, ctx) {
    const { random } = ctx;
    const others = SORT_ATTRS.filter((other) => other !== attr);
    const base = plainToken(random, new Set(SORT_ATTRS));
    const [shared] = drawValues(random, attr, 1) as [string | number];
    let tokens: readonly Token[] = [];
    // Different cards in the row: draw again until no two cards are alike (a few draws at most).
    for (let attempt = 0; attempt < 50; attempt += 1) {
      let drawn = range(0, items - 1).map(() => withValue(base, attr, shared));
      for (const other of others) {
        const values = items === 3 ? 2 : randomInt(random, 2, 3);
        const palette = drawValues(random, other, values);
        // Every value of the palette is on a card, the rest at random.
        const picks = shuffle(
          range(0, items - 1).map((index) =>
            index < values ? index : randomInt(random, 0, values - 1),
          ),
          random,
        );
        drawn = drawn.map((token, index) =>
          withValue(token, other, palette[picks[index] as number] as string | number),
        );
      }
      tokens = drawn;
      if (new Set(drawn.map(tokenId)).size === drawn.length) break;
    }
    const named = SORT_ATTRS.map((one): { id: string; attr: SortAttr; value: string | number } => {
      const value = one === attr ? shared : valueOf(pick(random, tokens), one);
      return { id: ruleOptionId(one, value), attr: one, value };
    });
    return {
      id: ctx.id,
      type: 'choice',
      text: ctx.text('text', 'templates.odd-rule'),
      prompt: { shapes: tokens.map(shapeOf) },
      options: shuffle(named, random).map((option): TextOption => ({
        id: option.id,
        text: sameRef(option.attr, option.value),
      })),
      answer: ruleOptionId(attr, shared),
    };
  },
  check(item, params, at) {
    const row = item.prompt.shapes;
    const shapes = row.filter((token): token is CardShape => token !== 'gap');
    if (shapes.length !== row.length || row.length !== params.items) {
      fail(at, `the row must be ${String(params.items)} shapes, no gap`);
      return;
    }
    const tokens = shapes.map(tokenOfShape);
    if (tokens.some((token) => token.count !== 1)) fail(at, 'a card shows more than one shape');
    if (new Set(tokens.map(tokenId)).size !== tokens.length) fail(at, 'two cards are alike');
    for (const problem of lookAlikes(tokens)) fail(at, problem);
    const shared = SORT_ATTRS.filter((attr) => tally(tokens, attr).size === 1);
    if (shared.length !== 1 || shared[0] !== params.attr) {
      fail(
        at,
        `exactly ${params.attr} must be shared by all, ${shared.join(', ') || 'nothing'} is`,
      );
    }
    const options = item.options.map((option) => ({
      id: option.id,
      named: parseRuleOption(option.id),
    }));
    const named = options.flatMap((option) => (option.named === undefined ? [] : [option.named]));
    if (
      named.length !== 3 ||
      new Set(named.map((one) => one.attr)).size !== 3 ||
      options.length !== 3
    ) {
      fail(at, 'the 3 options must name colour, kind and size once each (<attr>-<value>)');
      return;
    }
    const right = options.find((option) => option.id === item.answer)?.named;
    if (right === undefined) {
      fail(at, `"${item.answer}" is not one of the options`);
      return;
    }
    for (const one of named) {
      const counts = tally(tokens, one.attr);
      const holds = (counts.get(one.value) ?? 0) > 0;
      if (one === right) {
        if (counts.size !== 1 || !holds)
          fail(at, `the answer says ${one.attr} ${one.value}, not shared by all`);
      } else if (counts.size < 2 || !holds) {
        fail(
          at,
          `the option ${one.attr} ${one.value} must name an attribute that varies, with a value on a card`,
        );
      }
    }
  },
};
