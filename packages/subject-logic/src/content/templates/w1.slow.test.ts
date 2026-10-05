// `pnpm test:slow`: every W1 parameter set over 1 000 seeds (the fast suites run the same sets over 200), each item solved again from its
// own card by the independent solvers of `solvers.ts`.
import { describe, expect, it } from 'vitest';
import type { EntryItem, RuleChoiceItem, ShapeChoiceItem, ShapeEntryItem } from './items.ts';
import {
  FAR_SETS,
  GROW_SETS,
  PATTERN_SETS,
  STEP_NEXT_SETS,
  STEP_RULE_SETS,
  farProblems,
  growProblems,
  patternProblems,
  stepNextProblems,
  stepRuleProblems,
} from './solvers.ts';
import { SLOW_SEEDS, overSeeds } from './testing.ts';

describe.each(['next', 'gap'] as const)('pat-%s, 1 000 seeds', (mode) => {
  it.each(PATTERN_SETS)('$unit on $attr, units $units', (set) => {
    const { problems, items } = overSeeds<ShapeChoiceItem>(
      `pat-${mode}`,
      set,
      ({ item, text }) => patternProblems(mode, set, item, text),
      SLOW_SEEDS,
    );
    expect(problems).toEqual([]);
    expect(items).toHaveLength(SLOW_SEEDS);
  });
});

describe('step-next, 1 000 seeds', () => {
  it.each(STEP_NEXT_SETS)('$family $step easy $easy', (set) => {
    const { problems, items } = overSeeds<EntryItem>(
      'step-next',
      set,
      ({ item, text }) => stepNextProblems(set, item, text),
      SLOW_SEEDS,
    );
    expect(problems).toEqual([]);
    expect(items).toHaveLength(SLOW_SEEDS);
  });
});

describe('step-rule, 1 000 seeds', () => {
  it.each(STEP_RULE_SETS)('$family $step', (set) => {
    const { problems, items } = overSeeds<RuleChoiceItem>(
      'step-rule',
      set,
      ({ item, text, english }) => stepRuleProblems(set, item, text, english),
      SLOW_SEEDS,
    );
    expect(problems).toEqual([]);
    expect(items).toHaveLength(SLOW_SEEDS);
  });
});

describe('grow-next, 1 000 seeds', () => {
  it.each(GROW_SETS)('$mode step $step start $start ahead $ahead', (set) => {
    const { problems, items } = overSeeds<ShapeChoiceItem | ShapeEntryItem>(
      'grow-next',
      set,
      ({ item, text }) => growProblems(set, item, text),
      SLOW_SEEDS,
    );
    expect(problems).toEqual([]);
    expect(items).toHaveLength(SLOW_SEEDS);
  });
});

describe('far-term, 1 000 seeds', () => {
  it.each(FAR_SETS)('$unit on $attr, place $position', (set) => {
    const { problems, items } = overSeeds<ShapeChoiceItem>(
      'far-term',
      set,
      ({ item, text }) => farProblems(set, item, text),
      SLOW_SEEDS,
    );
    expect(problems).toEqual([]);
    expect(items).toHaveLength(SLOW_SEEDS);
  });
});
