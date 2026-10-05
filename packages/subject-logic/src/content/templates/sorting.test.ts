// sort-boxes, carroll and venn over 200 seeds per parameter set: each item is solved again here from its own rules, cards and words
// (animals from an independent copy of the table), and every `check` fails on a hand-broken item. Carroll covers every ordered pair of
// attributes (colour, kind, size, count) with 4, 6 and 8 cards, venn both fact kinds with 4-8 cards and with / without outside.
import { describe, expect, it } from 'vitest';
import type { CardShape } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import type { GroupItem } from './items.ts';
import {
  ANIMAL_TABLE,
  CARROLL_SETS,
  SORT_BOXES_SETS,
  VENN_SETS,
  carrollProblems,
  sortBoxesProblems,
  vennProblems,
} from './solvers-w2.ts';
import { ANIMALS, ANIMAL_PAIRS, animalsFor } from './animals.ts';
import { checkIssues, overSeeds, sample } from './testing.ts';

describe('sort-boxes', () => {
  describe.each(SORT_BOXES_SETS)('$attr, $boxes boxes, $items cards', (set) => {
    it('has boxes whose rules put every card in exactly one box (the answer), every box holds a card, and the words say the rule', () => {
      const { problems, items } = overSeeds<GroupItem>('sort-boxes', set, ({ item, text }) =>
        sortBoxesProblems(set, item, text),
      );
      expect(problems).toEqual([]);
      expect(items.length).toBeGreaterThan(0);
    });
  });
});

describe('carroll', () => {
  describe.each(CARROLL_SETS)('$axes × $items cards', (set) => {
    it('has two rules that put every card in exactly one of the 4 zones (the answer), every zone holds a card, and the words say the rules', () => {
      const { problems, items } = overSeeds<GroupItem>('carroll', set, ({ item, text }) =>
        carrollProblems(set, item, text),
      );
      expect(problems).toEqual([]);
      expect(items.length).toBeGreaterThan(0);
    });
  });
});

describe('venn', () => {
  describe.each(VENN_SETS)('$facts × $items cards, outside $outside', (set) => {
    it('has two rules that put every card in its region (the answer); the circles and, with outside, the outside hold a card; animals follow the table', () => {
      const { problems, items } = overSeeds<GroupItem>('venn', set, ({ item, text }) =>
        vennProblems(set, item, text),
      );
      expect(problems).toEqual([]);
      expect(items.length).toBeGreaterThan(0);
    });
  });
});

