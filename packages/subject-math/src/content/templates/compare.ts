// W1 comparing templates (docs/subjects/math/curriculum.md §3): `cmp-sign` (pick < = >), `cmp-order` (smallest first), `cmp-tf`
// ("406 > 460", true or false). The numbers share their first `shared` digits, so the first place that tells them apart is the
// lever; reason `ones-first` is the sign a child gets comparing from the ones place up. Each `check` re-reads the numerals on the card.
import { randomInt, shuffle, type Random } from '@learn/platform-core/domain/random';
import type { ExerciseTemplate } from '@learn/platform-content/generate/template';
import { z } from 'zod';
import { bugRef, onesFirstSign, valueOf } from './bugs.ts';
import { digitsParam, drawPair, fail, sharedParam } from './draw.ts';
import type { BigOption, ChoiceItem, OrderItem, TrueFalseItem } from './items.ts';
import { numeral, parseNumeral } from './numeral.ts';

const compareParams = z.object({ digits: digitsParam, shared: sharedParam }).strict();

export type CompareParams = z.output<typeof compareParams>;

type Sign = '<' | '=' | '>';

/** The pair of numbers of one item (distinct: they differ at the digit after the shared ones). */
function drawNumbers(random: Random, { digits, shared }: CompareParams): readonly [number, number] {
  const [a, b] = drawPair(random, digits, shared);
  return [valueOf(a), valueOf(b)];
}

/** The sign of `a ? b` read digit by digit from the left, as text (the right way). */
function trueSign(a: string, b: string): Sign {
  if (a.length !== b.length) return a.length < b.length ? '<' : '>';
  return a === b ? '=' : a < b ? '<' : '>';
}

/** The sign of `a ? b` comparing the last digits first and stopping at the first difference (the `ones-first` bug), as text. */
function onesFirst(a: string, b: string): Sign {
  const [x, y] = [a.split('').reverse().join(''), b.split('').reverse().join('')];
  return x === y ? '=' : x < y ? '<' : '>';
}

/** The numbers share exactly their first `shared` digits (and have `digits` digits each). */
function sharedRule(a: string, b: string, { digits, shared }: CompareParams): boolean {
  return (
    a.length === digits &&
    b.length === digits &&
    a.slice(0, shared) === b.slice(0, shared) &&
    a.charAt(shared) !== b.charAt(shared)
  );
}

/** "406 ? 460" or "406 > 460": the two numerals and the sign between them, or `null`. */
function readComparison(
  big: string,
  signs: string,
): { readonly a: string; readonly b: string; readonly sign: string } | null {
  const match = new RegExp(`^(\\S+) ([${signs}]) (\\S+)$`).exec(big);
  const [, left, sign, right] = match ?? [];
  if (left === undefined || sign === undefined || right === undefined) return null;
  const [a, b] = [parseNumeral(left), parseNumeral(right)];
  return a === null || b === null ? null : { a: String(a), b: String(b), sign };
}

// ---------------------------------------------------------------------------------------------------------------------
// cmp-sign

const SIGN_OPTIONS = [
  { id: 'lt', big: '<' },
  { id: 'eq', big: '=' },
  { id: 'gt', big: '>' },
] as const;

/** Pick the sign for "406 ? 460". The card keeps the three signs in a fixed order; the answer is never `=` (the numbers differ). */
export const cmpSign: ExerciseTemplate<CompareParams, ChoiceItem> = {
  params: compareParams,
  generate(params, ctx) {
    const [a, b] = drawNumbers(ctx.random, params);
    const right = a < b ? '<' : '>';
    const wrong = onesFirstSign(a, b);
    const options: readonly BigOption[] = SIGN_OPTIONS.map((option) => ({
      ...option,
      ...(option.big === wrong && wrong !== right ? { reason: bugRef('ones-first') } : {}),
    }));
    return {
      id: ctx.id,
      type: 'choice',
      text: ctx.text('text', 'templates.cmp-sign'),
      prompt: { big: `${numeral(a)} ? ${numeral(b)}` },
      options,
      answer: SIGN_OPTIONS.find((option) => option.big === right)?.id ?? 'lt',
    };
  },
  check(item, params, at) {
    const read = readComparison(item.prompt?.big ?? '', '?');
    if (read === null) {
      fail(at, `cannot read the prompt "${item.prompt?.big ?? ''}" as "a ? b"`);
      return;
    }
    if (!sharedRule(read.a, read.b, params)) {
      fail(
        at,
        `${read.a} and ${read.b} do not share exactly ${String(params.shared)} leading digits`,
      );
    }
    if (
      JSON.stringify(item.options.map((option) => option.big)) !== JSON.stringify(['<', '=', '>'])
    ) {
      fail(at, `the options should be < = > in that order`);
      return;
    }
    const right = trueSign(read.a, read.b);
    const satisfied = item.options.filter((option) => option.big === right);
    if (right === '=' || satisfied.length !== 1 || satisfied[0]?.id !== item.answer) {
      fail(
        at,
        `${read.a} ? ${read.b} is ${right}: option "${item.answer}" should be the only one that fits`,
      );
    }
    const wrong = onesFirst(read.a, read.b);
    const reasons = item.options.flatMap((option) =>
      option.reason === undefined ? [] : [`${option.big} ${option.reason}`],
    );
    const expected = wrong === right ? [] : [`${wrong} ${bugRef('ones-first')}`];
    if (JSON.stringify(reasons) !== JSON.stringify(expected)) {
      fail(at, `reasons ${JSON.stringify(reasons)} should be ${JSON.stringify(expected)}`);
    }
  },
};

