// W2 sorting templates (docs/subjects/logic/curriculum.md §3), all of the platform's opt-in `group` kind: `sort-boxes` (a row of 2-3
// boxes), `carroll` (a 2 x 2 table over two attributes) and `venn` (two circles over two shape facts, or two animal facts). The rules
// sit on the boxes / axes, the cards carry their facts (a drawn shape; an emoji with `tags`), and the `answer` is what the rules say. A
// third attribute that no rule names varies on the cards, so every zone can hold several different cards. Each `check` reads the rules
// and the cards back and puts every card in a zone again.
import {
  shapeFacts,
  type CardShape,
} from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import { CARROLL_ZONES, VENN_ZONES } from '@learn/platform-core/domain/exercise/kinds/group/def';
import { pick, shuffle, type Random } from '@learn/platform-core/domain/random';
import type { ExerciseTemplate } from '@learn/platform-content/generate/template';
import { z } from 'zod';
import {
  ANIMAL_FACT_NAME,
  ANIMAL_PAIRS,
  ANIMALS,
  animalsFor,
  type Animal,
  type AnimalFact,
} from './animals.ts';
import {
  SORT_ATTRS,
  cardId,
  cardPool,
  classAttrParam,
  drawCards,
  drawValues,
  factOf,
  labelRef,
  notRef,
  plainToken,
  shapeOf,
  sortAttrParam,
  valueOf,
  yesFirst,
  type ClassAttr,
  type ClassValue,
  type Placed,
  type Token,
} from './classify.ts';
import { fail } from './draw.ts';
import type { AxisYaml, BoxYaml, GroupCardYaml, GroupItem, RuleYaml } from './items.ts';

// ---------------------------------------------------------------------------------------------------------------------
// shared

/** An axis of a Carroll table / Venn: the value asked about, and the other values the cards of the "not" side take. */
interface Axis {
  readonly attr: ClassAttr;
  readonly yes: ClassValue;
  readonly values: readonly ClassValue[];
}

function drawAxis(random: Random, attr: ClassAttr): Axis {
  const values = yesFirst(attr, drawValues(random, attr, 3));
  return { attr, yes: values[0] as ClassValue, values };
}

function axisYaml(axis: Axis): AxisYaml {
  return {
    text: labelRef(axis.attr, axis.yes),
    notText: notRef(axis.attr, axis.yes),
    rule: { all: [factOf(axis.attr, axis.yes)] },
  };
}

function cardsYaml(placed: readonly Placed<string>[]): {
  readonly items: readonly GroupCardYaml[];
  readonly answer: Readonly<Record<string, string>>;
} {
  return {
    items: placed.map((one, index) => ({ id: cardId(index), shape: shapeOf(one.token) })),
    answer: Object.fromEntries(placed.map((one, index) => [cardId(index), one.zone])),
  };
}

/** The facts a card of the raw YAML states: its shape's and its tags. */
function factsOfCard(card: GroupCardYaml): readonly string[] {
  return [...(card.shape === undefined ? [] : shapeFacts(card.shape)), ...(card.tags ?? [])];
}

function meets(rule: RuleYaml, facts: readonly string[]): boolean {
  return (
    (rule.all ?? []).every((fact) => facts.includes(fact)) &&
    !(rule.none ?? []).some((fact) => facts.includes(fact))
  );
}

/** The attribute a fact `colour:red` is about. */
function attrOfFact(fact: string | undefined): string {
  return (fact ?? '').split(':')[0] ?? '';
}

/** The distinct shapes of the cards that differ only in colour must not be a confusable pair (the kit's rule), no square with a
 * diamond: repeated here so the `check` stands on its own. */
const CONFUSABLE = new Set(['green|red', 'green|orange', 'blue|purple']);
function lookAlikes(cards: readonly GroupCardYaml[]): readonly string[] {
  const shapes = cards.flatMap((card) => (card.shape === undefined ? [] : [card.shape]));
  const found: string[] = [];
  const size = (shape: CardShape): string => shape.size ?? 'big';
  const count = (shape: CardShape): number => shape.count ?? 1;
  for (const [index, a] of shapes.entries()) {
    for (const b of shapes.slice(index + 1)) {
      if (
        a.kind === b.kind &&
        size(a) === size(b) &&
        count(a) === count(b) &&
        CONFUSABLE.has([a.colour, b.colour].sort().join('|'))
      ) {
        found.push(`${a.colour} and ${b.colour} ${a.kind} differ only in colour`);
      }
    }
  }
  if (shapes.some((s) => s.kind === 'square') && shapes.some((s) => s.kind === 'diamond')) {
    found.push('a square and a diamond in one exercise');
  }
  return found;
}

