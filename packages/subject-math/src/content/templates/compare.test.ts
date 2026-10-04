// cmp-sign, cmp-order, cmp-tf over 1 000 seeds per (digits, shared) of curriculum §2: each item is solved again here from its card
// (plain number comparison, and a ones-first comparison by arithmetic), and every `check` fails on a hand-broken item.
import { describe, expect, it } from 'vitest';
import type { ChoiceItem, OrderItem, TrueFalseItem } from './items.ts';
import { checkIssues, overSeeds, sample } from './testing.ts';

const COMBOS = ([3, 4] as const).flatMap((digits) =>
  ([0, 1, 2] as const).map((shared) => ({ digits, shared })),
);

/** The sign of `a ? b`, from the ones place up (arithmetic, not strings). */
function fromOnes(a: number, b: number, digits: number): '<' | '>' | '=' {
  for (let place = 1; place < 10 ** digits; place *= 10) {
    const [x, y] = [Math.floor(a / place) % 10, Math.floor(b / place) % 10];
    if (x !== y) return x < y ? '<' : '>';
  }
  return '=';
}

/** The first `shared` digits agree and the next one differs (digits by arithmetic). */
function sharedProblems(a: number, b: number, digits: number, shared: number): string[] {
  const digit = (n: number, i: number): number => Math.floor(n / 10 ** (digits - 1 - i)) % 10;
  const same = Array.from({ length: shared }, (_unused, i) => digit(a, i) === digit(b, i));
  return same.every(Boolean) &&
    digit(a, shared) !== digit(b, shared) &&
    a >= 10 ** (digits - 1) &&
    b >= 10 ** (digits - 1)
    ? []
    : [
        `${String(a)} / ${String(b)} do not share exactly ${String(shared)} of ${String(digits)} digits`,
      ];
}

const read = (big: string): { a: number; sign: string; b: number } => {
  const [a, sign, b] = big.split(' ');
  return { a: Number(a), sign: sign ?? '', b: Number(b) };
};

describe('cmp-sign', () => {
  describe.each(COMBOS)('digits $digits, shared $shared', ({ digits, shared }) => {
    it('has one right sign, the three signs in a fixed order, and the ones-first reason only on a sign that is wrong', () => {
      let reasons = 0;
      const { problems, items } = overSeeds<ChoiceItem>(
        'cmp-sign',
        { digits, shared },
        ({ item, text }) => {
          const { a, b } = read(item.prompt?.big ?? '');
          const right = a < b ? '<' : a > b ? '>' : '=';
          const holds = item.options.filter((option) => option.big === right);
          const wrong = fromOnes(a, b, digits);
          const reasonOptions = item.options.filter((option) => option.reason !== undefined);
          if (reasonOptions.length > 0) reasons += 1;
          return [
            ...(text === 'Which sign goes in the gap? The open side faces the bigger number.'
              ? []
              : [`${item.id}: text "${text}"`]),
            ...(item.prompt?.big === `${String(a)} ? ${String(b)}`
              ? []
              : [`${item.id}: big ${item.prompt?.big ?? ''}`]),
            ...(item.options.map((option) => option.big).join('') === '<=>'
              ? []
              : [`${item.id}: options order`]),
            ...(right !== '=' &&
            holds.length === 1 &&
            holds[0]?.id === item.answer &&
            holds[0].reason === undefined
              ? []
              : [`${item.id}: ${String(a)} ? ${String(b)} is ${right}, answer ${item.answer}`]),
            ...sharedProblems(a, b, digits, shared),
            ...(wrong === right
              ? reasonOptions.length === 0
                ? []
                : [`${item.id}: a reason although ones-first is right`]
              : reasonOptions.length === 1 &&
                  reasonOptions[0]?.big === wrong &&
                  reasonOptions[0].reason === 'bugs.ones-first'
                ? []
                : [`${item.id}: reasons for ${wrong}`]),
          ];
        },
      );
      expect(problems).toEqual([]);
      const lower = items.filter(({ item }) => item.answer === 'lt').length;
      expect(lower).toBeGreaterThan(400);
      expect(lower).toBeLessThan(600);
      // Comparing from the ones place can be wrong whenever a place after the differing one is free; never when the last place differs.
      if (shared === digits - 1) expect(reasons).toBe(0);
      else expect(reasons).toBeGreaterThan(250);
    });
  });

  it('is the curriculum example when the numbers are 406 and 460: < is right, > is the ones-first bug', () => {
    const example: ChoiceItem = {
      id: 'dr-1',
      type: 'choice',
      text: 'gen.dr-1.text',
      prompt: { big: '406 ? 460' },
      options: [
        { id: 'lt', big: '<' },
        { id: 'eq', big: '=' },
        { id: 'gt', big: '>', reason: 'bugs.ones-first' },
      ],
      answer: 'lt',
    };
    expect(checkIssues('cmp-sign', { digits: 3, shared: 1 }, example)).toEqual([]);
  });

  describe('check', () => {
    const params = { digits: 3, shared: 1 };
    const good = sample<ChoiceItem>('cmp-sign', params, (item) =>
      item.options.some((option) => option.reason !== undefined),
    );
    const plain = sample<ChoiceItem>('cmp-sign', params, (item) =>
      item.options.every((option) => option.reason === undefined),
    );

    it('accepts good items, with and without the reason', () => {
      expect(checkIssues('cmp-sign', params, good)).toEqual([]);
      expect(checkIssues('cmp-sign', params, plain)).toEqual([]);
    });

    it('reports a wrong answer, an answer of =, options out of order, an unreadable prompt', () => {
      const other =
        good.options.find((option) => option.id !== good.answer && option.reason === undefined)
          ?.id ?? '';
      expect(checkIssues('cmp-sign', params, { ...good, answer: other }).join()).toMatch(
        /should be the only one that fits/,
      );
      expect(
        checkIssues('cmp-sign', params, { ...good, options: [...good.options].reverse() }).join(),
      ).toMatch(/< = >/);
      expect(
        checkIssues('cmp-sign', params, { ...good, prompt: { big: '406 > 460' } }).join(),
      ).toMatch(/cannot read the prompt/);
      expect(
        checkIssues('cmp-sign', params, { ...good, prompt: { big: '406 ? 406' } }).join(),
      ).toMatch(/share exactly|should be the only one/);
    });

    it('reports numbers that do not share the leading digits the params say, and a width other than the params', () => {
      expect(checkIssues('cmp-sign', { digits: 3, shared: 2 }, good).join()).toMatch(
        /share exactly 2/,
      );
      expect(checkIssues('cmp-sign', { digits: 4, shared: 1 }, good).join()).toMatch(
        /share exactly 1/,
      );
    });

    it('reports a missing, misplaced or invented ones-first reason', () => {
      const bare = {
        ...good,
        options: good.options.map(({ id, big }) => ({ id, big })),
      };
      expect(checkIssues('cmp-sign', params, bare).join()).toMatch(/reasons/);
      const onRight = {
        ...good,
        options: good.options.map((option) => ({
          ...option,
          reason: option.id === good.answer ? 'bugs.ones-first' : option.reason,
        })),
      };
      expect(checkIssues('cmp-sign', params, onRight).join()).toMatch(/reasons/);
      const invented = {
        ...plain,
        options: plain.options.map((option) =>
          option.id === 'eq' ? { ...option, reason: 'bugs.ones-first' } : option,
        ),
      };
      expect(checkIssues('cmp-sign', params, invented).join()).toMatch(/reasons/);
    });
  });
});

