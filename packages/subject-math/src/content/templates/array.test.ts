// `array-build` and `array-commute` over 1 000 seeds per parameter combination: each item is solved again here from its English
// sentence and card, and every `check` fails on a hand-broken item.
import { describe, expect, it } from 'vitest';
import type { ArrayItem, TrueFalseItem } from './items.ts';
import { checkIssues, draw, overSeeds, sample } from './testing.ts';

describe('array-build', () => {
  const combos = [
    { maxRows: 3, maxCols: 4, fixedRows: true },
    { maxRows: 4, maxCols: 4, fixedRows: true },
    { maxRows: 6, maxCols: 6, fixedRows: true },
    { maxRows: 3, maxCols: 3, fixedRows: false },
    { maxRows: 6, maxCols: 6, fixedRows: false },
  ] as const;

  describe.each(combos)('maxRows $maxRows, maxCols $maxCols, fixedRows $fixedRows', (params) => {
    it('asks for r rows of c dots (or an array for r times c), shows "r × c", and speaks neighbour for one dot more or fewer in a row', () => {
      const { problems, items } = overSeeds<ArrayItem>('array-build', params, ({ item, text }) => {
        const found = params.fixedRows
          ? /^Make (\d+) rows of (\d+) dots\. Tap the bottom-right dot\.$/.exec(text)
          : /^Make an array for (\d+) times (\d+)\. Tap the bottom-right dot\.$/.exec(text);
        const [rows, cols] = [Number(found?.[1]), Number(found?.[2])];
        const reasons = (item.reasons ?? []).map(
          (reason) => `${String(reason.rows)}x${String(reason.cols)} ${reason.text}`,
        );
        const expected = [cols - 1, cols + 1]
          .filter((count) => count >= 1 && count <= 6)
          .map((count) => `${String(rows)}x${String(count)} bugs.neighbour`);
        return [
          ...(found === null ? [`${item.id}: "${text}" is not the array sentence`] : []),
          ...(rows >= 2 && rows <= params.maxRows && cols >= 2 && cols <= params.maxCols
            ? []
            : [`${item.id}: ${String(rows)} × ${String(cols)} does not fit the params`]),
          ...(item.rows === rows && item.cols === cols
            ? []
            : [
                `${item.id}: the array is ${String(item.rows)} × ${String(item.cols)}, the text says ${String(rows)} × ${String(cols)}`,
              ]),
          ...(item.prompt.big === `${String(rows)} × ${String(cols)}`
            ? []
            : [`${item.id}: card ${item.prompt.big}`]),
          ...(params.fixedRows
            ? 'fixed-rows' in item
              ? [`${item.id}: fixed-rows written although it is the default`]
              : []
            : item['fixed-rows'] === false
              ? []
              : [`${item.id}: fixed-rows should be false`]),
          ...(JSON.stringify(reasons) === JSON.stringify(expected)
            ? []
            : [
                `${item.id}: reasons ${JSON.stringify(reasons)} should be ${JSON.stringify(expected)}`,
              ]),
        ];
      });
      expect(problems).toEqual([]);
      // Every shape of the range turns up.
      const shapes = new Set(items.map(({ item }) => `${String(item.rows)}x${String(item.cols)}`));
      expect(shapes.size).toBe((params.maxRows - 1) * (params.maxCols - 1));
      // The widest array has no "one more" shape: only one reason on the 6-column grid edge.
      if (params.maxCols === 6) {
        const edge = items.filter(({ item }) => item.cols === 6);
        expect(edge.length).toBeGreaterThan(0);
        expect(edge.every(({ item }) => item.reasons?.length === 1)).toBe(true);
      }
    });
  });

  it('is the curriculum example: 3 rows of 4; 3 × 3 and 3 × 5 are one dot off in a row', () => {
    const item: ArrayItem = {
      id: 'dr-1',
      type: 'array',
      text: 'gen.dr-1.text',
      prompt: { big: '3 × 4' },
      rows: 3,
      cols: 4,
      reasons: [
        { rows: 3, cols: 3, text: 'bugs.neighbour' },
        { rows: 3, cols: 5, text: 'bugs.neighbour' },
      ],
    };
    expect(checkIssues('array-build', { maxRows: 3, maxCols: 4 }, item)).toEqual([]);
  });

  it('draws 3 distinct items per entry in every combination (the kind verifies each), and names its params problems', () => {
    for (const params of combos) {
      for (let seed = 0; seed < 50; seed += 1) {
        expect(
          draw('array-build', params, seed, 3).issues,
          `${JSON.stringify(params)} @${String(seed)}`,
        ).toEqual([]);
      }
    }
    expect(draw('array-build', { maxRows: 2, maxCols: 4 }, 0).issues).not.toEqual([]);
    expect(draw('array-build', { maxRows: 7, maxCols: 4 }, 0).issues).not.toEqual([]);
    expect(draw('array-build', { maxRows: 3 }, 0).issues).not.toEqual([]);
    expect(draw('array-build', { maxRows: 3, maxCols: 3, fixedRows: 'yes' }, 0).issues).not.toEqual(
      [],
    );
  });

  describe('check', () => {
    const params = { maxRows: 4, maxCols: 4 };
    const good = sample<ArrayItem>(
      'array-build',
      params,
      (item) => item.cols === 4 && item.rows !== 4,
    );
    const mid = sample<ArrayItem>('array-build', params, (item) => item.cols === 3);

    it('accepts good items', () => {
      expect(checkIssues('array-build', params, good)).toEqual([]);
      expect(checkIssues('array-build', params, mid)).toEqual([]);
      expect(
        checkIssues(
          'array-build',
          { ...params, fixedRows: false },
          { ...mid, 'fixed-rows': false },
        ),
      ).toEqual([]);
    });

    it('reports an unreadable card, numbers outside the params, a card that is not the array', () => {
      expect(
        checkIssues('array-build', params, { ...good, prompt: { big: '3 x 4' } }).join(),
      ).toMatch(/cannot read the prompt/);
      expect(
        checkIssues('array-build', params, {
          ...good,
          prompt: { big: '5 × 3' },
          rows: 5,
          cols: 3,
        }).join(),
      ).toMatch(/does not fit/);
      expect(
        checkIssues('array-build', params, {
          ...good,
          prompt: { big: '3 × 1' },
          rows: 3,
          cols: 1,
        }).join(),
      ).toMatch(/does not fit/);
      expect(
        checkIssues('array-build', params, { ...good, rows: good.cols, cols: good.rows }).join(),
      ).toMatch(/the card says/);
    });

    it('reports fixed-rows that does not match the params', () => {
      expect(checkIssues('array-build', params, { ...good, 'fixed-rows': false }).join()).toMatch(
        /fixed-rows is false, not true/,
      );
      expect(checkIssues('array-build', { ...params, fixedRows: false }, good).join()).toMatch(
        /fixed-rows is true, not false/,
      );
    });

    it('reports a missing, a wrong and an extra reason', () => {
      expect(checkIssues('array-build', params, { ...good, reasons: undefined }).join()).toMatch(
        /reasons/,
      );
      expect(
        checkIssues('array-build', params, { ...mid, reasons: mid.reasons?.slice(0, 1) }).join(),
      ).toMatch(/reasons/);
      expect(
        checkIssues('array-build', params, {
          ...mid,
          reasons: mid.reasons?.map((reason) => ({ ...reason, text: 'bugs.add-factors' })),
        }).join(),
      ).toMatch(/reasons/);
      expect(
        checkIssues('array-build', params, {
          ...mid,
          reasons: [
            ...(mid.reasons ?? []),
            { rows: mid.rows + 1, cols: mid.cols, text: 'bugs.neighbour' },
          ],
        }).join(),
      ).toMatch(/reasons/);
    });
  });
});

