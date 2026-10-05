// W1 number-step templates (docs/subjects/logic/curriculum.md §3): `step-next` ("3 7 11 15 ?": type the next number) and `step-rule`
// ("Which rule makes these numbers?": three rules, one fits every jump). Five families: constant step up or down, doubling, two
// steps taking turns, steps that grow by one. The terms are written with single spaces (the card's big text holds 16 characters,
// and five two-digit terms with the "?" fill it). The `check` of both asks the four rule families what each makes of the shown
// terms: exactly the generating family fits, so `1, 2, 4` (also +1, +2) is a bad item.
import { pick, randomInt, shuffle, type Random } from '@learn/platform-core/domain/random';
import type { ExerciseTemplate, GenerateContext } from '@learn/platform-content/generate/template';
import type { Where } from '@learn/platform-content/subject';
import { z } from 'zod';
import { bugRef } from './bugs.ts';
import { fail, range } from './draw.ts';
import type { EntryItem, RuleChoiceItem, TextOption, ValueReason } from './items.ts';

export const FAMILIES = ['up', 'down', 'double', 'alternate', 'grow'] as const;
export type Family = (typeof FAMILIES)[number];

/** The steps `up` skips unless `easy`: counting by 2s and 5s (and 10s) is the times tables' skip counting, not a pattern to find. */
const SKIP_COUNTING = [2, 5];

/** Terms the card shows: 4, or 5 when two steps alternate or the steps grow. Every shown term has at most two digits. */
function shownCount(family: Family): number {
  return family === 'alternate' || family === 'grow' ? 5 : 4;
}

const stepNumber = z.number().int().min(2).max(9);

/** `[min, max]`, both within 2-9. */
const stepRange = z.tuple([stepNumber, stepNumber]).refine(([least, most]) => least <= most, {
  message: 'step must go from the smaller to the larger',
});

type StepRange = z.output<typeof stepRange>;

/** The steps a constant-step family may use under `range`: `up` skips 2 and 5 unless `easy`. */
function allowedSteps(family: Family, [least, most]: StepRange, easy: boolean): readonly number[] {
  return range(least, most).filter(
    (step) => family !== 'up' || easy || !SKIP_COUNTING.includes(step),
  );
}

const DEFAULT_STEPS: StepRange = [2, 9];

const stepNextParams = z
  .object({
    family: z.enum(FAMILIES),
    step: stepRange.optional(),
    easy: z.boolean().default(false),
  })
  .strict()
  .superRefine((params, ctx) => {
    const constant = params.family === 'up' || params.family === 'down';
    if (!constant && params.step !== undefined) {
      ctx.addIssue({ code: 'custom', path: ['step'], message: `${params.family} takes no step` });
    }
    if (params.easy && params.family !== 'up') {
      ctx.addIssue({ code: 'custom', path: ['easy'], message: 'easy is for the up family only' });
    }
    if (
      constant &&
      allowedSteps(params.family, params.step ?? DEFAULT_STEPS, params.easy).length === 0
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['step'],
        message: 'no step is left (up skips 2 and 5 unless easy)',
      });
    }
  });

export type StepNextParams = z.output<typeof stepNextParams>;

const stepRuleParams = z
  .object({
    family: z.enum(['up', 'double', 'alternate', 'grow']),
    step: stepRange.optional(),
  })
  .strict()
  .superRefine((params, ctx) => {
    if (params.family !== 'up' && params.step !== undefined) {
      ctx.addIssue({ code: 'custom', path: ['step'], message: `${params.family} takes no step` });
    }
    if (
      params.family === 'up' &&
      allowedSteps('up', params.step ?? DEFAULT_STEPS, false).length === 0
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['step'],
        message: 'no step is left (up skips 2 and 5)',
      });
    }
  });

export type StepRuleParams = z.output<typeof stepRuleParams>;

// ---------------------------------------------------------------------------------------------------------------------
// The sequences

/** The numbers of one item: the terms shown, the next one, and the jumps that made them. */
interface Sequence {
  readonly terms: readonly number[];
  readonly answer: number;
}

