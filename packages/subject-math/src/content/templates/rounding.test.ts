// round-ten, round-hundred, round-tf over 1 000 seeds per parameter combination of curriculum §2: each item is solved again here from
// its English sentence by distance (half-way goes up), round-ten's number line is read back against the number (the two tens as ends,
// a dot where the number is), and every `check` fails on a hand-broken item.
import { describe, expect, it } from 'vitest';
import type { LineChoiceItem, NumberEntryItem, TrueFalseItem } from './items.ts';
import { checkIssues, draw, overSeeds, sample } from './testing.ts';

/** The nearest multiple of `unit` by distance; a tie (exactly half-way) goes to the larger. */
function nearestByDistance(n: number, unit: number): number {
  const below = n - (n % unit);
  const above = below + unit;
  return n - below < above - n ? below : above;
}

const BOOLS = [false, true] as const;

describe('round-ten', () => {
  const combos = ([100, 1000] as const).flatMap((max) => BOOLS.map((five) => ({ max, five })));

  describe.each(combos)('max $max, five $five', ({ max, five }) => {
    it('has exactly one nearer ten among the two tens either side, the right reason on the ten below, and a five only when asked', () => {
      const { problems, items } = overSeeds<LineChoiceItem>(
        'round-ten',
        { max, five },
        ({ item, text }) => {
          const found = /^Round (\d+) to the nearest ten\.$/.exec(text);
          const n = Number(found?.[1]);
          const tens = item.options.map((option) => Number(option.big));
          const [low = 0, high = 0] = tens;
          const nearest = nearestByDistance(n, 10);
          const right = item.options.filter((_option, index) => tens[index] === nearest);
          const reasons = item.options.filter((option) => option.reason !== undefined);
          const downBug = n % 10 === 5 ? 'bugs.five-down' : 'bugs.truncate';
          return [
            ...(found === null ? [`${item.id}: "${text}" is not the rounding sentence`] : []),
            ...(item.prompt.big === String(n)
              ? []
              : [`${item.id}: big ${item.prompt.big} is not ${String(n)}`]),
            // The picture: the ten below to the ten above, a tick per number, one dot on the number.
            ...(item.prompt.line.from === low &&
            item.prompt.line.to === high &&
            item.prompt.line.step === 1 &&
            item.prompt.line.marks.join() === String(n) &&
            high - low === 10
              ? []
              : [`${item.id}: line ${JSON.stringify(item.prompt.line)} for ${String(n)}`]),
            ...(n % 10 !== 0 && n > 10 && n < max && (n % 10 === 5) === five
              ? []
              : [
                  `${item.id}: ${String(n)} does not fit max ${String(max)} / five ${String(five)}`,
                ]),
            ...(tens.length === 2 && low + 10 === high && n > low && n < high
              ? []
              : [`${item.id}: options ${tens.join(', ')} for ${String(n)}`]),
            ...(item.options.map((option) => option.id).join() === 'down,up'
              ? []
              : [`${item.id}: ids`]),
            ...(right.length === 1 && right[0]?.id === item.answer && right[0].reason === undefined
              ? []
              : [
                  `${item.id}: nearest ten of ${String(n)} is ${String(nearest)}, answer ${item.answer}`,
                ]),
            ...(nearest === tens[1]
              ? reasons.length === 1 && reasons[0]?.id === 'down' && reasons[0].reason === downBug
                ? []
                : [`${item.id}: reasons for ${String(n)}`]
              : reasons.length === 0
                ? []
                : [`${item.id}: a reason when rounding down is right`]),
          ];
        },
      );
      expect(problems).toEqual([]);
      const ups = items.filter(({ item }) => item.answer === 'up').length;
      if (five) expect(ups).toBe(1000);
      else {
        expect(ups).toBeGreaterThan(400);
        expect(ups).toBeLessThan(600);
      }
    });
  });

  it('is the curriculum example: 47 → 50, rounding down to 40 is the truncate bug; 45 → 50, down to 40 is five-down', () => {
    const item = (id: string, n: number, down: number, reason: string): LineChoiceItem => ({
      id,
      type: 'choice',
      text: `gen.${id}.text`,
      prompt: { big: String(n), line: { from: down, to: down + 10, step: 1, marks: [n] } },
      options: [
        { id: 'down', big: String(down), reason },
        { id: 'up', big: String(down + 10) },
      ],
      answer: 'up',
    });
    expect(checkIssues('round-ten', { max: 100 }, item('dr-1', 47, 40, 'bugs.truncate'))).toEqual(
      [],
    );
    expect(
      checkIssues('round-ten', { max: 100, five: true }, item('dr-2', 45, 40, 'bugs.five-down')),
    ).toEqual([]);
  });

  it('draws 3 distinct items per entry in every combination', () => {
    for (const params of combos) {
      for (let seed = 0; seed < 50; seed += 1) {
        expect(
          draw('round-ten', params, seed, 3).issues,
          `${JSON.stringify(params)} @${String(seed)}`,
        ).toEqual([]);
      }
    }
  });

  it('names its params problems', () => {
    expect(draw('round-ten', { max: 50 }, 0).issues).not.toEqual([]);
    expect(draw('round-ten', { max: 100, five: 'yes' }, 0).issues).not.toEqual([]);
    expect(draw('round-ten', {}, 0).issues).not.toEqual([]);
  });

  describe('check', () => {
    const params = { max: 100, five: false };
    const up = sample<LineChoiceItem>('round-ten', params, (item) => item.answer === 'up');
    const down = sample<LineChoiceItem>('round-ten', params, (item) => item.answer === 'down');

    it('accepts good items (rounded up with a reason, rounded down without)', () => {
      expect(checkIssues('round-ten', params, up)).toEqual([]);
      expect(checkIssues('round-ten', params, down)).toEqual([]);
    });

    it('reports a wrong answer, options that are not the tens either side, an unreadable prompt', () => {
      expect(checkIssues('round-ten', params, { ...up, answer: 'down' }).join()).toMatch(
        /should be the only one/,
      );
      expect(checkIssues('round-ten', params, { ...down, answer: 'up' }).join()).toMatch(
        /should be the only one/,
      );
      expect(
        checkIssues('round-ten', params, {
          ...up,
          options: [up.options[0] ?? { id: 'x', big: '1' }, { id: 'up', big: '999' }],
        }).join(),
      ).toMatch(/not the tens either side/);
      expect(
        checkIssues('round-ten', params, { ...up, options: up.options.slice(0, 1) }).join(),
      ).toMatch(/not 2 numerals/);
      expect(
        checkIssues('round-ten', params, { ...up, prompt: { ...up.prompt, big: 'x' } }).join(),
      ).toMatch(/cannot read the prompt/);
    });

    it('reports a number that breaks the params: a multiple of ten, a five without `five`, outside max', () => {
      const at = (n: number): LineChoiceItem => ({
        ...up,
        prompt: {
          big: String(n),
          line: { from: n - (n % 10), to: n - (n % 10) + 10, step: 1, marks: [n] },
        },
      });
      expect(checkIssues('round-ten', params, at(40)).join()).toMatch(/does not fit/);
      expect(checkIssues('round-ten', params, at(45)).join()).toMatch(/does not fit/);
      expect(checkIssues('round-ten', params, at(103)).join()).toMatch(/does not fit/);
      expect(checkIssues('round-ten', { max: 100, five: true }, up).join()).toMatch(/does not fit/);
    });

    it('reports a number line that does not match the card: none, other ends, a step, no dot, a dot elsewhere, an extra dot', () => {
      const { line } = up.prompt;
      const [n = 0] = line.marks;
      const withLine = (next: Partial<typeof line> | undefined): string =>
        checkIssues('round-ten', params, {
          ...up,
          prompt: {
            big: up.prompt.big,
            ...(next === undefined ? {} : { line: { ...line, ...next } }),
          },
        }).join();
      expect(withLine({})).toBe('');
      expect(withLine(undefined)).toMatch(/has no number line/);
      expect(withLine({ from: line.from - 10, to: line.to - 10 })).toMatch(/number line/);
      expect(withLine({ to: line.to + 10 })).toMatch(/number line/);
      expect(withLine({ step: 5 })).toMatch(/number line/);
      expect(withLine({ marks: [] })).toMatch(/number line/);
      expect(withLine({ marks: [line.from] })).toMatch(/number line/);
      expect(withLine({ marks: [n, line.to] })).toMatch(/number line/);
    });

    it('reports a missing, a wrong and a misplaced reason', () => {
      const bare = { ...up, options: up.options.map(({ id, big }) => ({ id, big })) };
      expect(checkIssues('round-ten', params, bare).join()).toMatch(/reasons/);
      const wrong = {
        ...up,
        options: up.options.map((option) =>
          option.reason === undefined ? option : { ...option, reason: 'bugs.five-down' },
        ),
      };
      expect(checkIssues('round-ten', params, wrong).join()).toMatch(/reasons/);
      const onDown = {
        ...down,
        options: down.options.map((option) =>
          option.id === 'down' ? { ...option, reason: 'bugs.truncate' } : option,
        ),
      };
      expect(checkIssues('round-ten', params, onDown).join()).toMatch(/reasons/);
    });
  });
});

