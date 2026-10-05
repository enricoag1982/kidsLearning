// grow-next over 200 seeds per parameter set: each item is solved again here from its own clusters (and, for an entry, from the step its
// sentence names), and every `check` fails on a hand-broken item.
import { describe, expect, it } from 'vitest';
import type { CardShape } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import type { ShapeChoiceItem, ShapeEntryItem } from './items.ts';
import { GROW_SETS, growProblems } from './solvers.ts';
import { checkIssues, draw, overSeeds, sample } from './testing.ts';

describe('grow-next', () => {
  describe.each(GROW_SETS)('$mode step $step start $start ahead $ahead', (set) => {
    it('shows 3 clusters of one shape growing by the step (counts 1-9), then asks for the next picture (options right ± step) or for a step further on (answer ≤ 30), and speaks grow-off only on the wrong counts', () => {
      const { problems, items } = overSeeds<ShapeChoiceItem | ShapeEntryItem>(
        'grow-next',
        set,
        ({ item, text }) => growProblems(set, item, text),
      );
      expect(problems).toEqual([]);
      expect(items.length).toBeGreaterThan(0);
    });
  });

  it('puts the right picture on each card in turn (the answer is not always the same card)', () => {
    const { items } = overSeeds<ShapeChoiceItem>(
      'grow-next',
      { mode: 'choice', step: 1 },
      () => [],
    );
    for (const id of ['a', 'b', 'c']) {
      expect(items.filter(({ item }) => item.answer === id).length, id).toBeGreaterThan(
        items.length / 8,
      );
    }
  });

  it('starts +2 choices at 1 only (the option right + 2 must stay within 9), +1 choices anywhere in start', () => {
    const starts = (params: object): number[] =>
      [
        ...new Set(
          overSeeds<ShapeChoiceItem>('grow-next', params, () => []).items.map(
            ({ item }) => (item.prompt.shapes[0] as CardShape).count,
          ),
        ),
      ].sort((a, b) => Number(a) - Number(b)) as number[];
    expect(starts({ mode: 'choice', step: 2 })).toEqual([1]);
    expect(starts({ mode: 'choice', step: 1 })).toEqual([1, 2, 3]);
    expect(starts({ mode: 'entry', step: 2, ahead: 3 })).toEqual([1, 2, 3]);
    expect(starts({ mode: 'entry', step: 1, ahead: 1, start: [2, 2] })).toEqual([2]);
  });

  it('names the step in the entry sentence: step 4, 5 or 6 for ahead 1, 2, 3', () => {
    const sentence = (ahead: number): Set<string> =>
      new Set(
        overSeeds<ShapeEntryItem>(
          'grow-next',
          { mode: 'entry', step: 1, ahead },
          () => [],
        ).items.map(({ text }) => text),
      );
    expect([...sentence(1)]).toEqual(['How many in step 4?']);
    expect([...sentence(2)]).toEqual(['How many in step 5?']);
    expect([...sentence(3)]).toEqual(['How many in step 6?']);
  });
});

const star = (count: number): CardShape => ({ kind: 'star', colour: 'yellow', count });

/** The curriculum example: stars 1, 3, 5, gap → 7 (the counts either side, 5 and 9, are the grow-off slips). */
const choice: ShapeChoiceItem = {
  id: 'dr-1',
  type: 'choice',
  text: 'gen.dr-1.text',
  prompt: { shapes: [star(1), star(3), star(5), 'gap'] },
  options: [
    { id: 'a', shape: star(5), reason: 'bugs.grow-off' },
    { id: 'b', shape: star(7) },
    { id: 'c', shape: star(9), reason: 'bugs.grow-off' },
  ],
  answer: 'b',
};
const CHOICE = { mode: 'choice', step: 2 } as const;

/** Step 5 of 1, 2, 3 growing by 1 is 5; 4 and 6 are the slips. */
const entry: ShapeEntryItem = {
  id: 'dr-1',
  type: 'number-entry',
  text: 'gen.dr-1.text',
  prompt: { shapes: [star(1), star(2), star(3)] },
  answer: 5,
  reasons: [
    { value: 4, text: 'bugs.grow-off' },
    { value: 6, text: 'bugs.grow-off' },
  ],
};
const ENTRY = { mode: 'entry', step: 1, ahead: 2 } as const;

const withOptions = (
  item: ShapeChoiceItem,
  counts: readonly [number, number, number],
  reasons = [true, false, true],
): ShapeChoiceItem => ({
  ...item,
  options: counts.map((count, index) => ({
    id: 'abc'.charAt(index),
    shape: star(count),
    ...(reasons[index] === true ? { reason: 'bugs.grow-off' } : {}),
  })),
});