describe('array-commute', () => {
  const combos = [{ max: 3 }, { max: 6 }, { max: 10 }] as const;

  describe.each(combos)('max $max', (params) => {
    it('says a × b = b × a (true) or a × b = a + b (false, add-factors), two different factors from 2 to max, true half the time', () => {
      const { problems, items } = overSeeds<TrueFalseItem>(
        'array-commute',
        params,
        ({ item, text }) => {
          const found = /^(\d+) × (\d+) = (\d+) (×|\+) (\d+)$/.exec(item.prompt.big);
          const [a, b, c, d] = [found?.[1], found?.[2], found?.[3], found?.[5]].map(Number);
          const product = (x: number, y: number): number =>
            Array.from({ length: y }, () => x).reduce((sum, term) => sum + term, 0);
          const sign = found?.[4];
          const right = sign === '+' ? (c ?? 0) + (d ?? 0) : product(c ?? 0, d ?? 0);
          const true_ = product(a ?? 0, b ?? 0) === right;
          return [
            ...(text === 'Is this true?' ? [] : [`${item.id}: text "${text}"`]),
            ...(found !== null &&
            a !== b &&
            [a, b].every((n) => (n ?? 0) >= 2 && (n ?? 0) <= params.max)
              ? []
              : [`${item.id}: "${item.prompt.big}" does not fit max ${String(params.max)}`]),
            ...(sign === '+'
              ? c === a && d === b
                ? []
                : [`${item.id}: sum of other numbers`]
              : c === b && d === a
                ? []
                : [`${item.id}: factors not turned round`]),
            ...(item.answer === true_
              ? []
              : [
                  `${item.id}: "${item.prompt.big}" is ${String(true_)}, answer ${String(item.answer)}`,
                ]),
            ...(item.answer
              ? item.reason === undefined
                ? []
                : [`${item.id}: a reason on a true statement`]
              : sign === '+' && item.reason === 'bugs.add-factors'
                ? []
                : [`${item.id}: reason ${item.reason ?? '(none)'} on "${item.prompt.big}"`]),
          ];
        },
      );
      expect(problems).toEqual([]);
      const truths = items.filter(({ item }) => item.answer).length;
      expect(truths).toBeGreaterThan(400);
      expect(truths).toBeLessThan(600);
      expect(items.some(({ item }) => item.prompt.big === '2 × 3 = 3 × 2')).toBe(true);
      expect(items.some(({ item }) => item.prompt.big === '3 × 2 = 3 + 2')).toBe(true);
    });
  });

  it('is the curriculum example: 3 × 4 = 4 × 3 is true; 3 × 4 = 3 + 4 is false and the add-factors bug', () => {
    const item = (big: string, answer: boolean, reason?: string): TrueFalseItem => ({
      id: 'dr-1',
      type: 'true-false',
      text: 'gen.dr-1.text',
      prompt: { big },
      answer,
      ...(reason === undefined ? {} : { reason }),
    });
    expect(checkIssues('array-commute', { max: 6 }, item('3 × 4 = 4 × 3', true))).toEqual([]);
    expect(
      checkIssues('array-commute', { max: 6 }, item('3 × 4 = 3 + 4', false, 'bugs.add-factors')),
    ).toEqual([]);
  });

  it('names its params problems (max 2 leaves no two different factors)', () => {
    expect(draw('array-commute', { max: 2 }, 0).issues).not.toEqual([]);
    expect(draw('array-commute', { max: 11 }, 0).issues).not.toEqual([]);
    expect(draw('array-commute', {}, 0).issues).not.toEqual([]);
    for (let seed = 0; seed < 50; seed += 1) {
      expect(draw('array-commute', { max: 6 }, seed, 4).issues, `@${String(seed)}`).toEqual([]);
    }
  });

  describe('check', () => {
    const params = { max: 6 };
    const yes = sample<TrueFalseItem>('array-commute', params, (item) => item.answer);
    const no = sample<TrueFalseItem>('array-commute', params, (item) => !item.answer);

    it('accepts good items', () => {
      expect(checkIssues('array-commute', params, yes)).toEqual([]);
      expect(checkIssues('array-commute', params, no)).toEqual([]);
    });

    it('reports a wrong answer, an unreadable statement, factors outside the params or not turned round', () => {
      expect(
        checkIssues('array-commute', params, {
          ...yes,
          answer: false,
          reason: 'bugs.add-factors',
        }).join(),
      ).toMatch(/is true, not false/);
      expect(
        checkIssues('array-commute', params, { ...no, answer: true, reason: undefined }).join(),
      ).toMatch(/is false, not true/);
      expect(
        checkIssues('array-commute', params, { ...yes, prompt: { big: '3 × 4 > 4 × 3' } }).join(),
      ).toMatch(/cannot read the prompt/);
      expect(
        checkIssues('array-commute', params, { ...yes, prompt: { big: '3 × 7 = 7 × 3' } }).join(),
      ).toMatch(/two different factors/);
      expect(
        checkIssues('array-commute', params, { ...yes, prompt: { big: '3 × 3 = 3 × 3' } }).join(),
      ).toMatch(/two different factors/);
      expect(
        checkIssues('array-commute', params, {
          ...yes,
          prompt: { big: '3 × 4 = 4 × 4' },
          answer: false,
          reason: 'bugs.add-factors',
        }).join(),
      ).toMatch(/not the factors turned round or added/);
    });

    it('reports a missing, a wrong and an invented reason', () => {
      expect(checkIssues('array-commute', params, { ...no, reason: undefined }).join()).toMatch(
        /reason/,
      );
      expect(
        checkIssues('array-commute', params, { ...no, reason: 'bugs.neighbour' }).join(),
      ).toMatch(/reason/);
      expect(
        checkIssues('array-commute', params, { ...yes, reason: 'bugs.add-factors' }).join(),
      ).toMatch(/reason/);
    });
  });
});
