// `fact`, `fact-missing`, `fact-choice` and `fact-tf` over 1 000 seeds per parameter combination: each item is solved again here from
// its English sentence and card (times by adding up), the wrong answers and their bugs are worked out again from a plain rule list, and
// every `check` fails on a hand-broken item.
import { describe, expect, it } from 'vitest';
import type { ChoiceItem, NumberEntryItem, TrueFalseItem } from './items.ts';
import { checkIssues, draw, overSeeds, sample } from './testing.ts';

/** a × b by adding a, b times. */
function times(a: number, b: number): number {
  return Array.from({ length: b }, () => a).reduce((sum, term) => sum + term, 0);
}

/** The wrong answers of a × b as "value bug" lines, worked out from the curriculum's rules (§3 "Bugs"): the added factors; the
 * neighbour, the fact with one group fewer (one more at b = 1, or when the lower one is the added factors); a 2-digit answer not
 * ending in 0 with its digits swapped. A value that is the answer or an earlier wrong answer is left out. */
function wrongLines(a: number, b: number): string[] {
  const answer = times(a, b);
  const taken = new Set([answer]);
  const lines: string[] = [];
  const push = (value: number, bug: string): void => {
    if (!taken.has(value)) {
      taken.add(value);
      lines.push(`${String(value)} bugs.${bug}`);
    }
  };
  push(a + b, 'add-factors');
  if (b >= 2 && !taken.has(times(a, b - 1))) push(times(a, b - 1), 'neighbour');
  else push(times(a, b + 1), 'neighbour');
  if (answer >= 10 && answer <= 99 && answer % 10 !== 0) {
    push(Number(String(answer).split('').reverse().join('')), 'digit-swap');
  }
  return lines;
}

interface FactSet {
  readonly tables: readonly number[];
  /** [lowest, highest] b. */
  readonly b: readonly [number, number];
}

/** The sets of tables and the ranges of b the curriculum's W3 lessons use. */
const SETS: readonly FactSet[] = [
  { tables: [2, 5, 10], b: [1, 10] },
  { tables: [10], b: [1, 10] },
  { tables: [4, 8], b: [1, 10] },
  { tables: [4], b: [1, 5] },
  { tables: [3, 6, 9], b: [1, 10] },
  { tables: [3], b: [1, 5] },
  { tables: [7], b: [1, 10] },
  { tables: [7, 0, 1], b: [1, 10] },
  { tables: [0, 1], b: [1, 10] },
  { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], b: [2, 10] },
];

const NON_ZERO = SETS.filter((set) => !set.tables.includes(0));

/** The "a" and "b" of "What is 7 times 6?". */
function readSentence(text: string): [number, number] | null {
  const found = /^What is (\d+) times (\d+)\?$/.exec(text);
  return found === null ? null : [Number(found[1]), Number(found[2])];
}

function inSet(a: number, b: number, set: FactSet): boolean {
  return set.tables.includes(a) && b >= set.b[0] && b <= set.b[1];
}

