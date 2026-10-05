// odd-one and odd-rule over 200 seeds per parameter set (every attribute with 3 cards, 4 cards, 4 cards with noise; every rule
// attribute with 3 and 4 cards): each item is solved again here from its own cards and sentences, and every `check` fails on a
// hand-broken item.
import { describe, expect, it } from 'vitest';
import type { CardShape } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import type { ShapeCardsItem, ShapeRuleItem } from './items.ts';
import { parseRuleOption, ruleOptionId } from './odd.ts';
import {
  ODD_ONE_SETS,
  ODD_RULE_SETS,
  authored,
  lookAlikes,
  oddOneProblems,
  oddRuleProblems,
} from './solvers-w2.ts';
import { checkIssues, overSeeds, sample } from './testing.ts';

type RuleItem = ShapeRuleItem;

describe('odd-one', () => {
  describe.each(ODD_ONE_SETS)('$attr, $items cards, noise $noise', (set) => {
    it('has cards equal in every attribute but one, in which exactly the answer is unique; a noise attribute splits them 2-2', () => {
      const { problems, items } = overSeeds<ShapeCardsItem>('odd-one', set, ({ item, text }) =>
        oddOneProblems(set, item, text),
      );
      expect(problems).toEqual([]);
      expect(items.length).toBeGreaterThan(0);
      // The answer is not always the same card.
      for (const id of 'abcd'.slice(0, set.items)) {
        expect(items.filter(({ item }) => item.answer === id).length, id).toBeGreaterThan(
          items.length / (set.items * 4),
        );
      }
    });
  });

  it('draws different cards for one parameter set (more than one item over the seeds)', () => {
    const { items } = overSeeds<ShapeCardsItem>('odd-one', { attr: 'colour', items: 4 }, () => []);
    expect(new Set(items.map(({ item }) => JSON.stringify(item.options))).size).toBeGreaterThan(20);
  });
});

const [red, blue, yellow, green] = [
  { kind: 'circle', colour: 'red' },
  { kind: 'circle', colour: 'blue' },
  { kind: 'circle', colour: 'yellow' },
  { kind: 'circle', colour: 'green' },
] as const satisfies readonly CardShape[];

const star = { kind: 'star', colour: 'red' } as const satisfies CardShape;

const cards = (id: string, shapes: readonly CardShape[], answer: string): ShapeCardsItem => ({
  id: 'dr-1',
  type: 'choice',
  text: 'gen.dr-1.text',
  options: shapes.map((shape, index) => ({ id: 'abcd'[index] as string, shape })),
  answer,
  ...(id === '' ? {} : {}),
});

const ODD = { attr: 'colour', items: 4, noise: false } as const;
/** red red blue red → c (blue) is the odd colour. */
const colourOdd = cards('', [red, red, blue, red], 'c');