/** The terms that start at `start` and take `jumps` in turn. */
function walk(start: number, jumps: readonly number[]): readonly number[] {
  return jumps.reduce<number[]>(
    (terms, jump) => [...terms, (terms.at(-1) ?? start) + jump],
    [start],
  );
}

function drawSequence(random: Random, family: Family, steps: readonly number[]): Sequence {
  if (family === 'up') {
    const step = pick(random, steps);
    const start = randomInt(random, 1, 40);
    const all = walk(start, [step, step, step, step]);
    return { terms: all.slice(0, 4), answer: all[4] ?? 0 };
  }
  if (family === 'down') {
    const step = pick(random, steps);
    const start = randomInt(random, 4 * step + 1, Math.min(99, 4 * step + 30));
    const all = walk(start, [-step, -step, -step, -step]);
    return { terms: all.slice(0, 4), answer: all[4] ?? 0 };
  }
  if (family === 'double') {
    const start = randomInt(random, 1, 5);
    return { terms: [start, 2 * start, 4 * start, 8 * start], answer: 16 * start };
  }
  if (family === 'alternate') {
    const first = randomInt(random, 1, 6);
    const second = pick(
      random,
      range(1, 6).filter((step) => step !== first),
    );
    const all = walk(randomInt(random, 1, 30), [first, second, first, second, first]);
    return { terms: all.slice(0, 5), answer: all[5] ?? 0 };
  }
  const first = randomInt(random, 1, 3);
  const all = walk(randomInt(random, 1, 15), [first, first + 1, first + 2, first + 3, first + 4]);
  return { terms: all.slice(0, 5), answer: all[5] ?? 0 };
}

/** The card's text: the terms and a "?" for the next one. */
export function termsBig(terms: readonly number[]): string {
  return `${terms.join(' ')} ?`;
}

/** The terms a card shows ("3 7 11 15 ?"), or `null`. */
export function parseTerms(big: string): readonly number[] | null {
  const match = /^(\d+(?: \d+){2,}) \?$/.exec(big);
  return match?.[1] === undefined ? null : match[1].split(' ').map(Number);
}

// ---------------------------------------------------------------------------------------------------------------------
// The rule families

/** The four families a child could read into numbers, and the next term each makes. */
export type FitFamily = 'step' | 'ratio' | 'alternate' | 'grow';

export interface Fit {
  readonly family: FitFamily;
  readonly next: number;
}

/** The jumps between neighbouring terms. */
function jumpsOf(terms: readonly number[]): readonly number[] {
  return terms.slice(1).map((term, index) => term - (terms[index] ?? 0));
}

/** Every family that makes the shown terms (at least three), with its next term: a constant step (not 0), a constant whole ratio of 2
 * or more, two steps taking turns (not alike), steps growing by a constant (not 0). */
export function fittingFamilies(terms: readonly number[]): readonly Fit[] {
  const last = terms.at(-1);
  const [first, second] = terms;
  if (terms.length < 3 || last === undefined || first === undefined || second === undefined)
    return [];
  const jumps = jumpsOf(terms);
  const [jump = 0, next = 0] = jumps;
  const fits: Fit[] = [];
  if (jump !== 0 && jumps.every((entry) => entry === jump)) {
    fits.push({ family: 'step', next: last + jump });
  }
  const ratio = second / first;
  if (
    first >= 1 &&
    Number.isInteger(ratio) &&
    ratio >= 2 &&
    terms.every((term, index) => term === first * ratio ** index)
  ) {
    fits.push({ family: 'ratio', next: last * ratio });
  }
  if (jump !== next && jumps.every((entry, index) => entry === (index % 2 === 0 ? jump : next))) {
    fits.push({ family: 'alternate', next: last + (jumps.length % 2 === 0 ? jump : next) });
  }
  const growth = next - jump;
  if (growth !== 0 && jumps.every((entry, index) => entry === jump + index * growth)) {
    fits.push({ family: 'grow', next: last + jump + jumps.length * growth });
  }
  return fits;
}