describe('wrong answers by hand', () => {
  // The test's own rule list, pinned against worked examples before it judges the templates.
  it('7 × 6 = 42: added 13, neighbour 35, digits 24', () => {
    expect(wrongLines(7, 6)).toEqual([
      '13 bugs.add-factors',
      '35 bugs.neighbour',
      '24 bugs.digit-swap',
    ]);
  });
  it('3 × 3 = 9: the lower neighbour 6 is the added factors, so the neighbour is 12', () => {
    expect(wrongLines(3, 3)).toEqual(['6 bugs.add-factors', '12 bugs.neighbour']);
  });
  it('2 × 2 = 4: 2 + 2 is the answer, no add-factors; 2 × 4 = 8: the lower neighbour 6 is the sum, so 10', () => {
    expect(wrongLines(2, 2)).toEqual(['2 bugs.neighbour']);
    expect(wrongLines(2, 4)).toEqual(['6 bugs.add-factors', '10 bugs.neighbour']);
  });
  it('b = 1 takes the fact over (4 × 1 → 8), 1 × 1 and 0 × n have no neighbour, 20 and 100 have no digits to swap', () => {
    expect(wrongLines(4, 1)).toEqual(['5 bugs.add-factors', '8 bugs.neighbour']);
    expect(wrongLines(1, 1)).toEqual(['2 bugs.add-factors']);
    expect(wrongLines(0, 5)).toEqual(['5 bugs.add-factors']);
    expect(wrongLines(4, 5)).toEqual(['9 bugs.add-factors', '16 bugs.neighbour']);
    expect(wrongLines(10, 10)).toEqual(['20 bugs.add-factors', '90 bugs.neighbour']);
  });
  it('more digit swaps: 8 × 8 → 46, 9 × 4 → 63, 3 × 6 → 81', () => {
    expect(wrongLines(8, 8).at(-1)).toBe('46 bugs.digit-swap');
    expect(wrongLines(9, 4).at(-1)).toBe('63 bugs.digit-swap');
    expect(wrongLines(3, 6).at(-1)).toBe('81 bugs.digit-swap');
  });
});

