// bond-missing, bond-pairs, equals-balance over 1 000 seeds per parameter set of curriculum §2: each item is solved again here from its
// English sentence and its card (not from the template's variables), and every `check` fails on a hand-broken item.
import { describe, expect, it } from 'vitest';
import type { ChoiceItem, NumberEntryItem } from './items.ts';
import { checkIssues, draw, overSeeds, sample } from './testing.ts';

const MISSING_SETS = [
  { total: 10 },
  { total: 20 },
  { total: 100 },
  { total: 100, tensOnly: true },
] as const;

/** The digit-tens wrong partner, from the digits as text: each digit of `a` taken to 10 (64 → 4 and 6 → 46). */
function eachDigitToTen(a: number): number {
  const [tens, ones] = [Math.floor(a / 10), a % 10];
  return Number(`${String(10 - tens)}${String(10 - ones)}`);
}

describe('bond-missing', () => {
  describe.each(MISSING_SETS)('$total / $tensOnly', (params) => {
    it('reads "a + ? = total", answers total − a, and speaks digit-tens only for a bond to 100 whose first number has two digits to take to 10', () => {
      const { problems, items } = overSeeds<NumberEntryItem>(
        'bond-missing',
        params,
        ({ item, text }) => {
          const sentence = /^What number makes (\d+)\?$/.exec(text);
          const card = /^(\d+) \+ \? = (\d+)$/.exec(item.prompt.big);
          const [total, a, shown] = [Number(sentence?.[1]), Number(card?.[1]), Number(card?.[2])];
          const tensOnly = 'tensOnly' in params;
          const wantsReason = params.total === 100 && !tensOnly;
          const reasons = item.reasons ?? [];
          return [
            ...(sentence === null ? [`${item.id}: "${text}" is not the bond sentence`] : []),
            ...(card === null ? [`${item.id}: card "${item.prompt.big}"`] : []),
            ...(total === params.total && shown === total
              ? []
              : [`${item.id}: total ${String(total)} / ${String(shown)}`]),
            ...(a >= 1 && a < total ? [] : [`${item.id}: first number ${String(a)}`]),
            ...(item.answer + a === total
              ? []
              : [`${item.id}: ${String(a)} + ${String(item.answer)} is not ${String(total)}`]),
            ...(tensOnly
              ? a % 10 === 0
                ? []
                : [`${item.id}: ${String(a)} is not a multiple of ten`]
              : params.total === 100 && (a % 10 === 0 || a < 11 || a > 89)
                ? [`${item.id}: ${String(a)} is not 11-89 without a zero`]
                : []),
            ...(wantsReason
              ? reasons.length === 1 &&
                reasons[0]?.value === eachDigitToTen(a) &&
                reasons[0].text === 'bugs.digit-tens' &&
                reasons[0].value === item.answer + 10
                ? []
                : [`${item.id}: reasons ${JSON.stringify(reasons)} for ${String(a)}`]
              : reasons.length === 0
                ? []
                : [`${item.id}: unexpected reasons ${JSON.stringify(reasons)}`]),
          ];
        },
      );
      expect(problems).toEqual([]);
      const firsts = new Set(items.map(({ item }) => item.prompt.big));
      expect(firsts.size).toBeGreaterThanOrEqual(params.total === 100 ? 9 : params.total - 1);
    });
  });

  it('is the curriculum example: 64 + ? = 100 → 36, the wrong 46 is digit-tens', () => {
    const item: NumberEntryItem = {
      id: 'dr-1',
      type: 'number-entry',
      text: 'gen.dr-1.text',
      prompt: { big: '64 + ? = 100' },
      answer: 36,
      reasons: [{ value: 46, text: 'bugs.digit-tens' }],
    };
    expect(checkIssues('bond-missing', { total: 100 }, item)).toEqual([]);
    expect(
      checkIssues(
        'bond-missing',
        { total: 10 },
        { ...item, prompt: { big: '4 + ? = 10' }, answer: 6, reasons: undefined },
      ),
    ).toEqual([]);
  });

  it('draws 3 distinct items per entry in every set', () => {
    for (const params of MISSING_SETS) {
      for (let seed = 0; seed < 50; seed += 1) {
        expect(
          draw('bond-missing', params, seed, 3).issues,
          `${JSON.stringify(params)} @${String(seed)}`,
        ).toEqual([]);
      }
    }
  });

  it('names its params problems', () => {
    expect(draw('bond-missing', { total: 50 }, 0).issues).not.toEqual([]);
    expect(draw('bond-missing', { total: 10, tensOnly: true }, 0).issues.join()).toMatch(
      /tensOnly/,
    );
    expect(draw('bond-missing', { total: 10, tensOnly: 'yes' }, 0).issues).not.toEqual([]);
    expect(draw('bond-missing', {}, 0).issues).not.toEqual([]);
  });

  describe('check', () => {
    const params = { total: 100 };
    const good = sample<NumberEntryItem>('bond-missing', params);

    it('accepts a good item', () => {
      expect(checkIssues('bond-missing', params, good)).toEqual([]);
    });

    it('reports a wrong answer and an unreadable prompt', () => {
      expect(
        checkIssues('bond-missing', params, { ...good, answer: good.answer + 1 }).join(),
      ).toMatch(/the missing number/);
      for (const big of ['64 + 36', '64 + ? = ', '? + 64 = 100', 'x + ? = 100']) {
        expect(
          checkIssues('bond-missing', params, { ...good, prompt: { big } }).join(),
          big,
        ).toMatch(/cannot read the prompt/);
      }
    });

    it('reports a number that breaks the params: another total, a multiple of ten, outside 11-89, tens only', () => {
      const at = (big: string, answer: number): NumberEntryItem => ({
        ...good,
        prompt: { big },
        answer,
        reasons: undefined,
      });
      expect(checkIssues('bond-missing', params, at('4 + ? = 10', 6)).join()).toMatch(
        /does not fit/,
      );
      expect(checkIssues('bond-missing', params, at('30 + ? = 100', 70)).join()).toMatch(
        /does not fit/,
      );
      expect(checkIssues('bond-missing', params, at('95 + ? = 100', 5)).join()).toMatch(
        /does not fit/,
      );
      expect(checkIssues('bond-missing', params, at('8 + ? = 100', 92)).join()).toMatch(
        /does not fit/,
      );
      expect(checkIssues('bond-missing', { total: 100, tensOnly: true }, good).join()).toMatch(
        /does not fit/,
      );
      expect(checkIssues('bond-missing', { total: 20 }, at('20 + ? = 20', 0)).join()).toMatch(
        /does not fit/,
      );
    });

    it('reports a missing, a wrong and an unneeded reason', () => {
      expect(checkIssues('bond-missing', params, { ...good, reasons: undefined }).join()).toMatch(
        /reasons/,
      );
      expect(
        checkIssues('bond-missing', params, {
          ...good,
          reasons: [{ value: good.answer + 1, text: 'bugs.digit-tens' }],
        }).join(),
      ).toMatch(/reasons/);
      expect(
        checkIssues('bond-missing', params, {
          ...good,
          reasons: [{ value: good.answer + 10, text: 'bugs.off-by-ten' }],
        }).join(),
      ).toMatch(/reasons/);
      const tens = sample<NumberEntryItem>('bond-missing', { total: 100, tensOnly: true });
      expect(
        checkIssues(
          'bond-missing',
          { total: 100, tensOnly: true },
          {
            ...tens,
            reasons: [{ value: tens.answer + 10, text: 'bugs.digit-tens' }],
          },
        ).join(),
      ).toMatch(/reasons/);
    });
  });
});

