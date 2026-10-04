// tens-hundreds and compensate over 1 000 seeds per parameter set of curriculum §2: each item is solved again here from its card and
// its English sentence (changing the one digit; using the round number, then fixing the 1), and every `check` fails on a hand-broken
// item.
import { describe, expect, it } from 'vitest';
import type { NumberEntryItem } from './items.ts';
import { checkIssues, draw, overSeeds, sample } from './testing.ts';

const MINUS = '−';
const BOOLS = ['+', '-'] as const;

const TENS_SETS = ([10, 100] as const).flatMap((step) => BOOLS.map((op) => ({ step, op })));

/** `n` with the digit of the place `step` (10 or 100) up or down by one, as text, no carry (the template keeps clear of them). */
function digitChanged(n: number, step: 10 | 100, op: '+' | '-'): number {
  const digits = String(n).split('').map(Number);
  const place = digits.length - (step === 10 ? 2 : 3);
  digits[place] = (digits[place] ?? 0) + (op === '+' ? 1 : -1);
  return Number(digits.join(''));
}

describe('tens-hundreds', () => {
  describe.each(TENS_SETS)('step $step, op $op', ({ step, op }) => {
    it('changes the tens (hundreds) digit of a 3-digit number by one without carrying; changing the place below is the wrong-place reason', () => {
      const sign = op === '+' ? '+' : MINUS;
      const { problems, items } = overSeeds<NumberEntryItem>(
        'tens-hundreds',
        { step, op },
        ({ item, text }) => {
          const card = new RegExp(`^(\\d+) \\${sign} (\\d+)$`).exec(item.prompt.big);
          const [n, shown] = [Number(card?.[1]), Number(card?.[2])];
          const reasons = item.reasons ?? [];
          const below = op === '+' ? n + step / 10 : n - step / 10;
          return [
            ...(text === 'What is the answer?' ? [] : [`${item.id}: "${text}"`]),
            ...(card === null ? [`${item.id}: card "${item.prompt.big}"`] : []),
            ...(shown === step && n >= 100 && n <= 999
              ? []
              : [`${item.id}: ${item.prompt.big} is not a 3-digit number ${sign} ${String(step)}`]),
            ...(item.answer === digitChanged(n, step, op)
              ? []
              : [
                  `${item.id}: ${item.prompt.big} is ${String(item.answer)}, not ${String(digitChanged(n, step, op))}`,
                ]),
            ...(reasons.length === 1 &&
            reasons[0]?.value === below &&
            reasons[0].text === 'bugs.wrong-place'
              ? []
              : [`${item.id}: reasons ${JSON.stringify(reasons)}`]),
          ];
        },
      );
      expect(problems).toEqual([]);
      expect(new Set(items.map(({ item }) => item.prompt.big)).size).toBeGreaterThan(300);
    });
  });

  it(`is the curriculum example: 347 + 10 → 357, and 348 is wrong-place; 347 + 100 → 447, and 357`, () => {
    const item = (big: string, answer: number, wrong: number): NumberEntryItem => ({
      id: 'dr-1',
      type: 'number-entry',
      text: 'gen.dr-1.text',
      prompt: { big },
      answer,
      reasons: [{ value: wrong, text: 'bugs.wrong-place' }],
    });
    expect(checkIssues('tens-hundreds', { step: 10, op: '+' }, item('347 + 10', 357, 348))).toEqual(
      [],
    );
    expect(
      checkIssues('tens-hundreds', { step: 100, op: '+' }, item('347 + 100', 447, 357)),
    ).toEqual([]);
    expect(
      checkIssues('tens-hundreds', { step: 10, op: '-' }, item(`347 ${MINUS} 10`, 337, 346)),
    ).toEqual([]);
  });

  it('draws 3 distinct items per entry in every set', () => {
    for (const params of TENS_SETS) {
      for (let seed = 0; seed < 50; seed += 1) {
        expect(
          draw('tens-hundreds', params, seed, 3).issues,
          `${JSON.stringify(params)} @${String(seed)}`,
        ).toEqual([]);
      }
    }
  });

  it('names its params problems', () => {
    expect(draw('tens-hundreds', { step: 1000, op: '+' }, 0).issues).not.toEqual([]);
    expect(draw('tens-hundreds', { step: 10, op: '*' }, 0).issues).not.toEqual([]);
    expect(draw('tens-hundreds', { step: 10 }, 0).issues).not.toEqual([]);
  });

  describe('check', () => {
    const params = { step: 10, op: '+' } as const;
    const good = sample<NumberEntryItem>('tens-hundreds', params);
    const at = (big: string, answer: number, wrong: number): NumberEntryItem => ({
      ...good,
      prompt: { big },
      answer,
      reasons: [{ value: wrong, text: 'bugs.wrong-place' }],
    });

    it('accepts a good item', () => {
      expect(checkIssues('tens-hundreds', params, good)).toEqual([]);
      expect(checkIssues('tens-hundreds', params, at('347 + 10', 357, 348))).toEqual([]);
    });

    it('reports a wrong answer and an unreadable card', () => {
      expect(
        checkIssues('tens-hundreds', params, { ...good, answer: good.answer + 1 }).join(),
      ).toMatch(/is [0-9]+, not/);
      for (const big of ['347', `347 ${MINUS} 10`, '347 + x', '347 * 10']) {
        expect(
          checkIssues('tens-hundreds', params, { ...good, prompt: { big } }).join(),
          big,
        ).toMatch(/cannot read the prompt/);
      }
    });

    it('reports a number that carries or breaks the params: the other step, 2 or 4 digits, a carry, a borrow', () => {
      expect(checkIssues('tens-hundreds', params, at('347 + 100', 447, 357)).join()).toMatch(
        /not a 3-digit/,
      );
      expect(checkIssues('tens-hundreds', params, at('47 + 10', 57, 48)).join()).toMatch(
        /not a 3-digit/,
      );
      expect(checkIssues('tens-hundreds', params, at('1347 + 10', 1357, 1348)).join()).toMatch(
        /not a 3-digit/,
      );
      expect(checkIssues('tens-hundreds', params, at('395 + 10', 405, 396)).join()).toMatch(
        /not a 3-digit/,
      );
      expect(
        checkIssues('tens-hundreds', { step: 10, op: '-' }, at(`305 ${MINUS} 10`, 295, 304)).join(),
      ).toMatch(/not a 3-digit/);
      expect(
        checkIssues(
          'tens-hundreds',
          { step: 100, op: '-' },
          at(`147 ${MINUS} 100`, 47, 137),
        ).join(),
      ).toMatch(/not a 3-digit/);
      expect(
        checkIssues('tens-hundreds', { step: 100, op: '+' }, at('947 + 100', 1047, 957)).join(),
      ).toMatch(/not a 3-digit/);
      expect(checkIssues('tens-hundreds', { step: 10, op: '-' }, good).join()).toMatch(
        /cannot read/,
      );
    });

    it('reports a missing, a wrong and an unneeded reason', () => {
      expect(checkIssues('tens-hundreds', params, { ...good, reasons: undefined }).join()).toMatch(
        /reasons/,
      );
      expect(checkIssues('tens-hundreds', params, at('347 + 10', 357, 349)).join()).toMatch(
        /reasons/,
      );
      expect(checkIssues('tens-hundreds', params, at('347 + 10', 357, 337)).join()).toMatch(
        /reasons/,
      );
      expect(
        checkIssues('tens-hundreds', params, {
          ...good,
          reasons: [{ value: good.answer + 1, text: 'bugs.off-by-one' }],
        }).join(),
      ).toMatch(/reasons/);
    });
  });
});

