// Test-only independent solvers of the W1 templates (never imported by shipped code): each re-solves an item from what its card shows,
// without the template's own helpers, and reports what is wrong with it. The fast tests run them over `SEEDS` seeds, the slow ones
// over `SLOW_SEEDS`; both walk the same parameter sets (`*_SETS`, a superset of what the shipped W1 lessons use).
import type { CardShape } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import type {
  EntryItem,
  PromptToken,
  RuleChoiceItem,
  ShapeChoiceItem,
  ShapeEntryItem,
} from './items.ts';

/** A token as these tests compare it. */
export const keyOf = (shape: CardShape): string =>
  [shape.kind, shape.colour, shape.size ?? 'big', shape.count ?? 1].join('/');

const CONFUSABLE = new Set(['red|green', 'green|orange', 'blue|purple']);

const confusable = (a: string, b: string): boolean =>
  CONFUSABLE.has(`${a}|${b}`) || CONFUSABLE.has(`${b}|${a}`);

/** Every drawn token of the item: the prompt row and the option cards. */
function tokensOf(
  item: ShapeChoiceItem | ShapeEntryItem | EntryItem | RuleChoiceItem,
): readonly CardShape[] {
  const row = 'shapes' in item.prompt ? item.prompt.shapes : [];
  const options = 'options' in item ? item.options : [];
  return [
    ...row.filter((token): token is CardShape => token !== 'gap'),
    ...options.flatMap((option) => ('shape' in option ? [option.shape] : [])),
  ];
}

/** The colour-blind rule and the square / diamond rule over the whole item. */
export function lookAlikeProblems(item: ShapeChoiceItem | ShapeEntryItem): string[] {
  const tokens = tokensOf(item);
  const problems: string[] = [];
  for (const [index, a] of tokens.entries()) {
    for (const b of tokens.slice(index + 1)) {
      if (
        a.kind === b.kind &&
        (a.size ?? 'big') === (b.size ?? 'big') &&
        (a.count ?? 1) === (b.count ?? 1) &&
        confusable(a.colour, b.colour)
      ) {
        problems.push(`${item.id}: ${a.colour} and ${b.colour} ${a.kind} differ only in colour`);
      }
    }
  }
  const kinds = new Set(tokens.map((token) => token.kind));
  if (kinds.has('square') && kinds.has('diamond')) {
    problems.push(`${item.id}: a square and a diamond in one exercise`);
  }
  return problems;
}

const same = (a: readonly unknown[], b: readonly unknown[]): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

// ---------------------------------------------------------------------------------------------------------------------
// pat-next / pat-gap

const UNIT_LETTERS = { AB: 'AB', AAB: 'AAB', ABB: 'ABB', ABC: 'ABC' } as const;

export const PATTERN_UNITS = ['AB', 'AAB', 'ABB', 'ABC'] as const;
export const PATTERN_ATTRS = ['colour', 'kind', 'size', 'kind+colour'] as const;

export interface PatternSet {
  readonly unit: (typeof PATTERN_UNITS)[number];
  readonly attr: (typeof PATTERN_ATTRS)[number];
  readonly units: 2 | 3;
}

/** The full matrix: every unit on every attribute with 2 and 3 units asked for. */
export const PATTERN_SETS: readonly PatternSet[] = PATTERN_UNITS.flatMap((unit) =>
  PATTERN_ATTRS.flatMap((attr) => ([2, 3] as const).map((units) => ({ unit, attr, units }))),
);

/** Whether `keys` repeats with some period of at most half its length. */
function periodic(keys: readonly string[]): boolean {
  for (let period = 1; period <= Math.floor(keys.length / 2); period += 1) {
    if (keys.every((key, index) => index + period >= keys.length || key === keys[index + period])) {
      return true;
    }
  }
  return false;
}

