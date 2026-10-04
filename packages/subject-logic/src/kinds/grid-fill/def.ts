// `grid-fill`: fill the cells of a grid puzzle. One kind with a rules registry (`rules.ts`): a sudoku 4 x 4 / 6 x 6 (tap a cell, tap a
// number; pencil marks) and a picture cross 5 x 5 (tap a cell, fill or cross it; the clues sit on the edges). A wrong entry is
// rejected with a reason, never kept; hints come per step (highlight the unit, name the technique, fill the cell).
import type { CardDefBase } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import type { ExerciseStateBase, HintBase } from '@learn/platform-core/domain/subject';
import type {
  CrossLine,
  CrossTechnique,
  SudokuFocus,
  SudokuGrid,
  SudokuSize,
  SudokuTechnique,
  Unit,
} from '../../core/puzzles/index.ts';

/** What a cell holds: a sudoku digit, or a picture-cross `fill` / `cross`. */
export type CellValue = number | 'fill' | 'cross';

export interface SudokuPuzzle {
  readonly rules: 'sudoku';
  readonly size: SudokuSize;
  /** Row-major, 0 = empty. */
  readonly givens: SudokuGrid;
  /** The one full grid. */
  readonly solution: SudokuGrid;
  /** The techniques the lesson allows (`LESSON_TECHNIQUES[focus]`) and the one hints prefer. */
  readonly focus: SudokuFocus;
}

export interface CrossPuzzle {
  readonly rules: 'picture-cross';
  /** Cells per side (a square grid). */
  readonly size: number;
  /** Clues per row / column: the lengths of its runs of filled cells. */
  readonly rows: readonly (readonly number[])[];
  readonly cols: readonly (readonly number[])[];
  /** Row-major, `true` = filled. */
  readonly solution: readonly boolean[];
  /** The line techniques the lesson allows: those up to this level (`CROSS_LEVEL`). */
  readonly maxLevel: 1 | 2 | 3;
  /** The emoji shown when the picture is solved. */
  readonly reveal?: string;
}

export type GridPuzzle = SudokuPuzzle | CrossPuzzle;

export interface GridFillDef extends CardDefBase {
  readonly type: 'grid-fill';
  readonly puzzle: GridPuzzle;
  /** The cells the child must fill (guided tries: one); default every empty sudoku cell / every filled picture cell. */
  readonly targets?: readonly number[];
}

/** A sudoku unit (row, column, box) or a picture-cross line (row, column). */
export type GridUnit = Unit | CrossLine;

export interface GridFillState extends ExerciseStateBase<GridFillDef> {
  /** The givens and the right entries (and the crosses); `undefined` = still open. Row-major. */
  readonly cells: readonly (CellValue | undefined)[];
  /** Sudoku pencil marks per cell, ascending; never scored. */
  readonly marks: Readonly<Record<number, readonly number[]>>;
  /** This step's hint level; back to 0 after each right entry. */
  readonly stepHint: 0 | 1 | 2 | 3;
  /** The hint of the current step (the level-3 hint stays until the next entry). */
  readonly hint?: GridFillHint;
  /** The last rejected entry, until the next accepted action. */
  readonly wrong?: {
    readonly cell: number;
    readonly value: CellValue;
    readonly conflict?: GridUnit;
  };
}

export type GridFillAction =
  | { readonly type: 'set-cell'; readonly cell: number; readonly value: CellValue }
  | { readonly type: 'toggle-mark'; readonly cell: number; readonly value: number }
  /** Removes a cross (the only entry that can be taken back). */
  | { readonly type: 'clear-cell'; readonly cell: number };

/** `placed`: a right entry; `solved`: the right entry that finished the exercise; `marked`: a pencil mark toggled or a cross removed
 * (free, never scored); `ignored`: nothing happened (a given or an entry already there, off the grid, a value the puzzle has no use
 * for, a mark on a picture, any action once solved); `wrong`: the entry was rejected (an error), `conflict` = the unit that
 * already shows why. */
export type GridFillOutcome =
  | { readonly kind: 'placed' | 'solved' | 'marked' | 'ignored' }
  | {
      readonly kind: 'wrong';
      readonly cell: number;
      readonly value: CellValue;
      readonly conflict?: GridUnit;
    };

/** One level per hint press of a step: 1 highlights `units`; 2 adds the `cell` (sudoku) and the `candidates` (naked single), the
 * `technique` is named in the note; 3: the engine fills `value` (a picture's `cell` stays open: the line is the unit). */
export interface GridFillHint extends HintBase {
  readonly kind: 'grid-fill';
  readonly level: 1 | 2 | 3;
  readonly technique: SudokuTechnique | CrossTechnique;
  /** Level 1 on: the units to look at (empty only when no step is left: the card kit's "look" nudge). */
  readonly units: readonly GridUnit[];
  /** Level 2 on, sudoku only. */
  readonly cell?: number;
  /** Level 2 on, sudoku naked single only: the numbers that still fit the cell. */
  readonly candidates?: readonly number[];
  /** Level 3 only: the entry the engine made. */
  readonly value?: CellValue;
}