describe('bond-pairs', () => {
  describe.each([10, 20, 100] as const)('total %i', (total) => {
    it('offers three sums with the same first number, only one making the total; for 100 the wrong pairs add 110 (digit-tens, with its reason) and 90', () => {
      const { problems, items } = overSeeds<ChoiceItem>(
        'bond-pairs',
        { total },
        ({ item, text }) => {
          const sentence = /^Which two numbers make (\d+)\?$/.exec(text);
          const pairs = item.options.map((option) => {
            const found = /^(\d+) \+ (\d+)$/.exec(option.big);
            return { x: Number(found?.[1]), y: Number(found?.[2]), option };
          });
          const sums = pairs.map(({ x, y }) => x + y).sort((p, q) => p - q);
          const near = total === 100 ? 10 : 1;
          const right = pairs.filter(({ x, y }) => x + y === total);
          const first = pairs[0]?.x;
          return [
            ...(sentence !== null && Number(sentence[1]) === total
              ? []
              : [`${item.id}: "${text}" is not the sentence for ${String(total)}`]),
            ...(item.prompt === undefined ? [] : [`${item.id}: a prompt`]),
            ...(pairs.length === 3 && pairs.every(({ x, y }) => x >= 1 && y >= 1)
              ? []
              : [`${item.id}: options ${JSON.stringify(item.options)}`]),
            ...(pairs.every(({ x }) => x === first) ? [] : [`${item.id}: first numbers differ`]),
            ...(JSON.stringify(sums) === JSON.stringify([total - near, total, total + near])
              ? []
              : [`${item.id}: sums ${sums.join(',')}`]),
            ...(right.length === 1 && right[0]?.option.id === item.answer
              ? []
              : [`${item.id}: answer ${item.answer}`]),
            ...(item.options.map((option) => option.id).join() === 'a,b,c'
              ? []
              : [`${item.id}: ids`]),
            ...pairs.flatMap(({ x, y, option }) => {
              const digitTens = total === 100 && x + y === 110;
              return option.reason === (digitTens ? 'bugs.digit-tens' : undefined) &&
                (!digitTens ||
                  y === Number(`${String(10 - Math.floor(x / 10))}${String(10 - (x % 10))}`))
                ? []
                : [`${item.id}: reason ${String(option.reason)} on ${option.big}`];
            }),
          ];
        },
      );
      expect(problems).toEqual([]);
      const positions = new Set(items.map(({ item }) => item.answer));
      expect([...positions].sort()).toEqual(['a', 'b', 'c']);
    });
  });

  it('is the curriculum example: 64 + 36 is right, 64 + 46 is digit-tens, 64 + 26 is off by ten', () => {
    const item: ChoiceItem = {
      id: 'dr-1',
      type: 'choice',
      text: 'gen.dr-1.text',
      options: [
        { id: 'a', big: '64 + 26' },
        { id: 'b', big: '64 + 36' },
        { id: 'c', big: '64 + 46', reason: 'bugs.digit-tens' },
      ],
      answer: 'b',
    };
    expect(checkIssues('bond-pairs', { total: 100 }, item)).toEqual([]);
  });

  it('draws 3 distinct items per entry', () => {
    for (const total of [10, 20, 100]) {
      for (let seed = 0; seed < 50; seed += 1) {
        expect(
          draw('bond-pairs', { total }, seed, 3).issues,
          `${String(total)} @${String(seed)}`,
        ).toEqual([]);
      }
    }
  });

  it('names its params problems', () => {
    expect(draw('bond-pairs', { total: 50 }, 0).issues).not.toEqual([]);
    expect(draw('bond-pairs', {}, 0).issues).not.toEqual([]);
  });

  describe('check', () => {
    const params = { total: 100 };
    const good = sample<ChoiceItem>('bond-pairs', params);
    const options = (...bigs: readonly string[]): ChoiceItem['options'] =>
      bigs.map((big, index) => ({ id: ['a', 'b', 'c'][index] ?? 'a', big }));

    it('accepts a good item', () => {
      expect(checkIssues('bond-pairs', params, good)).toEqual([]);
    });

    it('reports a wrong answer, a repeated or unreadable option, wrong sums', () => {
      const wrongId = good.options.find((option) => option.id !== good.answer)?.id ?? 'a';
      expect(checkIssues('bond-pairs', params, { ...good, answer: wrongId }).join()).toMatch(
        /should be the answer/,
      );
      expect(
        checkIssues('bond-pairs', params, { ...good, options: good.options.slice(0, 2) }).join(),
      ).toMatch(/not 3 sums/);
      expect(
        checkIssues('bond-pairs', params, {
          ...good,
          options: options('64 + 36', '64 + 36', '64 + 46'),
          answer: 'a',
        }).join(),
      ).toMatch(/same pair/);
      expect(
        checkIssues('bond-pairs', params, {
          ...good,
          options: options('64 + 36', '64 + 37', '64 + 38'),
          answer: 'a',
        }).join(),
      ).toMatch(/sums/);
      expect(
        checkIssues('bond-pairs', params, {
          ...good,
          options: options('64 + 36', 'x', '64 + 46'),
        }).join(),
      ).toMatch(/not 3 sums/);
    });

    it('reports a missing, a misplaced and an unneeded reason', () => {
      const bare = good.options.map(({ id, big }) => ({ id, big }));
      expect(checkIssues('bond-pairs', params, { ...good, options: bare }).join()).toMatch(
        /reasons/,
      );
      const onRight = good.options.map((option) =>
        option.id === good.answer ? { ...option, reason: 'bugs.digit-tens' } : option,
      );
      expect(checkIssues('bond-pairs', params, { ...good, options: onRight }).join()).toMatch(
        /reasons/,
      );
      const small = sample<ChoiceItem>('bond-pairs', { total: 20 });
      const withReason = small.options.map((option, index) =>
        index === 0 && option.id !== small.answer
          ? { ...option, reason: 'bugs.digit-tens' }
          : option,
      );
      expect(
        checkIssues('bond-pairs', { total: 20 }, { ...small, options: withReason }).join(),
      ).toMatch(/reasons/);
    });
  });
});

