// `pnpm test:slow`: every W3 sudoku parameter set over 1 000 seeds (the fast suite runs the same sets over 200), each item solved again
// from its givens by the counter and the human-style solver of `sudoku-sets.ts`.
import { describe, expect, it } from 'vitest';
import type { SudokuItem } from './items.ts';
import { MAX_WORDS, SUDOKU_SETS, paramsOf, sudokuProblems } from './sudoku-sets.ts';
import { SLOW_SEEDS, overSeeds } from './testing.ts';

describe('sudoku templates, 1 000 seeds', () => {
  it.each(SUDOKU_SETS)('$template empty $empty guided $guided tries $maxTries', (set) => {
    const { problems, items } = overSeeds<SudokuItem>(
      set.template,
      paramsOf(set),
      ({ item, text }) => sudokuProblems(set, item, text),
      SLOW_SEEDS,
      MAX_WORDS,
    );
    expect(problems).toEqual([]);
    expect(items).toHaveLength(SLOW_SEEDS);
  });
});