describe('grow-next check', () => {
  it('accepts the curriculum example and every generated item', () => {
    expect(checkIssues('grow-next', CHOICE, choice)).toEqual([]);
    expect(checkIssues('grow-next', ENTRY, entry)).toEqual([]);
    expect(checkIssues('grow-next', CHOICE, sample<ShapeChoiceItem>('grow-next', CHOICE))).toEqual(
      [],
    );
    expect(checkIssues('grow-next', ENTRY, sample<ShapeEntryItem>('grow-next', ENTRY))).toEqual([]);
  });

  it('rejects counts that do not grow by the step, clusters of different shapes, and counts or a start outside the range', () => {
    const row = (...tokens: (CardShape | 'gap')[]): ShapeChoiceItem => ({
      ...choice,
      prompt: { shapes: tokens },
    });
    expect(checkIssues('grow-next', CHOICE, row(star(1), star(3), star(6), 'gap')).join()).toMatch(
      /do not grow by 2 each step/,
    );
    expect(checkIssues('grow-next', { mode: 'choice', step: 1 }, choice).join()).toMatch(
      /do not grow by 1 each step/,
    );
    expect(
      checkIssues(
        'grow-next',
        CHOICE,
        row(star(1), { kind: 'heart', colour: 'yellow', count: 3 }, star(5), 'gap'),
      ).join(),
    ).toMatch(/3 clusters of one shape/);
    expect(
      checkIssues(
        'grow-next',
        CHOICE,
        row(star(1), { ...star(3), colour: 'blue' }, star(5), 'gap'),
      ).join(),
    ).toMatch(/3 clusters of one shape/);
    expect(checkIssues('grow-next', CHOICE, row(star(1), star(3), 'gap')).join()).toMatch(
      /3 clusters of one shape/,
    );
    expect(checkIssues('grow-next', CHOICE, row(star(7), star(9), star(11), 'gap')).join()).toMatch(
      /outside 1-9/,
    );
    expect(
      checkIssues('grow-next', { mode: 'entry', step: 1, ahead: 2, start: [2, 3] }, entry).join(),
    ).toMatch(/first count 1 is outside start 2-3/);
  });

  it('rejects options that repeat, leave the range, or are not the answer and the counts one step either side', () => {
    expect(checkIssues('grow-next', CHOICE, withOptions(choice, [5, 7, 7])).join()).toMatch(
      /options 5, 7, 7 should be 7, 5 and 9/,
    );
    expect(checkIssues('grow-next', CHOICE, withOptions(choice, [5, 7, 11])).join()).toMatch(
      /options 5, 7, 11 should be 7, 5 and 9/,
    );
    expect(checkIssues('grow-next', CHOICE, withOptions(choice, [6, 7, 8])).join()).toMatch(
      /should be 7, 5 and 9/,
    );
    // Over 9 stars: the cluster holds 3 x 3.
    const high: ShapeChoiceItem = {
      ...choice,
      prompt: { shapes: [star(3), star(5), star(7), 'gap'] },
      options: [
        { id: 'a', shape: star(7), reason: 'bugs.grow-off' },
        { id: 'b', shape: star(9) },
        { id: 'c', shape: star(11), reason: 'bugs.grow-off' },
      ],
      answer: 'b',
    };
    expect(checkIssues('grow-next', CHOICE, high).join()).toMatch(/distinct, 1-9/);
    expect(
      checkIssues('grow-next', CHOICE, {
        ...choice,
        options: choice.options.slice(0, 2),
      }).join(),
    ).toMatch(/options 5, 7 should be/);
    expect(
      checkIssues('grow-next', CHOICE, {
        ...choice,
        options: choice.options.map((option) => ({
          ...option,
          shape: { ...option.shape, kind: 'heart' as const },
        })),
      }).join(),
    ).toMatch(/must be a cluster of the row's shape/);
  });

  it('rejects an answer card that is not the next picture', () => {
    expect(checkIssues('grow-next', CHOICE, { ...choice, answer: 'a' }).join()).toMatch(
      /answer card has 5, the next picture has 7/,
    );
    expect(checkIssues('grow-next', CHOICE, { ...choice, answer: 'c' }).join()).toMatch(
      /answer card has 9/,
    );
  });

  it('rejects a missing, misplaced or invented grow-off reason', () => {
    expect(
      checkIssues(
        'grow-next',
        CHOICE,
        withOptions(choice, [5, 7, 9], [false, false, false]),
      ).join(),
    ).toMatch(/reasons \[\] should be/);
    expect(
      checkIssues('grow-next', CHOICE, withOptions(choice, [5, 7, 9], [true, true, true])).join(),
    ).toMatch(/reasons .* should be/);
    expect(
      checkIssues('grow-next', CHOICE, withOptions(choice, [5, 7, 9], [true, false, false])).join(),
    ).toMatch(/reasons/);
    expect(
      checkIssues('grow-next', CHOICE, {
        ...choice,
        options: choice.options.map((option) =>
          option.reason === undefined ? option : { ...option, reason: 'bugs.far-off' },
        ),
      }).join(),
    ).toMatch(/reasons/);
  });

  it('rejects a choice without a gap, a gap that is not last, and a choice under entry params (and the other way round)', () => {
    expect(
      checkIssues('grow-next', CHOICE, {
        ...choice,
        prompt: { shapes: [star(1), star(3), star(5)] },
      }).join(),
    ).toMatch(/3 clusters and a gap last/);
    expect(checkIssues('grow-next', ENTRY, choice).join()).toMatch(/3 clusters and a gap last/);
    expect(checkIssues('grow-next', CHOICE, entry).join()).toMatch(/shows 3 clusters, no gap/);
    expect(
      checkIssues('grow-next', ENTRY, {
        ...entry,
        prompt: { shapes: [star(1), star(2), star(3), 'gap'] },
      }).join(),
    ).toMatch(/shows 3 clusters, no gap/);
  });

  it('rejects an entry answer that is not the count of the step asked for, or over 30', () => {
    expect(checkIssues('grow-next', ENTRY, { ...entry, answer: 4 }).join()).toMatch(
      /step 5 has 5, not 4/,
    );
    expect(checkIssues('grow-next', { ...ENTRY, ahead: 3 }, entry).join()).toMatch(
      /step 6 has 6, not 5/,
    );
    // Clusters hold 9 at most, so only a hand-made row can ask for more than 30.
    const big = checkIssues(
      'grow-next',
      { mode: 'entry', step: 2, ahead: 3 },
      {
        ...entry,
        prompt: { shapes: [star(25), star(27), star(29)] },
        answer: 35,
      },
    ).join();
    expect(big).toMatch(/the answer 35 is over 30/);
    expect(big).toMatch(/outside 1-9/);
  });

  it('rejects an entry reason on the wrong values, a missing one, or the answer itself', () => {
    expect(checkIssues('grow-next', ENTRY, { ...entry, reasons: [] }).join()).toMatch(/reasons/);
    expect(
      checkIssues('grow-next', ENTRY, {
        ...entry,
        reasons: [
          { value: 4, text: 'bugs.grow-off' },
          { value: 5, text: 'bugs.grow-off' },
        ],
      }).join(),
    ).toMatch(/reasons/);
    expect(
      checkIssues('grow-next', ENTRY, {
        ...entry,
        reasons: [
          { value: 4, text: 'bugs.grow-off' },
          { value: 6, text: 'bugs.first-jump' },
        ],
      }).join(),
    ).toMatch(/reasons/);
    const bare: ShapeEntryItem = {
      id: entry.id,
      type: entry.type,
      text: entry.text,
      prompt: entry.prompt,
      answer: entry.answer,
    };
    expect(checkIssues('grow-next', ENTRY, bare).join()).toMatch(/reasons \[\] should be/);
  });
});

describe('grow-next params', () => {
  const bad = (params: object): string => draw('grow-next', params, 1).issues.join(' | ');

  it('reject ahead for a choice, a start of no use, a reversed start, an ahead or step out of range, and a missing mode', () => {
    expect(bad({ mode: 'choice', step: 1, ahead: 2 })).toMatch(/ahead is for entry only/);
    expect(bad({ mode: 'choice', step: 2, start: [2, 3] })).toMatch(/no start fits/);
    expect(bad({ mode: 'entry', step: 1, start: [3, 1] })).toMatch(/smaller to the larger/);
    expect(bad({ mode: 'entry', step: 1, ahead: 4 })).toMatch(/ahead/);
    expect(bad({ mode: 'entry', step: 3, ahead: 1 })).toMatch(/step/);
    expect(bad({ mode: 'entry', step: 0, ahead: 1 })).toMatch(/step/);
    expect(bad({ mode: 'entry', step: 1, start: [0, 3] })).toMatch(/start/);
    expect(bad({ step: 1 })).toMatch(/mode/);
  });

  it('draw an entry item with ahead 1 when none is given', () => {
    const { drawn, issues } = draw<ShapeEntryItem>('grow-next', { mode: 'entry', step: 1 }, 5);
    expect(issues).toEqual([]);
    expect(drawn[0]?.text).toBe('How many in step 4?');
  });
});