describe('fact', () => {
  describe.each(SETS)('tables $tables, b $b', (set) => {
    it('asks "What is a times b?" over the card "a × b", answers by adding up, and speaks every wrong answer of the rules with its bug', () => {
      const { problems, items } = overSeeds<NumberEntryItem>('fact', set, ({ item, text }) => {
        const read = readSentence(text);
        const [a, b] = read ?? [0, 0];
        const lines = (item.reasons ?? []).map(
          (reason) => `${String(reason.value)} ${reason.text}`,
        );
        return [
          ...(read === null ? [`${item.id}: "${text}" is not the fact sentence`] : []),
          ...(inSet(a, b, set)
            ? []
            : [`${item.id}: ${String(a)} × ${String(b)} is not of the set`]),
          ...(item.prompt.big === `${String(a)} × ${String(b)}`
            ? []
            : [`${item.id}: card ${item.prompt.big}`]),
          ...(item.answer === times(a, b)
            ? []
            : [`${item.id}: answer ${String(item.answer)} for ${String(a)} × ${String(b)}`]),
          ...(JSON.stringify(lines) === JSON.stringify(wrongLines(a, b))
            ? []
            : [
                `${item.id}: reasons ${JSON.stringify(lines)} should be ${JSON.stringify(wrongLines(a, b))}`,
              ]),
          ...((item.reasons ?? []).every(
            (reason) => String(reason.value).length <= Math.max(2, String(item.answer).length),
          )
            ? []
            : [`${item.id}: a reason wider than the pad`]),
        ];
      });
      expect(problems).toEqual([]);
      const facts = new Set(items.map(({ item }) => item.prompt.big));
      expect(facts.size).toBe(set.tables.length * (set.b[1] - set.b[0] + 1));
    });
  });

  it('is a curriculum example: 7 × 6 is 42 with 13, 35 and 24 spoken', () => {
    const item: NumberEntryItem = {
      id: 'dr-1',
      type: 'number-entry',
      text: 'gen.dr-1.text',
      prompt: { big: '7 × 6' },
      answer: 42,
      reasons: [
        { value: 13, text: 'bugs.add-factors' },
        { value: 35, text: 'bugs.neighbour' },
        { value: 24, text: 'bugs.digit-swap' },
      ],
    };
    expect(checkIssues('fact', { tables: [7] }, item)).toEqual([]);
  });

  it('draws up to 6 distinct items per entry in every set, and names its params problems', () => {
    for (const set of SETS) {
      const facts = set.tables.length * (set.b[1] - set.b[0] + 1);
      for (let seed = 0; seed < 30; seed += 1) {
        expect(
          draw('fact', set, seed, Math.min(6, facts)).issues,
          `${JSON.stringify(set)} @${String(seed)}`,
        ).toEqual([]);
      }
    }
    // The b range defaults to 1-10.
    expect(draw('fact', { tables: [7] }, 0).issues).toEqual([]);
    expect(draw('fact', { tables: [11] }, 0).issues).not.toEqual([]);
    expect(draw('fact', { tables: [] }, 0).issues).not.toEqual([]);
    expect(draw('fact', { tables: [3, 3] }, 0).issues.join('\n')).toMatch(/repeat/);
    expect(draw('fact', { tables: [3], b: [6, 2] }, 0).issues.join('\n')).toMatch(
      /lowest, highest/,
    );
    expect(draw('fact', { tables: [3], b: [0, 5] }, 0).issues).not.toEqual([]);
    expect(draw('fact', {}, 0).issues).not.toEqual([]);
  });

  describe('check', () => {
    const params = { tables: [2, 3, 7], b: [1, 10] };
    const full = sample<NumberEntryItem>('fact', params, (item) => item.reasons?.length === 3);
    const sum = sample<NumberEntryItem>('fact', { tables: [0] }, () => true);

    it('accepts good items', () => {
      expect(checkIssues('fact', params, full)).toEqual([]);
      expect(checkIssues('fact', { tables: [0] }, sum)).toEqual([]);
    });

    it('reports a wrong answer, an unreadable card, a fact outside the tables or the range', () => {
      expect(checkIssues('fact', params, { ...full, answer: full.answer + 1 }).join()).toMatch(
        /is \d+, not/,
      );
      expect(checkIssues('fact', params, { ...full, prompt: { big: '7 x 6' } }).join()).toMatch(
        /cannot read the prompt/,
      );
      expect(
        checkIssues('fact', params, { ...full, prompt: { big: '8 × 6' }, answer: 48 }).join(),
      ).toMatch(/not a fact of tables/);
      expect(
        checkIssues(
          'fact',
          { tables: [7], b: [1, 5] },
          { ...full, prompt: { big: '7 × 6' }, answer: 42 },
        ).join(),
      ).toMatch(/not a fact of tables/);
    });

    it('reports a missing, a wrong, an extra and a misnamed reason', () => {
      expect(checkIssues('fact', params, { ...full, reasons: undefined }).join()).toMatch(
        /reasons/,
      );
      expect(
        checkIssues('fact', params, { ...full, reasons: full.reasons?.slice(1) }).join(),
      ).toMatch(/reasons/);
      expect(
        checkIssues('fact', params, {
          ...full,
          reasons: full.reasons?.map((reason) => ({ ...reason, text: 'bugs.neighbour' })),
        }).join(),
      ).toMatch(/reasons/);
      expect(
        checkIssues('fact', params, {
          ...full,
          reasons: [...(full.reasons ?? []), { value: 1, text: 'bugs.neighbour' }],
        }).join(),
      ).toMatch(/reasons/);
      expect(
        checkIssues(
          'fact',
          { tables: [0] },
          { ...sum, reasons: [...(sum.reasons ?? []), { value: 99, text: 'bugs.digit-swap' }] },
        ).join(),
      ).toMatch(/reasons/);
    });
  });
});