describe('round-hundred', () => {
  const combos = ([1000, 10000] as const).flatMap((max) => BOOLS.map((five) => ({ max, five })));

  describe.each(combos)('max $max, five $five', ({ max, five }) => {
    it('asks for the nearer hundred, speaks truncate (five-down at half-way) for the hundred below, a half-way number only when asked', () => {
      const { problems, items } = overSeeds<NumberEntryItem>(
        'round-hundred',
        { max, five },
        ({ item, text }) => {
          const found = /^Round (\d+) to the nearest hundred\.$/.exec(text);
          const n = Number(found?.[1]);
          const nearest = nearestByDistance(n, 100);
          const below = n - (n % 100);
          const reasons = item.reasons ?? [];
          const bug = n % 100 === 50 ? 'bugs.five-down' : 'bugs.truncate';
          return [
            ...(found === null ? [`${item.id}: "${text}" is not the rounding sentence`] : []),
            ...(item.prompt.big === String(n)
              ? []
              : [`${item.id}: big ${item.prompt.big} is not ${String(n)}`]),
            ...(n % 100 !== 0 && n > 100 && n < max && (n % 100 === 50) === five
              ? []
              : [
                  `${item.id}: ${String(n)} does not fit max ${String(max)} / five ${String(five)}`,
                ]),
            ...(item.answer === nearest
              ? []
              : [
                  `${item.id}: nearest hundred of ${String(n)} is ${String(nearest)}, answer ${String(item.answer)}`,
                ]),
            ...(nearest === below
              ? reasons.length === 0
                ? []
                : [`${item.id}: a reason when rounding down is right`]
              : reasons.length === 1 && reasons[0]?.value === below && reasons[0].text === bug
                ? []
                : [`${item.id}: reasons ${JSON.stringify(reasons)} for ${String(n)}`]),
          ];
        },
      );
      expect(problems).toEqual([]);
      if (max === 10000) expect(items.some(({ item }) => item.answer === 10000)).toBe(true);
      expect(items.every(({ item }) => item.answer <= max)).toBe(true);
    });
  });

  it('is the curriculum example: 367 → 400, and 300 is the truncate bug; 350 → 400, and 300 is five-down', () => {
    const item = (id: string, n: number): NumberEntryItem => ({
      id,
      type: 'number-entry',
      text: `gen.${id}.text`,
      prompt: { big: String(n) },
      answer: Math.ceil(n / 100) * 100,
      reasons: [
        { value: n - (n % 100), text: n % 100 === 50 ? 'bugs.five-down' : 'bugs.truncate' },
      ],
    });
    expect(checkIssues('round-hundred', { max: 1000 }, item('dr-1', 367))).toEqual([]);
    expect(checkIssues('round-hundred', { max: 1000, five: true }, item('dr-2', 350))).toEqual([]);
    expect(checkIssues('round-hundred', { max: 10000 }, item('dr-3', 9967))).toEqual([]);
  });

  it('draws 3 distinct items per entry in every combination', () => {
    for (const params of combos) {
      for (let seed = 0; seed < 50; seed += 1) {
        expect(
          draw('round-hundred', params, seed, 3).issues,
          `${JSON.stringify(params)} @${String(seed)}`,
        ).toEqual([]);
      }
    }
  });

  describe('check', () => {
    const params = { max: 1000, five: false };
    const up = sample<NumberEntryItem>(
      'round-hundred',
      params,
      (item) => item.reasons !== undefined,
    );
    const down = sample<NumberEntryItem>(
      'round-hundred',
      params,
      (item) => item.reasons === undefined,
    );

    it('accepts good items', () => {
      expect(checkIssues('round-hundred', params, up)).toEqual([]);
      expect(checkIssues('round-hundred', params, down)).toEqual([]);
    });

    it('reports a wrong answer, an unreadable prompt, a number that breaks the params', () => {
      expect(
        checkIssues('round-hundred', params, { ...up, answer: up.answer - 100 }).join(),
      ).toMatch(/nearest hundred/);
      expect(
        checkIssues('round-hundred', params, { ...up, prompt: { big: '3 67' } }).join(),
      ).toMatch(/cannot read the prompt/);
      const at = (n: number): NumberEntryItem => ({
        ...up,
        prompt: { big: String(n) },
        answer: Math.round(n / 100) * 100,
      });
      expect(checkIssues('round-hundred', params, at(300)).join()).toMatch(/does not fit/);
      expect(checkIssues('round-hundred', params, at(350)).join()).toMatch(/does not fit/);
      expect(checkIssues('round-hundred', params, at(1067)).join()).toMatch(/does not fit/);
      expect(checkIssues('round-hundred', { max: 1000, five: true }, up).join()).toMatch(
        /does not fit/,
      );
    });

    it('reports a missing, a wrong and an unneeded reason', () => {
      expect(checkIssues('round-hundred', params, { ...up, reasons: undefined }).join()).toMatch(
        /reasons/,
      );
      expect(
        checkIssues('round-hundred', params, {
          ...up,
          reasons: [{ value: 5, text: 'bugs.truncate' }],
        }).join(),
      ).toMatch(/reasons/);
      expect(
        checkIssues('round-hundred', params, {
          ...up,
          reasons: [{ value: up.reasons?.[0]?.value ?? 0, text: 'bugs.five-down' }],
        }).join(),
      ).toMatch(/reasons/);
      expect(
        checkIssues('round-hundred', params, {
          ...down,
          reasons: [{ value: 5, text: 'bugs.truncate' }],
        }).join(),
      ).toMatch(/reasons/);
    });
  });
});