describe('odd-one check', () => {
  it('accepts a good item of each kind and every generated item', () => {
    expect(checkIssues('odd-one', ODD, colourOdd)).toEqual([]);
    const noisy = sample<ShapeCardsItem>('odd-one', { attr: 'kind', items: 4, noise: true });
    expect(checkIssues('odd-one', { attr: 'kind', items: 4, noise: true }, noisy)).toEqual([]);
  });

  it('rejects the wrong answer card and a card that is not unique', () => {
    expect(checkIssues('odd-one', ODD, { ...colourOdd, answer: 'a' }).join()).toMatch(
      /unique in colour is not the answer/,
    );
    expect(checkIssues('odd-one', ODD, { ...colourOdd, answer: 'z' }).join()).toMatch(
      /not one of the options/,
    );
  });

  it('rejects two cards unique in one attribute (more than one is different)', () => {
    expect(checkIssues('odd-one', ODD, cards('', [red, blue, yellow, red], 'b')).join()).toMatch(
      /2 cards are unique in colour/,
    );
  });

  it('rejects an odd card that is unique in two attributes, or in another attribute than asked', () => {
    const both = cards('', [red, red, { kind: 'square', colour: 'blue' }, red], 'c');
    expect(checkIssues('odd-one', ODD, both).join()).toMatch(/must be unique in colour only/);
    expect(checkIssues('odd-one', { ...ODD, attr: 'kind' }, colourOdd).join()).toMatch(
      /must be unique in kind only/,
    );
  });

  it('rejects cards that are all alike (no odd one)', () => {
    expect(checkIssues('odd-one', ODD, cards('', [red, red, red, red], 'a')).join()).toMatch(
      /unique in nothing|must be unique in colour only/,
    );
  });

  it('rejects an attribute that splits the cards when noise is off, and none when noise is on', () => {
    const tiny = { kind: 'circle', colour: 'red', size: 'tiny' } as const;
    const split = cards('', [red, tiny, blue, tiny], 'c');
    expect(checkIssues('odd-one', ODD, split).join()).toMatch(
      /no attribute may split the cards 2-2, 1 do/,
    );
    const noisy = { attr: 'colour', items: 4, noise: true } as const;
    expect(checkIssues('odd-one', noisy, colourOdd).join()).toMatch(/one attribute may split/);
  });

  it('rejects a second attribute in which a card is unique (a noise that is not 2-2)', () => {
    const noisy = { attr: 'colour', items: 4, noise: true } as const;
    const lopsided = cards(
      '',
      [{ ...red, size: 'tiny' }, { ...red, size: 'tiny' }, { ...blue, size: 'tiny' }, { ...red }],
      'c',
    );
    expect(checkIssues('odd-one', noisy, lopsided).join()).toMatch(/it is in: colour, size/);
  });

  it('rejects a wrong number of cards and repeating option ids', () => {
    expect(checkIssues('odd-one', ODD, cards('', [red, red, blue], 'c')).join()).toMatch(
      /3 cards, 4 expected/,
    );
    expect(
      checkIssues('odd-one', ODD, {
        ...colourOdd,
        options: colourOdd.options.map((option) => ({ ...option, id: 'a' })),
      }).join(),
    ).toMatch(/option ids repeat/);
  });

  it('rejects colours that look alike (red and green) and a square with a diamond', () => {
    expect(checkIssues('odd-one', ODD, cards('', [red, red, green, red], 'c')).join()).toMatch(
      /red and green circle differ only in colour/,
    );
    const kindOdd = { attr: 'kind', items: 3, noise: false } as const;
    expect(
      checkIssues(
        'odd-one',
        kindOdd,
        cards(
          '',
          [
            { kind: 'square', colour: 'red' },
            { kind: 'square', colour: 'red' },
            { kind: 'diamond', colour: 'red' },
          ],
          'c',
        ),
      ).join(),
    ).toMatch(/a square and a diamond/);
    expect(lookAlikes('x', [red, green]).join()).toMatch(/red and green/);
    expect(lookAlikes('x', [star, star])).toEqual([]);
  });

  it('rejects noise with 3 cards', () => {
    expect(() =>
      checkIssues('odd-one', { attr: 'colour', items: 3, noise: true }, colourOdd),
    ).toThrow();
  });
});

describe('odd-rule', () => {
  describe.each(ODD_RULE_SETS)('$attr, $items cards', (set) => {
    it('has a row that shares exactly the set’s attribute, and 3 sentences of which exactly the right one is true of every card', () => {
      const { problems, items } = overSeeds<RuleItem>('odd-rule', set, ({ item, text }) =>
        oddRuleProblems(set, item, text),
      );
      expect(problems).toEqual([]);
      expect(items.length).toBeGreaterThan(0);
      // The right sentence is not always in the same place.
      for (let place = 0; place < 3; place += 1) {
        expect(
          items.filter(({ item }) => item.options[place]?.id === item.answer).length,
          String(place),
        ).toBeGreaterThan(items.length / 8);
      }
    });
  });
});

const sq = (colour: CardShape['colour'], size: CardShape['size']): CardShape => ({
  kind: 'square',
  colour,
  size,
});

/** tiny / medium / huge red shapes of three kinds: all red. */
const RULE_ROW: readonly CardShape[] = [
  { kind: 'circle', colour: 'red', size: 'tiny' },
  { kind: 'square', colour: 'red', size: 'medium' },
  { kind: 'star', colour: 'red', size: 'huge' },
];

const rule = (
  shapes: readonly CardShape[],
  options: readonly string[],
  answer: string,
): RuleItem => ({
  id: 'dr-1',
  type: 'choice',
  text: 'gen.dr-1.text',
  prompt: { shapes },
  options: options.map((id) => ({
    id,
    text: `templates.same.${id}`,
  })),
  answer,
});

const RULE = { attr: 'colour', items: 3 } as const;
const redRule = rule(RULE_ROW, ['colour-red', 'kind-circle', 'size-tiny'], 'colour-red');