describe('fact-missing', () => {
  describe.each(NON_ZERO)('tables $tables, b $b', (set) => {
    it('hides the factor b in "a × ? = a × b", answers it, and speaks neighbour for one step out', () => {
      const { problems, items } = overSeeds<NumberEntryItem>(
        'fact-missing',
        set,
        ({ item, text }) => {
          const found = /^(\d+) × \? = (\d+)$/.exec(item.prompt.big);
          const [a, product] = [Number(found?.[1]), Number(found?.[2])];
          const b =
            Array.from({ length: 11 }, (_unused, n) => n).find((n) => times(a, n) === product) ??
            -1;
          const wrong = b >= 2 ? b - 1 : b + 1;
          return [
            ...(text === 'What number is missing?' ? [] : [`${item.id}: text "${text}"`]),
            ...(found !== null && b >= 1 && inSet(a, b, set)
              ? []
              : [`${item.id}: "${item.prompt.big}" is not of the set`]),
            ...(item.answer === b
              ? []
              : [`${item.id}: answer ${String(item.answer)} for ${item.prompt.big}`]),
            ...(JSON.stringify(item.reasons) ===
            JSON.stringify([{ value: wrong, text: 'bugs.neighbour' }])
              ? []
              : [`${item.id}: reasons ${JSON.stringify(item.reasons)}`]),
          ];
        },
      );
      expect(problems).toEqual([]);
      expect(new Set(items.map(({ item }) => item.prompt.big)).size).toBe(
        set.tables.length * (set.b[1] - set.b[0] + 1),
      );
    });
  });

  it('is a curriculum example: 6 × ? = 42 is 7, and 6 is the neighbour', () => {
    const item: NumberEntryItem = {
      id: 'dr-1',
      type: 'number-entry',
      text: 'gen.dr-1.text',
      prompt: { big: '6 × ? = 42' },
      answer: 7,
      reasons: [{ value: 6, text: 'bugs.neighbour' }],
    };
    expect(checkIssues('fact-missing', { tables: [6] }, item)).toEqual([]);
    expect(
      checkIssues(
        'fact-missing',
        { tables: [6] },
        {
          ...item,
          prompt: { big: '6 × ? = 6' },
          answer: 1,
          reasons: [{ value: 2, text: 'bugs.neighbour' }],
        },
      ),
    ).toEqual([]);
  });

  it('names its params problems (no table 0: any number would fit 0 × ? = 0)', () => {
    expect(draw('fact-missing', { tables: [0, 3] }, 0).issues).not.toEqual([]);
    expect(draw('fact-missing', { tables: [3], b: [3, 1] }, 0).issues).not.toEqual([]);
    for (const set of NON_ZERO) {
      for (let seed = 0; seed < 30; seed += 1) {
        expect(
          draw('fact-missing', set, seed, 2).issues,
          `${JSON.stringify(set)} @${String(seed)}`,
        ).toEqual([]);
      }
    }
  });

  describe('check', () => {
    const params = { tables: [3, 6], b: [1, 10] };
    const good = sample<NumberEntryItem>('fact-missing', params, (item) => item.answer > 1);

    it('accepts a good item', () => {
      expect(checkIssues('fact-missing', params, good)).toEqual([]);
    });

    it('reports a wrong answer, an unreadable card, a product the table does not make, a fact outside the params', () => {
      expect(
        checkIssues('fact-missing', params, { ...good, answer: good.answer + 1 }).join(),
      ).toMatch(/the missing number/);
      expect(
        checkIssues('fact-missing', params, { ...good, prompt: { big: '6 × 7' } }).join(),
      ).toMatch(/cannot read the prompt/);
      expect(
        checkIssues('fact-missing', params, { ...good, prompt: { big: '6 × ? = 40' } }).join(),
      ).toMatch(/no whole number/);
      expect(
        checkIssues('fact-missing', params, { ...good, prompt: { big: '0 × ? = 0' } }).join(),
      ).toMatch(/no whole number/);
      expect(
        checkIssues('fact-missing', params, {
          ...good,
          prompt: { big: '7 × ? = 42' },
          answer: 6,
        }).join(),
      ).toMatch(/not a fact of tables/);
    });

    it('reports a missing, a wrong and an extra reason', () => {
      expect(checkIssues('fact-missing', params, { ...good, reasons: undefined }).join()).toMatch(
        /reasons/,
      );
      expect(
        checkIssues('fact-missing', params, {
          ...good,
          reasons: [{ value: good.answer + 3, text: 'bugs.neighbour' }],
        }).join(),
      ).toMatch(/reasons/);
      expect(
        checkIssues('fact-missing', params, {
          ...good,
          reasons: [{ value: good.answer - 1, text: 'bugs.add-factors' }],
        }).join(),
      ).toMatch(/reasons/);
    });
  });
});