/** Two cards that look the same. */
function twins(cards: readonly GroupCardYaml[]): boolean {
  const seen = cards.map((card) => JSON.stringify([card.shape, card.emoji]));
  return new Set(seen).size !== seen.length;
}

/** How many cards the answer puts in each zone. */
function zoneCounts(item: GroupItem, zones: readonly string[]): ReadonlyMap<string, number> {
  const counts = new Map<string, number>(zones.map((zone) => [zone, 0]));
  for (const zone of Object.values(item.answer)) counts.set(zone, (counts.get(zone) ?? 0) + 1);
  return counts;
}

// ---------------------------------------------------------------------------------------------------------------------
// sort-boxes

const sortBoxesParams = z
  .object({
    attr: sortAttrParam,
    boxes: z.union([z.literal(2), z.literal(3)]),
    items: z.number().int().min(4).max(6),
  })
  .strict();

export type SortBoxesParams = z.output<typeof sortBoxesParams>;

/** What the cards of a box have in common, as the box's rule: the value (`all`) or everything else (`none`). */
function boxRule(attr: ClassAttr, value: ClassValue, not: boolean): RuleYaml {
  return not ? { none: [factOf(attr, value)] } : { all: [factOf(attr, value)] };
}

export const sortBoxes: ExerciseTemplate<SortBoxesParams, GroupItem> = {
  params: sortBoxesParams,
  generate({ attr, boxes, items }, ctx) {
    const { random } = ctx;
    const sorted = drawAxis(random, attr);
    const noiseAttr = pick(
      random,
      SORT_ATTRS.filter((other) => other !== attr),
    );
    const noiseValues = drawValues(random, noiseAttr, 3);
    const base = plainToken(random, new Set<ClassAttr>([attr, noiseAttr]));
    const pool = cardPool(base, [
      { attr, values: sorted.values },
      { attr: noiseAttr, values: noiseValues },
    ]);
    const boxList: readonly BoxYaml[] =
      boxes === 3
        ? sorted.values.map((value) => ({
            id: String(value),
            text: labelRef(attr, value),
            rule: boxRule(attr, value, false),
          }))
        : [
            { id: 'yes', text: labelRef(attr, sorted.yes), rule: boxRule(attr, sorted.yes, false) },
            { id: 'no', text: notRef(attr, sorted.yes), rule: boxRule(attr, sorted.yes, true) },
          ];
    const zoneOf = (token: Token): string =>
      boxes === 3
        ? String(valueOf(token, attr))
        : valueOf(token, attr) === sorted.yes
          ? 'yes'
          : 'no';
    const zones = boxList.map((box) => box.id);
    const pools = Object.fromEntries(
      zones.map((zone) => [zone, pool.filter((token) => zoneOf(token) === zone)] as const),
    );
    const placed = drawCards(random, pools, zones, items);
    return {
      id: ctx.id,
      type: 'group',
      text: ctx.text('text', 'templates.sort-boxes'),
      layout: 'row',
      boxes: boxList,
      ...cardsYaml(placed),
    };
  },
  check(item, params, at) {
    if (item.layout !== 'row' || item.boxes === undefined || item.boxes.length !== params.boxes) {
      fail(at, `a row of ${String(params.boxes)} boxes is expected`);
      return;
    }
    if (item.items.length !== params.items) {
      fail(at, `${String(item.items.length)} cards, ${String(params.items)} expected`);
    }
    const facts = item.boxes.flatMap((box) => [...(box.rule.all ?? []), ...(box.rule.none ?? [])]);
    if (facts.length !== params.boxes || facts.some((fact) => attrOfFact(fact) !== params.attr)) {
      fail(at, `every box must have one rule about ${params.attr}`);
      return;
    }
    if (params.boxes === 2) {
      const [yes, no] = item.boxes;
      const wanted = yes?.rule.all?.[0];
      if (
        yes?.id !== 'yes' ||
        no?.id !== 'no' ||
        wanted === undefined ||
        no.rule.none?.[0] !== wanted ||
        yes.rule.none !== undefined ||
        no.rule.all !== undefined
      ) {
        fail(at, 'two boxes must be "value" (all) and "not value" (none) over the same fact');
      }
    } else if (
      item.boxes.some((box) => box.rule.none !== undefined) ||
      new Set(item.boxes.map((box) => box.rule.all?.[0])).size !== 3
    ) {
      fail(at, 'three boxes must take three different values (all)');
    }
    for (const card of item.items) {
      const hits = item.boxes.filter((box) => meets(box.rule, factsOfCard(card)));
      if (hits.length !== 1) {
        fail(at, `card ${card.id} fits ${String(hits.length)} boxes, exactly one is needed`);
      } else if (hits[0]?.id !== item.answer[card.id]) {
        fail(
          at,
          `card ${card.id} goes in "${hits[0]?.id ?? '?'}", the answer says "${item.answer[card.id] ?? '?'}"`,
        );
      }
    }
    for (const [zone, count] of zoneCounts(
      item,
      item.boxes.map((box) => box.id),
    )) {
      if (count === 0) fail(at, `box "${zone}" holds no card`);
    }
    if (twins(item.items)) fail(at, 'two cards look the same');
    for (const problem of lookAlikes(item.items)) fail(at, problem);
  },
};

