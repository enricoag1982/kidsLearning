// The W3 sudoku templates over 200 seeds per parameter set of the curriculum: each item is solved again from its givens
// (`findSudokuSolution`, the counter, the human-style solver) and compared, and every `check` fails on a hand-broken item.
import { describe, expect, it } from 'vitest';
import { parseSudoku } from '../../core/puzzles/sudoku.ts';
import { findSudokuSolution } from '../puzzles/sudoku-count.ts';
import type { SudokuItem } from './items.ts';
import {
  GUIDED_SENTENCE,
  MAX_WORDS,
  SUDOKU_SETS,
  SUDOKU_TEMPLATES,
  paramsOf,
  sudokuProblems,
} from './sudoku-sets.ts';
import { SEEDS, checkIssues, draw, overSeeds, sample } from './testing.ts';

describe('the sudoku templates', () => {
  describe.each(SUDOKU_SETS)('$template empty $empty guided $guided tries $maxTries', (set) => {
    it('gives a unique grid with the exact number of empty cells that the lesson’s techniques finish, with the focus technique, the guided target and the sentence', () => {
      const { problems, items } = overSeeds<SudokuItem>(
        set.template,
        paramsOf(set),
        ({ item, text }) => sudokuProblems(set, item, text),
        SEEDS,
        MAX_WORDS,
      );
      expect(problems).toEqual([]);
      expect(items).toHaveLength(200);
    });
  });

  it('draws the same grid for the same seed and other grids for other seeds', () => {
    const grids = (seed: number): string[] =>
      draw<SudokuItem>('sdk-six', { empty: 10 }, seed).drawn.map(({ item }) =>
        item.sudoku.join('/'),
      );
    expect(grids(7)).toEqual(grids(7));
    const seen = new Set(Array.from({ length: 30 }, (_, seed) => grids(seed).join()));
    expect(seen.size).toBeGreaterThan(25);
  });

  it('words a guided item and a whole grid as the curriculum does', () => {
    expect(draw<SudokuItem>('sdk-last', { empty: 4, guided: true }, 1).drawn[0]?.text).toBe(
      GUIDED_SENTENCE,
    );
    for (const [template, { text }] of Object.entries(SUDOKU_TEMPLATES)) {
      expect(draw<SudokuItem>(template, { empty: 8 }, 1).drawn[0]?.text).toBe(text);
    }
    expect(GUIDED_SENTENCE).toBe('Which number goes in the ringed cell?');
  });

  it('puts one target on a guided item: the cell of the first step with the focus technique, counted from 0 as [row, column]', () => {
    for (const set of SUDOKU_SETS.filter(({ guided }) => guided)) {
      for (let seed = 0; seed < 20; seed += 1) {
        const [drawn] = draw<SudokuItem>(set.template, paramsOf(set), seed).drawn;
        const targets = drawn?.item.targets ?? [];
        expect(targets, `${set.template} @${String(seed)}`).toHaveLength(1);
        const [[row, column] = [-1, -1]] = targets;
        const { size, grid } = parseSudoku(drawn?.item.sudoku ?? []);
        expect(row).toBeLessThan(size);
        expect(column).toBeLessThan(size);
        expect(grid[row * size + column]).toBe(0);
      }
    }
  });

  it('keeps each 4 x 4 solution a real solution of its givens (the expander’s own re-check)', () => {
    const { drawn, issues } = draw<SudokuItem>('sdk-number', { empty: 9 }, 3, 5);
    expect(issues).toEqual([]);
    for (const { item } of drawn) {
      const { size, grid } = parseSudoku(item.sudoku);
      expect(findSudokuSolution(size, grid)).toBeDefined();
    }
  });

  it('draws 6 x 6 grids with 6 empty cells within 400 tries (the guided sdk-six), and says so when no grid fits', () => {
    expect(draw('sdk-six', { empty: 6, guided: true, maxTries: 400 }, 1).issues).toEqual([]);
    // Last cells alone never finish a 4 x 4 puzzle with 12 empty cells.
    const { issues } = draw('sdk-last', { empty: 12, maxTries: 3 }, 1);
    expect(issues.join()).toMatch(/no 4 x 4 sudoku with 12 empty cells and "last-cell" in 3 tries/);
  });

  it('refuses parameters outside the grid (empty, tries, unknown fields)', () => {
    for (const bad of [
      { empty: 0 },
      { empty: 13 },
      { empty: 3, maxTries: 0 },
      { empty: 3, x: 1 },
    ]) {
      expect(draw('sdk-last', bad, 1).issues.length, JSON.stringify(bad)).toBeGreaterThan(0);
    }
    expect(draw('sdk-six', { empty: 25 }, 1).issues.length).toBeGreaterThan(0);
  });
});