describe('the animal facts', () => {
  it('are the table of the curriculum, 16 animals', () => {
    expect(ANIMALS).toHaveLength(16);
    expect(ANIMALS.map(({ id, emoji, tags }) => ({ id, emoji, tags }))).toEqual(
      ANIMAL_TABLE.map(({ id, emoji, tags }) => ({ id, emoji, tags })),
    );
  });

  it('use the pairs fly × swim and farm × legs:4, each splitting the animals into 4 non-empty zones', () => {
    expect(ANIMAL_PAIRS).toEqual([
      ['can:fly', 'can:swim'],
      ['farm', 'legs:4'],
    ]);
    for (const [a, b] of ANIMAL_PAIRS) {
      const eligible = animalsFor([a, b]);
      for (const inA of [true, false]) {
        for (const inB of [true, false]) {
          const zone = eligible.filter(
            (animal) => animal.tags.includes(a) === inA && animal.tags.includes(b) === inB,
          );
          expect(zone.length, `${a} ${b} ${String(inA)} ${String(inB)}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('never put a disputable card in a venn: no frog with legs:4, no dog with swim or farm; a penguin is only ever a swimmer', () => {
    expect(animalsFor(['farm', 'legs:4']).map((animal) => animal.id)).not.toContain('frog');
    expect(animalsFor(['farm', 'legs:4']).map((animal) => animal.id)).not.toContain('dog');
    expect(animalsFor(['can:fly', 'can:swim']).map((animal) => animal.id)).not.toContain('dog');
    expect(animalsFor(['can:fly', 'can:swim']).map((animal) => animal.id)).toContain('frog');
    expect(ANIMALS.find((animal) => animal.id === 'penguin')?.tags).toEqual(['can:swim']);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// check: every rule fails on a hand-broken item

const circle = (colour: CardShape['colour'], size?: CardShape['size']): CardShape => ({
  kind: 'circle',
  colour,
  ...(size === undefined ? {} : { size }),
});

const BOXES = { attr: 'colour', boxes: 2, items: 4 } as const;

/** Red / Not red: two red circles, a blue and a yellow one. */
const redBoxes: GroupItem = {
  id: 'dr-1',
  type: 'group',
  text: 'gen.dr-1.text',
  layout: 'row',
  boxes: [
    { id: 'yes', text: 'templates.label.colour-red', rule: { all: ['colour:red'] } },
    { id: 'no', text: 'templates.not.colour-red', rule: { none: ['colour:red'] } },
  ],
  items: [
    { id: 'c1', shape: circle('red') },
    { id: 'c2', shape: { kind: 'star', colour: 'red' } },
    { id: 'c3', shape: circle('blue') },
    { id: 'c4', shape: { kind: 'star', colour: 'yellow' } },
  ],
  answer: { c1: 'yes', c2: 'yes', c3: 'no', c4: 'no' },
};

describe('sort-boxes check', () => {
  it('accepts a good item (red / not red) and every generated item', () => {
    expect(checkIssues('sort-boxes', BOXES, redBoxes)).toEqual([]);
    const three = { attr: 'kind', boxes: 3, items: 5 } as const;
    expect(checkIssues('sort-boxes', three, sample<GroupItem>('sort-boxes', three))).toEqual([]);
  });

  it('rejects a card the rules put in another box than the answer', () => {
    const broken = { ...redBoxes, answer: { ...redBoxes.answer, c1: 'no' } };
    expect(checkIssues('sort-boxes', BOXES, broken).join()).toMatch(
      /card c1 goes in "yes", the answer says "no"/,
    );
  });

  it('rejects a card that fits no box or two boxes', () => {
    const noBox = {
      ...redBoxes,
      boxes: [
        redBoxes.boxes?.[0],
        { id: 'no', text: 'templates.not.colour-red', rule: { all: ['colour:blue'] } },
      ],
    };
    expect(checkIssues('sort-boxes', BOXES, noBox as GroupItem).join()).toMatch(/fits 0 boxes/);
    const both = {
      ...redBoxes,
      boxes: [
        redBoxes.boxes?.[0],
        { id: 'no', text: 'templates.not.colour-red', rule: { all: ['kind:circle'] } },
      ],
    };
    expect(checkIssues('sort-boxes', BOXES, both as GroupItem).join()).toMatch(
      /fits 2 boxes|about colour/,
    );
  });

  it('rejects an empty box, a wrong number of cards and a wrong number of boxes', () => {
    const empty = { ...redBoxes, answer: { c1: 'yes', c2: 'yes', c3: 'yes', c4: 'yes' } };
    expect(checkIssues('sort-boxes', BOXES, empty).join()).toMatch(/box "no" holds no card/);
    expect(checkIssues('sort-boxes', { ...BOXES, items: 5 }, redBoxes).join()).toMatch(
      /4 cards, 5 expected/,
    );
    expect(checkIssues('sort-boxes', { ...BOXES, boxes: 3 }, redBoxes).join()).toMatch(
      /row of 3 boxes/,
    );
  });

  it('rejects boxes about another attribute than asked, two boxes that are not value / not value, and three boxes that repeat a value', () => {
    expect(checkIssues('sort-boxes', { ...BOXES, attr: 'kind' }, redBoxes).join()).toMatch(
      /about kind/,
    );
    const same = {
      ...redBoxes,
      boxes: [
        redBoxes.boxes?.[0],
        { id: 'no', text: 'templates.not.colour-red', rule: { all: ['colour:blue'] } },
      ],
    };
    expect(checkIssues('sort-boxes', BOXES, same as GroupItem).join()).toMatch(
      /"value" \(all\) and "not value"/,
    );
    const three = { attr: 'colour', boxes: 3, items: 4 } as const;
    const repeat: GroupItem = {
      ...redBoxes,
      boxes: [
        { id: 'red', text: 'templates.label.colour-red', rule: { all: ['colour:red'] } },
        { id: 'blue', text: 'templates.label.colour-blue', rule: { all: ['colour:blue'] } },
        { id: 'also-red', text: 'templates.label.colour-red', rule: { all: ['colour:red'] } },
      ],
      answer: { c1: 'red', c2: 'red', c3: 'blue', c4: 'blue' },
    };
    expect(checkIssues('sort-boxes', three, repeat).join()).toMatch(/three different values/);
  });

  it('rejects two cards that look the same and colours that look alike', () => {
    const twins = {
      ...redBoxes,
      items: [...redBoxes.items.slice(0, 3), { id: 'c4', shape: circle('blue') }],
    };
    expect(checkIssues('sort-boxes', BOXES, twins).join()).toMatch(/two cards look the same/);
    const alike: GroupItem = {
      ...redBoxes,
      items: [
        { id: 'c1', shape: circle('red') },
        { id: 'c2', shape: circle('green') },
        { id: 'c3', shape: circle('blue') },
        { id: 'c4', shape: { kind: 'star', colour: 'yellow' } },
      ],
      answer: { c1: 'yes', c2: 'no', c3: 'no', c4: 'no' },
    };
    expect(checkIssues('sort-boxes', BOXES, alike).join()).toMatch(
      /red and green circle differ only in colour/,
    );
  });
});

const CARROLL = { axes: ['colour', 'kind'], items: 4 } as const;

/** Red × circle: one card in each of the 4 zones. */
const redCircle: GroupItem = {
  id: 'dr-1',
  type: 'group',
  text: 'gen.dr-1.text',
  layout: 'carroll',
  axes: [
    {
      text: 'templates.label.colour-red',
      notText: 'templates.not.colour-red',
      rule: { all: ['colour:red'] },
    },
    {
      text: 'templates.label.kind-circle',
      notText: 'templates.not.kind-circle',
      rule: { all: ['kind:circle'] },
    },
  ],
  items: [
    { id: 'c1', shape: circle('red') },
    { id: 'c2', shape: { kind: 'star', colour: 'red' } },
    { id: 'c3', shape: circle('blue') },
    { id: 'c4', shape: { kind: 'star', colour: 'blue' } },
  ],
  answer: { c1: 'a-b', c2: 'a-not-b', c3: 'not-a-b', c4: 'not-a-not-b' },
};

describe('carroll check', () => {
  it('accepts red × circle with a card in each zone and every generated item', () => {
    expect(checkIssues('carroll', CARROLL, redCircle)).toEqual([]);
    const set = { axes: ['kind', 'count'], items: 6 } as const;
    expect(checkIssues('carroll', set, sample<GroupItem>('carroll', set))).toEqual([]);
  });

  it('rejects a card in the wrong zone, an empty zone, and the wrong number of cards', () => {
    expect(
      checkIssues('carroll', CARROLL, {
        ...redCircle,
        answer: { ...redCircle.answer, c2: 'a-b' },
      }).join(),
    ).toMatch(/card c2 goes in "a-not-b" by the rules, the answer says "a-b"/);
    const emptyZone: GroupItem = {
      ...redCircle,
      items: [
        redCircle.items[0],
        redCircle.items[1],
        redCircle.items[2],
        { id: 'c4', shape: circle('yellow') },
      ] as GroupItem['items'],
      answer: { c1: 'a-b', c2: 'a-not-b', c3: 'not-a-b', c4: 'not-a-b' },
    };
    expect(checkIssues('carroll', CARROLL, emptyZone).join()).toMatch(
      /zone "not-a-not-b" holds no card/,
    );
    expect(checkIssues('carroll', { ...CARROLL, items: 6 }, redCircle).join()).toMatch(
      /4 cards, 6 expected/,
    );
  });

  it('rejects axes about other attributes than asked, in another order, and an axis that is not one fact', () => {
    expect(
      checkIssues('carroll', { ...CARROLL, axes: ['kind', 'colour'] }, redCircle).join(),
    ).toMatch(/the axes must be kind × colour/);
    const multi: GroupItem = {
      ...redCircle,
      axes: [
        {
          text: 'templates.label.colour-red',
          notText: 'templates.not.colour-red',
          rule: { all: ['colour:red', 'kind:circle'] },
        },
        redCircle.axes?.[1] as NonNullable<GroupItem['axes']>[1],
      ],
    };
    expect(checkIssues('carroll', CARROLL, multi).join()).toMatch(/one rule: one fact/);
  });

  it('rejects another layout, two cards that look the same and colours that look alike', () => {
    expect(checkIssues('carroll', CARROLL, { ...redCircle, layout: 'venn' }).join()).toMatch(
      /layout "carroll"/,
    );
    const twins = {
      ...redCircle,
      items: [...redCircle.items.slice(0, 3), { id: 'c4', shape: circle('blue') }],
    };
    expect(checkIssues('carroll', CARROLL, twins).join()).toMatch(/two cards look the same/);
    const alike: GroupItem = {
      ...redCircle,
      items: [
        { id: 'c1', shape: circle('red') },
        { id: 'c2', shape: { kind: 'star', colour: 'red' } },
        { id: 'c3', shape: circle('blue') },
        { id: 'c4', shape: { kind: 'star', colour: 'blue' } },
        { id: 'c5', shape: circle('green') },
      ],
      answer: { ...redCircle.answer, c5: 'not-a-b' },
    };
    expect(checkIssues('carroll', { ...CARROLL, items: 5 }, alike).join()).toMatch(
      /red and green circle differ only in colour/,
    );
  });
});

const VENN = { facts: 'shapes', items: 4, outside: true } as const;

/** Red × circle as a Venn: one card in each of the 4 regions. */
const redCircleVenn: GroupItem = {
  ...redCircle,
  layout: 'venn',
  answer: { c1: 'both', c2: 'only-a', c3: 'only-b', c4: 'neither' },
};

describe('venn check', () => {
  it('accepts red × circle with a card in each region, a venn without outside, and every generated item', () => {
    expect(checkIssues('venn', VENN, redCircleVenn)).toEqual([]);
    const noOutside = { facts: 'shapes', items: 3 + 1, outside: false } as const;
    const three: GroupItem = {
      ...redCircleVenn,
      items: [
        { id: 'c1', shape: circle('red') },
        { id: 'c2', shape: { kind: 'star', colour: 'red' } },
        { id: 'c3', shape: circle('blue') },
        { id: 'c4', shape: circle('yellow') },
      ],
      answer: { c1: 'both', c2: 'only-a', c3: 'only-b', c4: 'only-b' },
      allowEmpty: true,
    };
    expect(checkIssues('venn', noOutside, three)).toEqual([]);
    const animals = { facts: 'animals', items: 6, outside: true } as const;
    expect(checkIssues('venn', animals, sample<GroupItem>('venn', animals))).toEqual([]);
  });

  it('rejects a card in the wrong region, an empty circle region, and an empty outside', () => {
    expect(
      checkIssues('venn', VENN, {
        ...redCircleVenn,
        answer: { ...redCircleVenn.answer, c4: 'only-a' },
      }).join(),
    ).toMatch(/card c4 goes in "neither" by the rules, the answer says "only-a"/);
    const noBoth: GroupItem = {
      ...redCircleVenn,
      items: [
        redCircleVenn.items[1],
        redCircleVenn.items[2],
        redCircleVenn.items[3],
        { id: 'c1', shape: circle('yellow') },
      ] as GroupItem['items'],
      answer: { c2: 'only-a', c3: 'only-b', c4: 'neither', c1: 'only-b' },
    };
    expect(checkIssues('venn', VENN, noBoth).join()).toMatch(/zone "both" holds no card/);
    const noOutside: GroupItem = {
      ...redCircleVenn,
      items: [
        redCircleVenn.items[0],
        redCircleVenn.items[1],
        redCircleVenn.items[2],
        { id: 'c4', shape: circle('yellow') },
      ] as GroupItem['items'],
      answer: { c1: 'both', c2: 'only-a', c3: 'only-b', c4: 'only-b' },
    };
    expect(checkIssues('venn', VENN, noOutside).join()).toMatch(/zone "neither" holds no card/);
  });

  it('rejects a card outside when outside is off, and allowEmpty that does not match outside', () => {
    const off = { facts: 'shapes', items: 4, outside: false } as const;
    expect(checkIssues('venn', off, { ...redCircleVenn, allowEmpty: true }).join()).toMatch(
      /a card sits outside both circles, outside is off/,
    );
    expect(checkIssues('venn', off, redCircleVenn).join()).toMatch(/needs allowEmpty/);
    expect(checkIssues('venn', VENN, { ...redCircleVenn, allowEmpty: true }).join()).toMatch(
      /allowEmpty is only for a venn without outside/,
    );
  });

  it('rejects shape axes on one attribute, an animal pair that is not one, a made-up animal, wrong tags, and a disputable card', () => {
    const colours: GroupItem = {
      ...redCircleVenn,
      axes: [
        redCircleVenn.axes?.[0] as NonNullable<GroupItem['axes']>[0],
        {
          text: 'templates.label.colour-blue',
          notText: 'templates.not.colour-blue',
          rule: { all: ['colour:blue'] },
        },
      ],
    };
    expect(checkIssues('venn', VENN, colours).join()).toMatch(/two rules on different attributes/);
    const animal = sample<GroupItem>('venn', { facts: 'animals', items: 6, outside: true });
    const animals = { facts: 'animals', items: 6, outside: true } as const;
    const swimLegs: GroupItem = {
      ...animal,
      axes: [
        {
          text: 'templates.label.can-swim',
          notText: 'templates.not.can-swim',
          rule: { all: ['can:swim'] },
        },
        {
          text: 'templates.label.four-legs',
          notText: 'templates.not.four-legs',
          rule: { all: ['legs:4'] },
        },
      ],
    };
    expect(checkIssues('venn', animals, swimLegs).join()).toMatch(/is not an animal pair/);
    const first = animal.items[0] as NonNullable<GroupItem['items']>[number];
    const madeUp = { ...animal, items: [{ ...first, emoji: '🦄' }, ...animal.items.slice(1)] };
    expect(checkIssues('venn', animals, madeUp).join()).toMatch(/is not an animal of the table/);
    const tags = {
      ...animal,
      items: [{ ...first, tags: ['can:fly', 'can:swim', 'legs:4'] }, ...animal.items.slice(1)],
    };
    expect(checkIssues('venn', animals, tags).join()).toMatch(/has other tags than the table/);
    const frog: GroupItem = {
      ...animal,
      axes: [
        { text: 'templates.label.farm', notText: 'templates.not.farm', rule: { all: ['farm'] } },
        {
          text: 'templates.label.four-legs',
          notText: 'templates.not.four-legs',
          rule: { all: ['legs:4'] },
        },
      ],
      items: [{ id: 'frog', emoji: '🐸', tags: ['can:swim', 'legs:4'] }, ...animal.items.slice(1)],
      answer: { ...animal.answer, frog: 'only-b' },
    };
    expect(checkIssues('venn', animals, frog).join()).toMatch(
      /left out of this pair \(a child could dispute it\)/,
    );
  });
});
