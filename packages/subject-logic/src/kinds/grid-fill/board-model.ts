// What the `grid-fill` play area draws, as pure functions of the def and the state: the board's cells (givens, entries, pencil marks, fills
// and crosses), the picture's clue lanes, the units a highlight covers and the highlight of each cell. No React here.
import type { Cell } from '@learn/platform-core/domain/grid';
import { cellKey } from '@learn/platform-core/domain/grid';
import type { GridCellContent, GridHighlight } from '@learn/platform-web/ui/grid/GridBoard.tsx';
import { boxShape, unitCells } from '../../core/puzzles/index.ts';
import type { CrossPuzzle, GridFillState, GridPuzzle, GridUnit, SudokuPuzzle } from './def.ts';
import { lineCells } from './rules.ts';

/** A cell's place on the board: column `x`, row `y` (row-major index `y * size + x`). */
export function cellAt(puzzle: GridPuzzle, index: number): Cell {
  return { x: index % puzzle.size, y: Math.floor(index / puzzle.size) };
}

export function indexOf(puzzle: GridPuzzle, cell: Cell): number {
  return cell.y * puzzle.size + cell.x;
}

/** The thick box borders of a sudoku (4 x 4: 2 x 2 boxes; 6 x 6: 3 columns x 2 rows). */
export function boxesOf(puzzle: SudokuPuzzle): { readonly cols: number; readonly rows: number } {
  return boxShape(puzzle.size);
}

/** Every cell the board shows content in, keyed by `cellKey`: a sudoku's givens (`given`) and the child's entries (`entry`), the
 * pencil marks of an empty cell; a picture's fills and crosses. Empty cells have no entry. */
export function boardCells(
  puzzle: GridPuzzle,
  state: Pick<GridFillState, 'cells' | 'marks'>,
): Record<string, GridCellContent> {
  const cells: Record<string, GridCellContent> = {};
  state.cells.forEach((value, index) => {
    const key = cellKey(cellAt(puzzle, index));
    if (value === 'fill') {
      cells[key] = { tone: 'filled' };
    } else if (value === 'cross') {
      cells[key] = { tone: 'crossed' };
    } else if (typeof value === 'number') {
      const given = puzzle.rules === 'sudoku' && puzzle.givens[index] !== 0;
      cells[key] = {
        item: { text: String(value), label: String(value), style: given ? 'given' : 'entry' },
      };
    } else {
      const marks = state.marks[index];
      if (marks !== undefined && marks.length > 0) {
        cells[key] = { marks: marks.map(String) };
      }
    }
  });
  return cells;
}

function clueText(clue: readonly number[]): string {
  return clue.length === 0 ? '0' : clue.join(' ');
}

/** A picture's clue lanes: a column's clue above it, a row's left of it; the runs of a clue joined by a space, an empty line "0". */
export function clueLabels(puzzle: CrossPuzzle): {
  readonly top: readonly string[];
  readonly left: readonly string[];
} {
  return { top: puzzle.cols.map(clueText), left: puzzle.rows.map(clueText) };
}

/** The cells of a unit (a sudoku row, column or box; a picture row or column), row-major indices. */
export function unitIndices(puzzle: GridPuzzle, unit: GridUnit): readonly number[] {
  if (puzzle.rules === 'sudoku') {
    return unitCells(puzzle.size, unit);
  }
  return lineCells(puzzle.size, {
    kind: unit.kind === 'column' ? 'column' : 'row',
    index: unit.index,
  });
}

/** Which cells carry which ring. A cell with several takes the strongest: flash (`good`) over the conflict (`bad`), over the hint's
 * cell (`target`), over the cells a guided try asks for (`ringed`, drawn as `target`), over the hint's units (`hint`), over the
 * selection. */
export interface BoardRings {
  readonly selected?: number | undefined;
  readonly ringed?: readonly number[] | undefined;
  readonly hint?: readonly number[] | undefined;
  readonly target?: number | undefined;
  readonly bad?: readonly number[] | undefined;
  readonly good?: readonly number[] | undefined;
}

export function highlightsOf(puzzle: GridPuzzle, rings: BoardRings): Record<string, GridHighlight> {
  const highlights: Record<string, GridHighlight> = {};
  const put = (index: number | undefined, highlight: GridHighlight): void => {
    if (index !== undefined) {
      highlights[cellKey(cellAt(puzzle, index))] = highlight;
    }
  };
  put(rings.selected, 'selected');
  rings.hint?.forEach((index) => {
    put(index, 'hint');
  });
  rings.ringed?.forEach((index) => {
    put(index, 'target');
  });
  put(rings.target, 'target');
  rings.bad?.forEach((index) => {
    put(index, 'bad');
  });
  rings.good?.forEach((index) => {
    put(index, 'good');
  });
  return highlights;
}

/** The indices whose value differs between two row-major cell lists (what the engine filled for the child). */
export function changedCells(
  before: GridFillState['cells'],
  after: GridFillState['cells'],
): readonly number[] {
  return after.flatMap((value, index) => (before[index] === value ? [] : [index]));
}
