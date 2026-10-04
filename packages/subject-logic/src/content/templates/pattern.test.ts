// pat-next and pat-gap over 200 seeds per unit × attribute × units shown (the full matrix, a superset of the shipped W1 lessons): each
// item is solved again here from its own row (exactly one option completes it as a repeating pattern), and every `check` fails on a
// hand-broken item.
import { describe, expect, it } from 'vitest';
import type { CardShape } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import { drawPalette } from './shapes.ts';
import { seededRandom } from '@learn/platform-core/domain/random';
import type { PromptToken, ShapeChoiceItem } from './items.ts';
import { shortPeriods, unitsShown } from './pattern.ts';
import { PATTERN_SETS, keyOf, lookAlikeProblems, patternProblems } from './solvers.ts';
import { checkIssues, overSeeds, sample } from './testing.ts';

describe.each(['next', 'gap'] as const)('pat-%s', (mode) => {
  const template = `pat-${mode}`;

  describe.each(PATTERN_SETS)('$unit on $attr, units $units', (set) => {
    it('has a row of the unit, 3 different options of which exactly the answer completes the pattern, and the unit-break reason only on the wrong token before the gap', () => {
      const { problems, items } = overSeeds<ShapeChoiceItem>(template, set, ({ item, text }) =>
        patternProblems(mode, set, item, text),
      );
      expect(problems).toEqual([]);
      expect(items.length).toBeGreaterThan(0);
      // The answer is not always the same card.
      for (const id of ['a', 'b', 'c']) {
        expect(items.filter(({ item }) => item.answer === id).length, id).toBeGreaterThan(
          items.length / 8,
        );
      }
    });
  });
});

describe('the rows', () => {
  it('drop the units shown to fit 8 tokens, never below 2: AB shows 3 units, the 3-token units only 2', () => {
    expect(unitsShown(3, 2, 7)).toBe(3);
    expect(unitsShown(3, 3, 7)).toBe(2);
    expect(unitsShown(3, 3, 8)).toBe(2);
    expect(unitsShown(2, 3, 7)).toBe(2);
    const lengths = (template: string, unit: string, units: number): Set<number> =>
      new Set(
        overSeeds<ShapeChoiceItem>(template, { unit, attr: 'kind', units }, () => []).items.map(
          ({ item }) => item.prompt.shapes.length,
        ),
      );
    expect([...lengths('pat-next', 'AB', 2)].sort()).toEqual([5, 6]);
    expect([...lengths('pat-next', 'AB', 3)].sort()).toEqual([7, 8]);
    expect([...lengths('pat-next', 'ABC', 3)].sort()).toEqual([7, 8]);
    expect([...lengths('pat-gap', 'AB', 2)].sort()).toEqual([4]);
    expect([...lengths('pat-gap', 'AB', 3)].sort()).toEqual([6]);
    expect([...lengths('pat-gap', 'AAB', 3)].sort()).toEqual([6]);
  });
});

describe('shortPeriods', () => {
  it('lists every period up to half the known tokens that the row obeys, with what it puts in the gap', () => {
    expect(shortPeriods(['A', 'B', 'A', 'B', null])).toEqual([{ period: 2, predicts: 'A' }]);
    expect(shortPeriods(['A', 'A', 'A', null])).toEqual([{ period: 1, predicts: 'A' }]);
    expect(shortPeriods(['A', 'B', 'C', null])).toEqual([]);
    expect(shortPeriods(['A', 'B', null, 'B'])).toEqual([]);
    expect(shortPeriods(['A', 'A', null, 'A', 'A', 'A'])).toEqual([
      { period: 1, predicts: 'A' },
      { period: 2, predicts: 'A' },
    ]);
  });

  it('says null when no known token shares the gap’s place', () => {
    expect(shortPeriods(['A', 'B', 'A', 'A', 'B', 'A', 'B', null])).toEqual([]);
    expect(shortPeriods([null, 'A', 'B', 'A', 'B'])).toEqual([{ period: 2, predicts: 'B' }]);
  });
});

