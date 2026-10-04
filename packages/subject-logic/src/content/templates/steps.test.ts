// step-next and step-rule over 200 seeds per parameter set: each item is solved again here from the numbers on its card (every
// rule family tries to regenerate them: exactly the generating one does), and every `check` fails on a hand-broken item.
import { describe, expect, it } from 'vitest';
import type { EntryItem, RuleChoiceItem } from './items.ts';
import { fittingFamilies, parseRule, parseTerms, ruleId, ruleTerms, termsBig } from './steps.ts';
import {
  STEP_NEXT_SETS,
  STEP_RULE_SETS,
  generatingFamilies,
  stepNextProblems,
  stepRuleProblems,
} from './solvers.ts';
import { checkIssues, draw, overSeeds, sample } from './testing.ts';

describe('step-next', () => {
  describe.each(STEP_NEXT_SETS)('$family $step easy $easy', (set) => {
    it('shows 4 terms (5 for alternate / grow) of 0-99 that exactly one rule family makes, asks for the next one (0-100), and speaks first-jump only where it is wrong', () => {
      const { problems, items } = overSeeds<EntryItem>('step-next', set, ({ item, text }) =>
        stepNextProblems(set, item, text),
      );
      expect(problems).toEqual([]);
      expect(items.length).toBeGreaterThan(0);
    });
  });

  it('never skip-counts in `up` unless easy: steps 2 and 5 are left out by default and allowed with easy', () => {
    const jumps = (params: object): Set<number> =>
      new Set(
        overSeeds<EntryItem>('step-next', params, () => [], 400).items.map(({ item }) => {
          const terms = parseTerms('big' in item.prompt ? item.prompt.big : '') ?? [];
          return (terms[1] ?? 0) - (terms[0] ?? 0);
        }),
      );
    expect([...jumps({ family: 'up' })].sort()).toEqual([3, 4, 6, 7, 8, 9]);
    expect([...jumps({ family: 'up', easy: true })].sort()).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    expect([...jumps({ family: 'up', step: [2, 2], easy: true })]).toEqual([2]);
  });

  it('shows the terms with single spaces and a "?", at most 16 characters even with five 2-digit terms', () => {
    const { items } = overSeeds<EntryItem>('step-next', { family: 'grow' }, () => [], 400);
    for (const { item } of items) {
      const big = 'big' in item.prompt ? item.prompt.big : '';
      expect(big).toMatch(/^\d+( \d+){4} \?$/);
      expect(big.length).toBeLessThanOrEqual(16);
    }
  });

  it('has a first-jump reason for grow (the first jump added again) and none for alternate (there it is the right answer)', () => {
    const grow = overSeeds<EntryItem>('step-next', { family: 'grow' }, () => []).items;
    expect(grow.every(({ item }) => item.reasons?.length === 1)).toBe(true);
    const alternate = overSeeds<EntryItem>('step-next', { family: 'alternate' }, () => []).items;
    expect(alternate.every(({ item }) => item.reasons === undefined)).toBe(true);
    const [one] = overSeeds<EntryItem>('step-next', { family: 'up' }, () => []).items;
    expect(one?.item.reasons).toBeUndefined();
  });

  it('draws the curriculum example: 3 7 11 15 ? → 19', () => {
    const item: EntryItem = {
      id: 'dr-1',
      type: 'number-entry',
      text: 'gen.dr-1.text',
      prompt: { big: '3 7 11 15 ?' },
      answer: 19,
    };
    expect(checkIssues('step-next', { family: 'up', step: [4, 4] }, item)).toEqual([]);
  });
});

