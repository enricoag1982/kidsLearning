// far-term over 200 seeds per parameter set: each item is solved again here by counting through the row's unit up to the place its
// sentence names, and every `check` fails on a hand-broken item.
import { describe, expect, it } from 'vitest';
import type { CardShape } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import { placeOf } from './far.ts';
import type { ShapeChoiceItem } from './items.ts';
import { FAR_SETS, farProblems } from './solvers.ts';
import { checkIssues, draw, overSeeds, sample } from './testing.ts';

describe('far-term', () => {
  describe.each(FAR_SETS)('$unit on $attr, place $position', (set) => {
    it('shows 2 units, names a place beyond the row, offers the unit’s tokens, answers with the token counting gives, and speaks far-off only on a token one place off', () => {
      const { problems, items } = overSeeds<ShapeChoiceItem>('far-term', set, ({ item, text }) =>
        farProblems(set, item, text),
      );
      expect(problems).toEqual([]);
      expect(items.length).toBeGreaterThan(0);
    });
  });

  it('puts the right token on each card in turn, and draws places over the whole range', () => {
    const params = { unit: 'ABC', attr: 'colour', position: [7, 15] } as const;
    const { items } = overSeeds<ShapeChoiceItem>('far-term', params, () => []);
    for (const spot of [0, 1, 2]) {
      expect(
        items.filter(({ item }) => item.options[spot]?.id === item.answer).length,
        String(spot),
      ).toBeGreaterThan(items.length / 8);
    }
    const places = new Set(items.map(({ item }) => placeOf(item.options)));
    expect([...places].sort((a, b) => Number(a) - Number(b))).toEqual([
      7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
  });

  it('gives AB the one other token as its only reason and ABC the two tokens a place before and after', () => {
    const reasons = (params: object): number[] =>
      overSeeds<ShapeChoiceItem>('far-term', params, () => []).items.map(
        ({ item }) => item.options.filter((option) => option.reason !== undefined).length,
      );
    expect(new Set(reasons({ unit: 'AB', attr: 'kind', position: [9, 20] }))).toEqual(new Set([1]));
    expect(new Set(reasons({ unit: 'ABC', attr: 'kind', position: [7, 15] }))).toEqual(
      new Set([2]),
    );
  });

  it('is the curriculum example: red blue red blue, number 10 is blue (counting in twos)', () => {
    const [item] = draw<ShapeChoiceItem>(
      'far-term',
      { unit: 'AB', attr: 'colour', position: [10, 10] },
      1,
    ).drawn;
    expect(item?.text).toBe('Which shape is number 10?');
  });
});

const [red, blue, yellow] = [
  { kind: 'circle', colour: 'red' },
  { kind: 'circle', colour: 'blue' },
  { kind: 'circle', colour: 'yellow' },
] as const satisfies readonly CardShape[];

/** AB: number 10 is blue; red (number 9 and 11) is the far-off slip. */
const ab: ShapeChoiceItem = {
  id: 'dr-1',
  type: 'choice',
  text: 'gen.dr-1.text',
  prompt: { shapes: [red, blue, red, blue] },
  options: [
    { id: 'p10-a', shape: red, reason: 'bugs.far-off' },
    { id: 'p10-b', shape: blue },
  ],
  answer: 'p10-b',
};
const AB = { unit: 'AB', attr: 'colour', position: [8, 12] } as const;

/** ABC: number 8 is blue; red (7) and yellow (9) are the slips. */
const abc: ShapeChoiceItem = {
  id: 'dr-1',
  type: 'choice',
  text: 'gen.dr-1.text',
  prompt: { shapes: [red, blue, yellow, red, blue, yellow] },
  options: [
    { id: 'p8-a', shape: yellow, reason: 'bugs.far-off' },
    { id: 'p8-b', shape: blue },
    { id: 'p8-c', shape: red, reason: 'bugs.far-off' },
  ],
  answer: 'p8-b',
};
const ABC = { unit: 'ABC', attr: 'colour', position: [7, 15] } as const;

describe('far-term check', () => {
  it('accepts a good AB and ABC item and every generated one', () => {
    expect(checkIssues('far-term', AB, ab)).toEqual([]);
    expect(checkIssues('far-term', ABC, abc)).toEqual([]);
    expect(checkIssues('far-term', AB, sample<ShapeChoiceItem>('far-term', AB))).toEqual([]);
    expect(checkIssues('far-term', ABC, sample<ShapeChoiceItem>('far-term', ABC))).toEqual([]);
  });

  it('rejects a place that is not further than the tokens shown', () => {
    const early = (n: number, item: ShapeChoiceItem, params: object): string =>
      checkIssues('far-term', params, {
        ...item,
        options: item.options.map((option) => ({
          ...option,
          id: option.id.replace(/^p\d+/, `p${String(n)}`),
        })),
        answer: item.answer.replace(/^p\d+/, `p${String(n)}`),
      }).join();
    expect(early(4, ab, AB)).toMatch(/place 4 is inside the 4 tokens shown/);
    expect(early(3, ab, AB)).toMatch(/place 3 is inside the 4 tokens shown/);
    expect(early(6, abc, ABC)).toMatch(/place 6 is inside the 6 tokens shown/);
    expect(early(5, ab, AB)).toMatch(/place 5 is outside position 8-12/);
  });

  it('rejects a place outside the position range, or one the option ids do not name', () => {
    expect(checkIssues('far-term', { ...AB, position: [11, 12] }, ab).join()).toMatch(
      /place 10 is outside position 11-12/,
    );
    expect(checkIssues('far-term', { ...AB, position: [6, 9] }, ab).join()).toMatch(
      /outside position 6-9/,
    );
    const nameless: ShapeChoiceItem = {
      ...ab,
      options: [
        { id: 'red', shape: red, reason: 'bugs.far-off' },
        { id: 'blue', shape: blue },
      ],
      answer: 'blue',
    };
    expect(checkIssues('far-term', AB, nameless).join()).toMatch(/option ids name no single place/);
    const two: ShapeChoiceItem = {
      ...ab,
      options: [
        { id: 'p10-a', shape: red, reason: 'bugs.far-off' },
        { id: 'p12-b', shape: blue },
      ],
    };
    expect(checkIssues('far-term', AB, two).join()).toMatch(/option ids name no single place/);
  });

  it('rejects a row that is not 2 full units of different tokens, or has a gap', () => {
    const row = (...tokens: (CardShape | 'gap')[]): ShapeChoiceItem => ({
      ...ab,
      prompt: { shapes: tokens },
    });
    expect(checkIssues('far-term', AB, row(red, blue, red)).join()).toMatch(
      /2 full units of 2 tokens, no gap/,
    );
    expect(checkIssues('far-term', AB, row(red, blue, red, 'gap')).join()).toMatch(
      /2 full units of 2 tokens, no gap/,
    );
    expect(checkIssues('far-term', AB, row(red, blue, blue, red)).join()).toMatch(
      /not 2 units of 2 different tokens/,
    );
    expect(checkIssues('far-term', AB, row(red, red, red, red)).join()).toMatch(
      /not 2 units of 2 different tokens/,
    );
    expect(checkIssues('far-term', ABC, ab).join()).toMatch(/2 full units of 3 tokens/);
  });

  it('rejects options that are not the unit’s tokens once each', () => {
    expect(
      checkIssues('far-term', AB, {
        ...ab,
        options: [
          { id: 'p10-a', shape: red, reason: 'bugs.far-off' },
          { id: 'p10-b', shape: yellow },
        ],
      }).join(),
    ).toMatch(/options must be the unit's tokens/);
    expect(
      checkIssues('far-term', AB, {
        ...ab,
        options: [
          { id: 'p10-a', shape: blue },
          { id: 'p10-b', shape: blue },
        ],
      }).join(),
    ).toMatch(/options must be the unit's tokens/);
    expect(
      checkIssues('far-term', ABC, { ...abc, options: abc.options.slice(0, 2) }).join(),
    ).toMatch(/options must be the unit's tokens/);
  });

  it('rejects an answer that is not the token at the place (counting one by one, a place off, gives it away)', () => {
    expect(checkIssues('far-term', AB, { ...ab, answer: 'p10-a' }).join()).toMatch(
      /place 10 is .*, not the answer card/,
    );
    expect(checkIssues('far-term', ABC, { ...abc, answer: 'p8-a' }).join()).toMatch(
      /not the answer card/,
    );
    expect(checkIssues('far-term', ABC, { ...abc, answer: 'p8-c' }).join()).toMatch(
      /not the answer card/,
    );
    expect(checkIssues('far-term', AB, { ...ab, answer: 'p10-z' }).join()).toMatch(
      /not the answer card/,
    );
  });

  it('rejects a missing, misplaced or invented far-off reason', () => {
    const strip = (item: ShapeChoiceItem): ShapeChoiceItem => ({
      ...item,
      options: item.options.map(({ id, shape }) => ({ id, shape })),
    });
    expect(checkIssues('far-term', AB, strip(ab)).join()).toMatch(/reasons \[\] should be/);
    expect(checkIssues('far-term', ABC, strip(abc)).join()).toMatch(/reasons \[\] should be/);
    expect(
      checkIssues('far-term', ABC, {
        ...abc,
        options: abc.options.map((option) =>
          option.id === 'p8-c' ? { id: option.id, shape: option.shape } : option,
        ),
      }).join(),
    ).toMatch(/reasons/);
    expect(
      checkIssues('far-term', AB, {
        ...ab,
        options: ab.options.map((option) => ({ ...option, reason: 'bugs.far-off' })),
      }).join(),
    ).toMatch(/reasons/);
    expect(
      checkIssues('far-term', AB, {
        ...ab,
        options: ab.options.map((option) =>
          option.reason === undefined ? option : { ...option, reason: 'bugs.unit-break' },
        ),
      }).join(),
    ).toMatch(/reasons/);
  });
});

describe('far-term params', () => {
  const bad = (params: object): string => draw('far-term', params, 1).issues.join(' | ');

  it('reject a place the row already shows, a place outside 6-20, a reversed range, and an unknown unit', () => {
    expect(bad({ unit: 'ABC', attr: 'kind', position: [6, 9] })).toMatch(
      /the place must be further/,
    );
    expect(bad({ unit: 'AB', attr: 'kind', position: [4, 9] })).toMatch(/position/);
    expect(bad({ unit: 'AB', attr: 'kind', position: [6, 21] })).toMatch(/position/);
    expect(bad({ unit: 'AB', attr: 'kind', position: [12, 9] })).toMatch(/smaller to the larger/);
    expect(bad({ unit: 'AAB', attr: 'kind', position: [9, 12] })).toMatch(/unit/);
    expect(bad({ unit: 'AB', position: [9, 12] })).toMatch(/attr/);
  });

  it('allow AB at place 6 (the easier variant) and ABC from place 7', () => {
    expect(bad({ unit: 'AB', attr: 'size', position: [6, 6] })).toBe('');
    expect(bad({ unit: 'ABC', attr: 'size', position: [7, 7] })).toBe('');
  });
});

describe('placeOf', () => {
  it('reads the place off the option ids, or null', () => {
    expect(placeOf([{ id: 'p12-a' }, { id: 'p12-b' }])).toBe(12);
    expect(placeOf([{ id: 'p12-a' }, { id: 'p13-b' }])).toBeNull();
    expect(placeOf([{ id: 'a' }, { id: 'b' }])).toBeNull();
    expect(placeOf([{ id: 'p12-d' }])).toBeNull();
    expect(placeOf([])).toBeNull();
  });
});