describe('the sudoku check', () => {
  const LAST = { empty: 4 } as const;
  const GUIDED = { empty: 4, guided: true } as const;
  const last = sample<SudokuItem>('sdk-last', LAST);
  const guided = sample<SudokuItem>('sdk-last', GUIDED);
  const six = sample<SudokuItem>('sdk-six', { empty: 10 });

  it('accepts every generated item', () => {
    expect(checkIssues('sdk-last', LAST, last)).toEqual([]);
    expect(checkIssues('sdk-last', GUIDED, guided)).toEqual([]);
    expect(checkIssues('sdk-six', { empty: 10 }, six)).toEqual([]);
    for (const set of SUDOKU_SETS) {
      const item = sample<SudokuItem>(set.template, paramsOf(set));
      expect(checkIssues(set.template, paramsOf(set), item), JSON.stringify(set)).toEqual([]);
    }
  });

  it('rejects a grid with the wrong number of empty cells', () => {
    expect(checkIssues('sdk-last', { empty: 5 }, last).join()).toMatch(/4 empty cells, not 5/);
    expect(checkIssues('sdk-last', { empty: 3 }, last).join()).toMatch(/4 empty cells, not 3/);
  });

  it('rejects a grid of the wrong size, and rows that are not a grid', () => {
    expect(checkIssues('sdk-six', { empty: 4 }, last).join()).toMatch(/4 rows|4 x 4, not 6 x 6/);
    expect(checkIssues('sdk-last', LAST, six).join()).toMatch(/6 x 6, not 4 x 4/);
    expect(
      checkIssues('sdk-last', LAST, { ...last, sudoku: last.sudoku.slice(0, 3) }).join(),
    ).toMatch(/3 rows/);
    expect(
      checkIssues('sdk-last', LAST, { ...last, sudoku: ['12x4', ...last.sudoku.slice(1)] }).join(),
    ).toMatch(/"x" in row 0/);
  });

  it('rejects another template’s focus', () => {
    expect(checkIssues('sdk-last', LAST, { ...last, focus: 'hidden-single' }).join()).toMatch(
      /focus "hidden-single" is not "last-cell"/,
    );
    expect(checkIssues('sdk-place', { empty: 4 }, last).join()).toMatch(
      /focus "last-cell" is not "hidden-single"/,
    );
  });

  it('rejects a target on a whole grid, a guided item without exactly one target, and a target that is not the first focus step', () => {
    const target = guided.targets ?? [];
    expect(checkIssues('sdk-last', LAST, { ...last, targets: [...target] }).join()).toMatch(
      /a target is for a guided item/,
    );
    const bare: SudokuItem = {
      id: guided.id,
      type: guided.type,
      text: guided.text,
      sudoku: guided.sudoku,
      focus: guided.focus,
    };
    expect(checkIssues('sdk-last', GUIDED, bare).join()).toMatch(/exactly one target, has 0/);
    expect(
      checkIssues('sdk-last', GUIDED, { ...guided, targets: [...target, [0, 0]] }).join(),
    ).toMatch(/exactly one target, has 2/);
    const [row = 0, column = 0] = target[0] ?? [];
    const other: [number, number] = [row, (column + 1) % 4];
    expect(checkIssues('sdk-last', GUIDED, { ...guided, targets: [other] }).join()).toMatch(
      /is not the cell of the first "last-cell" step/,
    );
    expect(checkIssues('sdk-last', LAST, { ...last, targets: [] }).join()).toEqual('');
  });
});
