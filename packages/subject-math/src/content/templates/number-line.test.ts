// nl-place, nl-estimate, nl-half over 1 000 seeds per line / unit of curriculum §2: each item is solved again here from its English
// sentence and the kind's own tick rules (`kinds/number-line/ticks.ts`), and every `check` fails on a hand-broken item.
import { describe, expect, it } from 'vitest';
import { isAccepted, isTick, tickValues } from '../../kinds/number-line/ticks.ts';
import type { NumberEntryItem, NumberLineItem } from './items.ts';
import { checkIssues, draw, overSeeds, sample } from './testing.ts';

type Labels = 'ends' | 'all' | readonly number[];
interface Params {
  readonly from: number;
  readonly to: number;
  readonly step: number;
  readonly labels: Labels;
}

/** The lines of curriculum §2 (guided and scored: 0-1 000 by 100, 0-100 by 10; the Number Train: by 100, 50, 10; the easier variant: every tick labelled)
 * plus a line that starts above 0 and a listed-labels line. */
const LINES: readonly Params[] = [
  { from: 0, to: 1000, step: 100, labels: 'ends' },
  { from: 0, to: 500, step: 50, labels: 'ends' },
  { from: 0, to: 100, step: 10, labels: 'ends' },
  { from: 0, to: 1000, step: 100, labels: 'all' },
  { from: 0, to: 1000, step: 100, labels: [0, 500, 1000] },
  { from: 100, to: 600, step: 50, labels: 'all' },
];

