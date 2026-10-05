// bridge-add and count-up over 1 000 seeds per parameter set of curriculum §2: each item is solved again here from its card by the
// bridge it teaches (up to the next ten, then the rest), the card's number line is read back against the numbers (the start and the
// next ten as dots, the ten after the total as the end, never the answer), and every `check` fails on a hand-broken item.
import { describe, expect, it } from 'vitest';
import type { LineNumberEntryItem, NumberEntryItem } from './items.ts';
import { checkIssues, draw, overSeeds, sample } from './testing.ts';

const MINUS = '−';

const ADD_SETS = [
  { onesSum: [11, 18], max: 100 },
  { onesSum: [11, 12], max: 100 },
  { onesSum: [13, 18], max: 100 },
  { onesSum: [11, 18], max: 20 },
  { onesSum: [18, 18], max: 100 },
] as const;

describe('bridge-add', () => {
  describe.each(ADD_SETS)('ones sum $onesSum, max $max', (params) => {
    it('adds the second number by making a ten first, with the ones adding to the ones sum; one jump and one ten short are the off-by-one and off-by-ten reasons', () => {
      const { problems, items } = overSeeds<LineNumberEntryItem>(
        'bridge-add',
        params,
        ({ item, text }) => {
          const card = /^(\d+) \+ (\d+)$/.exec(item.prompt.big);
          const [a, b] = [Number(card?.[1]), Number(card?.[2])];
          const toTen = 10 - (a % 10);
          const bridged = a + toTen + (b - toTen);
          const reasons = item.reasons ?? [];
          const { line } = item.prompt;
          return [
            // The picture: from the first number to the ten after the total, dots on the start and the next ten, a tick per number.
            ...(line.from === a &&
            line.to === (Math.floor(bridged / 10) + 1) * 10 &&
            line.step === 1 &&
            line.marks.join() === [a, a + toTen].join()
              ? []
              : [`${item.id}: line ${JSON.stringify(line)} for ${item.prompt.big}`]),
            ...(!line.marks.includes(bridged) && line.to !== bridged && line.to > bridged
              ? []
              : [`${item.id}: the line shows the answer ${String(bridged)}`]),
            ...(line.to - line.from >= 2 && line.to - line.from <= 20
              ? []
              : [`${item.id}: ${String(line.to - line.from)} gaps`]),
            ...(text === 'Make a ten first. What is the total?' ? [] : [`${item.id}: "${text}"`]),
            ...(card === null ? [`${item.id}: card "${item.prompt.big}"`] : []),
            ...(b >= 2 && b <= 9 && a % 10 >= 2
              ? []
              : [`${item.id}: ${String(a)} + ${String(b)} has no bridge`]),
            ...((a % 10) + b >= params.onesSum[0] && (a % 10) + b <= params.onesSum[1]
              ? []
              : [
                  `${item.id}: ones ${String(a % 10)} + ${String(b)} outside ${params.onesSum.join('-')}`,
                ]),
            ...(a + b <= params.max
              ? []
              : [`${item.id}: total ${String(a + b)} over ${String(params.max)}`]),
            ...(toTen < b ? [] : [`${item.id}: ${String(b)} does not pass the ten`]),
            ...(item.answer === bridged
              ? []
              : [`${item.id}: bridged ${String(bridged)}, answer ${String(item.answer)}`]),
            ...(JSON.stringify(reasons.map((reason) => [reason.value, reason.text]).sort()) ===
            JSON.stringify(
              [
                [bridged - 1, 'bugs.off-by-one'],
                [bridged - 10, 'bugs.off-by-ten'],
              ].sort(),
            )
              ? []
              : [`${item.id}: reasons ${JSON.stringify(reasons)}`]),
          ];
        },
      );
      expect(problems).toEqual([]);
      const firsts = new Set(items.map(({ item }) => item.prompt.big.split(' ')[0]));
      expect(firsts.size).toBeGreaterThan(
        params.max === 20 ? 3 : params.onesSum[0] === 18 ? 8 : 20,
      );
      if (params.max === 100) expect(items.some(({ item }) => item.answer > 90)).toBe(true);
    });
  });

  it('is the curriculum example: 38 + 7 → 45, 44 is off-by-one, 35 is off-by-ten', () => {
    const item: LineNumberEntryItem = {
      id: 'dr-1',
      type: 'number-entry',
      text: 'gen.dr-1.text',
      prompt: { big: '38 + 7', line: { from: 38, to: 50, step: 1, marks: [38, 40] } },
      answer: 45,
      reasons: [
        { value: 44, text: 'bugs.off-by-one' },
        { value: 35, text: 'bugs.off-by-ten' },
      ],
    };
    expect(checkIssues('bridge-add', { onesSum: [11, 18], max: 100 }, item)).toEqual([]);
    expect(checkIssues('bridge-add', { onesSum: [11, 12], max: 100 }, item).join()).toMatch(
      /does not fit/,
    );
  });

  it('draws 3 distinct items per entry in every set', () => {
    for (const params of ADD_SETS) {
      for (let seed = 0; seed < 50; seed += 1) {
        expect(
          draw('bridge-add', params, seed, 3).issues,
          `${JSON.stringify(params)} @${String(seed)}`,
        ).toEqual([]);
      }
    }
  });

  it('names its params problems', () => {
    expect(draw('bridge-add', { onesSum: [10, 12], max: 100 }, 0).issues).not.toEqual([]);
    expect(draw('bridge-add', { onesSum: [11, 19], max: 100 }, 0).issues).not.toEqual([]);
    expect(draw('bridge-add', { onesSum: [14, 12], max: 100 }, 0).issues.join()).toMatch(/onesSum/);
    expect(draw('bridge-add', { onesSum: [11], max: 100 }, 0).issues).not.toEqual([]);
    expect(draw('bridge-add', { onesSum: [11, 12], max: 101 }, 0).issues).not.toEqual([]);
    expect(draw('bridge-add', { onesSum: [11, 12] }, 0).issues).not.toEqual([]);
  });

  describe('check', () => {
    const params = { onesSum: [11, 18], max: 100 };
    const good = sample<LineNumberEntryItem>('bridge-add', params);
    /** A hand-made item for `a + b`: its line from `a` to the ten after the total, dots on `a` and the next ten. */
    const at = (big: string, answer: number): LineNumberEntryItem => ({
      ...good,
      prompt: {
        big,
        line: {
          from: Number(big.split(' ')[0]),
          to: (Math.floor(answer / 10) + 1) * 10,
          step: 1,
          marks: [Number(big.split(' ')[0]), (Math.floor(Number(big.split(' ')[0]) / 10) + 1) * 10],
        },
      },
      answer,
      reasons: [
        { value: answer - 1, text: 'bugs.off-by-one' },
        { value: answer - 10, text: 'bugs.off-by-ten' },
      ],
    });

    it('accepts a good item', () => {
      expect(checkIssues('bridge-add', params, good)).toEqual([]);
      expect(checkIssues('bridge-add', params, at('8 + 5', 13))).toEqual([]);
    });

    it('reports a wrong answer and an unreadable card', () => {
      expect(
        checkIssues('bridge-add', params, { ...good, answer: good.answer - 1 }).join(),
      ).toMatch(/is [0-9]+, not/);
      for (const big of ['38', `38 ${MINUS} 7`, '38 + 7 + 1', 'a + 7']) {
        expect(
          checkIssues('bridge-add', params, { ...good, prompt: { ...good.prompt, big } }).join(),
          big,
        ).toMatch(/cannot read the prompt/);
      }
    });

    it('reports a number line that does not match the card: no line, another end, a dot on the answer, a wrong or missing dot', () => {
      const line = good.prompt.line;
      const withLine = (next: Partial<typeof line> | undefined): string =>
        checkIssues('bridge-add', params, {
          ...good,
          prompt: {
            big: good.prompt.big,
            ...(next === undefined ? {} : { line: { ...line, ...next } }),
          },
        }).join();
      expect(withLine({})).toBe('');
      expect(withLine(undefined)).toMatch(/has no number line/);
      expect(withLine({ from: line.from - 1 })).toMatch(/number line/);
      expect(withLine({ to: line.to + 10 })).toMatch(/number line/);
      expect(withLine({ step: 2 })).toMatch(/number line/);
      expect(withLine({ marks: [line.from] })).toMatch(/number line/);
      expect(withLine({ marks: [...line.marks, line.from + 1] })).toMatch(/number line/);
      // A dot on the answer, and an end on the answer, give the answer away.
      expect(withLine({ marks: [...line.marks, good.answer] })).toMatch(/shows the answer/);
      expect(withLine({ to: good.answer })).toMatch(/shows the answer/);
    });

    it('reports a sum that makes no bridge or breaks the params', () => {
      expect(checkIssues('bridge-add', params, at('34 + 5', 39)).join()).toMatch(/does not fit/);
      expect(checkIssues('bridge-add', params, at('30 + 8', 38)).join()).toMatch(/does not fit/);
      expect(checkIssues('bridge-add', params, at('18 + 12', 30)).join()).toMatch(/does not fit/);
      expect(checkIssues('bridge-add', params, at('19 + 1', 20)).join()).toMatch(/does not fit/);
      expect(checkIssues('bridge-add', params, at('98 + 9', 107)).join()).toMatch(/does not fit/);
      expect(
        checkIssues('bridge-add', { onesSum: [11, 12], max: 100 }, at('38 + 7', 45)).join(),
      ).toMatch(/does not fit/);
      expect(
        checkIssues('bridge-add', { onesSum: [11, 18], max: 20 }, at('38 + 7', 45)).join(),
      ).toMatch(/does not fit/);
    });

    it('reports a missing, a wrong and an extra reason', () => {
      expect(checkIssues('bridge-add', params, { ...good, reasons: undefined }).join()).toMatch(
        /reasons/,
      );
      expect(
        checkIssues('bridge-add', params, {
          ...good,
          reasons: [{ value: good.answer - 1, text: 'bugs.off-by-one' }],
        }).join(),
      ).toMatch(/reasons/);
      expect(
        checkIssues('bridge-add', params, {
          ...good,
          reasons: [
            { value: good.answer - 1, text: 'bugs.off-by-ten' },
            { value: good.answer - 10, text: 'bugs.off-by-one' },
          ],
        }).join(),
      ).toMatch(/reasons/);
      expect(
        checkIssues('bridge-add', params, {
          ...good,
          reasons: [...(good.reasons ?? []), { value: good.answer + 10, text: 'bugs.off-by-ten' }],
        }).join(),
      ).toMatch(/reasons/);
    });
  });
});

