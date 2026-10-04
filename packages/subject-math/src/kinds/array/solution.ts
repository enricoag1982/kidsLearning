import type { ArrayAction, ArrayDef } from './def.ts';
import { ARRAY_MAX } from './shape.ts';

export function arraySolution(def: ArrayDef): readonly ArrayAction[] {
  return [{ type: 'make-array', rows: def.rows, cols: def.cols }];
}

/** One more column (one fewer when the array is already 6 wide): exactly 1 error, still answerable. It keeps the rows and changes the
 * columns, so it is neither the shape nor, when the rows are free, the swapped one (that would need the columns to equal the rows
 * both before and after the change). */
export function arrayWrongAction(def: ArrayDef): readonly ArrayAction[] {
  return [
    {
      type: 'make-array',
      rows: def.rows,
      cols: def.cols < ARRAY_MAX ? def.cols + 1 : def.cols - 1,
    },
  ];
}