describe('cmp-order', () => {
  describe.each(COMBOS)('digits $digits, shared $shared', ({ digits, shared }) => {
    it('has 4 distinct numerals with the shared leading digits, not already in order, and the ascending answer', () => {
      const { problems } = overSeeds<OrderItem>(
        'cmp-order',
        { digits, shared },
        ({ item, text }) => {
          const values = item.items.map((card) => Number(card.big));
          const ascending = [...item.items]
            .sort((x, y) => Number(x.big) - Number(y.big))
            .map((card) => card.id);
          const prefix = String(values[0]).slice(0, shared);
          return [
            ...(text === 'Put the numbers in order, smallest first.'
              ? []
              : [`${item.id}: text "${text}"`]),
            ...(values.length === 4 && new Set(values).size === 4
              ? []
              : [`${item.id}: cards ${values.join(', ')}`]),
            ...(values.every(
              (value) => String(value).length === digits && String(value).startsWith(prefix),
            )
              ? []
              : [
                  `${item.id}: ${values.join(', ')} are not ${String(digits)} digits sharing ${String(shared)}`,
                ]),
            ...(item.items.every((card) => card.id === `n${card.big}`) ? [] : [`${item.id}: ids`]),
            ...(JSON.stringify(item.answer) === JSON.stringify(ascending)
              ? []
              : [`${item.id}: answer ${item.answer.join(' ')}`]),
            ...(item.answer.join() === item.items.map((card) => card.id).join()
              ? [`${item.id}: nothing to sort`]
              : []),
          ];
        },
      );
      expect(problems).toEqual([]);
    });
  });

  it('puts the smallest card at every position over many seeds (the shuffle is not biased to one end)', () => {
    const { items } = overSeeds<OrderItem>('cmp-order', { digits: 3, shared: 1 }, () => []);
    const smallestAt = [0, 1, 2, 3].map(
      (position) => items.filter(({ item }) => item.items[position]?.id === item.answer[0]).length,
    );
    for (const count of smallestAt) expect(count).toBeGreaterThan(150);
  });

  describe('check', () => {
    const params = { digits: 3, shared: 1 };
    const good = sample<OrderItem>('cmp-order', params);

    it('accepts a good item', () => {
      expect(checkIssues('cmp-order', params, good)).toEqual([]);
    });

    it('reports a wrong order, an order that is already shown, a repeated card, a card count, an unreadable card', () => {
      expect(
        checkIssues('cmp-order', params, { ...good, answer: [...good.answer].reverse() }).join(),
      ).toMatch(/should be/);
      expect(
        checkIssues('cmp-order', params, {
          ...good,
          items: [...good.items].sort((x, y) => Number(x.big) - Number(y.big)),
        }).join(),
      ).toMatch(/already in order/);
      const repeated = {
        ...good,
        items: good.items.map((card, i) =>
          i === 0 ? { ...card, big: good.items[1]?.big ?? '' } : card,
        ),
      };
      expect(checkIssues('cmp-order', params, repeated).join()).toMatch(/not 4 distinct numerals/);
      expect(
        checkIssues('cmp-order', params, { ...good, items: good.items.slice(0, 3) }).join(),
      ).toMatch(/not 4 distinct numerals/);
      expect(
        checkIssues('cmp-order', params, {
          ...good,
          items: good.items.map((card, i) => (i === 0 ? { ...card, big: 'x' } : card)),
        }).join(),
      ).toMatch(/not 4 distinct numerals/);
    });

    it('reports numbers that do not share the leading digits or have the width', () => {
      expect(checkIssues('cmp-order', { digits: 3, shared: 2 }, good).join()).toMatch(/sharing 2/);
      expect(checkIssues('cmp-order', { digits: 4, shared: 1 }, good).join()).toMatch(/4-digit/);
    });
  });
});

