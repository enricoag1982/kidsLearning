// double, near-double, halve over 1 000 seeds per parameter set of curriculum §2: each item is solved again here from its English
// sentence and its card, and every `check` fails on a hand-broken item.
import { describe, expect, it } from 'vitest';
import type { NumberEntryItem } from './items.ts';
import { checkIssues, draw, overSeeds, sample } from './testing.ts';

/** Doubling the tens and keeping the ones, from the digits as text (34 → "6" and "4" → 64); the tens here are at most 4. */
function tensDoubledOnesKept(n: number): number {
  const text = String(n);
  return Number(`${String(2 * Number(text.slice(0, -1)))}${text.slice(-1)}`);
}

/** Halving the tens and keeping the ones: half of 70 is 35 and 4 stays (74 → 39). */
function tensHalvedOnesKept(n: number): number {
  const text = String(n);
  return Number(text.slice(0, -1)) * 5 + Number(text.slice(-1));
}

describe('double', () => {
  describe.each([20, 50] as const)('max %i', (max) => {
    it('doubles the number the sentence names, which is also on the card twice; tens-only (tens doubled, ones kept) is spoken when both places are used', () => {
      const from = max === 20 ? 6 : 11;
      const { problems, items } = overSeeds<NumberEntryItem>(
        'double',
        { max },
        ({ item, text }) => {
          const sentence = /^Double (\d+)\.$/.exec(text);
          const n = Number(sentence?.[1]);
          const reasons = item.reasons ?? [];
          const usesBoth = n >= 10 && n % 10 !== 0;
          return [
            ...(sentence === null ? [`${item.id}: "${text}" is not the double sentence`] : []),
            ...(item.prompt.big === `${String(n)} + ${String(n)}`
              ? []
              : [`${item.id}: card "${item.prompt.big}" for ${String(n)}`]),
            ...(n >= from && n <= max
              ? []
              : [`${item.id}: ${String(n)} is outside ${String(from)}-${String(max)}`]),
            ...(item.answer === n + n
              ? []
              : [`${item.id}: ${String(n)} doubled is ${String(item.answer)}`]),
            ...(usesBoth
              ? reasons.length === 1 &&
                reasons[0]?.value === tensDoubledOnesKept(n) &&
                reasons[0].value !== item.answer &&
                reasons[0].text === 'bugs.tens-only'
                ? []
                : [`${item.id}: reasons ${JSON.stringify(reasons)} for ${String(n)}`]
              : reasons.length === 0
                ? []
                : [`${item.id}: unexpected reasons for ${String(n)}`]),
          ];
        },
      );
      expect(problems).toEqual([]);
      expect(new Set(items.map(({ item }) => item.answer)).size).toBe(max - from + 1);
    });
  });

  it('is the curriculum example: Double 34 → 68, and 64 is tens-only', () => {
    const item: NumberEntryItem = {
      id: 'dr-1',
      type: 'number-entry',
      text: 'gen.dr-1.text',
      prompt: { big: '34 + 34' },
      answer: 68,
      reasons: [{ value: 64, text: 'bugs.tens-only' }],
    };
    expect(checkIssues('double', { max: 50 }, item)).toEqual([]);
  });

  it('draws 3 distinct items per entry', () => {
    for (const max of [20, 50]) {
      for (let seed = 0; seed < 50; seed += 1) {
        expect(draw('double', { max }, seed, 3).issues, `${String(max)} @${String(seed)}`).toEqual(
          [],
        );
      }
    }
  });

  it('names its params problems', () => {
    expect(draw('double', { max: 30 }, 0).issues).not.toEqual([]);
    expect(draw('double', {}, 0).issues).not.toEqual([]);
  });

  describe('check', () => {
    const params = { max: 50 };
    const withReason = sample<NumberEntryItem>(
      'double',
      params,
      (item) => item.reasons !== undefined,
    );
    const bare = sample<NumberEntryItem>('double', params, (item) => item.reasons === undefined);

    it('accepts good items (with a reason, without when a place is empty)', () => {
      expect(checkIssues('double', params, withReason)).toEqual([]);
      expect(checkIssues('double', params, bare)).toEqual([]);
    });

    it('reports a wrong answer, a card that is not a double, an unreadable card, a number outside the range', () => {
      expect(
        checkIssues('double', params, { ...withReason, answer: withReason.answer + 2 }).join(),
      ).toMatch(/is [0-9]+, not/);
      expect(
        checkIssues('double', params, { ...bare, prompt: { big: '30 + 31' }, answer: 61 }).join(),
      ).toMatch(/not a double/);
      expect(checkIssues('double', params, { ...bare, prompt: { big: '30 − 30' } }).join()).toMatch(
        /cannot read the prompt/,
      );
      expect(
        checkIssues('double', params, { ...bare, prompt: { big: '60 + 60' }, answer: 120 }).join(),
      ).toMatch(/is not from/);
      expect(
        checkIssues('double', params, { ...bare, prompt: { big: '9 + 9' }, answer: 18 }).join(),
      ).toMatch(/is not from/);
      expect(
        checkIssues(
          'double',
          { max: 20 },
          { ...bare, prompt: { big: '30 + 30' }, answer: 60 },
        ).join(),
      ).toMatch(/is not from/);
    });

    it('reports a missing, a wrong and an unneeded reason', () => {
      expect(checkIssues('double', params, { ...withReason, reasons: undefined }).join()).toMatch(
        /reasons/,
      );
      expect(
        checkIssues('double', params, {
          ...withReason,
          reasons: [{ value: 1, text: 'bugs.tens-only' }],
        }).join(),
      ).toMatch(/reasons/);
      expect(
        checkIssues('double', params, {
          ...bare,
          reasons: [{ value: bare.answer - 1, text: 'bugs.tens-only' }],
        }).join(),
      ).toMatch(/reasons/);
    });
  });
});