describe('the rule families', () => {
  it('say which rule makes the terms, and what it makes next', () => {
    expect(fittingFamilies([3, 7, 11, 15])).toEqual([{ family: 'step', next: 19 }]);
    expect(fittingFamilies([40, 34, 28, 22])).toEqual([{ family: 'step', next: 16 }]);
    expect(fittingFamilies([2, 4, 8, 16])).toEqual([{ family: 'ratio', next: 32 }]);
    expect(fittingFamilies([16, 20, 21, 25, 26])).toEqual([{ family: 'alternate', next: 30 }]);
    expect(fittingFamilies([1, 3, 6, 10, 15])).toEqual([{ family: 'grow', next: 21 }]);
    expect(fittingFamilies([5, 5, 5, 5])).toEqual([]);
  });

  it('find three readings of 1, 2, 4 (doubling, two steps taking turns, growing steps): such a card is rejected', () => {
    expect(fittingFamilies([1, 2, 4])).toEqual([
      { family: 'ratio', next: 8 },
      { family: 'alternate', next: 5 },
      { family: 'grow', next: 7 },
    ]);
    expect(generatingFamilies([1, 2, 4])).toEqual([
      { name: 'ratio', next: 8 },
      { name: 'alternate', next: 5 },
      { name: 'grow', next: 7 },
    ]);
    const item: EntryItem = {
      id: 'dr-1',
      type: 'number-entry',
      text: 'gen.dr-1.text',
      prompt: { big: '1 2 4 ?' },
      answer: 8,
    };
    expect(checkIssues('step-next', { family: 'double' }, item).join()).toMatch(
      /1 2 4 fits ratio and alternate and grow, it must fit only ratio/,
    );
  });

  it('read the card both ways', () => {
    expect(termsBig([3, 7, 11, 15])).toBe('3 7 11 15 ?');
    expect(parseTerms('3 7 11 15 ?')).toEqual([3, 7, 11, 15]);
    expect(parseTerms('3, 7, 11, 15, ?')).toBeNull();
    expect(parseTerms('3 7 ?')).toBeNull();
    expect(parseTerms('3 7 11 ?')).toEqual([3, 7, 11]);
    expect(parseTerms('3 7 11 15')).toBeNull();
  });
});

const UP = { family: 'up', step: [3, 9] } as const;
const entry = (big: string, answer: number, reasons?: EntryItem['reasons']): EntryItem => ({
  id: 'dr-1',
  type: 'number-entry',
  text: 'gen.dr-1.text',
  prompt: { big },
  answer,
  ...(reasons === undefined ? {} : { reasons }),
});

