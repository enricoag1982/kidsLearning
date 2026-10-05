// Test-only parameter sets and re-checks of the W3 sudoku templates (never imported by shipped code): the sets are exactly what the
// W3 lessons and the Sudoku Sprint draw (docs/subjects/logic/curriculum.md §2 W3), and `sudokuProblems` solves an item again from its
// givens with `findSudokuSolution` and the human-style solver, without the template's own helpers. The fast tests run it over
// `SEEDS` seeds, the slow ones over `SLOW_SEEDS`.
import {
  LESSON_TECHNIQUES,
  humanSolveSudoku,
  nextSudokuStep,
  parseSudoku,
  type SudokuSize,
  type SudokuTechnique,
} from '../../core/puzzles/sudoku.ts';
import { countSudokuSolutions, findSudokuSolution } from '../puzzles/sudoku-count.ts';
import type { SudokuItem } from './items.ts';

export type SudokuTemplateId = 'sdk-last' | 'sdk-place' | 'sdk-number' | 'sdk-six';

/** What each template is: the grid size, the technique the lesson teaches and the sentence of a whole-grid item. */
export const SUDOKU_TEMPLATES: Readonly<
  Record<
    SudokuTemplateId,
    { readonly size: SudokuSize; readonly focus: SudokuTechnique; readonly text: string }
  >
> = {
  'sdk-last': {
    size: 4,
    focus: 'last-cell',
    text: 'Fill the grid. Look for a row, column or box with one empty cell.',
  },
  'sdk-place': {
    size: 4,
    focus: 'hidden-single',
    text: 'Fill the grid. For each number, find the only place it can go in a box.',
  },
  'sdk-number': {
    size: 4,
    focus: 'naked-single',
    text: 'Fill the grid. For each empty cell, find the only number left.',
  },
  'sdk-six': {
    size: 6,
    focus: 'naked-single',
    text: 'Fill the big grid: each row, column and box has 1 to 6 once.',
  },
};

/** Most words of a sudoku sentence: the card kit allows 14, the "only place" sentence has 16. */
export const MAX_WORDS = 16;

/** The sentence of every guided item, whatever the lesson. */
export const GUIDED_SENTENCE = 'Which number goes in the ringed cell?';

export interface SudokuSet {
  readonly template: SudokuTemplateId;
  readonly empty: number;
  readonly guided: boolean;
  /** Left out = the default (200). */
  readonly maxTries?: number;
}

const set = (
  template: SudokuTemplateId,
  empty: number,
  guided = false,
  maxTries?: number,
): SudokuSet => ({
  template,
  empty,
  guided,
  ...(maxTries === undefined ? {} : { maxTries }),
});

/** Every parameter set of the W3 lessons and the Sudoku Sprint: guided tries, scored grids, easier variants, boss rounds. */
export const SUDOKU_SETS: readonly SudokuSet[] = [
  set('sdk-last', 3, true),
  set('sdk-last', 6, true),
  set('sdk-last', 3),
  set('sdk-last', 4),
  set('sdk-last', 5),
  set('sdk-last', 6),
  set('sdk-place', 5, true),
  set('sdk-place', 6, true),
  set('sdk-place', 5),
  set('sdk-place', 6),
  set('sdk-place', 7),
  set('sdk-place', 8),
  set('sdk-number', 7, true),
  set('sdk-number', 8, true),
  set('sdk-number', 7),
  set('sdk-number', 8),
  set('sdk-number', 9),
  set('sdk-number', 10),
  set('sdk-six', 6, true, 400),
  set('sdk-six', 8, true),
  set('sdk-six', 8),
  set('sdk-six', 10),
  set('sdk-six', 12),
  set('sdk-six', 14),
  set('sdk-six', 16),
];

/** The params object as the YAML writes it. */
export function paramsOf({ empty, guided, maxTries }: SudokuSet): Record<string, unknown> {
  return { empty, ...(guided ? { guided } : {}), ...(maxTries === undefined ? {} : { maxTries }) };
}

/** What is wrong with a drawn item, found again from its givens: the size, the exact number of empty cells, one solution (the same
 * one the solver finds), the lesson's techniques finish it and the focus occurs, the one guided target is the first step with the
 * focus technique, the sentence. */
export function sudokuProblems(setOf: SudokuSet, item: SudokuItem, text: string): string[] {
  const { size, focus, text: sentence } = SUDOKU_TEMPLATES[setOf.template];
  const problems: string[] = [];
  const bad = (message: string): void => {
    problems.push(`${item.id}: ${message}`);
  };
  const { size: found, grid } = parseSudoku(item.sudoku);
  if (found !== size)
    bad(`${String(found)} x ${String(found)}, not ${String(size)} x ${String(size)}`);
  const empty = grid.filter((value) => value === 0).length;
  if (empty !== setOf.empty) bad(`${String(empty)} empty cells, not ${String(setOf.empty)}`);
  if (countSudokuSolutions(found, grid) !== 1) bad('not exactly one solution');
  const allowed = LESSON_TECHNIQUES[focus];
  const solved = humanSolveSudoku(found, grid, allowed);
  const solution = findSudokuSolution(found, grid);
  if (!solved.solved) bad(`the techniques of "${focus}" do not finish it`);
  else if (JSON.stringify(solved.grid) !== JSON.stringify(solution)) {
    bad('the human solver and the counter disagree on the solution');
  }
  if (solved.counts[focus] === 0) bad(`"${focus}" never occurs`);
  if (item.focus !== focus) bad(`focus ${item.focus}, not ${focus}`);
  const targets = item.targets ?? [];
  if (setOf.guided) {
    const step = nextSudokuStep(found, grid, allowed, focus);
    const [target, ...more] = targets;
    if (target === undefined || more.length > 0) bad('a guided item needs exactly one target');
    else if (step?.technique !== focus || step.cell !== target[0] * found + target[1]) {
      bad('the target is not the cell of the first focus step');
    } else if (grid[step.cell] !== 0) bad('the target is a given');
  } else if (targets.length > 0) {
    bad('a whole-grid item has a target');
  }
  const expected = setOf.guided ? GUIDED_SENTENCE : sentence;
  if (text !== expected) bad(`text "${text}", not "${expected}"`);
  return problems;
}