/** Everything wrong with a generated `pat-next` (`mode: 'next'`) or `pat-gap` item, re-solved from its card. */
export function patternProblems(
  mode: 'next' | 'gap',
  set: PatternSet,
  item: ShapeChoiceItem,
  text: string,
): string[] {
  const problems: string[] = [...lookAlikeProblems(item)];
  const { id } = item;
  const row = item.prompt.shapes;
  const gap = row.indexOf('gap');
  const letters = UNIT_LETTERS[set.unit];
  const symbols = new Set(letters).size;
  const tokens = row.filter((token): token is CardShape => token !== 'gap');
  if (text !== (mode === 'next' ? 'What comes next?' : 'What is missing?')) {
    problems.push(`${id}: text "${text}"`);
  }
  if (row.length > 8 || row.filter((token) => token === 'gap').length !== 1) {
    problems.push(`${id}: row of ${String(row.length)} tokens, gaps ${String(gap)}`);
  }
  if (mode === 'next' ? gap !== row.length - 1 : gap < letters.length || gap > row.length - 2) {
    problems.push(`${id}: gap at ${String(gap)} of ${String(row.length)}`);
  }
  const full = Math.floor((mode === 'next' ? row.length - 1 : row.length) / letters.length);
  if (full < 2 || full > set.units) problems.push(`${id}: ${String(full)} full units shown`);
  // The row says the unit over and over: places with the same letter hold the same token, others differ.
  for (const [i, a] of row.entries()) {
    for (const [j, b] of row.entries()) {
      if (j <= i || a === 'gap' || b === 'gap') continue;
      if (
        (letters[i % letters.length] === letters[j % letters.length]) !==
        (keyOf(a) === keyOf(b))
      ) {
        problems.push(`${id}: places ${String(i)} and ${String(j)} break the unit ${set.unit}`);
      }
    }
  }
  // Only the attribute of the set varies.
  const kinds = new Set(tokens.map((token) => token.kind));
  const colours = new Set(tokens.map((token) => token.colour));
  const sizes = new Set(tokens.map((token) => token.size));
  const varied = {
    colour:
      colours.size === symbols && kinds.size === 1 && sizes.size === 1 && sizes.has(undefined),
    kind: kinds.size === symbols && colours.size === 1 && sizes.size === 1 && sizes.has(undefined),
    size:
      sizes.size === symbols &&
      kinds.size === 1 &&
      colours.size === 1 &&
      [...sizes].every((size) => size === 'tiny' || size === 'medium' || size === 'huge'),
    'kind+colour':
      kinds.size === symbols &&
      colours.size === symbols &&
      sizes.size === 1 &&
      sizes.has(undefined),
  };
  if (!varied[set.attr]) problems.push(`${id}: tokens do not vary exactly ${set.attr}`);
  // Options: 3 different cards; exactly the answer completes the row as a repeating pattern; one token outside the pattern (none when
  // the sizes of an ABC unit are all in use).
  const optionKeys = item.options.map((option) => keyOf(option.shape));
  if (item.options.length !== 3 || new Set(optionKeys).size !== 3) {
    problems.push(`${id}: options ${JSON.stringify(optionKeys)}`);
  }
  const fitting = item.options.filter((option) =>
    periodic(row.map((token) => keyOf(token === 'gap' ? option.shape : token))),
  );
  if (
    !same(
      fitting.map((option) => option.id),
      [item.answer],
    )
  ) {
    problems.push(
      `${id}: options that complete the pattern: ${JSON.stringify(fitting.map((o) => o.id))}, answer ${item.answer}`,
    );
  }
  const inRow = new Set(tokens.map(keyOf));
  const outside = item.options.filter((option) => !inRow.has(keyOf(option.shape)));
  const expectedOutside = set.attr === 'size' && symbols === 3 ? 0 : 1;
  if (outside.length !== expectedOutside) {
    problems.push(
      `${id}: ${String(outside.length)} options outside the pattern, ${String(expectedOutside)} expected`,
    );
  }
  for (const { shape } of outside) {
    const sameKind = kinds.has(shape.kind);
    const sameColour = colours.has(shape.colour);
    const outsideOnly =
      (set.attr === 'colour' && sameKind && !sameColour && shape.size === undefined) ||
      (set.attr === 'kind' && !sameKind && sameColour && shape.size === undefined) ||
      (set.attr === 'size' && sameKind && sameColour && !sizes.has(shape.size)) ||
      (set.attr === 'kind+colour' && !sameKind && !sameColour && shape.size === undefined);
    if (!outsideOnly)
      problems.push(`${id}: the outside token ${keyOf(shape)} does not vary only ${set.attr}`);
  }
  // Reason: the wrong option equal to the token just before the gap says "same again".
  const before = row[gap - 1];
  const answer = item.options.find((option) => option.id === item.answer);
  const slip =
    before === undefined ||
    before === 'gap' ||
    answer === undefined ||
    keyOf(before) === keyOf(answer.shape)
      ? undefined
      : keyOf(before);
  const withReason = item.options.filter((option) => option.reason !== undefined);
  const expectedReason = item.options.filter(
    (option) => slip !== undefined && keyOf(option.shape) === slip,
  );
  if (
    !same(
      withReason.map((option) => option.id),
      expectedReason.map((option) => option.id),
    ) ||
    withReason.some((option) => option.reason !== 'bugs.unit-break')
  ) {
    problems.push(
      `${id}: reasons on ${JSON.stringify(withReason.map((option) => option.id))}, expected ${JSON.stringify(expectedReason.map((option) => option.id))}`,
    );
  }
  if (slip !== undefined && expectedReason.length !== 1) {
    problems.push(`${id}: the token before the gap is wrong but not offered`);
  }
  return problems;
}

