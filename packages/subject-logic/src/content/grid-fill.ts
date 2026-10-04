// `grid-fill` content: a sudoku (`sudoku:` rows of digits and `.`, a `focus`) or a picture cross (`picture:` rows of `#` and `.`, a
// `maxLevel`). The build derives the rest (the solution, the clues), and `verify` proves the puzzle is the lesson's: exactly one
// solution, finished by the lesson's techniques, which it uses; the guided "where does it go?" target is the first step.
import { cardExerciseFields, cardVisualFields } from '@learn/platform-content/kinds/cards/prompt';
import type { ExerciseKindContent } from '@learn/platform-content/kinds/kind-content';
import { z } from 'zod';
import {
  CROSS_LEVEL,
  LESSON_TECHNIQUES,
  humanSolveCross,
  humanSolveSudoku,
  nextSudokuStep,
  parsePicture,
  parseSudoku,
  pictureClues,
  unitCells,
  type SudokuFocus,
  type SudokuGrid,
  type SudokuSize,
  type Unit,
} from '../core/puzzles/index.ts';
import type { CrossPuzzle, GridFillDef, SudokuPuzzle } from '../kinds/grid-fill/def.ts';
import { countCrossSolutions } from './puzzles/cross-count.ts';
import { countSudokuSolutions, findSudokuSolution } from './puzzles/sudoku-count.ts';

/** The instruction an item without `text` gets (the `common` namespace: `grid.instruction.*`). */
const DEFAULT_TEXT = {
  sudoku: 'common:grid.instruction.sudoku',
  cross: 'common:grid.instruction.cross',
} as const;

const FOCUSES = [
  'last-cell',
  'hidden-single',
  'naked-single',
  'all',
] as const satisfies readonly SudokuFocus[];

/** Most empty cells the lesson sizes allow: a 4 x 4 keeps 4 of 16 givens, a 6 x 6 keeps 12 of 36 (and at least 1 is empty). */
const MAX_EMPTY = { 4: 12, 6: 24 } as const satisfies Readonly<Record<SudokuSize, number>>;
/** Picture sizes that fit the screen with their clues (the lessons draw 5 x 5). */
const PICTURE_SIZES = { min: 4, max: 6 } as const;

const gridFillSchema = z
  .object({
    ...cardExerciseFields,
    type: z.literal('grid-fill'),
    /** A sudoku: 4 or 6 rows of `.` and the digits 1 to the size. */
    sudoku: z.array(z.string()).min(1).optional(),
    /** The techniques the sudoku lesson allows; its focus technique must occur (`all`: only place or only number). */
    focus: z.enum(FOCUSES).optional(),
    /** Guided tries: the `[row, column]` cells (counting from 0) the child fills; the first step must be one of them. */
    targets: z
      .array(z.tuple([z.number().int().min(0), z.number().int().min(0)]))
      .min(1)
      .optional(),
    /** A picture: rows of `#` (filled) and `.`, square. */
    picture: z.array(z.string()).min(1).optional(),
    /** The line techniques the picture lesson allows, up to this level; a technique of that level must occur. */
    maxLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    /** The emoji shown when the picture is solved. */
    reveal: cardVisualFields.emoji,
  })
  .strict();

type GridFillRaw = z.output<typeof gridFillSchema>;

function unitName(unit: Unit): string {
  return `${unit.kind} ${String(unit.index)}`;
}

/** Every row, column and box. */
function unitsOfSize(size: SudokuSize): readonly Unit[] {
  return (['row', 'column', 'box'] as const).flatMap((kind) =>
    Array.from({ length: size }, (_, index) => ({ kind, index })),
  );
}

/** One issue per unit that holds a number twice among the givens (0 = empty; units count from 0). */
function clashIssues(size: SudokuSize, givens: SudokuGrid, where: string): readonly string[] {
  return unitsOfSize(size).flatMap((unit) => {
    const seen = new Set<number>();
    const issues: string[] = [];
    for (const cell of unitCells(size, unit)) {
      const given = givens[cell] ?? 0;
      if (given !== 0 && seen.has(given)) {
        issues.push(
          `${where}: ${unitName(unit)} has ${String(given)} twice among the givens (units count from 0)`,
        );
      }
      seen.add(given);
    }
    return issues;
  });
}