describe('fact-choice', () => {
  describe.each(NON_ZERO)('tables $tables, b $b', (set) => {
    it('offers the answer, the neighbour and the added factors as three distinct numbers, in every place about a third of the time', () => {
      const { problems, items } = overSeeds<ChoiceItem>('fact-choice', set, ({ item, text }) => {
        const found = /^(\d+) × (\d+)$/.exec(item.prompt?.big ?? '');
        const [a, b] = [Number(found?.[1]), Number(found?.[2])];
        const wrong = item.options.filter((option) => option.id !== item.answer);
        const lines = wrong.map((option) => `${option.big} ${option.reason ?? '(none)'}`);
        const expected = wrongLines(a, b).filter((line) => !line.endsWith('digit-swap'));
        const right = item.options.filter((option) => Number(option.big) === times(a, b));
        return [
          ...(text === 'Which is the answer?' ? [] : [`${item.id}: text "${text}"`]),
          ...(found !== null && inSet(a, b, set)
            ? []
            : [`${item.id}: "${item.prompt?.big ?? ''}" is not of the set`]),
          ...(item.options.map((option) => option.id).join() === 'a,b,c' &&
          new Set(item.options.map((option) => option.big)).size === 3
            ? []
            : [`${item.id}: options ${JSON.stringify(item.options)}`]),
          ...(right.length === 1 && right[0]?.id === item.answer && right[0].reason === undefined
            ? []
            : [`${item.id}: ${String(right.length)} options are ${String(times(a, b))}`]),
          ...(expected.length === 2 &&
          JSON.stringify([...lines].sort()) === JSON.stringify([...expected].sort())
            ? []
            : [
                `${item.id}: wrong options ${JSON.stringify(lines)} should be ${JSON.stringify(expected)}`,
              ]),
        ];
      });
      expect(problems).toEqual([]);
      for (const id of ['a', 'b', 'c']) {
        const count = items.filter(({ item }) => item.answer === id).length;
        expect(count, id).toBeGreaterThan(250);
        expect(count, id).toBeLessThan(420);
      }
    });
  });

  it('is a curriculum example: 8 × 7 is 56 with 49 (neighbour) and 15 (add-factors)', () => {
    const item: ChoiceItem = {
      id: 'dr-1',
      type: 'choice',
      text: 'gen.dr-1.text',
      prompt: { big: '8 × 7' },
      options: [
        { id: 'a', big: '15', reason: 'bugs.add-factors' },
        { id: 'b', big: '56' },
        { id: 'c', big: '48', reason: 'bugs.neighbour' },
      ],
      answer: 'b',
    };
    // 8 × 6 = 48 is the fact under 8 × 7 (8 × 7 = 56 is one group of 8 more).
    expect(checkIssues('fact-choice', { tables: [8] }, item)).toEqual([]);
  });

  it('draws only facts with three distinct answers, and names its params problems (1 × 1 has none)', () => {
    expect(draw('fact-choice', { tables: [1], b: [1, 1] }, 0).issues.join('\n')).toMatch(
      /three distinct answers/,
    );
    expect(draw('fact-choice', { tables: [2], b: [2, 2] }, 0).issues.join('\n')).toMatch(
      /three distinct answers/,
    );
    expect(draw('fact-choice', { tables: [0, 2] }, 0).issues).not.toEqual([]);
    for (const set of NON_ZERO) {
      for (let seed = 0; seed < 30; seed += 1) {
        expect(
          draw('fact-choice', set, seed, 2).issues,
          `${JSON.stringify(set)} @${String(seed)}`,
        ).toEqual([]);
      }
    }
    // 1 × 2 and 2 × 2 are left out of the draw: with only them in range the params are refused, with others they are never drawn.
    const drawn = overSeeds<ChoiceItem>(
      'fact-choice',
      { tables: [1, 2], b: [1, 3] },
      () => [],
    ).items;
    expect(drawn.some(({ item }) => item.prompt?.big === '2 × 2')).toBe(false);
    expect(drawn.some(({ item }) => item.prompt?.big === '1 × 1')).toBe(false);
    expect(drawn.some(({ item }) => item.prompt?.big === '1 × 3')).toBe(true);
  });

  describe('check', () => {
    const params = { tables: [3, 7], b: [1, 10] };
    const good = sample<ChoiceItem>('fact-choice', params, (item) => item.prompt?.big === '7 × 6');
    const withOptions = (
      edit: (option: ChoiceItem['options'][number]) => ChoiceItem['options'][number],
    ): ChoiceItem => ({ ...good, options: good.options.map(edit) });

    it('accepts a good item', () => {
      expect(checkIssues('fact-choice', params, good)).toEqual([]);
    });

    it('reports a wrong answer, an unreadable card, options that are not 3 distinct numbers, a fact outside the params', () => {
      const other = good.options.find((option) => option.id !== good.answer)?.id ?? 'a';
      expect(checkIssues('fact-choice', params, { ...good, answer: other }).join()).toMatch(
        /should be 42/,
      );
      expect(
        checkIssues('fact-choice', params, { ...good, prompt: { big: '7 6' } }).join(),
      ).toMatch(/cannot read the prompt/);
      expect(
        checkIssues('fact-choice', params, { ...good, options: good.options.slice(0, 2) }).join(),
      ).toMatch(/not 3 distinct numbers/);
      expect(
        checkIssues(
          'fact-choice',
          params,
          withOptions((option) => ({ ...option, big: '42' })),
        ).join(),
      ).toMatch(/not 3 distinct numbers/);
      expect(
        checkIssues(
          'fact-choice',
          params,
          withOptions((option) => ({ ...option, big: 'x' })),
        ).join(),
      ).toMatch(/not 3 distinct numbers/);
      expect(
        checkIssues('fact-choice', params, { ...good, prompt: { big: '8 × 6' } }).join(),
      ).toMatch(/not a fact of tables/);
    });

    it('reports a missing, a swapped and an invented reason', () => {
      expect(
        checkIssues(
          'fact-choice',
          params,
          withOptions(({ id, big }) => ({ id, big })),
        ).join(),
      ).toMatch(/wrong options/);
      expect(
        checkIssues(
          'fact-choice',
          params,
          withOptions((option) =>
            option.reason === 'bugs.neighbour'
              ? { ...option, reason: 'bugs.add-factors' }
              : option.reason === 'bugs.add-factors'
                ? { ...option, reason: 'bugs.neighbour' }
                : option,
          ),
        ).join(),
      ).toMatch(/wrong options/);
      expect(
        checkIssues(
          'fact-choice',
          params,
          withOptions((option) =>
            option.id === good.answer ? { ...option, reason: 'bugs.neighbour' } : option,
          ),
        ).join(),
      ).toMatch(/has a reason/);
    });
  });
});