/** The family a template's `family` param generates. */
function fitOf(family: Family): FitFamily {
  switch (family) {
    case 'up':
    case 'down':
      return 'step';
    case 'double':
      return 'ratio';
    case 'alternate':
      return 'alternate';
    case 'grow':
      return 'grow';
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// step-next

/** The wrong number of a child who adds the first jump to the last term again (`first-jump`); only when it is not the answer
 * (with two steps taking turns the next jump IS the first one). */
function firstJumpReasons(terms: readonly number[], answer: number): readonly ValueReason[] {
  const last = terms.at(-1) ?? 0;
  const value = last + (jumpsOf(terms)[0] ?? 0);
  return value === answer ? [] : [{ value, text: bugRef('first-jump') }];
}

/** The reasons of a `step-next` card: only the two families whose next jump differs from the last ones have a first-jump slip. */
function reasonsOf(
  family: Family,
  terms: readonly number[],
  answer: number,
): readonly ValueReason[] {
  return family === 'alternate' || family === 'grow' ? firstJumpReasons(terms, answer) : [];
}

/** "What number comes next?" over a row of numbers; the child types the next one. */
export const stepNext: ExerciseTemplate<StepNextParams, EntryItem> = {
  params: stepNextParams,
  generate({ family, step, easy }, ctx) {
    const steps = allowedSteps(family, step ?? DEFAULT_STEPS, easy);
    const { terms, answer } = drawSequence(ctx.random, family, steps);
    const reasons = reasonsOf(family, terms, answer);
    return {
      id: ctx.id,
      type: 'number-entry',
      text: ctx.text('text', 'templates.step-next'),
      prompt: { big: termsBig(terms) },
      answer,
      ...(reasons.length === 0 ? {} : { reasons }),
    };
  },
  check(item, params, at) {
    const terms = readCard(item.prompt, params.family, at);
    if (terms === null) return;
    const jumps = jumpsOf(terms);
    const steps = allowedSteps(params.family, params.step ?? DEFAULT_STEPS, params.easy);
    const [jump = 0] = jumps;
    checkFamily(terms, params.family, item.answer, at);
    const sizeFits: Record<Family, boolean> = {
      up: steps.includes(jump),
      down: steps.includes(-jump),
      double: (terms[0] ?? 0) <= 5,
      alternate: jumps.every((entry) => entry >= 1 && entry <= 6),
      grow: jump >= 1 && jump <= 3,
    };
    if (!sizeFits[params.family]) {
      fail(at, `the terms ${terms.join(' ')} do not fit the ${params.family} parameters`);
    }
    const found = (item.reasons ?? []).map((reason) => `${String(reason.value)} ${reason.text}`);
    const wanted = reasonsOf(params.family, terms, item.answer).map(
      (reason) => `${String(reason.value)} ${reason.text}`,
    );
    if (JSON.stringify(found) !== JSON.stringify(wanted)) {
      fail(at, `reasons ${JSON.stringify(found)} should be ${JSON.stringify(wanted)}`);
    }
  },
};

/** Reads the terms off the card and checks how many (4 or 5), their size (0-99) and the answer's (0-100); `null` when unreadable. */
function readCard(
  prompt: EntryItem['prompt'],
  family: Family,
  at: Where,
): readonly number[] | null {
  const big = 'big' in prompt ? prompt.big : '';
  return readTerms(big, family, at);
}

function readTerms(big: string, family: Family, at: Where): readonly number[] | null {
  const terms = parseTerms(big);
  if (terms === null) {
    fail(at, `cannot read the prompt "${big}" as terms and a "?"`);
    return null;
  }
  if (terms.length !== shownCount(family)) {
    fail(at, `${String(terms.length)} terms shown, ${family} shows ${String(shownCount(family))}`);
  }
  if (terms.some((term) => term > 99)) {
    fail(at, `a shown term is over 99: ${terms.join(' ')}`);
  }
  return terms;
}

/** Exactly the generating family fits `terms`, and it makes `answer` (0-100). */
function checkFamily(terms: readonly number[], family: Family, answer: number, at: Where): void {
  const fits = fittingFamilies(terms);
  const wanted = fitOf(family);
  const [only] = fits;
  if (fits.length !== 1 || only?.family !== wanted) {
    fail(
      at,
      `${terms.join(' ')} fits ${fits.length === 0 ? 'no rule' : fits.map((fit) => fit.family).join(' and ')}, it must fit only ${wanted}`,
    );
    return;
  }
  if (only.next !== answer) {
    fail(at, `the next term is ${String(only.next)}, not ${String(answer)}`);
  }
  if (answer < 0 || answer > 100) fail(at, `the answer ${String(answer)} is outside 0-100`);
  const direction = (jumpsOf(terms)[0] ?? 0) > 0;
  if (family === 'down' ? direction : family === 'up' && !direction) {
    fail(at, `${family} goes the wrong way: ${terms.join(' ')}`);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// step-rule

/** A rule as a child would say it: how the terms go on from the first. */
export type Rule =
  | { readonly kind: 'step'; readonly step: number }
  | { readonly kind: 'double' }
  | { readonly kind: 'alt'; readonly first: number; readonly second: number }
  | { readonly kind: 'grow'; readonly first: number };

/** The id of a rule's card: `step-4`, `double`, `alt-2-5`, `grow-1`. */
export function ruleId(rule: Rule): string {
  switch (rule.kind) {
    case 'step':
      return `step-${String(rule.step)}`;
    case 'double':
      return 'double';
    case 'alt':
      return `alt-${String(rule.first)}-${String(rule.second)}`;
    case 'grow':
      return `grow-${String(rule.first)}`;
  }
}

/** The rule a card id names, or `null`. */
export function parseRule(id: string): Rule | null {
  const match = /^(step|alt|grow)-(\d+)(?:-(\d+))?$/.exec(id);
  if (id === 'double') return { kind: 'double' };
  const [, kind, one, two] = match ?? [];
  if (one === undefined) return null;
  if (kind === 'step' && two === undefined) return { kind: 'step', step: Number(one) };
  if (kind === 'grow' && two === undefined) return { kind: 'grow', first: Number(one) };
  if (kind === 'alt' && two !== undefined) {
    return { kind: 'alt', first: Number(one), second: Number(two) };
  }
  return null;
}

/** The `count` terms a rule makes from `start`. */
export function ruleTerms(rule: Rule, start: number, count: number): readonly number[] {
  const jumpAt = (index: number): number => {
    switch (rule.kind) {
      case 'step':
        return rule.step;
      case 'alt':
        return index % 2 === 0 ? rule.first : rule.second;
      case 'grow':
        return rule.first + index;
      case 'double':
        return 0;
    }
  };
  const terms = [start];
  for (let index = 0; index < count - 1; index += 1) {
    const before = terms.at(-1) ?? start;
    terms.push(rule.kind === 'double' ? before * 2 : before + jumpAt(index));
  }
  return terms;
}

/** Whether the rule makes every term of `terms`. */
function fitsAll(rule: Rule, terms: readonly number[]): boolean {
  return ruleTerms(rule, terms[0] ?? 0, terms.length).join() === terms.join();
}

/** Whether the rule makes the first two terms and then goes its own way. */
function fitsFirstTwoOnly(rule: Rule, terms: readonly number[]): boolean {
  const made = ruleTerms(rule, terms[0] ?? 0, 3);
  return made[1] === terms[1] && made[2] !== terms[2];
}

/** The rule that makes the whole of a sequence of the family (read off its first jumps). */
function rightRule(family: StepRuleParams['family'], terms: readonly number[]): Rule {
  const [first = 0, second = 0] = jumpsOf(terms);
  switch (family) {
    case 'up':
      return { kind: 'step', step: first };
    case 'double':
      return { kind: 'double' };
    case 'alternate':
      return { kind: 'alt', first, second };
    case 'grow':
      return { kind: 'grow', first };
  }
}

/** The kinds of wrong rule that fit the first two terms only, in a fixed order; each has the rules of its kind that qualify. */
function wrongRules(terms: readonly number[], right: Rule): readonly (readonly Rule[])[] {
  const [first = 1] = jumpsOf(terms);
  const candidates: readonly (readonly Rule[])[] = [
    [{ kind: 'step', step: first }],
    [{ kind: 'double' }],
    [{ kind: 'grow', first }],
    range(1, 9)
      .filter((second) => second !== first)
      .map((second): Rule => ({ kind: 'alt', first, second })),
  ];
  return candidates
    .map((rules) =>
      rules.filter((rule) => ruleId(rule) !== ruleId(right) && fitsFirstTwoOnly(rule, terms)),
    )
    .filter((rules) => rules.length > 0);
}

/** The `lessons:` text of a rule and the values it names. */
function ruleText(rule: Rule): { readonly key: string; readonly vars: Record<string, number> } {
  switch (rule.kind) {
    case 'step':
      return { key: 'templates.rule-step', vars: { d: rule.step } };
    case 'double':
      return { key: 'templates.rule-double', vars: {} };
    case 'alt':
      return { key: 'templates.rule-alt', vars: { a: rule.first, b: rule.second } };
    case 'grow':
      return {
        key: 'templates.rule-grow',
        vars: { a: rule.first, b: rule.first + 1, c: rule.first + 2 },
      };
  }
}

function ruleOptions(
  ctx: GenerateContext,
  right: Rule,
  wrong: readonly Rule[],
): readonly TextOption[] {
  const ordered = shuffle([right, ...wrong], ctx.random);
  return ordered.map((rule, index): TextOption => {
    const id = ruleId(rule);
    const { key, vars } = ruleText(rule);
    return { id, text: ctx.text(`rule-${['a', 'b', 'c'][index] ?? 'x'}`, key, vars) };
  });
}

/** "Which rule makes these numbers?": the right rule and two that fit the first two terms only. */
export const stepRule: ExerciseTemplate<StepRuleParams, RuleChoiceItem> = {
  params: stepRuleParams,
  generate({ family, step }, ctx) {
    const { terms } = drawSequence(
      ctx.random,
      family,
      allowedSteps('up', step ?? DEFAULT_STEPS, false),
    );
    const right = rightRule(family, terms);
    const [firstKind, secondKind] = shuffle(wrongRules(terms, right), ctx.random);
    if (firstKind === undefined || secondKind === undefined) {
      throw new RangeError('fewer than two kinds of wrong rule fit the first two terms');
    }
    const wrong = [pick(ctx.random, firstKind), pick(ctx.random, secondKind)];
    return {
      id: ctx.id,
      type: 'choice',
      text: ctx.text('text', 'templates.step-rule'),
      prompt: { big: termsBig(terms) },
      options: ruleOptions(ctx, right, wrong),
      answer: ruleId(right),
    };
  },
  check(item, params, at) {
    const terms = readTerms(item.prompt.big, params.family, at);
    if (terms === null) return;
    const rules = item.options.map((option) => parseRule(option.id));
    if (item.options.length !== 3 || rules.some((rule) => rule === null)) {
      fail(
        at,
        `needs 3 options that name a rule, has ${JSON.stringify(item.options.map((option) => option.id))}`,
      );
      return;
    }
    if (new Set(item.options.map((option) => option.id)).size !== 3) {
      fail(at, 'the 3 rules must be different');
      return;
    }
    const fitting = item.options.filter((option) => {
      const rule = parseRule(option.id);
      return rule !== null && fitsAll(rule, terms);
    });
    if (fitting.length !== 1 || fitting[0]?.id !== item.answer) {
      fail(
        at,
        `${terms.join(' ')} should fit exactly one rule, the answer "${item.answer}"; fits ${JSON.stringify(fitting.map((option) => option.id))}`,
      );
    }
    for (const option of item.options) {
      const rule = parseRule(option.id);
      if (option.id !== item.answer && rule !== null && !fitsFirstTwoOnly(rule, terms)) {
        fail(at, `the wrong rule "${option.id}" must fit the first two terms and no more`);
      }
    }
    checkFamily(terms, params.family, fittingNext(terms), at);
    const answerRule = parseRule(item.answer);
    if (answerRule === null || ruleId(answerRule) !== ruleId(rightRule(params.family, terms))) {
      fail(
        at,
        `the answer "${item.answer}" is not the ${params.family} rule of ${terms.join(' ')}`,
      );
    }
  },
};

/** The next term of the one family that fits (0 when none does: `checkFamily` reports that). */
function fittingNext(terms: readonly number[]): number {
  return fittingFamilies(terms)[0]?.next ?? 0;
}
