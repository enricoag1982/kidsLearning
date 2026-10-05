// `pnpm test:slow`: every W2 parameter set over 1 000 seeds (the fast suites run the same sets over 200), each item solved again from
// its own cards, rules and sentences by the independent solvers of `solvers-w2.ts`.
import { describe, expect, it } from 'vitest';
import type {
  GroupItem,
  OrderShapesItem,
  ShapeCardsItem,
  ShapeChoiceItem,
  TextOption,
} from './items.ts';
import {
  CARROLL_SETS,
  LINE_UP_SETS,
  ODD_ONE_SETS,
  ODD_RULE_SETS,
  SORT_BOXES_SETS,
  VENN_SETS,
  carrollProblems,
  lineUpProblems,
  oddOneProblems,
  oddRuleProblems,
  sortBoxesProblems,
  vennProblems,
} from './solvers-w2.ts';
import { SLOW_SEEDS, overSeeds } from './testing.ts';

describe('odd-one, 1 000 seeds', () => {
  it.each(ODD_ONE_SETS)('$attr, $items cards, noise $noise', (set) => {
    const { problems, items } = overSeeds<ShapeCardsItem>(
      'odd-one',
      set,
      ({ item, text }) => oddOneProblems(set, item, text),
      SLOW_SEEDS,
    );
    expect(problems).toEqual([]);
    expect(items).toHaveLength(SLOW_SEEDS);
  });
});

describe('odd-rule, 1 000 seeds', () => {
  it.each(ODD_RULE_SETS)('$attr, $items cards', (set) => {
    const { problems, items } = overSeeds<
      ShapeChoiceItem & { readonly options: readonly TextOption[] }
    >('odd-rule', set, ({ item, text }) => oddRuleProblems(set, item, text), SLOW_SEEDS);
    expect(problems).toEqual([]);
    expect(items).toHaveLength(SLOW_SEEDS);
  });
});

describe('sort-boxes, 1 000 seeds', () => {
  it.each(SORT_BOXES_SETS)('$attr, $boxes boxes, $items cards', (set) => {
    const { problems, items } = overSeeds<GroupItem>(
      'sort-boxes',
      set,
      ({ item, text }) => sortBoxesProblems(set, item, text),
      SLOW_SEEDS,
    );
    expect(problems).toEqual([]);
    expect(items).toHaveLength(SLOW_SEEDS);
  });
});

describe('carroll, 1 000 seeds', () => {
  it.each(CARROLL_SETS)('$axes × $items cards', (set) => {
    const { problems, items } = overSeeds<GroupItem>(
      'carroll',
      set,
      ({ item, text }) => carrollProblems(set, item, text),
      SLOW_SEEDS,
    );
    expect(problems).toEqual([]);
    expect(items).toHaveLength(SLOW_SEEDS);
  });
});

describe('venn, 1 000 seeds', () => {
  it.each(VENN_SETS)('$facts × $items cards, outside $outside', (set) => {
    const { problems, items } = overSeeds<GroupItem>(
      'venn',
      set,
      ({ item, text }) => vennProblems(set, item, text),
      SLOW_SEEDS,
    );
    expect(problems).toEqual([]);
    expect(items).toHaveLength(SLOW_SEEDS);
  });
});

describe('line-up, 1 000 seeds', () => {
  it.each(LINE_UP_SETS)('$by, $items cards', (set) => {
    const { problems, items } = overSeeds<OrderShapesItem>(
      'line-up',
      set,
      ({ item, text }) => lineUpProblems(set, item, text),
      SLOW_SEEDS,
    );
    expect(problems).toEqual([]);
    expect(items).toHaveLength(SLOW_SEEDS);
  });
});
