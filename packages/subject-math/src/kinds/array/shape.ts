// The array arithmetic shared by the engine, the UI and the content checks: the side limit, what Check accepts, the reason of a
// wrong shape, and which cells a shape covers.
import type { ArrayDef } from './def.ts';

/** The grid is 6 x 6: rows and columns each run 1-6. */
export const ARRAY_MAX = 6;

/** A whole number of rows or columns the grid has. */
export function inRange(count: number): boolean {
  return Number.isInteger(count) && count >= 1 && count <= ARRAY_MAX;
}

/** The array the child made: `rows` x `cols` dots with the top-left cell fixed. */
export interface ArrayShape {
  readonly rows: number;
  readonly cols: number;
}

/** What Check accepts: rows x cols, or cols x rows too unless the text fixes the rows. */
export function isAccepted(def: ArrayDef, { rows, cols }: ArrayShape): boolean {
  return (
    (rows === def.rows && cols === def.cols) ||
    (!def.fixedRows && rows === def.cols && cols === def.rows)
  );
}

/** The wrong shape is the right one with rows and columns the other way round (only a wrong try when the rows are fixed). */
export function isSwapped(def: ArrayDef, { rows, cols }: ArrayShape): boolean {
  return def.fixedRows && rows === def.cols && cols === def.rows;
}

/** The def's spoken reason for exactly this shape, if it has one. */
export function reasonKeyOf(def: ArrayDef, { rows, cols }: ArrayShape): string | undefined {
  return def.reasons?.find((reason) => reason.rows === rows && reason.cols === cols)?.reasonKey;
}

/** Is the cell at column `x`, row `y` (0-based, top-left = 0, 0) one of the shape's dots? */
export function covers({ rows, cols }: ArrayShape, x: number, y: number): boolean {
  return x < cols && y < rows;
}