describe('step-next check', () => {
  const grow = entry('1 3 6 10 15 ?', 21, [{ value: 17, text: 'bugs.first-jump' }]);

  it('accepts a good item of every family, with and without the reason', () => {
    expect(checkIssues('step-next', UP, entry('4 11 18 25 ?', 32))).toEqual([]);
    expect(checkIssues('step-next', { family: 'down' }, entry('40 34 28 22 ?', 16))).toEqual([]);
    expect(checkIssues('step-next', { family: 'double' }, entry('3 6 12 24 ?', 48))).toEqual([]);
    expect(
      checkIssues('step-next', { family: 'alternate' }, entry('16 20 21 25 26 ?', 30)),
    ).toEqual([]);
    expect(checkIssues('step-next', { family: 'grow' }, grow)).toEqual([]);
    const first = sample<EntryItem>('step-next', { family: 'grow' });
    expect(checkIssues('step-next', { family: 'grow' }, first)).toEqual([]);
  });

  it('reports a wrong answer and an answer outside 0-100', () => {
    expect(checkIssues('step-next', UP, entry('4 11 18 25 ?', 31)).join()).toMatch(
      /next term is 32, not 31/,
    );
    expect(checkIssues('step-next', UP, entry('60 69 78 87 ?', 96)).join()).toBe('');
    expect(checkIssues('step-next', UP, entry('72 81 90 99 ?', 108)).join()).toMatch(
      /outside 0-100/,
    );
  });

  it('reports terms that fit two rules, or none, or the wrong one', () => {
    expect(checkIssues('step-next', { family: 'double' }, entry('1 2 4 7 ?', 11)).join()).toMatch(
      /fits grow, it must fit only ratio/,
    );
    expect(checkIssues('step-next', UP, entry('2 5 3 9 ?', 4)).join()).toMatch(/fits no rule/);
    expect(checkIssues('step-next', { family: 'up' }, entry('9 6 3 0 ?', 0)).join()).toMatch(
      /fits step.* goes the wrong way|goes the wrong way/,
    );
    expect(checkIssues('step-next', { family: 'down' }, entry('4 7 10 13 ?', 16)).join()).toMatch(
      /goes the wrong way/,
    );
  });

  it('reports the wrong number of terms, a term over 99, and an unreadable card', () => {
    expect(checkIssues('step-next', UP, entry('4 11 18 ?', 25)).join()).toMatch(
      /3 terms shown, up shows 4/,
    );
    expect(checkIssues('step-next', { family: 'grow' }, entry('1 3 6 10 ?', 15)).join()).toMatch(
      /4 terms shown, grow shows 5/,
    );
    expect(checkIssues('step-next', UP, entry('94 97 100 103 ?', 106)).join()).toMatch(/over 99/);
    expect(checkIssues('step-next', UP, entry('4, 11, 18, 25, ?', 32)).join()).toMatch(
      /cannot read the prompt/,
    );
    expect(
      checkIssues('step-next', UP, {
        ...entry('4 11 18 25 ?', 32),
        prompt: { shapes: ['gap'] },
      }).join(),
    ).toMatch(/cannot read the prompt/);
  });

  it('reports terms outside the parameters: a step out of range, a skipped 2 or 5 unless easy, a start of double over 5', () => {
    expect(
      checkIssues('step-next', { family: 'up', step: [4, 4] }, entry('4 11 18 25 ?', 32)).join(),
    ).toMatch(/do not fit the up parameters/);
    expect(checkIssues('step-next', { family: 'up' }, entry('5 7 9 11 ?', 13)).join()).toMatch(
      /do not fit the up parameters/,
    );
    expect(checkIssues('step-next', { family: 'up', easy: true }, entry('5 7 9 11 ?', 13))).toEqual(
      [],
    );
    expect(
      checkIssues('step-next', { family: 'double' }, entry('6 12 24 48 ?', 96)).join(),
    ).toMatch(/do not fit the double parameters/);
    expect(
      checkIssues('step-next', { family: 'grow' }, entry('1 5 10 16 23 ?', 31)).join(),
    ).toMatch(/do not fit the grow parameters/);
    expect(
      checkIssues('step-next', { family: 'alternate' }, entry('1 8 10 17 19 ?', 26)).join(),
    ).toMatch(/do not fit the alternate parameters/);
  });

  it('reports a missing, extra or misplaced first-jump reason', () => {
    expect(checkIssues('step-next', { family: 'grow' }, entry('1 3 6 10 15 ?', 21)).join()).toMatch(
      /reasons \[\] should be \["17 bugs.first-jump"\]/,
    );
    expect(
      checkIssues(
        'step-next',
        { family: 'grow' },
        entry('1 3 6 10 15 ?', 21, [{ value: 16, text: 'bugs.first-jump' }]),
      ).join(),
    ).toMatch(/reasons/);
    expect(
      checkIssues(
        'step-next',
        { family: 'grow' },
        entry('1 3 6 10 15 ?', 21, [{ value: 21, text: 'bugs.first-jump' }]),
      ).join(),
    ).toMatch(/reasons/);
    // Two steps taking turns: the first jump added again IS the answer, so it is no reason.
    expect(
      checkIssues(
        'step-next',
        { family: 'alternate' },
        entry('16 20 21 25 26 ?', 30, [{ value: 30, text: 'bugs.first-jump' }]),
      ).join(),
    ).toMatch(/reasons/);
    expect(
      checkIssues(
        'step-next',
        UP,
        entry('4 11 18 25 ?', 32, [{ value: 29, text: 'bugs.first-jump' }]),
      ).join(),
    ).toMatch(/reasons/);
  });
});