describe('nl-place', () => {
  describe.each(LINES)('line $from-$to by $step, labels $labels', (line) => {
    it('puts a tick between the ends, exactly, the prompt and sentence agree, and one tick short is the ticks-not-gaps reason', () => {
      const ticks = tickValues(line);
      const { problems, items } = overSeeds<NumberLineItem>('nl-place', line, ({ item, text }) => {
        const found = /^Put (\d+) on the number line\.$/.exec(text);
        const n = Number(found?.[1]);
        const reasons = item.reasons ?? [];
        const behind = n - line.step;
        const exact = { target: item.target, tolerance: 0 };
        return [
          ...(found === null ? [`${item.id}: "${text}" is not the placing sentence`] : []),
          ...(item.target === n && item.prompt.big === String(n)
            ? []
            : [
                `${item.id}: target ${String(item.target)} / big ${item.prompt.big} is not ${String(n)}`,
              ]),
          ...(item.from === line.from &&
          item.to === line.to &&
          item.step === line.step &&
          JSON.stringify(item.labels) === JSON.stringify(line.labels)
            ? []
            : [`${item.id}: another line`]),
          ...(isTick(line, n) && n > line.from && n < line.to
            ? []
            : [`${item.id}: ${String(n)} is not an inner tick`]),
          ...(item.estimate === undefined ? [] : [`${item.id}: estimate set`]),
          ...(isAccepted(exact, n) &&
          !isAccepted(exact, n + line.step) &&
          !isAccepted(exact, n - line.step)
            ? []
            : [`${item.id}: exact tolerance`]),
          ...(behind > line.from
            ? JSON.stringify(reasons) ===
                JSON.stringify([{ value: behind, text: 'bugs.ticks-not-gaps' }]) &&
              ticks.includes(behind) &&
              !isAccepted(exact, behind)
              ? []
              : [`${item.id}: reasons ${JSON.stringify(reasons)}`]
            : reasons.length === 0
              ? []
              : [`${item.id}: a reason at the left end`]),
        ];
      });
      expect(problems).toEqual([]);
      expect(items).toHaveLength(1000);
      // Every inner tick is asked for.
      expect(new Set(items.map(({ item }) => item.target))).toEqual(new Set(ticks.slice(1, -1)));
    });
  });

  it('asks the fixed `values` in order (a guided try) and says so when one is missing or not an inner tick', () => {
    const line = { from: 0, to: 1000, step: 100, labels: 'ends' };
    const { drawn, issues } = draw<NumberLineItem>(
      'nl-place',
      { ...line, values: [300, 700] },
      0,
      2,
    );
    expect(issues).toEqual([]);
    expect(drawn.map(({ item }) => item.target)).toEqual([300, 700]);
    expect(drawn.map(({ text }) => text)).toEqual([
      'Put 300 on the number line.',
      'Put 700 on the number line.',
    ]);
    expect(drawn.map(({ item }) => item.reasons)).toEqual([
      [{ value: 200, text: 'bugs.ticks-not-gaps' }],
      [{ value: 600, text: 'bugs.ticks-not-gaps' }],
    ]);
    expect(draw('nl-place', { ...line, values: [300] }, 0, 2).issues.join('\n')).toMatch(
      /values has 1 entries, item 2 has none/,
    );
    for (const bad of [0, 1000, 350, 1200]) {
      expect(
        draw('nl-place', { ...line, values: [bad] }, 0).issues.join('\n'),
        String(bad),
      ).toMatch(/values.*is not a tick between the ends/);
    }
  });

  it('has no reason for the first inner tick (one tick short is the left end)', () => {
    const { drawn } = draw<NumberLineItem>(
      'nl-place',
      { from: 0, to: 1000, step: 100, labels: 'ends', values: [100, 200] },
      0,
      2,
    );
    expect(drawn.map(({ item }) => item.reasons)).toEqual([
      undefined,
      [{ value: 100, text: 'bugs.ticks-not-gaps' }],
    ]);
  });

  it('names a bad line: ends the wrong way round, a step that does not divide, too many or too few gaps, a label that is no tick', () => {
    const bad = (line: object): string => draw('nl-place', line, 0).issues.join('\n');
    expect(bad({ from: 100, to: 100, step: 10, labels: 'ends' })).toMatch(
      /to 100 is not right of from 100/,
    );
    expect(bad({ from: 0, to: 105, step: 10, labels: 'ends' })).toMatch(
      /not a whole number of 2-10 gaps/,
    );
    expect(bad({ from: 0, to: 1100, step: 100, labels: 'ends' })).toMatch(
      /not a whole number of 2-10 gaps/,
    );
    expect(bad({ from: 0, to: 100, step: 100, labels: 'ends' })).toMatch(
      /not a whole number of 2-10 gaps/,
    );
    expect(bad({ from: 0, to: 1000, step: 100, labels: [0, 250] })).toMatch(
      /labels.*label 250 is not a tick/,
    );
    expect(bad({ from: 0, to: 1000, step: 100, labels: 'sometimes' })).not.toBe('');
    expect(bad({ from: 0, to: 1000, step: 100 })).not.toBe('');
  });

  describe('check', () => {
    const line = { from: 0, to: 1000, step: 100, labels: 'ends' };
    const good = sample<NumberLineItem>('nl-place', line, (item) => item.reasons !== undefined);

    it('accepts a good item', () => {
      expect(checkIssues('nl-place', line, good)).toEqual([]);
    });

    it('reports a prompt that is not the target, an unreadable prompt, another line', () => {
      expect(checkIssues('nl-place', line, { ...good, target: good.target + 100 }).join()).toMatch(
        /prompt shows/,
      );
      expect(checkIssues('nl-place', line, { ...good, prompt: { big: 'x' } }).join()).toMatch(
        /cannot read the prompt/,
      );
      expect(checkIssues('nl-place', line, { ...good, step: 50 }).join()).toMatch(
        /not the params’ line/,
      );
      expect(checkIssues('nl-place', line, { ...good, labels: 'all' }).join()).toMatch(
        /not the params’ line/,
      );
    });

    it('reports a target on an end or between ticks, an estimate flag, a target outside `values`', () => {
      expect(
        checkIssues('nl-place', line, {
          ...good,
          target: 1000,
          prompt: { big: '1000' },
          reasons: [{ value: 900, text: 'bugs.ticks-not-gaps' }],
        }).join(),
      ).toMatch(/not a tick between the ends/);
      expect(
        checkIssues('nl-place', line, {
          ...good,
          target: 350,
          prompt: { big: '350' },
          reasons: [{ value: 250, text: 'bugs.ticks-not-gaps' }],
        }).join(),
      ).toMatch(/not a tick between the ends/);
      expect(checkIssues('nl-place', line, { ...good, estimate: true }).join()).toMatch(
        /exact item/,
      );
      expect(checkIssues('nl-place', { ...line, values: [900] }, good).join()).toMatch(
        /not one of the values/,
      );
    });

    it('reports a missing, a wrong, an unexpected reason', () => {
      expect(checkIssues('nl-place', line, { ...good, reasons: undefined }).join()).toMatch(
        /reasons/,
      );
      expect(
        checkIssues('nl-place', line, {
          ...good,
          reasons: [{ value: good.target + 100, text: 'bugs.ticks-not-gaps' }],
        }).join(),
      ).toMatch(/reasons/);
      expect(
        checkIssues('nl-place', line, {
          ...good,
          reasons: [{ value: good.target - 100, text: 'bugs.swap' }],
        }).join(),
      ).toMatch(/reasons/);
      const first = {
        ...good,
        target: 100,
        prompt: { big: '100' },
        reasons: [{ value: 0, text: 'bugs.ticks-not-gaps' }],
      };
      expect(checkIssues('nl-place', line, first).join()).toMatch(/reasons/);
    });
  });
});