function compileSudoku(
  raw: GridFillRaw,
  rows: readonly string[],
  where: string,
  issues: string[],
): SudokuPuzzle | null {
  if (raw.focus === undefined) {
    return null;
  }
  let parsed: ReturnType<typeof parseSudoku>;
  try {
    parsed = parseSudoku(rows);
  } catch (error) {
    issues.push(`${where}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
  const clashes = clashIssues(parsed.size, parsed.grid, where);
  if (clashes.length > 0) {
    issues.push(...clashes);
    return null;
  }
  const solution = findSudokuSolution(parsed.size, parsed.grid);
  if (solution === undefined) {
    issues.push(`${where}: the givens have no solution`);
    return null;
  }
  return {
    rules: 'sudoku',
    size: parsed.size,
    givens: parsed.grid,
    solution,
    focus: raw.focus,
  };
}

function compilePicture(
  raw: GridFillRaw,
  rows: readonly string[],
  where: string,
  issues: string[],
): CrossPuzzle | null {
  if (raw.maxLevel === undefined) {
    return null;
  }
  let parsed: ReturnType<typeof parsePicture>;
  try {
    parsed = parsePicture(rows);
  } catch (error) {
    issues.push(`${where}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
  const clues = pictureClues(parsed.size, parsed.solution);
  return {
    rules: 'picture-cross',
    size: parsed.size,
    rows: clues.rows,
    cols: clues.cols,
    solution: parsed.solution,
    maxLevel: raw.maxLevel,
    ...(raw.reveal === undefined ? {} : { reveal: raw.reveal }),
  };
}

/** Shape of a sudoku def: sizes, digit ranges, no repeat among the givens, and a solution that is a full grid keeping the givens.
 * `false` = malformed (the solver checks cannot run). */
function verifySudokuShape(puzzle: SudokuPuzzle, where: string, issues: string[]): boolean {
  const { size, givens, solution } = puzzle;
  const cells = size * size;
  if (givens.length !== cells || solution.length !== cells) {
    issues.push(
      `${where}: a ${String(size)} x ${String(size)} sudoku has ${String(cells)} cells (${String(givens.length)} givens, ${String(solution.length)} in the solution)`,
    );
    return false;
  }
  const digit = (value: number): boolean => Number.isInteger(value) && value >= 1 && value <= size;
  let ok = true;
  for (const [cell, value] of givens.entries()) {
    if (value !== 0 && !digit(value)) {
      issues.push(
        `${where}: given ${String(value)} (cell ${String(cell)}) is not 1 to ${String(size)}`,
      );
      ok = false;
    }
  }
  for (const [cell, value] of solution.entries()) {
    if (!digit(value)) {
      issues.push(
        `${where}: solution ${String(value)} (cell ${String(cell)}) is not 1 to ${String(size)}`,
      );
      ok = false;
    }
  }
  if (!ok) {
    return false;
  }
  const clashes = clashIssues(size, givens, where);
  issues.push(...clashes);
  ok = clashes.length === 0;
  for (const unit of unitsOfSize(size)) {
    const full = new Set(unitCells(size, unit).map((cell) => solution[cell] ?? 0));
    if (full.size !== size) {
      issues.push(`${where}: the solution repeats a number in ${unitName(unit)}`);
      ok = false;
    }
  }
  for (const [cell, value] of givens.entries()) {
    if (value !== 0 && solution[cell] !== value) {
      issues.push(`${where}: the solution changes the given in cell ${String(cell)}`);
      ok = false;
    }
  }
  return ok;
}

function emptyCount(givens: SudokuGrid): number {
  return givens.filter((value) => value === 0).length;
}

function verifyTargets(
  def: GridFillDef,
  open: (cell: number) => boolean,
  openName: string,
  where: string,
  issues: string[],
): boolean {
  const { puzzle, targets } = def;
  if (targets === undefined) {
    return true;
  }
  const cells = puzzle.size * puzzle.size;
  const seen = new Set<number>();
  let ok = true;
  for (const cell of targets) {
    if (!Number.isInteger(cell) || cell < 0 || cell >= cells) {
      issues.push(
        `${where}: target cell ${String(cell)} is outside the grid (0-${String(cells - 1)})`,
      );
      ok = false;
    } else if (!open(cell)) {
      issues.push(`${where}: target cell ${String(cell)} is ${openName}`);
      ok = false;
    }
    if (seen.has(cell)) {
      issues.push(`${where}: target cell ${String(cell)} is given twice`);
      ok = false;
    }
    seen.add(cell);
  }
  return ok;
}

function verifySudoku(
  def: GridFillDef,
  puzzle: SudokuPuzzle,
  where: string,
  issues: string[],
): void {
  if (!verifySudokuShape(puzzle, where, issues)) {
    return;
  }
  const { size, givens, focus } = puzzle;
  const empty = emptyCount(givens);
  if (empty < 1 || empty > MAX_EMPTY[size]) {
    issues.push(
      `${where}: ${String(empty)} empty cells in a ${String(size)} x ${String(size)} sudoku (1-${String(MAX_EMPTY[size])} expected)`,
    );
  }

  const solutions = countSudokuSolutions(size, givens);
  if (solutions !== 1) {
    issues.push(
      `${where}: the givens have ${solutions === 0 ? 'no solution' : 'more than one solution'} (exactly 1 expected)`,
    );
  }

  const allowed = LESSON_TECHNIQUES[focus];
  const solved = humanSolveSudoku(size, givens, allowed);
  if (!solved.solved) {
    issues.push(
      `${where}: the techniques of focus "${focus}" (${allowed.join(', ')}) do not finish the puzzle`,
    );
  } else if (focus === 'all') {
    if (solved.counts['hidden-single'] + solved.counts['naked-single'] === 0) {
      issues.push(
        `${where}: the puzzle never needs only place or only number: a last-cell puzzle (use focus "last-cell")`,
      );
    }
  } else if (solved.counts[focus] === 0) {
    issues.push(`${where}: focus "${focus}" never occurs: the puzzle is solved without it`);
  }

  if (
    verifyTargets(def, (cell) => givens[cell] === 0, 'a given, not an empty cell', where, issues) &&
    def.targets !== undefined
  ) {
    const first = nextSudokuStep(size, givens, allowed, focus === 'all' ? undefined : focus);
    const isTarget = first !== undefined && def.targets.includes(first.cell);
    if (!isTarget || (focus !== 'all' && first.technique !== focus)) {
      issues.push(
        `${where}: the first step (${first === undefined ? 'none' : `${first.technique} in cell ${String(first.cell)}`}) is not ${focus === 'all' ? 'a target cell' : `a target cell found by ${focus}`}`,
      );
    }
  }
}

function verifyPicture(
  def: GridFillDef,
  puzzle: CrossPuzzle,
  where: string,
  issues: string[],
): void {
  const { size, rows, cols, solution, maxLevel } = puzzle;
  if (size < PICTURE_SIZES.min || size > PICTURE_SIZES.max) {
    issues.push(
      `${where}: the picture is ${String(size)} x ${String(size)}: ${String(PICTURE_SIZES.min)} to ${String(PICTURE_SIZES.max)} fit (the lessons draw 5 x 5)`,
    );
    return;
  }
  if (solution.length !== size * size || rows.length !== size || cols.length !== size) {
    issues.push(
      `${where}: the solution and the clues must fit a ${String(size)} x ${String(size)} grid`,
    );
    return;
  }
  if (!solution.includes(true)) {
    issues.push(`${where}: the picture has no filled cell`);
    return;
  }
  const clues = pictureClues(size, solution);
  if (JSON.stringify(clues) !== JSON.stringify({ rows, cols })) {
    issues.push(`${where}: the clues do not match the picture`);
    return;
  }

  const solutions = countCrossSolutions(size, rows, cols);
  if (solutions !== 1) {
    issues.push(
      `${where}: the clues have ${solutions === 0 ? 'no solution' : 'more than one solution'} (exactly 1 expected)`,
    );
  }

  const solved = humanSolveCross(size, rows, cols, maxLevel);
  if (!solved.solved) {
    issues.push(
      `${where}: the line techniques up to level ${String(maxLevel)} do not finish the picture`,
    );
  } else if (!solved.steps.some((step) => CROSS_LEVEL[step.technique] === maxLevel)) {
    issues.push(
      `${where}: no step needs level ${String(maxLevel)}: the picture is solved without it (lower maxLevel)`,
    );
  }
  verifyTargets(def, (cell) => solution[cell] === true, 'not a filled cell', where, issues);
}

export const gridFill: ExerciseKindContent<GridFillDef, typeof gridFillSchema> = {
  type: 'grid-fill',
  schema: gridFillSchema,

  /** One of `sudoku` (with `focus`, optional `targets`) or `picture` (with `maxLevel`, optional `reveal`). */
  refine(raw, ctx) {
    const issue = (message: string): void => {
      ctx.addIssue({ code: 'custom', message });
    };
    const isSudoku = raw.sudoku !== undefined;
    if (isSudoku === (raw.picture !== undefined)) {
      issue(
        'needs "sudoku" (rows of digits and ".") or "picture" (rows of "#" and "."), exactly one',
      );
      return;
    }
    if (isSudoku) {
      if (raw.focus === undefined) {
        issue(`a sudoku needs "focus" (${FOCUSES.join(', ')})`);
      }
      if (raw.maxLevel !== undefined) issue('"maxLevel" is for a picture');
      if (raw.reveal !== undefined) issue('"reveal" is for a picture');
    } else {
      if (raw.maxLevel === undefined) issue('a picture needs "maxLevel" (1, 2 or 3)');
      if (raw.focus !== undefined) issue('"focus" is for a sudoku');
      if (raw.targets !== undefined) issue('"targets" is for a sudoku');
    }
  },

  compile(raw, ctx) {
    const { where, issues } = ctx;
    const text = (kind: keyof typeof DEFAULT_TEXT): object =>
      raw.text === undefined ? { textKey: DEFAULT_TEXT[kind] } : {};
    if (raw.sudoku !== undefined) {
      const puzzle = compileSudoku(raw, raw.sudoku, where, issues);
      if (puzzle === null) {
        return null;
      }
      const targets = (raw.targets ?? []).map(([row, column]) => ({
        cell: row * puzzle.size + column,
        inGrid: row < puzzle.size && column < puzzle.size,
        row,
        column,
      }));
      const outside = targets.filter((target) => !target.inGrid);
      for (const { row, column } of outside) {
        issues.push(
          `${where}: target [${String(row)}, ${String(column)}] is outside the ${String(puzzle.size)} x ${String(puzzle.size)} grid`,
        );
      }
      if (outside.length > 0) {
        return null;
      }
      return ctx.build<GridFillDef>({
        ...text('sudoku'),
        type: 'grid-fill',
        puzzle,
        ...(raw.targets === undefined ? {} : { targets: targets.map((target) => target.cell) }),
      });
    }
    const puzzle =
      raw.picture === undefined ? null : compilePicture(raw, raw.picture, where, issues);
    if (puzzle === null) {
      return null;
    }
    return ctx.build<GridFillDef>({ ...text('cross'), type: 'grid-fill', puzzle });
  },

  verify(def, where, issues) {
    const { puzzle } = def;
    if (puzzle.rules === 'sudoku') {
      verifySudoku(def, puzzle, where, issues);
    } else {
      verifyPicture(def, puzzle, where, issues);
    }
  },
};