describe('the palettes', () => {
  const CONFUSABLE = ['red|green', 'green|orange', 'blue|purple'];
  it('never put a confusable colour pair, a square with a diamond, or a size outside tiny / medium / huge in one exercise', () => {
    const random = seededRandom(7);
    for (const attr of ['colour', 'kind', 'size', 'kind+colour'] as const) {
      for (const count of [2, 3]) {
        for (let draw = 0; draw < 300; draw += 1) {
          const { values, outside } = drawPalette(random, attr, count, true);
          const tokens: CardShape[] = outside === undefined ? [...values] : [...values, outside];
          expect(values).toHaveLength(count);
          expect(new Set(tokens.map(keyOf)).size).toBe(tokens.length);
          if (attr === 'size') expect(outside === undefined).toBe(count === 3);
          else expect(outside).toBeDefined();
          for (const a of tokens) {
            expect(['tiny', 'medium', 'huge', undefined]).toContain(a.size);
            for (const b of tokens) {
              expect(CONFUSABLE).not.toContain(`${a.colour}|${b.colour}`);
            }
          }
          const kinds = tokens.map((token) => token.kind);
          expect(kinds.includes('square') && kinds.includes('diamond')).toBe(false);
        }
      }
    }
  });

  it('draws no outside token when it is not asked for', () => {
    const random = seededRandom(3);
    for (const attr of ['colour', 'kind', 'size', 'kind+colour'] as const) {
      expect(drawPalette(random, attr, 2, false).outside).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// check: every rule fails on a hand-broken item

const [red, blue, yellow, green, orange] = [
  { kind: 'circle', colour: 'red' },
  { kind: 'circle', colour: 'blue' },
  { kind: 'circle', colour: 'yellow' },
  { kind: 'circle', colour: 'green' },
  { kind: 'circle', colour: 'orange' },
] as const satisfies readonly CardShape[];

const AB = { unit: 'AB', attr: 'colour', units: 2 } as const;

/** red blue red blue red ? → blue; "red" (the last token shown) is the unit-break slip. */
const next: ShapeChoiceItem = {
  id: 'dr-1',
  type: 'choice',
  text: 'gen.dr-1.text',
  prompt: { shapes: [red, blue, red, blue, red, 'gap'] },
  options: [
    { id: 'a', shape: blue },
    { id: 'b', shape: red, reason: 'bugs.unit-break' },
    { id: 'c', shape: yellow },
  ],
  answer: 'a',
};

/** red blue ? blue → red: the token before the gap (blue) is wrong. */
const gap: ShapeChoiceItem = {
  id: 'dr-1',
  type: 'choice',
  text: 'gen.dr-1.text',
  prompt: { shapes: [red, blue, 'gap', blue] },
  options: [
    { id: 'a', shape: blue, reason: 'bugs.unit-break' },
    { id: 'b', shape: red },
    { id: 'c', shape: yellow },
  ],
  answer: 'b',
};

const withRow = (item: ShapeChoiceItem, shapes: readonly PromptToken[]): ShapeChoiceItem => ({
  ...item,
  prompt: { shapes },
});

describe('pat-next check', () => {
  it('accepts the curriculum example (red blue red blue red ? → blue) and every generated item', () => {
    expect(checkIssues('pat-next', AB, next)).toEqual([]);
    const good = sample<ShapeChoiceItem>('pat-next', AB, (item) =>
      item.options.some((option) => option.reason !== undefined),
    );
    expect(checkIssues('pat-next', AB, good)).toEqual([]);
    // In AB the token before the gap is always the wrong one; AAB can repeat it (A A B A ? → A): no reason then.
    const aab = { unit: 'AAB', attr: 'colour', units: 2 } as const;
    const plain = sample<ShapeChoiceItem>('pat-next', aab, (item) =>
      item.options.every((option) => option.reason === undefined),
    );
    expect(checkIssues('pat-next', aab, plain)).toEqual([]);
  });

  it('rejects a second reading: a different answer card than the period the row obeys', () => {
    const issues = checkIssues('pat-next', AB, { ...next, answer: 'c' }).join();
    expect(issues).toMatch(/period 2 also fits the row and puts .* in the gap/);
    expect(issues).toMatch(/not the token one unit before the gap/);
    expect(checkIssues('pat-next', AB, { ...next, answer: 'b' }).join()).toMatch(
      /period 2 also fits/,
    );
    expect(checkIssues('pat-next', AB, { ...next, answer: 'z' }).join()).toMatch(
      /not one of the options/,
    );
  });

  it('rejects a gap that is not last, two gaps, and no gap', () => {
    expect(
      checkIssues('pat-next', AB, withRow(next, [red, blue, 'gap', blue, red])).join(),
    ).toMatch(/gap must be the last token/);
    expect(
      checkIssues('pat-next', AB, withRow(next, [red, 'gap', red, blue, red, 'gap'])).join(),
    ).toMatch(/exactly one gap, has 2/);
    expect(checkIssues('pat-next', AB, withRow(next, [red, blue, red, blue, red])).join()).toMatch(
      /exactly one gap, has 0/,
    );
  });

  it('rejects a row that breaks the unit, one that shows too few units for `units`, and one over 8 tokens', () => {
    expect(
      checkIssues('pat-next', AB, withRow(next, [red, blue, red, red, red, 'gap'])).join(),
    ).toMatch(/break the unit AB/);
    expect(checkIssues('pat-next', AB, withRow(next, [red, blue, 'gap'])).join()).toMatch(
      /show 1 full units, 2 expected/,
    );
    expect(checkIssues('pat-next', { ...AB, units: 3 }, next).join()).toMatch(
      /show 2 full units, 3 expected/,
    );
    const long = [red, blue, red, blue, red, blue, red, blue, 'gap'] as const;
    expect(checkIssues('pat-next', { ...AB, units: 3 }, withRow(next, long)).join()).toMatch(
      /9 tokens/,
    );
  });

  it('rejects options that repeat or are not 3, and a token that varies more than the attribute', () => {
    expect(
      checkIssues('pat-next', AB, {
        ...next,
        options: [next.options[0], next.options[1], next.options[1]],
      }).join(),
    ).toMatch(/3 different options/);
    expect(
      checkIssues('pat-next', AB, { ...next, options: next.options.slice(0, 2) }).join(),
    ).toMatch(/3 different options/);
    const square = { kind: 'square', colour: 'blue' } as const;
    expect(
      checkIssues('pat-next', AB, withRow(next, [red, square, red, square, red, 'gap'])).join(),
    ).toMatch(/vary more than the attribute "colour"/);
    expect(checkIssues('pat-next', { ...AB, attr: 'kind' }, next).join()).toMatch(
      /vary more than the attribute "kind"/,
    );
  });

  it('rejects two options outside the pattern, and an outside token that varies another attribute', () => {
    const second = { kind: 'circle', colour: 'orange' } as const;
    expect(
      checkIssues('pat-next', AB, {
        ...next,
        options: [next.options[0], { id: 'b', shape: second }, next.options[2]],
      }).join(),
    ).toMatch(/at most one option may be outside/);
    const triangle = { kind: 'triangle', colour: 'orange' } as const;
    expect(
      checkIssues('pat-next', AB, {
        ...next,
        options: [next.options[0], next.options[1], { id: 'c', shape: triangle }],
      }).join(),
    ).toMatch(/vary only the same attribute/);
  });

  it('rejects a missing, misplaced or invented unit-break reason, and a slip that is not offered', () => {
    const bare = { ...next, options: next.options.map(({ id, shape }) => ({ id, shape })) };
    expect(checkIssues('pat-next', AB, bare).join()).toMatch(/reasons/);
    const onRight = {
      ...next,
      options: next.options.map((option) => ({
        ...option,
        ...(option.id === 'a' ? { reason: 'bugs.unit-break' } : {}),
      })),
    };
    expect(checkIssues('pat-next', AB, onRight).join()).toMatch(/reasons/);
    const wrongText = {
      ...next,
      options: next.options.map((option) =>
        option.reason === undefined ? option : { ...option, reason: 'bugs.far-off' },
      ),
    };
    expect(checkIssues('pat-next', AB, wrongText).join()).toMatch(/reasons/);
    const notOffered = {
      ...next,
      options: [next.options[0], next.options[2], { id: 'c', shape: green }],
    };
    expect(checkIssues('pat-next', { ...AB }, { ...notOffered }).join()).toMatch(
      /must be one of the options/,
    );
  });
});

describe('pat-gap check', () => {
  it('accepts a gap inside the row (red blue ? blue → red) and every generated item', () => {
    expect(checkIssues('pat-gap', AB, gap)).toEqual([]);
    const good = sample<ShapeChoiceItem>('pat-gap', { unit: 'AAB', attr: 'kind' });
    expect(checkIssues('pat-gap', { unit: 'AAB', attr: 'kind', units: 2 }, good)).toEqual([]);
  });

  it('rejects a gap in the first unit, a gap at the end, and a wrong answer', () => {
    expect(checkIssues('pat-gap', AB, withRow(gap, ['gap', blue, red, blue])).join()).toMatch(
      /after the first unit and before the last token/,
    );
    expect(checkIssues('pat-gap', AB, withRow(gap, [red, blue, red, 'gap'])).join()).toMatch(
      /after the first unit and before the last token/,
    );
    expect(checkIssues('pat-gap', AB, { ...gap, answer: 'c' }).join()).toMatch(
      /not the token one unit before the gap/,
    );
  });

  it('rejects a row of the wrong length for `units`', () => {
    expect(
      checkIssues('pat-gap', AB, withRow(gap, [red, blue, 'gap', blue, red, blue])).join(),
    ).toMatch(/3 full units, 2 expected/);
  });

  it('wants the token before the gap as the reason, not the last one of the row', () => {
    const lastShown = {
      ...gap,
      options: [
        { id: 'a', shape: blue },
        { id: 'b', shape: red, reason: 'bugs.unit-break' },
        { id: 'c', shape: yellow },
      ],
    };
    expect(checkIssues('pat-gap', AB, lastShown).join()).toMatch(/reasons/);
  });
});

describe('the look-alike rules the solver repeats', () => {
  it('flag a confusable colour pair and a square with a diamond in one item', () => {
    const redGreen = withRow(next, [red, green, red, green, red, 'gap']);
    expect(lookAlikeProblems(redGreen).join()).toMatch(/red and green/);
    const greenOrange = withRow(next, [green, orange, green, orange, green, 'gap']);
    expect(lookAlikeProblems(greenOrange).join()).toMatch(/green and orange/);
    const squareDiamond = withRow(next, [
      { kind: 'square', colour: 'red' },
      { kind: 'diamond', colour: 'red' },
      'gap',
    ]);
    expect(lookAlikeProblems(squareDiamond).join()).toMatch(/square and a diamond/);
    expect(lookAlikeProblems(next)).toEqual([]);
  });
});
