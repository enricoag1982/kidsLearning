/** Largest side of a grid, in cells (the board stays tappable on a tablet; ASCII maps stay readable). */
export const MAX_GRID_SIDE = 10;

export interface GridSize {
  readonly cols: number;
  readonly rows: number;
}

/** 0-based; `y = 0` is the TOP row. */
export interface Cell {
  readonly x: number;
  readonly y: number;
}

export type Heading = 'up' | 'right' | 'down' | 'left';

/** Clockwise from `up`. */
export const HEADINGS: readonly Heading[] = ['up', 'right', 'down', 'left'];

/** `"x,y"`: the key of a cell in a record (`GridBoard`'s `cells`, `highlights`). */
export function cellKey(cell: Cell): string {
  return `${String(cell.x)},${String(cell.y)}`;
}

// Canonical integers only ("0", "7", "-1"): no sign on zero, no leading zeros, no spaces.
const CELL_KEY = /^(0|-?[1-9]\d*),(0|-?[1-9]\d*)$/;

/** Inverse of `cellKey`; throws on a key that is not two canonical integers joined by a comma. */
export function parseCellKey(key: string): Cell {
  const match = CELL_KEY.exec(key);
  const x = match?.[1];
  const y = match?.[2];
  if (x === undefined || y === undefined) {
    throw new Error(`Bad cell key "${key}": expected "x,y"`);
  }
  return { x: Number(x), y: Number(y) };
}

export function inGrid(size: GridSize, cell: Cell): boolean {
  return (
    Number.isInteger(cell.x) &&
    Number.isInteger(cell.y) &&
    cell.x >= 0 &&
    cell.x < size.cols &&
    cell.y >= 0 &&
    cell.y < size.rows
  );
}

/** `n` cells (default 1) in `heading`; the result may lie outside the grid (the caller checks `inGrid`). */
export function step(cell: Cell, heading: Heading, n = 1): Cell {
  switch (heading) {
    case 'up':
      return { x: cell.x, y: cell.y - n };
    case 'right':
      return { x: cell.x + n, y: cell.y };
    case 'down':
      return { x: cell.x, y: cell.y + n };
    case 'left':
      return { x: cell.x - n, y: cell.y };
  }
}

function rotate(heading: Heading, quarterTurns: number): Heading {
  const index = HEADINGS.indexOf(heading);
  const turned = HEADINGS[(index + quarterTurns + HEADINGS.length) % HEADINGS.length];
  // `index` is always found and the modulo keeps the result in range.
  return turned ?? heading;
}

export function turnLeft(heading: Heading): Heading {
  return rotate(heading, -1);
}

export function turnRight(heading: Heading): Heading {
  return rotate(heading, 1);
}

export function sameCell(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.y === b.y;
}

/** "row 2, column 3" style, 1-based, top row = row 1: for accessible names. */
export function cellPosition(cell: Cell): { readonly row: number; readonly column: number } {
  return { row: cell.y + 1, column: cell.x + 1 };
}

/** Parses an ASCII map (one string per row, same length, ≤ 10 × 10) into its size and the cells holding each char of `chars`
 * (row by row, left to right; a listed char that does not occur maps to `[]`); any other char means an empty cell.
 * Throws on no rows, ragged rows or a side over 10. */
export function parseGridMap(
  rows: readonly string[],
  chars: string,
): { readonly size: GridSize; readonly cells: Readonly<Record<string, readonly Cell[]>> } {
  // Split by code point so an emoji marker counts as one column.
  const grid = rows.map((row) => Array.from(row));
  const first = grid[0];
  if (first === undefined || first.length === 0) {
    throw new Error('Grid map needs at least one row with at least one column');
  }
  const cols = first.length;
  grid.forEach((row, y) => {
    if (row.length !== cols) {
      throw new Error(
        `Ragged grid map: row ${String(y + 1)} has ${String(row.length)} columns, expected ${String(cols)}`,
      );
    }
  });
  if (cols > MAX_GRID_SIDE || grid.length > MAX_GRID_SIDE) {
    throw new Error(
      `Grid map too large: ${String(cols)} × ${String(grid.length)} (max ${String(MAX_GRID_SIDE)} × ${String(MAX_GRID_SIDE)})`,
    );
  }
  const found: Record<string, Cell[]> = {};
  for (const char of Array.from(chars)) {
    found[char] = [];
  }
  grid.forEach((row, y) => {
    row.forEach((char, x) => {
      found[char]?.push({ x, y });
    });
  });
  return { size: { cols, rows: grid.length }, cells: found };
}