const COUNT_SETS = [{ maxDiff: 12 }, { maxDiff: 8 }, { maxDiff: 4 }] as const;

describe('count-up', () => {
  describe.each(COUNT_SETS)('max difference $maxDiff', ({ maxDiff }) => {
    it('asks the difference of two numbers either side of a ten, counted up to the ten and on; adding the ten again is the off-by-ten reason', () => {
      const { problems, items } = overSeeds<NumberEntryItem>(
        'count-up',
        { maxDiff },
        ({ item, text }) => {
          const card = new RegExp(`^(\\d+) ${MINUS} (\\d+)$`).exec(item.prompt.big);
          const [large, small] = [Number(card?.[1]), Number(card?.[2])];
          const ten = (Math.floor(small / 10) + 1) * 10;
          const counted = ten - small + (large - ten);
          const reasons = item.reasons ?? [];
          return [
            ...(text === 'Count up from the smaller number. How many?'
              ? []
              : [`${item.id}: "${text}"`]),
            ...(card === null ? [`${item.id}: card "${item.prompt.big}"`] : []),
            ...(small > 10 &&
            large < 100 &&
            small % 10 !== 0 &&
            large % 10 !== 0 &&
            large > ten &&
            small < ten
              ? []
              : [
                  `${item.id}: ${String(large)} ${MINUS} ${String(small)} does not go across one ten`,
                ]),
            ...(large - small >= 2 && large - small <= maxDiff
              ? []
              : [`${item.id}: difference ${String(large - small)} over ${String(maxDiff)}`]),
            ...(item.answer === counted
              ? []
              : [`${item.id}: counted ${String(counted)}, answer ${String(item.answer)}`]),
            ...(reasons.length === 1 &&
            reasons[0]?.value === counted + 10 &&
            reasons[0].text === 'bugs.off-by-ten'
              ? []
              : [`${item.id}: reasons ${JSON.stringify(reasons)}`]),
          ];
        },
      );
      expect(problems).toEqual([]);
      expect(new Set(items.map(({ item }) => item.answer)).size).toBeGreaterThanOrEqual(
        Math.min(maxDiff, 10) - 2,
      );
      expect(Math.max(...items.map(({ item }) => item.answer))).toBe(maxDiff);
    });
  });

  it(`is the curriculum example: 82 ${MINUS} 76 → 6, and 16 is off-by-ten`, () => {
    const item: NumberEntryItem = {
      id: 'dr-1',
      type: 'number-entry',
      text: 'gen.dr-1.text',
      prompt: { big: `82 ${MINUS} 76` },
      answer: 6,
      reasons: [{ value: 16, text: 'bugs.off-by-ten' }],
    };
    expect(checkIssues('count-up', { maxDiff: 12 }, item)).toEqual([]);
  });

  it('draws 3 distinct items per entry in every set', () => {
    for (const params of COUNT_SETS) {
      for (let seed = 0; seed < 50; seed += 1) {
        expect(
          draw('count-up', params, seed, 3).issues,
          `${JSON.stringify(params)} @${String(seed)}`,
        ).toEqual([]);
      }
    }
  });

  it('names its params problems', () => {
    expect(draw('count-up', { maxDiff: 3 }, 0).issues).not.toEqual([]);
    expect(draw('count-up', { maxDiff: 13 }, 0).issues).not.toEqual([]);
    expect(draw('count-up', {}, 0).issues).not.toEqual([]);
  });

  describe('check', () => {
    const params = { maxDiff: 12 };
    const good = sample<NumberEntryItem>('count-up', params);
    const at = (large: number, small: number): NumberEntryItem => ({
      ...good,
      prompt: { big: `${String(large)} ${MINUS} ${String(small)}` },
      answer: large - small,
      reasons: [{ value: large - small + 10, text: 'bugs.off-by-ten' }],
    });

    it('accepts a good item', () => {
      expect(checkIssues('count-up', params, good)).toEqual([]);
      expect(checkIssues('count-up', params, at(82, 76))).toEqual([]);
    });

    it('reports a wrong answer and an unreadable card', () => {
      expect(checkIssues('count-up', params, { ...good, answer: good.answer + 1 }).join()).toMatch(
        /is [0-9]+, not/,
      );
      for (const big of ['82 + 76', '82', '82 - 76', 'x − 76']) {
        expect(checkIssues('count-up', params, { ...good, prompt: { big } }).join(), big).toMatch(
          /cannot read the prompt/,
        );
      }
    });

    it('reports a difference that does not go across one ten or breaks the params', () => {
      for (const [large, small] of [
        [78, 76],
        [80, 76],
        [96, 76],
        [100, 96],
        [76, 82],
        [95, 82],
        [88, 80],
        [14, 9],
      ] as const) {
        expect(
          checkIssues('count-up', params, at(large, small)).join(),
          `${String(large)}-${String(small)}`,
        ).toMatch(/not a difference/);
      }
      expect(checkIssues('count-up', { maxDiff: 4 }, at(85, 76)).join()).toMatch(
        /not a difference/,
      );
    });

    it('reports a missing and a wrong reason', () => {
      expect(checkIssues('count-up', params, { ...good, reasons: undefined }).join()).toMatch(
        /reasons/,
      );
      expect(
        checkIssues('count-up', params, {
          ...good,
          reasons: [{ value: good.answer + 1, text: 'bugs.off-by-ten' }],
        }).join(),
      ).toMatch(/reasons/);
      expect(
        checkIssues('count-up', params, {
          ...good,
          reasons: [{ value: good.answer + 10, text: 'bugs.off-by-one' }],
        }).join(),
      ).toMatch(/reasons/);
    });
  });
});
