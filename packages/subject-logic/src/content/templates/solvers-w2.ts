// Test-only independent solvers of the W2 templates (never imported by shipped code): each re-solves an item from what its cards show
// and what its words say, without the templates' helpers (own fact reader, own animal table), and reports what is wrong with it. The
// fast tests run them over `SEEDS` seeds, the slow ones over `SLOW_SEEDS`; both walk the same parameter sets (`*_SETS`, a superset of
// what the shipped W2 lessons use).
import type { CardShape } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import { resolveText } from '@learn/platform-content/text-resolve';
import type { GroupItem, OrderShapesItem, ShapeCardsItem, ShapeRuleItem } from './items.ts';
import { AUTHORED_LOCALES } from './testing.ts';

type Attr = 'colour' | 'kind' | 'size' | 'count';
const ATTRS: readonly Attr[] = ['colour', 'kind', 'size', 'count'];
const SORT: readonly Attr[] = ['colour', 'kind', 'size'];

/** The English of an authored `lessons:` text ref (`templates.label.colour-red`). */
export function authored(ref: string): string {
  const text = resolveText(AUTHORED_LOCALES.en?.lessons ?? {}, ref);
  if (text === undefined) throw new Error(`no authored text for ${ref}`);
  return text;
}

/** A card's value of an attribute, as the drawing shows it (default size big, default count 1). */
function value(shape: CardShape, attr: Attr): string {
  if (attr === 'size') return shape.size ?? 'big';
  if (attr === 'count') return String(shape.count ?? 1);
  return shape[attr];
}

/** Every fact a drawn card states, read here and not through the platform. */
function facts(shape: CardShape): string[] {
  return ATTRS.map((attr) => `${attr}:${value(shape, attr)}`);
}

const SIZE_ORDER = ['tiny', 'small', 'medium', 'big', 'huge'];

const CONFUSABLE = new Set(['green|red', 'green|orange', 'blue|purple']);

/** The colour-blind and square / diamond rules over the drawn cards of one exercise. */
export function lookAlikes(id: string, shapes: readonly CardShape[]): string[] {
  const problems: string[] = [];
  for (const [index, a] of shapes.entries()) {
    for (const b of shapes.slice(index + 1)) {
      const rest = (['kind', 'size', 'count'] as const).every(
        (attr) => value(a, attr) === value(b, attr),
      );
      if (rest && CONFUSABLE.has([a.colour, b.colour].sort().join('|'))) {
        problems.push(`${id}: ${a.colour} and ${b.colour} ${a.kind} differ only in colour`);
      }
    }
  }
  const kinds = new Set(shapes.map((shape) => shape.kind));
  if (kinds.has('square') && kinds.has('diamond')) problems.push(`${id}: a square and a diamond`);
  return problems;
}

const same = (a: readonly unknown[], b: readonly unknown[]): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

const cardKey = (shape: CardShape): string => ATTRS.map((attr) => value(shape, attr)).join('/');

// ---------------------------------------------------------------------------------------------------------------------
// odd-one

export interface OddOneSet {
  readonly attr: Attr;
  readonly items: 3 | 4;
  readonly noise: boolean;
}

/** Every attribute with 3 cards, 4 cards, and 4 cards with noise. */
export const ODD_ONE_SETS: readonly OddOneSet[] = ATTRS.flatMap((attr) => [
  { attr, items: 3 as const, noise: false },
  { attr, items: 4 as const, noise: false },
  { attr, items: 4 as const, noise: true },
]);