// ---------------------------------------------------------------------------------------------------------------------
// step-next / step-rule

export interface StepSet {
  readonly family: 'up' | 'down' | 'double' | 'alternate' | 'grow';
  readonly step?: readonly [number, number];
  readonly easy?: boolean;
}

export const STEP_NEXT_SETS: readonly StepSet[] = [
  { family: 'up', step: [3, 3] },
  { family: 'up', step: [4, 4] },
  { family: 'up', step: [6, 9] },
  { family: 'up', step: [3, 9] },
  { family: 'up' },
  { family: 'up', step: [2, 2], easy: true },
  { family: 'up', step: [2, 9], easy: true },
  { family: 'down', step: [3, 9] },
  { family: 'down' },
  { family: 'double' },
  { family: 'alternate' },
  { family: 'grow' },
];

export const STEP_RULE_SETS: readonly StepSet[] = [
  { family: 'up', step: [3, 9] },
  { family: 'up' },
  { family: 'double' },
  { family: 'alternate' },
  { family: 'grow' },
];

/** The terms on a card ("3 7 11 15 ?"). */
export function termsOnCard(big: string): number[] {
  const match = /^(\d+(?: \d+)+) \?$/.exec(big);
  return match?.[1] === undefined ? [] : match[1].split(' ').map(Number);
}

/** The next term, by trying to generate the terms from each family: a constant step, a constant whole ratio of 2 or more, two jumps
 * taking turns, jumps growing by a constant. Returns every family that regenerates the shown terms, with the term it makes next. */
export function generatingFamilies(terms: readonly number[]): { name: string; next: number }[] {
  const [t0 = 0, t1 = 0, t2 = 0] = terms;
  const [j0, j1] = [t1 - t0, t2 - t1];
  const made = (build: (index: number) => number): { prefix: boolean; next: number } => ({
    prefix: terms.every((term, index) => build(index) === term),
    next: build(terms.length),
  });
  const result: { name: string; next: number }[] = [];
  const step = made((index) => t0 + index * j0);
  if (step.prefix && j0 !== 0) result.push({ name: 'step', next: step.next });
  const ratio = t1 / t0;
  const times = made((index) => t0 * ratio ** index);
  if (times.prefix && Number.isInteger(ratio) && ratio >= 2)
    result.push({ name: 'ratio', next: times.next });
  const turns = made((index) => t0 + Math.ceil(index / 2) * j0 + Math.floor(index / 2) * j1);
  if (turns.prefix && j0 !== j1) result.push({ name: 'alternate', next: turns.next });
  const growth = j1 - j0;
  // Jump k is j0 + k * growth, so term n is t0 + n * j0 + growth * n * (n - 1) / 2.
  const grows = made((index) => t0 + index * j0 + (growth * index * (index - 1)) / 2);
  if (grows.prefix && growth !== 0) result.push({ name: 'grow', next: grows.next });
  return result;
}