describe('nl-estimate', () => {
  describe.each(LINES)('line $from-$to by $step, labels $labels', (line) => {
    it('puts the number between ticks, at least a quarter step from each, as an estimate; no reason', () => {
      const { problems, items } = overSeeds<NumberLineItem>(
        'nl-estimate',
        line,
        ({ item, text }) => {
          const found = /^About where is (\d+)\? Put it on the line\.$/.exec(text);
          const n = Number(found?.[1]);
          const estimate = { target: item.target, tolerance: item.step / 2 };
          const below = Math.max(...tickValues(line).filter((tick) => tick < n));
          const above = Math.min(...tickValues(line).filter((tick) => tick > n));
          return [
            ...(found === null ? [`${item.id}: "${text}" is not the estimating sentence`] : []),
            ...(item.target === n && item.prompt.big === String(n)
              ? []
              : [
                  `${item.id}: target ${String(item.target)} / big ${item.prompt.big} is not ${String(n)}`,
                ]),
            ...(item.from === line.from &&
            item.to === line.to &&
            item.step === line.step &&
            JSON.stringify(item.labels) === JSON.stringify(line.labels)
              ? []
              : [`${item.id}: another line`]),
            ...(item.estimate === true ? [] : [`${item.id}: not an estimate`]),
            ...(!isTick(line, n) && n > line.from && n < line.to
              ? []
              : [`${item.id}: ${String(n)} is on a tick or off the line`]),
            ...(n - below >= line.step / 4 && above - n >= line.step / 4
              ? []
              : [`${item.id}: ${String(n)} is too near a tick`]),
            ...(isAccepted(estimate, n) &&
            isAccepted(estimate, n + line.step / 2) &&
            !isAccepted(estimate, n + line.step / 2 + 1)
              ? []
              : [`${item.id}: tolerance`]),
            ...(item.reasons === undefined ? [] : [`${item.id}: reasons`]),
          ];
        },
      );
      expect(problems).toEqual([]);
      expect(items).toHaveLength(1000);
      // Every gap is used.
      const gaps = new Set(
        items.map(({ item }) => Math.floor((item.target - line.from) / line.step)),
      );
      expect(gaps.size).toBe((line.to - line.from) / line.step);
    });
  });

  it('names a step too small to have a number a quarter step from both ticks, and a bad line', () => {
    expect(
      draw('nl-estimate', { from: 0, to: 10, step: 1, labels: 'ends' }, 0).issues.join('\n'),
    ).toMatch(/step 1 leaves no whole number/);
    expect(
      draw('nl-estimate', { from: 0, to: 1000, step: 100, labels: [0, 55] }, 0).issues.join('\n'),
    ).toMatch(/label 55 is not a tick/);
    expect(
      draw('nl-estimate', { from: 0, to: 1000, step: 100, labels: 'ends', values: [300] }, 0)
        .issues,
    ).not.toEqual([]);
  });

  it('works for small steps too: step 2 and 3', () => {
    for (const step of [2, 3, 4]) {
      const { problems } = overSeeds<NumberLineItem>(
        'nl-estimate',
        { from: 0, to: step * 5, step, labels: 'ends' },
        () => [],
      );
      expect(problems, `step ${String(step)}`).toEqual([]);
    }
  });

  describe('check', () => {
    const line = { from: 0, to: 1000, step: 100, labels: 'ends' };
    const good = sample<NumberLineItem>('nl-estimate', line);

    it('accepts a good item', () => {
      expect(checkIssues('nl-estimate', line, good)).toEqual([]);
    });

    it('reports a target on a tick or too near one, a missing estimate flag, an unreadable prompt, another line, a reason', () => {
      const at = (target: number): NumberLineItem => ({
        ...good,
        target,
        prompt: { big: String(target) },
      });
      expect(checkIssues('nl-estimate', line, at(300)).join()).toMatch(/a quarter step/);
      expect(checkIssues('nl-estimate', line, at(310)).join()).toMatch(/a quarter step/);
      expect(checkIssues('nl-estimate', line, at(390)).join()).toMatch(/a quarter step/);
      expect(checkIssues('nl-estimate', line, at(1050)).join()).toMatch(/a quarter step/);
      expect(checkIssues('nl-estimate', line, { ...good, estimate: undefined }).join()).toMatch(
        /estimate: true/,
      );
      expect(checkIssues('nl-estimate', line, { ...good, target: good.target + 1 }).join()).toMatch(
        /prompt shows/,
      );
      expect(checkIssues('nl-estimate', line, { ...good, prompt: { big: 'x' } }).join()).toMatch(
        /cannot read the prompt/,
      );
      expect(checkIssues('nl-estimate', line, { ...good, to: 500 }).join()).toMatch(
        /not the params’ line/,
      );
      expect(
        checkIssues('nl-estimate', line, {
          ...good,
          reasons: [{ value: 5, text: 'bugs.ticks-not-gaps' }],
        }).join(),
      ).toMatch(/no known wrong answer/);
    });
  });
});

