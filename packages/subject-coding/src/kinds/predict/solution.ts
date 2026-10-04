import { sameCell } from '@learn/platform-core/domain/grid';
import type { Cell } from '@learn/platform-core/domain/grid';
import type { PredictDef } from '../../core/types.ts';
import type { PickCellAction } from './kind.ts';

export function predictSolution(def: PredictDef): readonly PickCellAction[] {
  return [{ type: 'pick-cell', cell: def.answer }];
}

/** Another cell of the grid (the first one that is not the answer): exactly 1 error, still answerable. */
export function predictWrongAction(def: PredictDef): readonly PickCellAction[] {
  const { cols, rows } = def.level.size;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const cell: Cell = { x, y };
      if (!sameCell(cell, def.answer)) {
        return [{ type: 'pick-cell', cell }];
      }
    }
  }
  throw new Error(`predict "${def.id}": the grid has no cell other than the answer`);
}