const FAMILY_NAME = {
  up: 'step',
  down: 'step',
  double: 'ratio',
  alternate: 'alternate',
  grow: 'grow',
} as const;

/** Everything wrong with a generated `step-next` item, re-solved from the numbers on its card. */
export function stepNextProblems(set: StepSet, item: EntryItem, text: string): string[] {
  const problems: string[] = [];
  const { id } = item;
  const big = 'big' in item.prompt ? item.prompt.big : '';
  const terms = termsOnCard(big);
  if (text !== 'What number comes next?') problems.push(`${id}: text "${text}"`);
  const expectedTerms = set.family === 'alternate' || set.family === 'grow' ? 5 : 4;
  if (terms.length !== expectedTerms)
    problems.push(`${id}: ${String(terms.length)} terms in "${big}"`);
  if (terms.some((term) => term > 99 || term < 0))
    problems.push(`${id}: a term outside 0-99 in "${big}"`);
  const families = generatingFamilies(terms);
  if (
    !same(
      families.map((family) => family.name),
      [FAMILY_NAME[set.family]],
    )
  ) {
    problems.push(
      `${id}: "${big}" fits ${JSON.stringify(families.map((family) => family.name))}, not ${FAMILY_NAME[set.family]} only`,
    );
  }
  if (families[0]?.next !== item.answer || item.answer < 0 || item.answer > 100) {
    problems.push(
      `${id}: "${big}" goes on with ${String(families[0]?.next)}, answer ${String(item.answer)}`,
    );
  }
  const jumps = terms.slice(1).map((term, index) => term - (terms[index] ?? 0));
  const [first = 0] = jumps;
  const [least, most] = set.step ?? [2, 9];
  const skipped =
    set.family === 'up' && set.easy !== true && (Math.abs(first) === 2 || Math.abs(first) === 5);
  const jumpsFit: Record<StepSet['family'], boolean> = {
    up: first >= least && first <= most && !skipped,
    down: -first >= least && -first <= most,
    double: (terms[0] ?? 0) >= 1 && (terms[0] ?? 0) <= 5,
    alternate: jumps.every((jump) => jump >= 1 && jump <= 6),
    grow: first >= 1 && first <= 3 && jumps.every((jump, index) => jump === first + index),
  };
  if (!jumpsFit[set.family]) problems.push(`${id}: "${big}" does not fit ${JSON.stringify(set)}`);
  // The reason: the first jump added to the last term again, only where that is a wrong number.
  const last = terms.at(-1) ?? 0;
  const slip = last + first;
  const wanted =
    (set.family === 'alternate' || set.family === 'grow') && slip !== item.answer
      ? [[slip, 'bugs.first-jump']]
      : [];
  if (
    !same(
      (item.reasons ?? []).map((reason) => [reason.value, reason.text]),
      wanted,
    )
  ) {
    problems.push(
      `${id}: reasons ${JSON.stringify(item.reasons)} should be ${JSON.stringify(wanted)}`,
    );
  }
  return problems;
}