// ---------------------------------------------------------------------------------------------------------------------
// carroll and venn over shape facts

const carrollParams = z
  .object({
    axes: z.tuple([classAttrParam, classAttrParam]),
    items: z.number().int().min(4).max(8),
  })
  .strict()
  .refine(({ axes: [a, b] }) => a !== b, {
    message: 'the two axes must be different attributes',
    path: ['axes'],
  });

export type CarrollParams = z.output<typeof carrollParams>;

/** The zone of a card in a Carroll table (a = columns, b = rows) or a Venn, from its side of each axis. */
function carrollZone(inA: boolean, inB: boolean): (typeof CARROLL_ZONES)[number] {
  return CARROLL_ZONES[(inA ? 0 : 2) + (inB ? 0 : 1)] as (typeof CARROLL_ZONES)[number];
}

function vennZone(inA: boolean, inB: boolean): (typeof VENN_ZONES)[number] {
  if (inA) return inB ? 'both' : 'only-a';
  return inB ? 'only-b' : 'neither';
}

/** Draws the axes and the cards of a shape-fact Carroll table or Venn: `zones` lists the zones that get a card (all four, or the
 * Venn without `neither`). */
function drawShapeGroup(
  random: Random,
  layout: 'carroll' | 'venn',
  attrs: readonly [ClassAttr, ClassAttr],
  count: number,
  zones: readonly string[],
): Pick<GroupItem, 'axes' | 'items' | 'answer'> {
  const [axisA, axisB] = [drawAxis(random, attrs[0]), drawAxis(random, attrs[1])] as const;
  const noiseAttr = pick(
    random,
    SORT_ATTRS.filter((other) => other !== attrs[0] && other !== attrs[1]),
  );
  const noiseValues = drawValues(random, noiseAttr, 3);
  const base = plainToken(random, new Set<ClassAttr>([...attrs, noiseAttr]));
  const pool = cardPool(base, [
    { attr: axisA.attr, values: axisA.values },
    { attr: axisB.attr, values: axisB.values },
    { attr: noiseAttr, values: noiseValues },
  ]);
  const zoneOf = (token: Token): string => {
    const inA = valueOf(token, axisA.attr) === axisA.yes;
    const inB = valueOf(token, axisB.attr) === axisB.yes;
    return layout === 'carroll' ? carrollZone(inA, inB) : vennZone(inA, inB);
  };
  const pools = Object.fromEntries(
    zones.map((zone) => [zone, pool.filter((token) => zoneOf(token) === zone)] as const),
  );
  return {
    axes: [axisYaml(axisA), axisYaml(axisB)],
    ...cardsYaml(drawCards(random, pools, zones, count)),
  };
}

/** The attribute and value an axis rule names (`colour:red`; a plain fact like `farm` has no value), or `undefined` when the rule is
 * not exactly one fact (`all`). */
function axisFact(axis: AxisYaml): { attr: string; value: string } | undefined {
  const [fact, ...rest] = axis.rule.all ?? [];
  if (fact === undefined || rest.length > 0 || axis.rule.none !== undefined) return undefined;
  const [attr = '', value = ''] = fact.split(':');
  return { attr, value };
}