describe('near-double', () => {
  describe.each([{ max: 50 }, { max: 20 }])('max $max', ({ max }) => {
    it('adds n and n + 1: the plain double of n is the off-by-one reason', () => {
      const { problems, items } = overSeeds<NumberEntryItem>(
        'near-double',
        { max },
        ({ item, text }) => {
          const card = /^(\d+) \+ (\d+)$/.exec(item.prompt.big);
          const [a, b] = [Number(card?.[1]), Number(card?.[2])];
          const reasons = item.reasons ?? [];
          return [
            ...(text === 'Use a double to help. What is the total?'
              ? []
              : [`${item.id}: "${text}"`]),
            ...(card === null ? [`${item.id}: card "${item.prompt.big}"`] : []),
            ...(b === a + 1 && a >= 6 && b <= max
              ? []
              : [`${item.id}: ${String(a)} + ${String(b)}`]),
            ...(item.answer === a + b
              ? []
              : [`${item.id}: ${String(a)} + ${String(b)} is ${String(item.answer)}`]),
            ...(reasons.length === 1 &&
            reasons[0]?.value === a + a &&
            reasons[0].text === 'bugs.off-by-one'
              ? []
              : [`${item.id}: reasons ${JSON.stringify(reasons)}`]),
          ];
        },
      );
      expect(problems).toEqual([]);
      expect(new Set(items.map(({ item }) => item.prompt.big)).size).toBe(max - 6);
    });
  });

  it('is the curriculum example: 35 + 36 → 71, and the double 70 is off-by-one', () => {
    const item: NumberEntryItem = {
      id: 'dr-1',
      type: 'number-entry',
      text: 'gen.dr-1.text',
      prompt: { big: '35 + 36' },
      answer: 71,
      reasons: [{ value: 70, text: 'bugs.off-by-one' }],
    };
    expect(checkIssues('near-double', { max: 50 }, item)).toEqual([]);
  });

  it('draws 3 distinct items per entry', () => {
    for (const max of [20, 50]) {
      for (let seed = 0; seed < 50; seed += 1) {
        expect(
          draw('near-double', { max }, seed, 3).issues,
          `${String(max)} @${String(seed)}`,
        ).toEqual([]);
      }
    }
  });

  it('names its params problems', () => {
    expect(draw('near-double', { max: 9 }, 0).issues).not.toEqual([]);
    expect(draw('near-double', { max: 51 }, 0).issues).not.toEqual([]);
    expect(draw('near-double', {}, 0).issues).not.toEqual([]);
  });

  describe('check', () => {
    const params = { max: 50 };
    const good = sample<NumberEntryItem>('near-double', params);

    it('accepts a good item', () => {
      expect(checkIssues('near-double', params, good)).toEqual([]);
    });

    it('reports a wrong answer, a pair that is not a near double, an unreadable card, a number outside the range', () => {
      expect(
        checkIssues('near-double', params, { ...good, answer: good.answer + 1 }).join(),
      ).toMatch(/is [0-9]+, not/);
      expect(
        checkIssues('near-double', params, {
          ...good,
          prompt: { big: '35 + 37' },
          answer: 72,
        }).join(),
      ).toMatch(/not a near double/);
      expect(
        checkIssues('near-double', params, {
          ...good,
          prompt: { big: '36 + 35' },
          answer: 71,
        }).join(),
      ).toMatch(/not a near double/);
      expect(checkIssues('near-double', params, { ...good, prompt: { big: '35' } }).join()).toMatch(
        /cannot read the prompt/,
      );
      expect(
        checkIssues('near-double', params, { ...good, prompt: { big: '4 + 5' }, answer: 9 }).join(),
      ).toMatch(/not a near double/);
      expect(
        checkIssues('near-double', params, {
          ...good,
          prompt: { big: '50 + 51' },
          answer: 101,
        }).join(),
      ).toMatch(/not a near double/);
    });

    it('reports a missing and a wrong reason', () => {
      expect(checkIssues('near-double', params, { ...good, reasons: undefined }).join()).toMatch(
        /reasons/,
      );
      expect(
        checkIssues('near-double', params, {
          ...good,
          reasons: [{ value: good.answer + 1, text: 'bugs.off-by-one' }],
        }).join(),
      ).toMatch(/reasons/);
      expect(
        checkIssues('near-double', params, {
          ...good,
          reasons: [{ value: good.answer - 1, text: 'bugs.off-by-ten' }],
        }).join(),
      ).toMatch(/reasons/);
    });
  });
});