/** Everything wrong with a generated `odd-one` item: find the cards that no other card equals in some attribute. */
export function oddOneProblems(set: OddOneSet, item: ShapeCardsItem, text: string): string[] {
  const { id } = item;
  const problems: string[] = [];
  if (text !== 'Which one is different?') problems.push(`${id}: text "${text}"`);
  const cards = item.options.map((option) => option.shape);
  if (cards.length !== set.items || item.options.some((option, i) => option.id !== 'abcd'[i])) {
    problems.push(
      `${id}: ${String(cards.length)} cards, ids ${item.options.map((o) => o.id).join('')}`,
    );
  }
  problems.push(...lookAlikes(id, cards));
  // For each attribute: which cards have a value no other card has?
  const uniques = ATTRS.map((attr) => ({
    attr,
    cards: cards.flatMap((card, index) =>
      cards.filter((other) => value(other, attr) === value(card, attr)).length === 1 ? [index] : [],
    ),
    values: new Set(cards.map((card) => value(card, attr))).size,
    split: [...new Set(cards.map((card) => value(card, attr)))].map(
      (v) => cards.filter((card) => value(card, attr) === v).length,
    ),
  }));
  const different = uniques.filter(({ cards: found }) => found.length > 0);
  if (
    different.length !== 1 ||
    different[0]?.attr !== set.attr ||
    different[0].cards.length !== 1
  ) {
    problems.push(
      `${id}: unique in ${JSON.stringify(different.map((one) => [one.attr, one.cards]))}`,
    );
  } else if (item.options[different[0].cards[0] as number]?.id !== item.answer) {
    problems.push(`${id}: the different card is not the answer ${item.answer}`);
  }
  // The other attributes: all equal, or (noise) exactly one that splits the cards 2-2.
  const others = uniques.filter(({ attr }) => attr !== set.attr);
  const splits = others.filter(({ values }) => values > 1);
  if (splits.length !== (set.noise ? 1 : 0)) {
    problems.push(`${id}: ${String(splits.length)} other attributes vary`);
  }
  if (set.noise && splits[0] !== undefined && !same(splits[0].split, [2, 2])) {
    problems.push(`${id}: the noise splits ${JSON.stringify(splits[0].split)}`);
  }
  if (uniques.find(({ attr }) => attr === set.attr)?.values !== 2) {
    problems.push(`${id}: ${set.attr} takes other than 2 values`);
  }
  // Sizes far apart (tiny / medium / huge or the default) and counts at least 2 apart.
  for (const card of cards) {
    if (!['tiny', 'medium', 'huge', 'big'].includes(value(card, 'size'))) {
      problems.push(`${id}: size ${value(card, 'size')}`);
    }
  }
  if (set.attr === 'count') {
    const counts = [...new Set(cards.map((card) => Number(value(card, 'count'))))];
    if (Math.abs((counts[0] ?? 0) - (counts[1] ?? 0)) < 2)
      problems.push(`${id}: counts ${counts.join(', ')}`);
  }
  return problems;
}

// ---------------------------------------------------------------------------------------------------------------------
// odd-rule

export interface OddRuleSet {
  readonly attr: 'colour' | 'kind' | 'size';
  readonly items: 3 | 4;
}

export const ODD_RULE_SETS: readonly OddRuleSet[] = (['colour', 'kind', 'size'] as const).flatMap(
  (attr) => ([3, 4] as const).map((items) => ({ attr, items })),
);

const KIND_WORDS: Readonly<Record<string, string>> = {
  circle: 'circles',
  square: 'squares',
  triangle: 'triangles',
  star: 'stars',
  heart: 'hearts',
  diamond: 'diamonds',
};

/** What "They are all <word>." says: the attribute and value its word names. */
function sentenceFact(sentence: string): [Attr, string] | undefined {
  const word = /^They are all (\w+)\.$/.exec(sentence)?.[1];
  if (word === undefined) return undefined;
  const kind = Object.entries(KIND_WORDS).find(([, plural]) => plural === word)?.[0];
  if (kind !== undefined) return ['kind', kind];
  if (['tiny', 'medium', 'huge'].includes(word)) return ['size', word];
  if (['red', 'blue', 'yellow', 'green', 'purple', 'orange'].includes(word))
    return ['colour', word];
  return undefined;
}