describe('step-rule', () => {
  describe.each(STEP_RULE_SETS)('$family $step', (set) => {
    it('shows the numbers of one family, 3 rule cards of which exactly one makes every number and two make the first two only, each card saying what its id says', () => {
      const { problems, items } = overSeeds<RuleChoiceItem>(
        'step-rule',
        set,
        ({ item, text, english }) => stepRuleProblems(set, item, text, english),
      );
      expect(problems).toEqual([]);
      expect(items.length).toBeGreaterThan(0);
    });
  });

  it('puts the right rule on each card in turn (the answer is not always the same card)', () => {
    const { items } = overSeeds<RuleChoiceItem>('step-rule', { family: 'up' }, () => []);
    const spots = [0, 1, 2].map(
      (spot) => items.filter(({ item }) => item.options[spot]?.id === item.answer).length,
    );
    for (const count of spots) expect(count).toBeGreaterThan(items.length / 8);
  });

  it('words the rules as the curriculum does', () => {
    const wording = (params: object): string[] =>
      draw<RuleChoiceItem>('step-rule', params, 3).drawn.flatMap(({ item, english }) =>
        item.options.map((option) => english(option.text)),
      );
    expect(
      wording({ family: 'up', step: [3, 9] }).some((text) => /^\+\d each time$/.test(text)),
    ).toBe(true);
    expect(wording({ family: 'double' }).some((text) => text === '× 2 each time')).toBe(true);
    expect(
      wording({ family: 'alternate' }).some((text) =>
        /^\+\d, then \+\d, again and again$/.test(text),
      ),
    ).toBe(true);
    expect(wording({ family: 'grow' }).some((text) => /^\+\d, \+\d+, \+\d+ …$/.test(text))).toBe(
      true,
    );
  });

  it('is the curriculum example: 3 7 11 15 ? → +4 each time, against +4, +5, +6 … and +4, then +9', () => {
    const item: RuleChoiceItem = {
      id: 'dr-1',
      type: 'choice',
      text: 'gen.dr-1.text',
      prompt: { big: '3 7 11 15 ?' },
      options: [
        { id: 'grow-4', text: 'gen.dr-1.rule-a' },
        { id: 'step-4', text: 'gen.dr-1.rule-b' },
        { id: 'alt-4-9', text: 'gen.dr-1.rule-c' },
      ],
      answer: 'step-4',
    };
    expect(checkIssues('step-rule', { family: 'up', step: [4, 4] }, item)).toEqual([]);
  });
});

describe('step-rule check', () => {
  const good: RuleChoiceItem = {
    id: 'dr-1',
    type: 'choice',
    text: 'gen.dr-1.text',
    prompt: { big: '3 7 11 15 ?' },
    options: [
      { id: 'grow-4', text: 'gen.dr-1.rule-a' },
      { id: 'step-4', text: 'gen.dr-1.rule-b' },
      { id: 'alt-4-9', text: 'gen.dr-1.rule-c' },
    ],
    answer: 'step-4',
  };
  const params = { family: 'up', step: [3, 9] } as const;
  const options = (...ids: string[]): RuleChoiceItem['options'] =>
    ids.map((id, index) => ({ id, text: `gen.dr-1.rule-${'abc'.charAt(index)}` }));

  it('accepts a good item and every generated one', () => {
    expect(checkIssues('step-rule', params, good)).toEqual([]);
    expect(checkIssues('step-rule', params, sample<RuleChoiceItem>('step-rule', params))).toEqual(
      [],
    );
  });

  it('reports a distractor that makes every number, and a second card that fits', () => {
    // alt-4-4 hides in the distractors as "+4, then +4": it makes 3 7 11 15, like the answer.
    expect(
      checkIssues('step-rule', params, {
        ...good,
        options: options('grow-4', 'step-4', 'alt-4-4'),
      }).join(),
    ).toMatch(/should fit exactly one rule/);
  });

  it('reports a distractor that goes wrong at the first jump, or fits more than the first two numbers', () => {
    expect(
      checkIssues('step-rule', params, {
        ...good,
        options: options('grow-5', 'step-4', 'alt-4-9'),
      }).join(),
    ).toMatch(/wrong rule "grow-5" must fit the first two terms and no more/);
    const doubling = {
      ...good,
      prompt: { big: '3 6 9 12 ?' },
      options: options('double', 'step-3', 'alt-3-9'),
    };
    expect(
      checkIssues('step-rule', { family: 'up', step: [3, 3] }, { ...doubling, answer: 'step-3' }),
    ).toEqual([]);
    expect(
      checkIssues(
        'step-rule',
        { family: 'up', step: [3, 3] },
        { ...doubling, options: options('step-3', 'alt-3-3', 'alt-3-9'), answer: 'step-3' },
      ).join(),
    ).toMatch(/must fit the first two terms and no more/);
  });

  it('reports a wrong answer, cards that name no rule, the same rule twice, and terms two families make', () => {
    expect(checkIssues('step-rule', params, { ...good, answer: 'grow-4' }).join()).toMatch(
      /should fit exactly one rule/,
    );
    expect(
      checkIssues('step-rule', params, {
        ...good,
        options: options('grow-4', 'step-4', 'sideways'),
      }).join(),
    ).toMatch(/name a rule/);
    expect(
      checkIssues('step-rule', params, {
        ...good,
        options: options('step-4', 'step-4', 'alt-4-9'),
      }).join(),
    ).toMatch(/3 rules must be different/);
    expect(
      checkIssues('step-rule', params, { ...good, options: good.options.slice(0, 2) }).join(),
    ).toMatch(/needs 3 options/);
    expect(
      checkIssues(
        'step-rule',
        { family: 'double' },
        { ...good, prompt: { big: '1 2 4 7 ?' } },
      ).join(),
    ).toMatch(/fits grow, it must fit only ratio/);
    expect(checkIssues('step-rule', { family: 'alternate' }, good).join()).toMatch(
      /must fit only alternate/,
    );
  });

  it('reports the wrong rule as the answer for the family', () => {
    const grown = {
      ...good,
      prompt: { big: '1 3 6 10 15 ?' },
      options: options('step-2', 'grow-2', 'alt-2-9'),
      answer: 'grow-2',
    };
    expect(checkIssues('step-rule', { family: 'grow' }, grown)).toEqual([]);
    expect(checkIssues('step-rule', { family: 'up', step: [2, 9] }, grown).join()).toMatch(
      /must fit only step/,
    );
  });
});