// ---------------------------------------------------------------------------------------------------------------------
// cmp-order

/** 4 distinct numbers that share their first `shared` digits, in a shuffled order that is not already ascending. */
function drawFour(random: Random, { digits, shared }: CompareParams): readonly number[] {
  const tailWidth = digits - shared;
  const prefix = Array.from({ length: shared }, (_unused, index) =>
    randomInt(random, index === 0 ? 1 : 0, 9),
  );
  const lowest = shared === 0 ? 10 ** (digits - 1) : 0;
  const numbers = new Set<number>();
  while (numbers.size < 4) {
    numbers.add(valueOf(prefix) * 10 ** tailWidth + randomInt(random, lowest, 10 ** tailWidth - 1));
  }
  const ascending = [...numbers].sort((x, y) => x - y);
  for (;;) {
    const shuffled = shuffle(ascending, random);
    if (shuffled.join() !== ascending.join()) return shuffled;
  }
}

/** Put 4 numbers in order, smallest first; the cards show the numerals only. */
export const cmpOrder: ExerciseTemplate<CompareParams, OrderItem> = {
  params: compareParams,
  generate(params, ctx) {
    const shown = drawFour(ctx.random, params);
    return {
      id: ctx.id,
      type: 'order',
      text: ctx.text('text', 'templates.cmp-order'),
      items: shown.map((value) => ({ id: `n${String(value)}`, big: numeral(value) })),
      answer: [...shown].sort((x, y) => x - y).map((value) => `n${String(value)}`),
    };
  },
  check(item, params, at) {
    const values = item.items.map((card) => parseNumeral(card.big));
    if (item.items.length !== 4 || values.includes(null) || new Set(values).size !== 4) {
      fail(
        at,
        `the cards ${JSON.stringify(item.items.map((card) => card.big))} are not 4 distinct numerals`,
      );
      return;
    }
    const texts = values.map(String);
    const prefix = (texts[0] ?? '').slice(0, params.shared);
    if (texts.some((text) => text.length !== params.digits || !text.startsWith(prefix))) {
      fail(
        at,
        `${texts.join(', ')} are not ${String(params.digits)}-digit numbers sharing ${String(params.shared)} leading digits`,
      );
    }
    const ascending = item.items
      .map((card, index) => ({ id: card.id, value: values[index] ?? 0 }))
      .sort((x, y) => x.value - y.value)
      .map((card) => card.id);
    if (JSON.stringify(item.answer) !== JSON.stringify(ascending)) {
      fail(
        at,
        `the answer ${item.answer.join(' ')} should be ${ascending.join(' ')} (smallest first)`,
      );
    }
    if (item.answer.join() === item.items.map((card) => card.id).join()) {
      fail(at, 'the cards are already in order');
    }
  },
};

// ---------------------------------------------------------------------------------------------------------------------
// cmp-tf

/** Is "406 > 460" true? The sign shown is right half of the time; the `ones-first` reason is spoken on the wrong pick when comparing
 * from the ones place would have judged the sentence the other way. */
export const cmpTf: ExerciseTemplate<CompareParams, TrueFalseItem> = {
  params: compareParams,
  generate(params, ctx) {
    const [a, b] = drawNumbers(ctx.random, params);
    const shownSign = randomInt(ctx.random, 0, 1) === 0 ? '<' : '>';
    const right = a < b ? '<' : '>';
    return {
      id: ctx.id,
      type: 'true-false',
      text: ctx.text('text', 'templates.cmp-tf'),
      prompt: { big: `${numeral(a)} ${shownSign} ${numeral(b)}` },
      answer: shownSign === right,
      ...(onesFirstSign(a, b) === right ? {} : { reason: bugRef('ones-first') }),
    };
  },
  check(item, params, at) {
    const read = readComparison(item.prompt.big, '<>');
    if (read === null) {
      fail(at, `cannot read the prompt "${item.prompt.big}" as "a < b" or "a > b"`);
      return;
    }
    if (!sharedRule(read.a, read.b, params)) {
      fail(
        at,
        `${read.a} and ${read.b} do not share exactly ${String(params.shared)} leading digits`,
      );
    }
    const right = trueSign(read.a, read.b);
    if (item.answer !== (read.sign === right)) {
      fail(
        at,
        `"${item.prompt.big}" is ${String(read.sign === right)}, not ${String(item.answer)}`,
      );
    }
    const expected = onesFirst(read.a, read.b) === right ? undefined : bugRef('ones-first');
    if (item.reason !== expected) {
      fail(at, `reason ${item.reason ?? '(none)'} should be ${expected ?? '(none)'}`);
    }
  },
};