/** Everything wrong with a generated `odd-rule` item: read the three sentences, test each against every card of the row. */
export function oddRuleProblems(set: OddRuleSet, item: ShapeRuleItem, text: string): string[] {
  const { id } = item;
  const problems: string[] = [];
  if (text !== 'What is the same about all of them?') problems.push(`${id}: text "${text}"`);
  const row = item.prompt.shapes.filter((token): token is CardShape => token !== 'gap');
  if (row.length !== set.items || row.length !== item.prompt.shapes.length) {
    problems.push(`${id}: row of ${String(item.prompt.shapes.length)}`);
  }
  problems.push(...lookAlikes(id, row));
  if (new Set(row.map(cardKey)).size !== row.length) problems.push(`${id}: two cards alike`);
  if (row.some((card) => (card.count ?? 1) !== 1))
    problems.push(`${id}: a card counts more than 1`);
  // Each attribute that every card shares; exactly the set's.
  const sharedBy = SORT.filter((attr) => new Set(row.map((card) => value(card, attr))).size === 1);
  if (!same(sharedBy, [set.attr]))
    problems.push(`${id}: shared attributes ${JSON.stringify(sharedBy)}`);
  for (const attr of SORT) {
    const values = new Set(row.map((card) => value(card, attr))).size;
    if (attr !== set.attr && (values < 2 || values > (set.items === 3 ? 2 : 3))) {
      problems.push(`${id}: ${attr} takes ${String(values)} values`);
    }
  }
  // The sentences: true of every card = right; the others name a value that some card has but not all.
  if (item.options.length !== 3) problems.push(`${id}: ${String(item.options.length)} options`);
  const sentences = item.options.map((option) => {
    const words = authored(option.text);
    return { option, words, said: sentenceFact(words) };
  });
  const attrsSaid = sentences.map((one) => one.said?.[0]).sort();
  if (!same(attrsSaid, ['colour', 'kind', 'size'])) {
    problems.push(`${id}: the options name ${JSON.stringify(attrsSaid)}`);
  }
  const trueOnes = sentences.filter(
    ({ said }) => said !== undefined && row.every((card) => value(card, said[0]) === said[1]),
  );
  if (
    !same(
      trueOnes.map((one) => one.option.id),
      [item.answer],
    )
  ) {
    problems.push(
      `${id}: true for every card: ${JSON.stringify(trueOnes.map((o) => o.option.id))}, answer ${item.answer}`,
    );
  }
  for (const { option, said } of sentences) {
    if (option.id === item.answer || said === undefined) continue;
    const holders = row.filter((card) => value(card, said[0]) === said[1]).length;
    if (holders < 1 || holders === row.length) {
      problems.push(
        `${id}: option ${option.id} is held by ${String(holders)} of ${String(row.length)} cards`,
      );
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------------------------------------------------
// group templates: the rules and the words

/** The English words a rule's fact gives its box / axis: "Red", "Circles", "Tiny", "One". */
function wordsOf(fact: string): { yes: string; no: string } | undefined {
  const [attr, v = ''] = fact.split(':');
  const cap = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);
  if (attr === 'colour' || attr === 'size') return { yes: cap(v), no: `Not ${v}` };
  if (attr === 'kind') return { yes: cap(KIND_WORDS[v] ?? '?'), no: `Not ${KIND_WORDS[v] ?? '?'}` };
  if (attr === 'count') {
    const word = ['', 'one', 'two', 'three', 'four', 'five', 'six'][Number(v)] ?? '?';
    return { yes: cap(word), no: `Not ${word}` };
  }
  const animal: Readonly<Record<string, { yes: string; no: string }>> = {
    'can:fly': { yes: 'Can fly', no: 'Cannot fly' },
    'can:swim': { yes: 'Can swim', no: 'Cannot swim' },
    'legs:4': { yes: 'Four legs', no: 'Not four legs' },
    farm: { yes: 'On a farm', no: 'Not on a farm' },
  };
  return animal[fact];
}

interface Rule {
  readonly all?: readonly string[];
  readonly none?: readonly string[];
}

const fits = (rule: Rule, cardFacts: readonly string[]): boolean =>
  (rule.all ?? []).every((fact) => cardFacts.includes(fact)) &&
  (rule.none ?? []).every((fact) => !cardFacts.includes(fact));

/** The facts of a card of a group exercise: its shape's, or (an animal) its tags from the table below, never its own `tags`. */
function cardFacts(card: {
  readonly shape?: CardShape;
  readonly emoji?: string;
  readonly id: string;
}): string[] {
  if (card.shape !== undefined) return facts(card.shape);
  const animal = TABLE.find((one) => one.emoji === card.emoji && one.id === card.id);
  return animal === undefined ? [] : [...animal.tags];
}

/** The 16 animals as the lead wrote the table (an independent copy). */
const TABLE: readonly { id: string; emoji: string; tags: readonly string[] }[] = [
  { id: 'duck', emoji: '🦆', tags: ['can:fly', 'can:swim', 'farm'] },
  { id: 'goat', emoji: '🐐', tags: ['legs:4', 'farm'] },
  { id: 'cow', emoji: '🐄', tags: ['legs:4', 'farm'] },
  { id: 'pig', emoji: '🐖', tags: ['legs:4', 'farm'] },
  { id: 'horse', emoji: '🐎', tags: ['legs:4', 'farm'] },
  { id: 'sheep', emoji: '🐑', tags: ['legs:4', 'farm'] },
  { id: 'fish', emoji: '🐟', tags: ['can:swim'] },
  { id: 'whale', emoji: '🐋', tags: ['can:swim'] },
  { id: 'eagle', emoji: '🦅', tags: ['can:fly'] },
  { id: 'owl', emoji: '🦉', tags: ['can:fly'] },
  { id: 'bee', emoji: '🐝', tags: ['can:fly'] },
  { id: 'frog', emoji: '🐸', tags: ['can:swim', 'legs:4'] },
  { id: 'dog', emoji: '🐕', tags: ['legs:4'] },
  { id: 'lion', emoji: '🦁', tags: ['legs:4'] },
  { id: 'penguin', emoji: '🐧', tags: ['can:swim'] },
  { id: 'bat', emoji: '🦇', tags: ['can:fly'] },
];

export { TABLE as ANIMAL_TABLE };

function countsPer(answer: Readonly<Record<string, string>>, zones: readonly string[]): number[] {
  return zones.map((zone) => Object.values(answer).filter((one) => one === zone).length);
}

// ---------------------------------------------------------------------------------------------------------------------
// sort-boxes

export interface SortBoxesSet {
  readonly attr: 'colour' | 'kind' | 'size';
  readonly boxes: 2 | 3;
  readonly items: 4 | 5 | 6;
}

export const SORT_BOXES_SETS: readonly SortBoxesSet[] = (
  ['colour', 'kind', 'size'] as const
).flatMap((attr) =>
  ([2, 3] as const).flatMap((boxes) =>
    ([4, 5, 6] as const).map((items) => ({ attr, boxes, items })),
  ),
);

/** Everything wrong with a generated `sort-boxes` item. */
export function sortBoxesProblems(set: SortBoxesSet, item: GroupItem, text: string): string[] {
  const { id } = item;
  const problems: string[] = [];
  if (text !== 'Put each card in its box.') problems.push(`${id}: text "${text}"`);
  const boxes = item.boxes ?? [];
  if (item.layout !== 'row' || boxes.length !== set.boxes)
    problems.push(`${id}: ${item.layout} ${String(boxes.length)}`);
  if (item.items.length !== set.items) problems.push(`${id}: ${String(item.items.length)} cards`);
  const shapes = item.items.flatMap((card) => (card.shape === undefined ? [] : [card.shape]));
  if (shapes.length !== item.items.length) problems.push(`${id}: a card without a shape`);
  problems.push(...lookAlikes(id, shapes));
  if (new Set(shapes.map(cardKey)).size !== shapes.length) problems.push(`${id}: two cards alike`);
  // Put every card in a box by the rule, and by the words of the box.
  for (const card of item.items) {
    const hits = boxes.filter((box) => fits(box.rule, cardFacts(card)));
    if (hits.length !== 1 || hits[0]?.id !== item.answer[card.id]) {
      problems.push(
        `${id}: card ${card.id} fits ${JSON.stringify(hits.map((box) => box.id))}, answer ${item.answer[card.id] ?? '?'}`,
      );
    }
  }
  const per = countsPer(
    item.answer,
    boxes.map((box) => box.id),
  );
  if (per.some((count) => count === 0)) problems.push(`${id}: an empty box ${JSON.stringify(per)}`);
  // The words of each box say its rule.
  for (const box of boxes) {
    const negative = box.rule.none !== undefined;
    const fact = (negative ? box.rule.none : box.rule.all)?.[0] ?? '';
    const words = wordsOf(fact);
    const said = authored(box.text);
    if (words === undefined || said !== (negative ? words.no : words.yes)) {
      problems.push(`${id}: box ${box.id} says "${said}" for ${fact}`);
    }
    if (!fact.startsWith(`${set.attr}:`)) problems.push(`${id}: box ${box.id} is about ${fact}`);
  }
  if (set.boxes === 3 && new Set(boxes.map((box) => box.rule.all?.[0])).size !== 3) {
    problems.push(`${id}: three boxes need three values`);
  }
  return problems;
}

// ---------------------------------------------------------------------------------------------------------------------
// carroll

export interface CarrollSet {
  readonly axes: readonly [Attr, Attr];
  readonly items: 4 | 5 | 6 | 7 | 8;
}

/** Every ordered pair of different attributes (colour, kind, size, count) with 4 to 8 cards. */
export const CARROLL_SETS: readonly CarrollSet[] = ATTRS.flatMap((a) =>
  ATTRS.filter((b) => b !== a).flatMap((b) =>
    ([4, 5, 6, 7, 8] as const).map((items) => ({ axes: [a, b] as const, items })),
  ),
);

const CARROLL = ['a-b', 'a-not-b', 'not-a-b', 'not-a-not-b'];
const VENN = ['both', 'only-a', 'only-b', 'neither'];

/** The zone a card goes in from its side of the two axis rules (Carroll: column a, row b). */
function zoneByRules(
  layout: 'carroll' | 'venn',
  axes: readonly { readonly rule: Rule }[],
  cardFactList: readonly string[],
): string {
  const inA = fits(axes[0]?.rule ?? {}, cardFactList);
  const inB = fits(axes[1]?.rule ?? {}, cardFactList);
  if (layout === 'carroll') return `${inA ? 'a' : 'not-a'}-${inB ? 'b' : 'not-b'}`;
  if (inA) return inB ? 'both' : 'only-a';
  return inB ? 'only-b' : 'neither';
}

function axisWordProblems(id: string, item: GroupItem): string[] {
  return (item.axes ?? []).flatMap((axis, index) => {
    const fact = axis.rule.all?.[0] ?? '';
    const words = wordsOf(fact);
    const [yes, no] = [authored(axis.text), authored(axis.notText)];
    return words === undefined || yes !== words.yes || no !== words.no
      ? [`${id}: axis ${String(index)} says "${yes}" / "${no}" for ${fact}`]
      : [];
  });
}

/** Everything wrong with a generated `carroll` item. */
export function carrollProblems(set: CarrollSet, item: GroupItem, text: string): string[] {
  const { id } = item;
  const problems: string[] = [];
  if (text !== 'Look at both rules. Where does each card go?')
    problems.push(`${id}: text "${text}"`);
  if (item.layout !== 'carroll' || item.axes?.length !== 2)
    return [...problems, `${id}: layout ${item.layout}`];
  if (item.items.length !== set.items) problems.push(`${id}: ${String(item.items.length)} cards`);
  const axisAttrs = item.axes.map((axis) => (axis.rule.all?.[0] ?? '').split(':')[0]);
  if (!same(axisAttrs, set.axes)) problems.push(`${id}: axes ${JSON.stringify(axisAttrs)}`);
  const shapes = item.items.flatMap((card) => (card.shape === undefined ? [] : [card.shape]));
  problems.push(...lookAlikes(id, shapes));
  if (new Set(shapes.map(cardKey)).size !== shapes.length) problems.push(`${id}: two cards alike`);
  for (const card of item.items) {
    const zone = zoneByRules('carroll', item.axes, cardFacts(card));
    if (zone !== item.answer[card.id])
      problems.push(
        `${id}: card ${card.id} goes in ${zone}, answer ${item.answer[card.id] ?? '?'}`,
      );
  }
  if (countsPer(item.answer, CARROLL).some((count) => count === 0))
    problems.push(`${id}: an empty zone`);
  problems.push(...axisWordProblems(id, item));
  const sizeYes = item.axes
    .map((axis) => axis.rule.all?.[0])
    .find((fact) => fact?.startsWith('size:'));
  if (sizeYes !== undefined && !['size:tiny', 'size:huge'].includes(sizeYes))
    problems.push(`${id}: size axis ${sizeYes}`);
  return problems;
}

// ---------------------------------------------------------------------------------------------------------------------
// venn

export interface VennSet {
  readonly facts: 'shapes' | 'animals';
  readonly items: 4 | 5 | 6 | 7 | 8;
  readonly outside: boolean;
}

export const VENN_SETS: readonly VennSet[] = (['shapes', 'animals'] as const).flatMap((kind) =>
  ([4, 5, 6, 7, 8] as const).flatMap((items) =>
    [true, false].map((outside) => ({ facts: kind, items, outside })),
  ),
);

/** Everything wrong with a generated `venn` item. Animals are placed by the table above, not by the cards' tags. */
export function vennProblems(set: VennSet, item: GroupItem, text: string): string[] {
  const { id } = item;
  const problems: string[] = [];
  if (text !== 'Where does each card go? The middle fits both.')
    problems.push(`${id}: text "${text}"`);
  if (item.layout !== 'venn' || item.axes?.length !== 2)
    return [...problems, `${id}: layout ${item.layout}`];
  if (item.items.length !== set.items) problems.push(`${id}: ${String(item.items.length)} cards`);
  if ((item.allowEmpty === true) === set.outside)
    problems.push(`${id}: allowEmpty ${String(item.allowEmpty)}`);
  const axisFacts = item.axes.map((axis) => axis.rule.all?.[0] ?? '');
  if (set.facts === 'shapes') {
    const attrs = axisFacts.map((fact) => fact.split(':')[0] as Attr);
    if (attrs[0] === attrs[1] || attrs.some((attr) => !SORT.includes(attr)))
      problems.push(`${id}: axes ${JSON.stringify(axisFacts)}`);
    const shapes = item.items.flatMap((card) => (card.shape === undefined ? [] : [card.shape]));
    if (shapes.length !== item.items.length) problems.push(`${id}: a card without a shape`);
    problems.push(...lookAlikes(id, shapes));
    if (new Set(shapes.map(cardKey)).size !== shapes.length)
      problems.push(`${id}: two cards alike`);
  } else {
    const pairOk =
      (axisFacts.includes('can:fly') && axisFacts.includes('can:swim')) ||
      (axisFacts.includes('farm') && axisFacts.includes('legs:4'));
    if (!pairOk) problems.push(`${id}: animal axes ${JSON.stringify(axisFacts)}`);
    for (const card of item.items) {
      const animal = TABLE.find((one) => one.id === card.id);
      if (animal === undefined || animal.emoji !== card.emoji)
        problems.push(`${id}: card ${card.id} is no animal`);
      else if (!same(card.tags ?? [], animal.tags))
        problems.push(`${id}: tags of ${card.id} are not the table's`);
      // A child could dispute these: never drawn for those axes.
      if (card.id === 'frog' && axisFacts.includes('legs:4'))
        problems.push(`${id}: a frog in a legs:4 venn`);
      if (card.id === 'dog' && (axisFacts.includes('can:swim') || axisFacts.includes('farm'))) {
        problems.push(`${id}: a dog in a ${axisFacts.join(' × ')} venn`);
      }
      if (
        card.id === 'penguin' &&
        axisFacts.includes('can:fly') &&
        item.answer[card.id] !== 'only-b' &&
        item.answer[card.id] !== 'only-a'
      ) {
        problems.push(`${id}: a penguin is not a flier`);
      }
    }
  }
  for (const card of item.items) {
    const zone = zoneByRules('venn', item.axes, cardFacts(card));
    if (zone !== item.answer[card.id])
      problems.push(
        `${id}: card ${card.id} goes in ${zone}, answer ${item.answer[card.id] ?? '?'}`,
      );
  }
  const per = countsPer(item.answer, VENN);
  if (per.slice(0, 3).some((count) => count === 0))
    problems.push(`${id}: an empty circle region ${JSON.stringify(per)}`);
  if (set.outside ? per[3] === 0 : per[3] !== 0)
    problems.push(`${id}: outside holds ${String(per[3])}, outside is ${String(set.outside)}`);
  problems.push(...axisWordProblems(id, item));
  return problems;
}

// ---------------------------------------------------------------------------------------------------------------------
// line-up

export interface LineUpSet {
  readonly by: 'size' | 'count';
  readonly items: 3 | 4 | 5;
}

export const LINE_UP_SETS: readonly LineUpSet[] = (['size', 'count'] as const).flatMap((by) =>
  ([3, 4, 5] as const).map((items) => ({ by, items })),
);

/** Everything wrong with a generated `line-up` item: sort the shown cards and compare with the answer. */
export function lineUpProblems(set: LineUpSet, item: OrderShapesItem, text: string): string[] {
  const { id } = item;
  const problems: string[] = [];
  const wanted =
    set.by === 'size' ? 'Put them in order, smallest first.' : 'Put them in order, fewest first.';
  if (text !== wanted) problems.push(`${id}: text "${text}"`);
  if (item.items.length !== set.items) problems.push(`${id}: ${String(item.items.length)} cards`);
  const shapes = item.items.map((card) => card.shape);
  if (new Set(shapes.map((shape) => `${shape.kind}/${shape.colour}`)).size !== 1)
    problems.push(`${id}: more than one kind or colour`);
  const amount = (shape: CardShape): number =>
    set.by === 'size' ? SIZE_ORDER.indexOf(shape.size ?? 'big') : (shape.count ?? 1);
  const rest = (shape: CardShape): number =>
    set.by === 'size' ? (shape.count ?? 1) : SIZE_ORDER.indexOf(shape.size ?? 'big');
  if (new Set(shapes.map(rest)).size !== 1)
    problems.push(`${id}: the cards differ in more than ${set.by}`);
  if (new Set(shapes.map(amount)).size !== shapes.length) problems.push(`${id}: a tie`);
  const smallestFirst = [...item.items]
    .sort((a, b) => amount(a.shape) - amount(b.shape))
    .map((card) => card.id);
  if (!same(smallestFirst, item.answer))
    problems.push(`${id}: sorted ${smallestFirst.join()}, answer ${item.answer.join()}`);
  if (
    same(
      item.items.map((card) => card.id),
      item.answer,
    )
  )
    problems.push(`${id}: shown in the answer order`);
  if (
    set.items === 3 &&
    set.by === 'size' &&
    !shapes.every((shape) => ['tiny', 'medium', 'huge'].includes(shape.size ?? 'big'))
  ) {
    problems.push(`${id}: three sizes that are too close`);
  }
  return problems;
}