describe('round-tf', () => {
  const combos = [
    { to: 10, max: 100 },
    { to: 10, max: 1000 },
    { to: 100, max: 1000 },
    { to: 100, max: 10000 },
  ] as const;

  describe.each(combos)('to $to, max $max', ({ to, max }) => {
    it('says "n → m" of a neighbouring multiple, true half the time; the reason is there when the false claim is the bug', () => {
      const { problems, items } = overSeeds<TrueFalseItem>(
        'round-tf',
        { to, max },
        ({ item, text }) => {
          const [left, right] = item.prompt.big.split(' → ');
          const n = Number((left ?? '').replace(' ', ''));
          const claim = Number((right ?? '').replace(' ', ''));
          const nearest = nearestByDistance(n, to);
          const below = n - (n % to);
          const bug = n % to === to / 2 ? 'bugs.five-down' : 'bugs.truncate';
          return [
            ...(text === `Is this the nearest ${to === 10 ? 'ten' : 'hundred'}?`
              ? []
              : [`${item.id}: text "${text}"`]),
            ...(n % to !== 0 && n > to && n < max && (claim === below || claim === below + to)
              ? []
              : [
                  `${item.id}: "${item.prompt.big}" does not fit to ${String(to)} / max ${String(max)}`,
                ]),
            ...(item.answer === (claim === nearest)
              ? []
              : [
                  `${item.id}: nearest ${String(to)} of ${String(n)} is ${String(nearest)}, "${item.prompt.big}" answered ${String(item.answer)}`,
                ]),
            ...(!item.answer && claim === below && nearest !== below
              ? item.reason === bug
                ? []
                : [`${item.id}: reason ${item.reason ?? '(none)'} should be ${bug}`]
              : item.reason === undefined
                ? []
                : [`${item.id}: a reason although the false claim is not rounding down`]),
          ];
        },
      );
      expect(problems).toEqual([]);
      const truths = items.filter(({ item }) => item.answer).length;
      expect(truths).toBeGreaterThan(400);
      expect(truths).toBeLessThan(600);
      expect(items.some(({ item }) => item.reason === 'bugs.truncate')).toBe(true);
      expect(items.some(({ item }) => item.reason === 'bugs.five-down')).toBe(true);
    });
  });

  it('is the curriculum example: 47 → 50 is true; 47 → 40 is false and is the truncate bug', () => {
    const item = (id: string, claim: number, answer: boolean, reason?: string): TrueFalseItem => ({
      id,
      type: 'true-false',
      text: `gen.${id}.text`,
      prompt: { big: `47 → ${String(claim)}` },
      answer,
      ...(reason === undefined ? {} : { reason }),
    });
    expect(checkIssues('round-tf', { to: 10, max: 100 }, item('dr-1', 50, true))).toEqual([]);
    expect(
      checkIssues('round-tf', { to: 10, max: 100 }, item('dr-2', 40, false, 'bugs.truncate')),
    ).toEqual([]);
  });

  it('names a max that leaves no number to round', () => {
    expect(draw('round-tf', { to: 100, max: 100 }, 0).issues.join('\n')).toMatch(
      /max 100 leaves no number to round/,
    );
    expect(draw('round-tf', { to: 10, max: 500 }, 0).issues).not.toEqual([]);
    expect(draw('round-tf', { to: 1000, max: 10000 }, 0).issues).not.toEqual([]);
  });

  describe('check', () => {
    const params = { to: 10, max: 1000 };
    const bug = sample<TrueFalseItem>('round-tf', params, (item) => item.reason !== undefined);
    const plain = sample<TrueFalseItem>('round-tf', params, (item) => item.reason === undefined);

    it('accepts good items', () => {
      expect(checkIssues('round-tf', params, bug)).toEqual([]);
      expect(checkIssues('round-tf', params, plain)).toEqual([]);
    });

    it('reports a wrong answer, an unreadable or far prompt, a multiple of the unit', () => {
      expect(checkIssues('round-tf', params, { ...plain, answer: !plain.answer }).join()).toMatch(
        /nearest 10/,
      );
      expect(
        checkIssues('round-tf', params, { ...plain, prompt: { big: '47 - 50' } }).join(),
      ).toMatch(/cannot read the prompt/);
      expect(
        checkIssues('round-tf', params, { ...plain, prompt: { big: '47 → 60' } }).join(),
      ).toMatch(/not a number below .* neighbouring/);
      expect(
        checkIssues('round-tf', params, { ...plain, prompt: { big: '40 → 50' } }).join(),
      ).toMatch(/not a number below .* neighbouring/);
      expect(
        checkIssues(
          'round-tf',
          { to: 10, max: 100 },
          { ...plain, prompt: { big: '147 → 150' } },
        ).join(),
      ).toMatch(/not a number below .* neighbouring/);
    });

    it('reports a missing, a wrong and an invented reason', () => {
      expect(checkIssues('round-tf', params, { ...bug, reason: undefined }).join()).toMatch(
        /reason/,
      );
      expect(
        checkIssues('round-tf', params, {
          ...bug,
          reason: bug.reason === 'bugs.truncate' ? 'bugs.five-down' : 'bugs.truncate',
        }).join(),
      ).toMatch(/reason/);
      expect(checkIssues('round-tf', params, { ...plain, reason: 'bugs.truncate' }).join()).toMatch(
        /reason/,
      );
    });
  });
});