describe('nl-half', () => {
  describe.each([10, 100, 1000] as const)('unit %i', (unit) => {
    it('asks for the number halfway between a and a unit more, a = 1-8 units; the answer is exact', () => {
      const { problems, items } = overSeeds<NumberEntryItem>(
        'nl-half',
        { unit },
        ({ item, text }) => {
          const found = /^What number is halfway between (\d+) and (\d+)\?$/.exec(text);
          const [a, b] = [Number(found?.[1]), Number(found?.[2])];
          return [
            ...(found === null ? [`${item.id}: "${text}" is not the halfway sentence`] : []),
            ...(item.prompt.big === `${String(a)} … ${String(b)}`
              ? []
              : [`${item.id}: big "${item.prompt.big}"`]),
            ...(b - a === unit && a % unit === 0 && a >= unit && a <= 8 * unit
              ? []
              : [`${item.id}: ${String(a)} … ${String(b)} for unit ${String(unit)}`]),
            ...(item.answer === a + unit / 2 &&
            Number.isInteger(item.answer) &&
            item.answer > a &&
            item.answer < b
              ? []
              : [`${item.id}: answer ${String(item.answer)}`]),
            ...(item.reasons === undefined ? [] : [`${item.id}: reasons`]),
            ...(item.prompt.big.length <= 16 ? [] : [`${item.id}: wide`]),
          ];
        },
      );
      expect(problems).toEqual([]);
      expect(new Set(items.map(({ item }) => item.answer)).size).toBe(8);
    });
  });

  it('is the curriculum example: halfway between 300 and 400 is 350', () => {
    const example: NumberEntryItem = {
      id: 'dr-1',
      type: 'number-entry',
      text: 'gen.dr-1.text',
      prompt: { big: '300 … 400' },
      answer: 350,
    };
    expect(checkIssues('nl-half', { unit: 100 }, example)).toEqual([]);
  });

  it('draws 3 distinct items per entry (8 are possible)', () => {
    for (let seed = 0; seed < 50; seed += 1) {
      expect(draw('nl-half', { unit: 1000 }, seed, 3).issues, String(seed)).toEqual([]);
    }
    expect(draw('nl-half', { unit: 1000 }, 0, 9).issues.join('\n')).toMatch(
      /could not generate 9 distinct items/,
    );
  });

  describe('check', () => {
    const params = { unit: 100 };
    const good = sample<NumberEntryItem>('nl-half', params);

    it('accepts a good item', () => {
      expect(checkIssues('nl-half', params, good)).toEqual([]);
    });

    it('reports a wrong answer, an unreadable prompt, a gap that is not the unit, a start outside 1-8 units, a reason', () => {
      expect(checkIssues('nl-half', params, { ...good, answer: good.answer + 1 }).join()).toMatch(
        /halfway between/,
      );
      expect(
        checkIssues('nl-half', params, { ...good, prompt: { big: '300 - 400' } }).join(),
      ).toMatch(/cannot read the prompt/);
      expect(
        checkIssues('nl-half', params, { ...good, prompt: { big: '300 … 500' } }).join(),
      ).toMatch(/1-8 units/);
      expect(checkIssues('nl-half', { unit: 10 }, good).join()).toMatch(/1-8 units/);
      expect(
        checkIssues('nl-half', params, {
          ...good,
          prompt: { big: '900 … 1000' },
          answer: 950,
        }).join(),
      ).toMatch(/1-8 units/);
      expect(
        checkIssues('nl-half', params, {
          ...good,
          reasons: [{ value: 1, text: 'bugs.swap' }],
        }).join(),
      ).toMatch(/no known wrong answer/);
    });
  });
});