describe('rules', () => {
  it('have ids that read back, and make their own terms', () => {
    for (const id of ['step-4', 'double', 'alt-2-5', 'grow-3']) {
      const rule = parseRule(id);
      expect(rule).not.toBeNull();
      if (rule !== null) expect(ruleId(rule)).toBe(id);
    }
    for (const id of ['step', 'step-4-5', 'alt-2', 'grow-1-2', 'double-2', 'sideways', 'step-x']) {
      expect(parseRule(id), id).toBeNull();
    }
    expect(ruleTerms({ kind: 'step', step: 4 }, 3, 5)).toEqual([3, 7, 11, 15, 19]);
    expect(ruleTerms({ kind: 'double' }, 3, 4)).toEqual([3, 6, 12, 24]);
    expect(ruleTerms({ kind: 'alt', first: 2, second: 5 }, 1, 5)).toEqual([1, 3, 8, 10, 15]);
    expect(ruleTerms({ kind: 'grow', first: 1 }, 1, 5)).toEqual([1, 2, 4, 7, 11]);
  });
});

describe('params', () => {
  it('reject a step for the families without one, easy outside up, an empty step range and a range outside 2-9', () => {
    const bad = (params: object): string => draw('step-next', params, 1).issues.join(' | ');
    expect(bad({ family: 'double', step: [3, 4] })).toMatch(/takes no step/);
    expect(bad({ family: 'down', easy: true })).toMatch(/easy is for the up family only/);
    expect(bad({ family: 'up', step: [2, 2] })).toMatch(/no step is left/);
    expect(bad({ family: 'up', step: [5, 5] })).toMatch(/no step is left/);
    expect(bad({ family: 'up', step: [1, 4] })).toMatch(/step/);
    expect(bad({ family: 'up', step: [6, 4] })).toMatch(/smaller to the larger/);
    expect(bad({ family: 'sideways' })).toMatch(/family/);
    const rule = (params: object): string => draw('step-rule', params, 1).issues.join(' | ');
    expect(rule({ family: 'down' })).toMatch(/family/);
    expect(rule({ family: 'double', step: [3, 4] })).toMatch(/takes no step/);
    expect(rule({ family: 'up', step: [2, 2] })).toMatch(/no step is left/);
  });
});