export const carroll: ExerciseTemplate<CarrollParams, GroupItem> = {
  params: carrollParams,
  generate({ axes, items }, ctx) {
    return {
      id: ctx.id,
      type: 'group',
      text: ctx.text('text', 'templates.carroll'),
      layout: 'carroll',
      ...drawShapeGroup(ctx.random, 'carroll', axes, items, CARROLL_ZONES),
    };
  },
  check(item, params, at) {
    const zone = checkAxesAndZones(item, at, 'carroll', CARROLL_ZONES, params.items, (inA, inB) =>
      carrollZone(inA, inB),
    );
    if (zone === undefined) return;
    const facts = zone.axes.map(axisFact);
    if (facts[0]?.attr !== params.axes[0] || facts[1]?.attr !== params.axes[1]) {
      fail(at, `the axes must be ${params.axes.join(' × ')}`);
    }
    for (const [count, name] of zone.counts) {
      if (count === 0) fail(at, `zone "${name}" holds no card`);
    }
  },
};

const vennParams = z
  .object({
    facts: z.enum(['shapes', 'animals']),
    items: z.number().int().min(4).max(8),
    outside: z.boolean().default(true),
  })
  .strict();

export type VennParams = z.output<typeof vennParams>;

/** The animals of a venn over the pair `[a, b]`, one pool per zone. */
function animalPools(
  a: AnimalFact,
  b: AnimalFact,
): Readonly<Record<(typeof VENN_ZONES)[number], readonly Animal[]>> {
  const eligible = animalsFor([a, b]);
  const zone = (inA: boolean, inB: boolean): readonly Animal[] =>
    eligible.filter((animal) => animal.tags.includes(a) === inA && animal.tags.includes(b) === inB);
  return {
    both: zone(true, true),
    'only-a': zone(true, false),
    'only-b': zone(false, true),
    neither: zone(false, false),
  };
}