const COMPENSATE_SETS = ([9, 99] as const).flatMap((near) => BOOLS.map((op) => ({ near, op })));

describe('compensate', () => {
  describe.each(COMPENSATE_SETS)('near $near, op $op', ({ near, op }) => {
    it('says to use the round number and put the 1 back; using the round number and stopping is the forgot-adjust reason', () => {
      const sign = op === '+' ? '+' : MINUS;
      const round = near + 1;
      const sentence =
        op === '+'
          ? `Add ${String(round)}, then take 1 away. What is it?`
          : `Take away ${String(round)}, then add 1 back. What is it?`;
      const { problems, items } = overSeeds<NumberEntryItem>(
        'compensate',
        { near, op },
        ({ item, text }) => {
          const card = new RegExp(`^(\\d+) \\${sign} (\\d+)$`).exec(item.prompt.big);
          const [n, shown] = [Number(card?.[1]), Number(card?.[2])];
          const rounded = op === '+' ? n + round : n - round;
          const fixed = op === '+' ? rounded - 1 : rounded + 1;
          const reasons = item.reasons ?? [];
          const fits =
            n % 10 >= 2 &&
            n % 10 <= 8 &&
            (near === 99 && op === '-' ? n >= 102 && n <= 998 : n >= 12 && n <= 98);
          return [
            ...(text === sentence ? [] : [`${item.id}: "${text}" is not "${sentence}"`]),
            ...(card === null ? [`${item.id}: card "${item.prompt.big}"`] : []),
            ...(shown === near && fits ? [] : [`${item.id}: ${item.prompt.big} does not fit`]),
            ...(item.answer === fixed
              ? []
              : [`${item.id}: ${item.prompt.big} is ${String(item.answer)}, not ${String(fixed)}`]),
            ...(item.answer > 0 && fixed > 0 ? [] : [`${item.id}: not above zero`]),
            ...(reasons.length === 1 &&
            reasons[0]?.value === rounded &&
            reasons[0].text === 'bugs.forgot-adjust'
              ? []
              : [`${item.id}: reasons ${JSON.stringify(reasons)}`]),
          ];
        },
      );
      expect(problems).toEqual([]);
      const distinct = new Set(items.map(({ item }) => item.prompt.big)).size;
      if (near === 99 && op === '-') expect(distinct).toBeGreaterThan(300);
      else expect(distinct).toBe(63);
    });
  });

  it(`is the curriculum example: 46 + 99 → 145, and 146 is forgot-adjust; 146 ${MINUS} 99 → 47, and 46`, () => {
    const item = (big: string, answer: number, wrong: number): NumberEntryItem => ({
      id: 'dr-1',
      type: 'number-entry',
      text: 'gen.dr-1.text',
      prompt: { big },
      answer,
      reasons: [{ value: wrong, text: 'bugs.forgot-adjust' }],
    });
    expect(checkIssues('compensate', { near: 99, op: '+' }, item('46 + 99', 145, 146))).toEqual([]);
    expect(
      checkIssues('compensate', { near: 99, op: '-' }, item(`146 ${MINUS} 99`, 47, 46)),
    ).toEqual([]);
    expect(checkIssues('compensate', { near: 9, op: '+' }, item('46 + 9', 55, 56))).toEqual([]);
    expect(checkIssues('compensate', { near: 9, op: '-' }, item(`46 ${MINUS} 9`, 37, 36))).toEqual(
      [],
    );
  });

  it('draws 3 distinct items per entry in every set', () => {
    for (const params of COMPENSATE_SETS) {
      for (let seed = 0; seed < 50; seed += 1) {
        expect(
          draw('compensate', params, seed, 3).issues,
          `${JSON.stringify(params)} @${String(seed)}`,
        ).toEqual([]);
      }
    }
  });

  it('names its params problems', () => {
    expect(draw('compensate', { near: 19, op: '+' }, 0).issues).not.toEqual([]);
    expect(draw('compensate', { near: 9, op: 'x' }, 0).issues).not.toEqual([]);
    expect(draw('compensate', { near: 9 }, 0).issues).not.toEqual([]);
  });

  describe('check', () => {
    const params = { near: 99, op: '+' } as const;
    const good = sample<NumberEntryItem>('compensate', params);
    const at = (big: string, answer: number, wrong: number): NumberEntryItem => ({
      ...good,
      prompt: { big },
      answer,
      reasons: [{ value: wrong, text: 'bugs.forgot-adjust' }],
    });

    it('accepts a good item', () => {
      expect(checkIssues('compensate', params, good)).toEqual([]);
      expect(checkIssues('compensate', params, at('46 + 99', 145, 146))).toEqual([]);
    });

    it('reports a wrong answer and an unreadable card', () => {
      expect(
        checkIssues('compensate', params, { ...good, answer: good.answer + 1 }).join(),
      ).toMatch(/is [0-9]+, not/);
      for (const big of ['46', `46 ${MINUS} 99`, '46 + x', '46 x 99']) {
        expect(checkIssues('compensate', params, { ...good, prompt: { big } }).join(), big).toMatch(
          /cannot read the prompt/,
        );
      }
    });

    it('reports a number that breaks the params: another near number, ones 0, 1 or 9, outside the range', () => {
      expect(checkIssues('compensate', params, at('46 + 9', 55, 56)).join()).toMatch(
        /does not fit/,
      );
      expect(checkIssues('compensate', params, at('40 + 99', 139, 140)).join()).toMatch(
        /does not fit/,
      );
      expect(checkIssues('compensate', params, at('41 + 99', 140, 141)).join()).toMatch(
        /does not fit/,
      );
      expect(checkIssues('compensate', params, at('49 + 99', 148, 149)).join()).toMatch(
        /does not fit/,
      );
      expect(checkIssues('compensate', params, at('106 + 99', 205, 206)).join()).toMatch(
        /does not fit/,
      );
      expect(checkIssues('compensate', params, at('6 + 99', 105, 106)).join()).toMatch(
        /does not fit/,
      );
      expect(
        checkIssues('compensate', { near: 99, op: '-' }, at(`46 ${MINUS} 99`, -53, -54)).join(),
      ).toMatch(/does not fit/);
    });

    it('reports a missing, a wrong and an unneeded reason', () => {
      expect(checkIssues('compensate', params, { ...good, reasons: undefined }).join()).toMatch(
        /reasons/,
      );
      expect(checkIssues('compensate', params, at('46 + 99', 145, 144)).join()).toMatch(/reasons/);
      expect(checkIssues('compensate', params, at('46 + 99', 145, 155)).join()).toMatch(/reasons/);
      expect(
        checkIssues('compensate', params, {
          ...good,
          reasons: [{ value: good.answer + 1, text: 'bugs.off-by-one' }],
        }).join(),
      ).toMatch(/reasons/);
    });
  });
});