describe('equals-balance', () => {
  describe.each([{ max: 20 }, { max: 10 }])('max $max', (params) => {
    it('has the same total on both sides: the gap is the left sum minus the number after the equals sign, never an addend, and the left sum is the answer-next reason', () => {
      const { problems, items } = overSeeds<NumberEntryItem>(
        'equals-balance',
        params,
        ({ item, text }) => {
          const card = /^(\d+) \+ (\d+) = (\d+) \+ \?$/.exec(item.prompt.big);
          const [a, b, c] = [Number(card?.[1]), Number(card?.[2]), Number(card?.[3])];
          const reasons = item.reasons ?? [];
          return [
            ...(text === 'Both sides must be the same. What goes in the gap?'
              ? []
              : [`${item.id}: "${text}"`]),
            ...(card === null ? [`${item.id}: card "${item.prompt.big}"`] : []),
            ...(a + b <= params.max && a >= 2 && b >= 2
              ? []
              : [`${item.id}: ${String(a)} + ${String(b)}`]),
            ...(c >= 1 && c < a + b && c !== a && c !== b ? [] : [`${item.id}: c ${String(c)}`]),
            ...(c + item.answer === a + b
              ? []
              : [`${item.id}: ${String(c)} + ${String(item.answer)}`]),
            ...(item.answer !== a && item.answer !== b
              ? []
              : [`${item.id}: the gap repeats an addend`]),
            ...(reasons.length === 1 &&
            reasons[0]?.value === a + b &&
            reasons[0].text === 'bugs.answer-next'
              ? []
              : [`${item.id}: reasons ${JSON.stringify(reasons)}`]),
          ];
        },
      );
      expect(problems).toEqual([]);
      expect(new Set(items.map(({ item }) => item.prompt.big)).size).toBeGreaterThan(40);
    });
  });

  it('is the curriculum example: 7 + 5 = 6 + ? → 6, and 12 is answer-next', () => {
    const item: NumberEntryItem = {
      id: 'dr-1',
      type: 'number-entry',
      text: 'gen.dr-1.text',
      prompt: { big: '7 + 5 = 6 + ?' },
      answer: 6,
      reasons: [{ value: 12, text: 'bugs.answer-next' }],
    };
    expect(checkIssues('equals-balance', { max: 20 }, item)).toEqual([]);
  });

  it('draws 3 distinct items per entry', () => {
    for (const max of [10, 20]) {
      for (let seed = 0; seed < 50; seed += 1) {
        expect(
          draw('equals-balance', { max }, seed, 3).issues,
          `${String(max)} @${String(seed)}`,
        ).toEqual([]);
      }
    }
  });

  it('names its params problems', () => {
    expect(draw('equals-balance', { max: 9 }, 0).issues).not.toEqual([]);
    expect(draw('equals-balance', { max: 21 }, 0).issues).not.toEqual([]);
    expect(draw('equals-balance', {}, 0).issues).not.toEqual([]);
  });

  describe('check', () => {
    const params = { max: 20 };
    const good = sample<NumberEntryItem>('equals-balance', params);

    it('accepts a good item', () => {
      expect(checkIssues('equals-balance', params, good)).toEqual([]);
    });

    it('reports a wrong answer, an unreadable prompt, numbers that break the params', () => {
      expect(
        checkIssues('equals-balance', params, { ...good, answer: good.answer + 1 }).join(),
      ).toMatch(/the gap is/);
      expect(
        checkIssues('equals-balance', params, { ...good, prompt: { big: '7 + 5 = 6' } }).join(),
      ).toMatch(/cannot read the prompt/);
      for (const [big, answer] of [
        ['7 + 5 = 7 + ?', 5],
        ['7 + 5 = 5 + ?', 7],
        ['7 + 5 = 12 + ?', 0],
        ['15 + 9 = 6 + ?', 18],
        ['1 + 5 = 4 + ?', 2],
      ] as const) {
        expect(
          checkIssues('equals-balance', params, { ...good, prompt: { big }, answer }).join(),
          big,
        ).toMatch(/does not fit/);
      }
    });

    it('reports a missing and a wrong reason', () => {
      expect(checkIssues('equals-balance', params, { ...good, reasons: undefined }).join()).toMatch(
        /reasons/,
      );
      expect(
        checkIssues('equals-balance', params, {
          ...good,
          reasons: [{ value: 1, text: 'bugs.answer-next' }],
        }).join(),
      ).toMatch(/reasons/);
      expect(
        checkIssues('equals-balance', params, {
          ...good,
          reasons: [{ value: good.reasons?.[0]?.value ?? 0, text: 'bugs.wrong-op' }],
        }).join(),
      ).toMatch(/reasons/);
    });
  });
});
