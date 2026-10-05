// W3 sudoku templates (docs/subjects/logic/curriculum.md §3): `sdk-last`, `sdk-place`, `sdk-number` (4 × 4, focus last cell / only place /
// only number) and `sdk-six` (6 × 6, focus only number). Each item is a `grid-fill` sudoku built by the build-time generator
// (`puzzles/sudoku-generate.ts`) on the lesson's allowed techniques (plan L9), with the focus technique at least once; a guided item
// also names one target cell, the cell of the first step with the focus technique. The kind's `verify` proves every item again
// (one solution, solved with the allowed set, the focus occurs, the target); the template's `check` holds what only the template
// knows: the exact number of empty cells, the size, the focus and the target.
import type { ExerciseTemplate } from '@learn/platform-content/generate/template';
import { z } from 'zod';
import {
  LESSON_TECHNIQUES,
  nextSudokuStep,
  parseSudoku,
  type SudokuFocus,
  type SudokuSize,
  type SudokuTechnique,
} from '../../core/puzzles/sudoku.ts';
import { generateSudoku, type GeneratedSudoku } from '../puzzles/sudoku-generate.ts';
import { fail } from './draw.ts';
import type { SudokuItem } from './items.ts';

/** Most empty cells a template asks for (the kind's limit: 12 of 16 in a 4 × 4, 24 of 36 in a 6 × 6). */
const MAX_EMPTY = { 4: 12, 6: 24 } as const satisfies Readonly<Record<SudokuSize, number>>;

/** Draws a guided item may take before giving up: each draw is a whole generator run (up to `maxTries` tries inside it). */
const MAX_GUIDED_DRAWS = 50;

/** The text of a guided item, whatever the lesson (`lessons.yaml` `templates.sdk-guided`). */
const GUIDED_TEXT = 'templates.sdk-guided';

export interface SudokuParams {
  /** Empty cells, exactly. */
  readonly empty: number;
  /** One target cell: the child fills the cell the first step with the focus technique finds. */
  readonly guided: boolean;
  /** Generator tries per draw: a 6 × 6 with 6 empty cells needs more than the default. */
  readonly maxTries: number;
}

function paramsOf(size: SudokuSize): z.ZodType<SudokuParams> {
  return z
    .object({
      empty: z.number().int().min(1).max(MAX_EMPTY[size]),
      guided: z.boolean().default(false),
      maxTries: z.number().int().min(1).max(5000).default(200),
    })
    .strict();
}

/** The `[row, column]` of a cell index. */
function rowColumn(size: SudokuSize, cell: number): readonly [number, number] {
  return [Math.floor(cell / size), cell % size];
}

/** The guided target of `givens`: the cell of the first step the focus technique finds (the hints' first step), or `undefined`
 * when the first step is another technique. */
function guidedTarget(
  size: SudokuSize,
  focus: SudokuTechnique,
  givens: readonly number[],
): number | undefined {
  const step = nextSudokuStep(size, givens, LESSON_TECHNIQUES[focus], focus);
  return step?.technique === focus ? step.cell : undefined;
}

/** One sudoku template: `focus` is the lesson's technique (a `SudokuFocus` that names one technique), `size` the grid. */
function sudokuTemplate(
  size: SudokuSize,
  focus: SudokuTechnique,
  text: string,
): ExerciseTemplate<SudokuParams, SudokuItem> {
  const set: SudokuFocus = focus;
  return {
    params: paramsOf(size),
    generate(params, ctx) {
      for (let draw = 0; draw < (params.guided ? MAX_GUIDED_DRAWS : 1); draw += 1) {
        const puzzle: GeneratedSudoku | undefined = generateSudoku(
          { size, empty: params.empty, focus: set, require: focus },
          ctx.random,
          params.maxTries,
        );
        if (puzzle === undefined) {
          throw new Error(
            `no ${String(size)} x ${String(size)} sudoku with ${String(params.empty)} empty cells and "${focus}" in ${String(params.maxTries)} tries`,
          );
        }
        const target = params.guided
          ? guidedTarget(size, focus, parseSudoku(puzzle.givens).grid)
          : undefined;
        if (params.guided && target === undefined) {
          continue;
        }
        return {
          id: ctx.id,
          type: 'grid-fill',
          text: ctx.text('text', params.guided ? GUIDED_TEXT : text),
          sudoku: puzzle.givens,
          focus: set,
          ...(target === undefined ? {} : { targets: [rowColumn(size, target)] }),
        };
      }
      throw new Error(
        `no guided ${String(size)} x ${String(size)} sudoku with ${String(params.empty)} empty cells: the first "${focus}" step never comes first in ${String(MAX_GUIDED_DRAWS)} draws`,
      );
    },
    check(item, params, at) {
      let parsed: ReturnType<typeof parseSudoku>;
      try {
        parsed = parseSudoku(item.sudoku);
      } catch (error) {
        fail(at, error instanceof Error ? error.message : String(error));
        return;
      }
      if (parsed.size !== size) {
        fail(
          at,
          `the grid is ${String(parsed.size)} x ${String(parsed.size)}, not ${String(size)} x ${String(size)}`,
        );
      }
      const empty = parsed.grid.filter((value) => value === 0).length;
      if (empty !== params.empty) {
        fail(at, `${String(empty)} empty cells, not ${String(params.empty)}`);
      }
      if (item.focus !== set) {
        fail(at, `focus "${item.focus}" is not "${set}"`);
      }
      const targets = item.targets ?? [];
      if (!params.guided) {
        if (targets.length > 0) {
          fail(at, 'a target is for a guided item');
        }
        return;
      }
      const expected = guidedTarget(parsed.size, focus, parsed.grid);
      const [first, ...more] = targets;
      if (first === undefined || more.length > 0) {
        fail(at, `a guided item needs exactly one target, has ${String(targets.length)}`);
      } else if (expected === undefined || first[0] * parsed.size + first[1] !== expected) {
        fail(
          at,
          `the target [${String(first[0])}, ${String(first[1])}] is not the cell of the first "${focus}" step`,
        );
      }
    },
  };
}

/** 4 × 4, focus last cell: a row, column or box with one empty cell. */
export const sdkLast = sudokuTemplate(4, 'last-cell', 'templates.sdk-last');
/** 4 × 4, focus only place (hidden single). */
export const sdkPlace = sudokuTemplate(4, 'hidden-single', 'templates.sdk-place');
/** 4 × 4, focus only number (naked single). */
export const sdkNumber = sudokuTemplate(4, 'naked-single', 'templates.sdk-number');
/** 6 × 6 (boxes 2 rows × 3 columns), focus only number. */
export const sdkSix = sudokuTemplate(6, 'naked-single', 'templates.sdk-six');