/** The terms a rule card makes from `start` (the card's id names the rule). */
function ruleMakes(rule: string, start: number, count: number): number[] {
  const [kind = '', one = '0', two = '0'] = rule.split('-');
  const [a, b] = [Number(one), Number(two)];
  const terms = [start];
  for (let index = 0; index < count - 1; index += 1) {
    const before = terms[index] ?? 0;
    if (kind === 'double') terms.push(before * 2);
    else if (kind === 'step') terms.push(before + a);
    else if (kind === 'alt') terms.push(before + (index % 2 === 0 ? a : b));
    else terms.push(before + a + index);
  }
  return terms;
}

/** The English wording a rule card has. */
export function ruleWords(rule: string): string {
  const [kind = '', one = '', two = ''] = rule.split('-');
  if (kind === 'double') return '× 2 each time';
  if (kind === 'step') return `+${one} each time`;
  if (kind === 'alt') return `+${one}, then +${two}, again and again`;
  return `+${one}, +${String(Number(one) + 1)}, +${String(Number(one) + 2)} …`;
}

/** Everything wrong with a generated `step-rule` item: exactly one card makes every shown number, the others make the first two only,
 * and every card says in English what its id says. */
export function stepRuleProblems(
  set: StepSet,
  item: RuleChoiceItem,
  text: string,
  english: (ref: string) => string,
): string[] {
  const problems: string[] = [];
  const { id } = item;
  const terms = termsOnCard(item.prompt.big);
  if (text !== 'Which rule makes these numbers?') problems.push(`${id}: text "${text}"`);
  if (terms.length !== (set.family === 'alternate' || set.family === 'grow' ? 5 : 4)) {
    problems.push(`${id}: ${String(terms.length)} terms in "${item.prompt.big}"`);
  }
  const families = generatingFamilies(terms);
  if (
    !same(
      families.map((family) => family.name),
      [FAMILY_NAME[set.family]],
    )
  ) {
    problems.push(
      `${id}: "${item.prompt.big}" fits ${JSON.stringify(families.map((family) => family.name))}`,
    );
  }
  if (item.options.length !== 3 || new Set(item.options.map((option) => option.id)).size !== 3) {
    problems.push(`${id}: options ${JSON.stringify(item.options.map((option) => option.id))}`);
  }
  const wording = item.options.map((option) => english(option.text));
  if (new Set(wording).size !== 3) problems.push(`${id}: rule texts ${JSON.stringify(wording)}`);
  for (const option of item.options) {
    if (english(option.text) !== ruleWords(option.id)) {
      problems.push(`${id}: card ${option.id} says "${english(option.text)}"`);
    }
    const made = ruleMakes(option.id, terms[0] ?? 0, terms.length);
    const all = made.join() === terms.join();
    const firstTwo = made[1] === terms[1] && made[2] !== terms[2];
    if (option.id === item.answer ? !all : all || !firstTwo) {
      problems.push(`${id}: rule ${option.id} makes ${made.join(' ')} for "${item.prompt.big}"`);
    }
  }
  if (!item.options.some((option) => option.id === item.answer))
    problems.push(`${id}: no answer card`);
  return problems;
}

// ---------------------------------------------------------------------------------------------------------------------
// grow-next

export interface GrowSet {
  readonly mode: 'choice' | 'entry';
  readonly step: 1 | 2;
  readonly start?: readonly [number, number];
  readonly ahead?: number;
}

export const GROW_SETS: readonly GrowSet[] = [
  { mode: 'choice', step: 1 },
  { mode: 'choice', step: 2 },
  { mode: 'choice', step: 1, start: [1, 3] },
  { mode: 'entry', step: 1, ahead: 1 },
  { mode: 'entry', step: 1, ahead: 2 },
  { mode: 'entry', step: 1, ahead: 3 },
  { mode: 'entry', step: 2, ahead: 1 },
  { mode: 'entry', step: 2, ahead: 2 },
  { mode: 'entry', step: 2, ahead: 3 },
];