describe('halve', () => {
  describe.each([{ max: 100 }, { max: 20 }])('max $max', ({ max }) => {
    it('halves the even number on the card: halving the tens only (half of the tens, ones kept) is spoken when the ones digit is not 0', () => {
      const { problems, items } = overSeeds<NumberEntryItem>('halve', { max }, ({ item, text }) => {
        const sentence = /^What is half of (\d+)\?$/.exec(text);
        const n = Number(sentence?.[1]);
        const reasons = item.reasons ?? [];
        const usesOnes = n % 10 !== 0;
        return [
          ...(sentence === null ? [`${item.id}: "${text}" is not the halve sentence`] : []),
          ...(item.prompt.big === String(n)
            ? []
            : [`${item.id}: card "${item.prompt.big}" for ${String(n)}`]),
          ...(n % 2 === 0 && n >= 12 && n <= max
            ? []
            : [`${item.id}: ${String(n)} is not an even number in range`]),
          ...(item.answer * 2 === n
            ? []
            : [`${item.id}: half of ${String(n)} is not ${String(item.answer)}`]),
          ...(usesOnes
            ? reasons.length === 1 &&
              reasons[0]?.value === tensHalvedOnesKept(n) &&
              reasons[0].value !== item.answer &&
              reasons[0].text === 'bugs.halve-tens-only'
              ? []
              : [`${item.id}: reasons ${JSON.stringify(reasons)} for ${String(n)}`]
            : reasons.length === 0
              ? []
              : [`${item.id}: unexpected reasons for ${String(n)}`]),
        ];
      });
      expect(problems).toEqual([]);
      expect(new Set(items.map(({ item }) => item.answer)).size).toBe(max / 2 - 5);
    });
  });

  it('is the curriculum example: half of 68 → 34, and 38 (half of the tens, the ones kept) is halve-tens-only', () => {
    const item: NumberEntryItem = {
      id: 'dr-1',
      type: 'number-entry',
      text: 'gen.dr-1.text',
      prompt: { big: '68' },
      answer: 34,
      reasons: [{ value: 38, text: 'bugs.halve-tens-only' }],
    };
    expect(checkIssues('halve', { max: 100 }, item)).toEqual([]);
    expect(
      checkIssues(
        'halve',
        { max: 100 },
        { ...item, prompt: { big: '100' }, answer: 50, reasons: undefined },
      ),
    ).toEqual([]);
  });

  it('draws 3 distinct items per entry', () => {
    for (const max of [20, 100]) {
      for (let seed = 0; seed < 50; seed += 1) {
        expect(draw('halve', { max }, seed, 3).issues, `${String(max)} @${String(seed)}`).toEqual(
          [],
        );
      }
    }
  });

  it('names its params problems', () => {
    expect(draw('halve', { max: 19 }, 0).issues).not.toEqual([]);
    expect(draw('halve', { max: 101 }, 0).issues).not.toEqual([]);
    expect(draw('halve', {}, 0).issues).not.toEqual([]);
  });

  describe('check', () => {
    const params = { max: 100 };
    const withReason = sample<NumberEntryItem>(
      'halve',
      params,
      (item) => item.reasons !== undefined,
    );
    const bare = sample<NumberEntryItem>('halve', params, (item) => item.reasons === undefined);

    it('accepts good items', () => {
      expect(checkIssues('halve', params, withReason)).toEqual([]);
      expect(checkIssues('halve', params, bare)).toEqual([]);
    });

    it('reports a wrong answer, an unreadable card, an odd number, a number outside the range', () => {
      expect(
        checkIssues('halve', params, { ...withReason, answer: withReason.answer + 1 }).join(),
      ).toMatch(/half of/);
      expect(checkIssues('halve', params, { ...bare, prompt: { big: 'x' } }).join()).toMatch(
        /cannot read the prompt/,
      );
      expect(
        checkIssues('halve', params, { ...bare, prompt: { big: '67' }, answer: 33 }).join(),
      ).toMatch(/not an even number/);
      expect(
        checkIssues('halve', params, { ...bare, prompt: { big: '8' }, answer: 4 }).join(),
      ).toMatch(/not an even number/);
      expect(
        checkIssues('halve', params, { ...bare, prompt: { big: '102' }, answer: 51 }).join(),
      ).toMatch(/not an even number/);
      expect(
        checkIssues('halve', { max: 20 }, { ...bare, prompt: { big: '40' }, answer: 20 }).join(),
      ).toMatch(/not an even number/);
    });

    it('reports a missing, a wrong and an unneeded reason', () => {
      expect(checkIssues('halve', params, { ...withReason, reasons: undefined }).join()).toMatch(
        /reasons/,
      );
      expect(
        checkIssues('halve', params, {
          ...withReason,
          reasons: [{ value: 1, text: 'bugs.halve-tens-only' }],
        }).join(),
      ).toMatch(/reasons/);
      expect(
        checkIssues('halve', params, {
          ...withReason,
          reasons: [{ value: withReason.reasons?.[0]?.value ?? 0, text: 'bugs.tens-only' }],
        }).join(),
      ).toMatch(/reasons/);
      expect(
        checkIssues('halve', params, {
          ...bare,
          reasons: [{ value: bare.answer + 1, text: 'bugs.halve-tens-only' }],
        }).join(),
      ).toMatch(/reasons/);
    });
  });
});
