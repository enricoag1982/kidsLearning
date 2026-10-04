import type { CellValue, GridFillAction, GridFillDef, GridPuzzle } from './def.ts';
import { rulesOf, targetsOf } from './rules.ts';

/** The rules' own step sequence from the start (the hints' steps, so the technique order a child sees), one `set-cell` per step until
 * every target is filled. Throws when the grid gets stuck: content `verify` rules that out. */
export function gridFillSolution(def: GridFillDef): readonly GridFillAction[] {
  const { puzzle } = def;
  const rules = rulesOf(puzzle);
  const targets = targetsOf(def);
  const cells = [...rules.initial(puzzle)];
  const actions: GridFillAction[] = [];
  while (!rules.isSolved(puzzle, cells, targets)) {
    const step = rules.nextStep(puzzle, cells);
    if (!step) {
      throw new Error(`grid-fill ${def.id}: no step left before every target is filled`);
    }
    cells[step.cell] = step.value;
    actions.push({ type: 'set-cell', cell: step.cell, value: step.value });
  }
  return actions;
}

// A value the puzzle accepts but the solution does not hold in `cell`.
function wrongValue(puzzle: GridPuzzle, cell: number): CellValue {
  if (puzzle.rules === 'sudoku') {
    return ((puzzle.solution[cell] ?? 0) % puzzle.size) + 1;
  }
  return puzzle.solution[cell] === true ? 'cross' : 'fill';
}

/** One rejected entry in the first cell the solution fills: exactly 1 error, nothing else changes. */
export function gridFillWrongAction(def: GridFillDef): readonly GridFillAction[] {
  const [first] = gridFillSolution(def);
  if (first?.type !== 'set-cell') {
    return [];
  }
  return [{ type: 'set-cell', cell: first.cell, value: wrongValue(def.puzzle, first.cell) }];
}