function drawAnimalVenn(
  random: Random,
  count: number,
  zones: readonly (typeof VENN_ZONES)[number][],
): Pick<GroupItem, 'axes' | 'items' | 'answer'> {
  // A pair that has enough animals for the zones asked for (farm × legs:4 has 7 outside the middle: no 8 without `neither`).
  const fitting = ANIMAL_PAIRS.filter(
    ([x, y]) => zones.reduce((sum, zone) => sum + animalPools(x, y)[zone].length, 0) >= count,
  );
  const [a, b] = shuffle(pick(random, fitting), random) as [AnimalFact, AnimalFact];
  const pools = animalPools(a, b);
  const left = Object.fromEntries(
    zones.map((zone) => [zone, shuffle(pools[zone], random)] as const),
  ) as Record<(typeof VENN_ZONES)[number], Animal[]>;
  const placed: { zone: string; animal: Animal }[] = [];
  const take = (zone: (typeof VENN_ZONES)[number]): void => {
    const animal = left[zone].pop();
    if (animal === undefined) throw new Error(`no animal left for zone "${zone}"`);
    placed.push({ zone, animal });
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
  const shown = shuffle(placed, random);
  const axis = (fact: AnimalFact): AxisYaml => ({
    text: `templates.label.${ANIMAL_FACT_NAME[fact]}`,
    notText: `templates.not.${ANIMAL_FACT_NAME[fact]}`,
    rule: { all: [fact] },
  });
  return {
    axes: [axis(a), axis(b)],
    items: shown.map(({ animal }) => ({ id: animal.id, emoji: animal.emoji, tags: animal.tags })),
    answer: Object.fromEntries(shown.map(({ zone, animal }) => [animal.id, zone])),
  };
}

export const venn: ExerciseTemplate<VennParams, GroupItem> = {
  params: vennParams,
  generate({ facts, items, outside }, ctx) {
    const { random } = ctx;
    const zones = outside ? VENN_ZONES : VENN_ZONES.filter((zone) => zone !== 'neither');
    const text = ctx.text('text', 'templates.venn');
    const drawn =
      facts === 'animals'
        ? drawAnimalVenn(random, items, zones)
        : drawShapeGroup(random, 'venn', pickTwo(random, SORT_ATTRS), items, zones);
    return {
      id: ctx.id,
      type: 'group',
      text,
      layout: 'venn',
      ...drawn,
      ...(outside ? {} : { allowEmpty: true as const }),
    };
  },
  check(item, params, at) {
    const found = checkAxesAndZones(item, at, 'venn', VENN_ZONES, params.items, (inA, inB) =>
      vennZone(inA, inB),
    );
    if (found === undefined) return;
    for (const [count, name] of found.counts) {
      if (count === 0 && !(name === 'neither' && !params.outside)) {
        fail(at, `zone "${name}" holds no card`);
      }
      if (count > 0 && name === 'neither' && !params.outside) {
        fail(at, 'a card sits outside both circles, outside is off');
      }
    }
    if (params.outside === (item.allowEmpty === true)) {
      fail(
        at,
        params.outside
          ? 'allowEmpty is only for a venn without outside'
          : 'a venn without outside needs allowEmpty',
      );
    }
    const facts = found.axes.map(axisFact);
    if (params.facts === 'shapes') {
      const [a, b] = facts;
      if (
        a === undefined ||
        b === undefined ||
        a.attr === b.attr ||
        ![a.attr, b.attr].every((attr) => (SORT_ATTRS as readonly string[]).includes(attr))
      ) {
        fail(at, 'a shape venn needs two rules on different attributes of colour, kind and size');
      }
      if (item.items.some((card) => card.emoji !== undefined))
        fail(at, 'a shape venn has shape cards');
    } else {
      const pair = found.axes.map((axis) => axis.rule.all?.[0] ?? '');
      const known = ANIMAL_PAIRS.some(([a, b]) => pair.includes(a) && pair.includes(b));
      if (!known) fail(at, `the pair ${pair.join(' × ')} is not an animal pair`);
      for (const card of item.items) {
        const animal = ANIMALS.find((one) => one.emoji === card.emoji);
        if (animal === undefined || animal.id !== card.id) {
          fail(at, `card ${card.id} is not an animal of the table`);
        } else if (JSON.stringify(animal.tags) !== JSON.stringify(card.tags)) {
          fail(at, `card ${card.id} has other tags than the table`);
        } else if (!animalsFor(pair as AnimalFact[]).some((one) => one.id === animal.id)) {
          fail(at, `card ${card.id} is left out of this pair (a child could dispute it)`);
        }
      }
    }
  },
};

/** Two different attributes, in a random order. */
function pickTwo(random: Random, attrs: readonly ClassAttr[]): readonly [ClassAttr, ClassAttr] {
  const [a, b] = shuffle(attrs, random);
  return [a as ClassAttr, b as ClassAttr];
}

// ---------------------------------------------------------------------------------------------------------------------
// the zone check of carroll and venn

/** The checks `carroll` and `venn` share: a layout with two one-fact axes, `items` cards that look different, every card in the zone
 * its rules give and the answer says, the zone counts. `undefined` when the structure is too broken to go on. */
function checkAxesAndZones(
  item: GroupItem,
  at: { readonly where: string; readonly issues: string[] },
  layout: 'carroll' | 'venn',
  zones: readonly string[],
  items: number,
  zoneOf: (inA: boolean, inB: boolean) => string,
): { axes: readonly AxisYaml[]; counts: readonly (readonly [number, string])[] } | undefined {
  if (item.layout !== layout || item.axes === undefined) {
    fail(at, `layout "${layout}" with 2 axes is expected`);
    return undefined;
  }
  const axes = item.axes;
  if (axes.some((axis) => axisFact(axis) === undefined)) {
    fail(at, 'every axis must have one rule: one fact (all)');
    return undefined;
  }
  if (item.items.length !== items) {
    fail(at, `${String(item.items.length)} cards, ${String(items)} expected`);
  }
  for (const card of item.items) {
    const facts = factsOfCard(card);
    const [a, b] = axes.map((axis) => meets(axis.rule, facts)) as [boolean, boolean];
    const wanted = zoneOf(a, b);
    if (item.answer[card.id] !== wanted) {
      fail(
        at,
        `card ${card.id} goes in "${wanted}" by the rules, the answer says "${item.answer[card.id] ?? '?'}"`,
      );
    }
  }
  if (twins(item.items)) fail(at, 'two cards look the same');
  for (const problem of lookAlikes(item.items)) fail(at, problem);
  const counts = zoneCounts(item, zones);
  return { axes, counts: [...counts].map(([zone, count]) => [count, zone] as const) };
}
