// line-up over 200 seeds per parameter set (size and count with 3, 4 and 5 cards): each item is solved again here by sorting the shown
// cards, and every `check` fails on a hand-broken item.
import { describe, expect, it } from 'vitest';
import type { CardShape } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import type { OrderShapesItem } from './items.ts';
import { LINE_UP_SETS, lineUpProblems } from './solvers-w2.ts';
import { checkIssues, overSeeds, sample } from './testing.ts';

describe('line-up', () => {
  describe.each(LINE_UP_SETS)('$by, $items cards', (set) => {
    it('shows cards of one kind and colour that differ only in the set’s attribute, in a mixed order, and the answer is the strict order, smallest / fewest first', () => {
      const { problems, items } = overSeeds<OrderShapesItem>('line-up', set, ({ item, text }) =>
        lineUpProblems(set, item, text),
      );
      expect(problems).toEqual([]);
      expect(items.length).toBeGreaterThan(0);
    });
  });

  it('draws 5 sizes in full, and 4 of the 5 for 4 cards', () => {
    const sizes = (items: number): Set<string> =>
      new Set(
        overSeeds<OrderShapesItem>('line-up', { by: 'size', items }, () => []).items.map(
          ({ item }) =>
            item.items
              .map((card) => card.shape.size ?? 'big')
              .sort()
              .join(),
        ),
      );
    expect([...sizes(5)]).toEqual(['big,huge,medium,small,tiny']);
    expect(sizes(4).size).toBeGreaterThan(1);
    expect([...sizes(3)]).toEqual(['huge,medium,tiny']);
  });
});

const tri = (size: CardShape['size']): CardShape => ({ kind: 'triangle', colour: 'green', size });

/** tiny, medium, huge green triangles, shown medium, huge, tiny. */
const bySize: OrderShapesItem = {
  id: 'dr-1',
  type: 'order',
  text: 'gen.dr-1.text',
  items: [
    { id: 's-medium', shape: tri('medium') },
    { id: 's-huge', shape: tri('huge') },
    { id: 's-tiny', shape: tri('tiny') },
  ],
  answer: ['s-tiny', 's-medium', 's-huge'],
};

const SIZE = { by: 'size', items: 3 } as const;

const count = (n: number): { id: string; shape: CardShape } => ({
  id: `n-${String(n)}`,
  shape: { kind: 'star', colour: 'yellow', count: n },
});

const byCount: OrderShapesItem = {
  id: 'dr-1',
  type: 'order',
  text: 'gen.dr-1.text',
  items: [count(5), count(2), count(8), count(3)],
  answer: ['n-2', 'n-3', 'n-5', 'n-8'],
};

const COUNT = { by: 'count', items: 4 } as const;

describe('line-up check', () => {
  it('accepts the curriculum example (tiny, medium, huge green triangles), a count order and every generated item', () => {
    expect(checkIssues('line-up', SIZE, bySize)).toEqual([]);
    expect(checkIssues('line-up', COUNT, byCount)).toEqual([]);
    expect(
      checkIssues(
        'line-up',
        { by: 'size', items: 5 },
        sample<OrderShapesItem>('line-up', { by: 'size', items: 5 }),
      ),
    ).toEqual([]);
  });

  it('rejects an answer that is not the strict order, smallest first (and biggest first)', () => {
    expect(
      checkIssues('line-up', SIZE, { ...bySize, answer: ['s-tiny', 's-huge', 's-medium'] }).join(),
    ).toMatch(/not strictly smallest first/);
    expect(
      checkIssues('line-up', SIZE, { ...bySize, answer: ['s-huge', 's-medium', 's-tiny'] }).join(),
    ).toMatch(/not strictly smallest first/);
    expect(
      checkIssues('line-up', COUNT, { ...byCount, answer: ['n-8', 'n-5', 'n-3', 'n-2'] }).join(),
    ).toMatch(/not strictly fewest first/);
  });

  it('rejects a tie (two cards of one size or one count)', () => {
    const tie: OrderShapesItem = {
      ...bySize,
      items: [
        bySize.items[0],
        bySize.items[1],
        { id: 's-also-tiny', shape: tri('medium') },
      ] as OrderShapesItem['items'],
      answer: ['s-medium', 's-also-tiny', 's-huge'],
    };
    expect(checkIssues('line-up', SIZE, tie).join()).toMatch(
      /not strictly smallest first|two cards tie/,
    );
    expect(
      checkIssues('line-up', COUNT, {
        ...byCount,
        items: [
          count(5),
          { id: 'n-5b', shape: { kind: 'star', colour: 'yellow', count: 5 } },
          count(8),
          count(3),
        ],
        answer: ['n-3', 'n-5', 'n-5b', 'n-8'],
      }).join(),
    ).toMatch(/two cards tie/);
  });

  it('rejects an answer that skips or invents a card, and cards shown in the answer order', () => {
    expect(
      checkIssues('line-up', SIZE, { ...bySize, answer: ['s-tiny', 's-medium'] }).join(),
    ).toMatch(/must name every card once/);
    expect(
      checkIssues('line-up', SIZE, { ...bySize, answer: ['s-tiny', 's-medium', 's-gone'] }).join(),
    ).toMatch(/names a card that is not shown/);
    expect(
      checkIssues('line-up', SIZE, {
        ...bySize,
        items: [...bySize.items].reverse().sort((a, b) => b.id.localeCompare(a.id)),
        answer: ['s-tiny', 's-medium', 's-huge'],
      }).join(),
    ).toMatch(/shown in the answer order/);
  });

  it('rejects a wrong number of cards, cards of two kinds or colours, and cards that differ in another attribute', () => {
    expect(checkIssues('line-up', { by: 'size', items: 4 }, bySize).join()).toMatch(
      /3 cards, 4 expected/,
    );
    const mixed = {
      ...bySize,
      items: [
        { id: 's-medium', shape: { kind: 'circle', colour: 'green', size: 'medium' } },
        ...bySize.items.slice(1),
      ],
    } as OrderShapesItem;
    expect(checkIssues('line-up', SIZE, mixed).join()).toMatch(/one kind and one colour/);
    const recoloured = {
      ...bySize,
      items: [
        { id: 's-medium', shape: { kind: 'triangle', colour: 'blue', size: 'medium' } },
        ...bySize.items.slice(1),
      ],
    } as OrderShapesItem;
    expect(checkIssues('line-up', SIZE, recoloured).join()).toMatch(/one kind and one colour/);
    const clustered = {
      ...bySize,
      items: [
        { id: 's-medium', shape: { kind: 'triangle', colour: 'green', size: 'medium', count: 2 } },
        ...bySize.items.slice(1),
      ],
    } as OrderShapesItem;
    expect(checkIssues('line-up', SIZE, clustered).join()).toMatch(/may differ in size only/);
    const sized = {
      ...byCount,
      items: [
        { id: 'n-5', shape: { kind: 'star', colour: 'yellow', count: 5, size: 'tiny' } },
        ...byCount.items.slice(1),
      ],
    } as OrderShapesItem;
    expect(checkIssues('line-up', COUNT, sized).join()).toMatch(/may differ in count only/);
  });
});