describe('fact-tf', () => {
  describe.each(NON_ZERO)('tables $tables, b $b', (set) => {
    it('says "a × b = n", true half the time; the false claim is the neighbour fact and speaks neighbour', () => {
      const { problems, items } = overSeeds<TrueFalseItem>('fact-tf', set, ({ item, text }) => {
        const found = /^(\d+) × (\d+) = (\d+)$/.exec(item.prompt.big);
        const [a, b, claim] = [Number(found?.[1]), Number(found?.[2]), Number(found?.[3])];
        const neighbour = wrongLines(a, b).find((line) => line.endsWith('bugs.neighbour'));
        return [
          ...(text === 'Is this true?' ? [] : [`${item.id}: text "${text}"`]),
          ...(found !== null && inSet(a, b, set)
            ? []
            : [`${item.id}: "${item.prompt.big}" is not of the set`]),
          ...(item.answer === (claim === times(a, b))
            ? []
            : [`${item.id}: "${item.prompt.big}" answered ${String(item.answer)}`]),
          ...(item.answer
            ? item.reason === undefined
              ? []
              : [`${item.id}: a reason on a true claim`]
            : neighbour === `${String(claim)} bugs.neighbour` && item.reason === 'bugs.neighbour'
              ? []
              : [
                  `${item.id}: the false claim ${String(claim)} / reason ${item.reason ?? '(none)'}`,
                ]),
        ];
      });
      expect(problems).toEqual([]);
      const truths = items.filter(({ item }) => item.answer).length;
      expect(truths).toBeGreaterThan(400);
      expect(truths).toBeLessThan(600);
    });
  });

  it('is a curriculum example: 4 × 8 = 32 is true; 4 × 8 = 28 is false and the neighbour', () => {
    const item = (claim: number, answer: boolean, reason?: string): TrueFalseItem => ({
      id: 'dr-1',
      type: 'true-false',
      text: 'gen.dr-1.text',
      prompt: { big: `4 × 8 = ${String(claim)}` },
      answer,
      ...(reason === undefined ? {} : { reason }),
    });
    expect(checkIssues('fact-tf', { tables: [4, 8] }, item(32, true))).toEqual([]);
    expect(checkIssues('fact-tf', { tables: [4, 8] }, item(28, false, 'bugs.neighbour'))).toEqual(
      [],
    );
  });

  it('draws only facts that have a neighbour, and names its params problems', () => {
    expect(draw('fact-tf', { tables: [1], b: [1, 1] }, 0).issues.join('\n')).toMatch(
      /neighbour fact/,
    );
    expect(draw('fact-tf', { tables: [0] }, 0).issues).not.toEqual([]);
    for (const set of NON_ZERO) {
      for (let seed = 0; seed < 30; seed += 1) {
        expect(
          draw('fact-tf', set, seed, 4).issues,
          `${JSON.stringify(set)} @${String(seed)}`,
        ).toEqual([]);
      }
    }
  });

  describe('check', () => {
    const params = { tables: [4, 8], b: [1, 10] };
    const yes = sample<TrueFalseItem>('fact-tf', params, (item) => item.answer);
    const no = sample<TrueFalseItem>('fact-tf', params, (item) => !item.answer);

    it('accepts good items', () => {
      expect(checkIssues('fact-tf', params, yes)).toEqual([]);
      expect(checkIssues('fact-tf', params, no)).toEqual([]);
    });

    it('reports a wrong answer, an unreadable claim, a fact outside the tables, a false claim that is not the neighbour', () => {
      expect(
        checkIssues('fact-tf', params, { ...yes, answer: false, reason: 'bugs.neighbour' }).join(),
      ).toMatch(/is true, not false/);
      expect(
        checkIssues('fact-tf', params, { ...no, answer: true, reason: undefined }).join(),
      ).toMatch(/is false, not true/);
      expect(checkIssues('fact-tf', params, { ...yes, prompt: { big: '4 × 8' } }).join()).toMatch(
        /cannot read the prompt/,
      );
      expect(
        checkIssues('fact-tf', params, { ...yes, prompt: { big: '5 × 8 = 40' } }).join(),
      ).toMatch(/not a fact of tables/);
      expect(
        checkIssues('fact-tf', params, { ...no, prompt: { big: '4 × 8 = 29' } }).join(),
      ).toMatch(/not the neighbour fact/);
    });

    it('reports a missing, a wrong and an invented reason', () => {
      expect(checkIssues('fact-tf', params, { ...no, reason: undefined }).join()).toMatch(/reason/);
      expect(checkIssues('fact-tf', params, { ...no, reason: 'bugs.add-factors' }).join()).toMatch(
        /reason/,
      );
      expect(checkIssues('fact-tf', params, { ...yes, reason: 'bugs.neighbour' }).join()).toMatch(
        /reason/,
      );
    });
  });
});