/** Everything wrong with a generated `grow-next` item, re-solved from its clusters and (entry) the step named in its sentence. */
export function growProblems(
  set: GrowSet,
  item: ShapeChoiceItem | ShapeEntryItem,
  text: string,
): string[] {
  const problems: string[] = [...lookAlikeProblems(item)];
  const { id } = item;
  const row = item.prompt.shapes;
  const shown = row.filter((token): token is CardShape => token !== 'gap');
  const counts = shown.map((token) => token.count ?? 1);
  const [c1 = 0, c2 = 0, c3 = 0] = counts;
  if (shown.length !== 3 || c2 - c1 !== set.step || c3 - c2 !== set.step) {
    problems.push(`${id}: counts ${counts.join(', ')} for step ${String(set.step)}`);
  }
  if (
    new Set(shown.map((token) => `${token.kind}/${token.colour}/${String(token.size)}`)).size !== 1
  ) {
    problems.push(`${id}: the clusters are not of one shape`);
  }
  const [least, most] = set.start ?? [1, 3];
  if (counts.some((count) => count < 1 || count > 9) || c1 < least || c1 > most) {
    problems.push(`${id}: counts ${counts.join(', ')} outside the range`);
  }
  if (item.type === 'choice') {
    if (set.mode !== 'choice' || row.at(-1) !== 'gap' || row.length !== 4) {
      problems.push(`${id}: a choice shows 3 clusters and a gap`);
    }
    if (text !== 'Which picture comes next?') problems.push(`${id}: text "${text}"`);
    const next = c3 + set.step;
    const optionCounts = item.options.map((option) => option.shape.count ?? 1);
    if (
      !same(
        [...optionCounts].sort((x, y) => x - y),
        [next - set.step, next, next + set.step],
      )
    ) {
      problems.push(`${id}: options ${optionCounts.join(', ')} for next ${String(next)}`);
    }
    if (optionCounts.some((count) => count < 1 || count > 9))
      problems.push(`${id}: option outside 1-9`);
    const answer = item.options.find((option) => option.id === item.answer);
    if ((answer?.shape.count ?? 0) !== next)
      problems.push(
        `${id}: answer card is ${String(answer?.shape.count)}, next is ${String(next)}`,
      );
    for (const option of item.options) {
      const wrong = (option.shape.count ?? 1) !== next;
      if (
        wrong !== (option.reason === 'bugs.grow-off') ||
        (!wrong && option.reason !== undefined)
      ) {
        problems.push(
          `${id}: reason ${String(option.reason)} on a card of ${String(option.shape.count)}`,
        );
      }
    }
  } else {
    const match = /^How many in step (\d+)\?$/.exec(text);
    const n = Number(match?.[1]);
    if (set.mode !== 'entry' || row.includes('gap') || match === null) {
      problems.push(
        `${id}: an entry shows 3 clusters, no gap, and asks "How many in step n?" (got "${text}")`,
      );
    }
    if (n !== 3 + (set.ahead ?? 1))
      problems.push(`${id}: step ${String(n)} for ahead ${String(set.ahead)}`);
    // The child counts on: step n has the count of step 3 plus n - 3 more steps.
    const expected = c3 + (n - 3) * set.step;
    if (item.answer !== expected || expected > 30)
      problems.push(
        `${id}: step ${String(n)} has ${String(expected)}, answer ${String(item.answer)}`,
      );
    const reasons = (item.reasons ?? []).map((reason) => [reason.value, reason.text]);
    if (
      !same(reasons, [
        [expected - set.step, 'bugs.grow-off'],
        [expected + set.step, 'bugs.grow-off'],
      ])
    ) {
      problems.push(`${id}: reasons ${JSON.stringify(item.reasons)}`);
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------------------------------------------------
// far-term

export interface FarSet {
  readonly unit: 'AB' | 'ABC';
  readonly attr: (typeof PATTERN_ATTRS)[number];
  readonly position: readonly [number, number];
}

/** The places of the lessons, by unit: three ranges that climb (AB 9-12, 13-16, 17-20; ABC 7-9, 10-12, 13-15), on every attribute. */
const FAR_RANGES = {
  AB: [
    [9, 12],
    [13, 16],
    [17, 20],
  ],
  ABC: [
    [7, 9],
    [10, 12],
    [13, 15],
  ],
} as const;

export const FAR_SETS: readonly FarSet[] = [
  // The whole range, as the boss draws it.
  ...PATTERN_ATTRS.map((attr): FarSet => ({ unit: 'AB', attr, position: [9, 20] })),
  ...PATTERN_ATTRS.map((attr): FarSet => ({ unit: 'ABC', attr, position: [7, 15] })),
  // The climbing ranges of the lesson (pat-far).
  ...(['AB', 'ABC'] as const).flatMap((unit) =>
    FAR_RANGES[unit].flatMap((position) =>
      PATTERN_ATTRS.map((attr): FarSet => ({ unit, attr, position })),
    ),
  ),
  // The guided places and the easier variant.
  ...PATTERN_ATTRS.flatMap((attr) =>
    ([6, 8, 10] as const).map((place): FarSet => ({ unit: 'AB', attr, position: [place, place] })),
  ),
];

/** Everything wrong with a generated `far-term` item: the child counts through the row's unit up to the place its sentence names. */
export function farProblems(set: FarSet, item: ShapeChoiceItem, text: string): string[] {
  const problems: string[] = [...lookAlikeProblems(item)];
  const { id } = item;
  const row = item.prompt.shapes.filter((token): token is CardShape => token !== 'gap');
  const length = set.unit.length;
  const match = /^Which shape is number (\d+)\?$/.exec(text);
  const n = Number(match?.[1]);
  if (match === null) problems.push(`${id}: text "${text}"`);
  if (row.length !== 2 * length || row.length !== item.prompt.shapes.length) {
    problems.push(`${id}: row of ${String(item.prompt.shapes.length)} for unit ${set.unit}`);
  }
  if (n <= row.length || n < set.position[0] || n > set.position[1]) {
    problems.push(
      `${id}: place ${String(n)} for position ${set.position.join('-')} and ${String(row.length)} shown`,
    );
  }
  // Count: each token of the unit in turn, again and again, until number n.
  let counted = row[0];
  for (let place = 1; place <= n; place += 1) counted = row[(place - 1) % length];
  const answer = item.options.find((option) => option.id === item.answer);
  if (counted === undefined || answer === undefined || keyOf(answer.shape) !== keyOf(counted)) {
    problems.push(
      `${id}: number ${String(n)} is ${counted === undefined ? '?' : keyOf(counted)}, answer card ${answer === undefined ? '?' : keyOf(answer.shape)}`,
    );
  }
  const unit = row.slice(0, length).map(keyOf);
  if (new Set(unit).size !== length || row.slice(length).map(keyOf).join() !== unit.join()) {
    problems.push(`${id}: the row is not 2 units of ${String(length)} different tokens`);
  }
  if (!same(item.options.map((option) => keyOf(option.shape)).sort(), [...unit].sort())) {
    problems.push(`${id}: options are not the unit's tokens`);
  }
  if (!item.options.every((option) => option.id.startsWith(`p${String(n)}-`))) {
    problems.push(
      `${id}: option ids ${JSON.stringify(item.options.map((option) => option.id))} do not name place ${String(n)}`,
    );
  }
  // Reason: the token a place before or after (counting one by one, a place off) is a wrong card.
  const off = new Set(
    [row[(n - 2) % length], row[n % length]].map((token) =>
      token === undefined ? '' : keyOf(token),
    ),
  );
  for (const option of item.options) {
    const wanted =
      keyOf(option.shape) !== (counted === undefined ? '' : keyOf(counted)) &&
      off.has(keyOf(option.shape));
    if (wanted !== (option.reason === 'bugs.far-off') || (!wanted && option.reason !== undefined)) {
      problems.push(`${id}: reason ${String(option.reason)} on ${option.id}`);
    }
  }
  return problems;
}

export type { PromptToken };