describe('cmp-tf', () => {
  describe.each(COMBOS)('digits $digits, shared $shared', ({ digits, shared }) => {
    it('says a sentence that is true about half the time; the ones-first reason is there when comparing from the ones would judge it the other way', () => {
      const { problems, items } = overSeeds<TrueFalseItem>(
        'cmp-tf',
        { digits, shared },
        ({ item, text }) => {
          const { a, sign, b } = read(item.prompt.big);
          const holds = sign === '<' ? a < b : sign === '>' ? a > b : false;
          const judged = sign === fromOnes(a, b, digits);
          return [
            ...(text === 'Is this true?' ? [] : [`${item.id}: text "${text}"`]),
            ...(sign === '<' || sign === '>' ? [] : [`${item.id}: sign ${sign}`]),
            ...(item.answer === holds
              ? []
              : [
                  `${item.id}: "${item.prompt.big}" is ${String(holds)}, answer ${String(item.answer)}`,
                ]),
            ...sharedProblems(a, b, digits, shared),
            ...(judged === holds
              ? item.reason === undefined
                ? []
                : [`${item.id}: a reason although ones-first agrees`]
              : item.reason === 'bugs.ones-first'
                ? []
                : [`${item.id}: no reason although ones-first disagrees`]),
          ];
        },
      );
      expect(problems).toEqual([]);
      const truths = items.filter(({ item }) => item.answer).length;
      expect(truths).toBeGreaterThan(400);
      expect(truths).toBeLessThan(600);
    });
  });

  it('is the curriculum example: 406 > 460 is false, and ones-first would call it true', () => {
    const example: TrueFalseItem = {
      id: 'dr-1',
      type: 'true-false',
      text: 'gen.dr-1.text',
      prompt: { big: '406 > 460' },
      answer: false,
      reason: 'bugs.ones-first',
    };
    expect(checkIssues('cmp-tf', { digits: 3, shared: 1 }, example)).toEqual([]);
  });

  describe('check', () => {
    const params = { digits: 3, shared: 1 };
    const good = sample<TrueFalseItem>('cmp-tf', params, (item) => item.reason !== undefined);
    const plain = sample<TrueFalseItem>('cmp-tf', params, (item) => item.reason === undefined);

    it('accepts good items', () => {
      expect(checkIssues('cmp-tf', params, good)).toEqual([]);
      expect(checkIssues('cmp-tf', params, plain)).toEqual([]);
    });

    it('reports a wrong answer, an unreadable prompt, numbers that break the params', () => {
      expect(checkIssues('cmp-tf', params, { ...good, answer: !good.answer }).join()).toMatch(
        /not (true|false)/,
      );
      expect(
        checkIssues('cmp-tf', params, { ...good, prompt: { big: '406 = 460' } }).join(),
      ).toMatch(/cannot read the prompt/);
      expect(checkIssues('cmp-tf', { digits: 3, shared: 2 }, good).join()).toMatch(
        /share exactly 2/,
      );
    });

    it('reports a missing and an invented reason', () => {
      const bare = { ...good, reason: undefined };
      expect(checkIssues('cmp-tf', params, bare).join()).toMatch(/reason/);
      expect(checkIssues('cmp-tf', params, { ...plain, reason: 'bugs.ones-first' }).join()).toMatch(
        /reason/,
      );
      expect(checkIssues('cmp-tf', params, { ...good, reason: 'bugs.swap' }).join()).toMatch(
        /reason/,
      );
    });
  });
});