describe('odd-rule check', () => {
  it('accepts the curriculum example (a tiny red circle, a medium red square, a huge red star: all red) and every generated item', () => {
    expect(checkIssues('odd-rule', RULE, redRule)).toEqual([]);
    const good = sample<RuleItem>('odd-rule', { attr: 'size', items: 4 });
    expect(checkIssues('odd-rule', { attr: 'size', items: 4 }, good)).toEqual([]);
    expect(authored('templates.same.colour-red')).toBe('They are all red.');
    expect(authored('templates.same.kind-circle')).toBe('They are all circles.');
  });

  it('reads an option id as an attribute and a value', () => {
    expect(parseRuleOption('colour-red')).toEqual({ attr: 'colour', value: 'red' });
    expect(parseRuleOption('size-tiny')).toEqual({ attr: 'size', value: 'tiny' });
    expect(parseRuleOption('count-3')).toBeUndefined();
    expect(parseRuleOption('red')).toBeUndefined();
    expect(ruleOptionId('kind', 'star')).toBe('kind-star');
  });

  it('rejects a wrong answer, a row that shares another attribute, and a row that shares two', () => {
    expect(checkIssues('odd-rule', RULE, { ...redRule, answer: 'kind-circle' }).join()).toMatch(
      /kind circle|answer says/,
    );
    expect(checkIssues('odd-rule', { ...RULE, attr: 'kind' }, redRule).join()).toMatch(
      /exactly kind must be shared/,
    );
    const two = rule(
      [
        sq('red', 'tiny'),
        { kind: 'square', colour: 'red', size: 'huge' },
        { kind: 'square', colour: 'red', size: 'medium' },
      ],
      ['colour-red', 'kind-square', 'size-tiny'],
      'colour-red',
    );
    expect(checkIssues('odd-rule', RULE, two).join()).toMatch(
      /exactly colour must be shared by all, colour, kind is/,
    );
  });

  it('rejects a distractor that names a value no card has, or an attribute all share', () => {
    const none = rule(RULE_ROW, ['colour-red', 'kind-heart', 'size-tiny'], 'colour-red');
    expect(checkIssues('odd-rule', RULE, none).join()).toMatch(
      /kind heart must name an attribute that varies/,
    );
    const shared = rule(
      [
        { kind: 'circle', colour: 'red', size: 'medium' },
        { kind: 'square', colour: 'red', size: 'medium' },
        { kind: 'star', colour: 'red', size: 'medium' },
      ],
      ['colour-red', 'kind-circle', 'size-medium'],
      'colour-red',
    );
    expect(checkIssues('odd-rule', RULE, shared).join()).toMatch(
      /size medium must name an attribute that varies/,
    );
  });

  it('rejects options that do not name colour, kind and size once each, and an answer that is not an option', () => {
    expect(
      checkIssues(
        'odd-rule',
        RULE,
        rule(RULE_ROW, ['colour-red', 'colour-blue', 'size-tiny'], 'colour-red'),
      ).join(),
    ).toMatch(/colour, kind and size once each/);
    expect(
      checkIssues(
        'odd-rule',
        RULE,
        rule(RULE_ROW, ['colour-red', 'kind-circle'], 'colour-red'),
      ).join(),
    ).toMatch(/colour, kind and size once each/);
    expect(checkIssues('odd-rule', RULE, { ...redRule, answer: 'colour-blue' }).join()).toMatch(
      /not one of the options/,
    );
  });

  it('rejects a gap, the wrong number of cards, two alike cards, a cluster, and look-alike colours', () => {
    expect(
      checkIssues('odd-rule', RULE, {
        ...redRule,
        prompt: { shapes: [...RULE_ROW.slice(0, 2), 'gap'] },
      }).join(),
    ).toMatch(/3 shapes, no gap/);
    expect(
      checkIssues('odd-rule', RULE, {
        ...redRule,
        prompt: { shapes: RULE_ROW.slice(0, 2) },
      }).join(),
    ).toMatch(/3 shapes, no gap/);
    const alike = [RULE_ROW[0] as CardShape, RULE_ROW[0] as CardShape, RULE_ROW[2] as CardShape];
    expect(checkIssues('odd-rule', RULE, { ...redRule, prompt: { shapes: alike } }).join()).toMatch(
      /two cards are alike/,
    );
    const cluster = RULE_ROW.map((shape) => ({ ...shape, count: 2 }));
    expect(
      checkIssues('odd-rule', RULE, { ...redRule, prompt: { shapes: cluster } }).join(),
    ).toMatch(/more than one shape/);
    const looks = rule(
      [sq('red', 'big'), sq('green', 'big'), sq('blue', 'big')],
      ['kind-square', 'colour-red', 'size-tiny'],
      'kind-square',
    );
    expect(checkIssues('odd-rule', { attr: 'kind', items: 3 }, looks).join()).toMatch(
      /red and green square differ only in colour/,
    );
  });
});
