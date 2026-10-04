// The accessible names the coding e2e drivers click, built from the compiled English texts the way the UI builds them from `t()`.
// `text(key)` returns the template with its `{{vars}}` still in it (the e2e kit's `contentText`).
import { cellPosition } from '@learn/platform-core/domain/grid';
import type { Cell } from '@learn/platform-core/domain/grid';
import { tilePaths, tileAt, samePath } from '../../core/tiles.ts';
import type { Tile, TileKind } from '../../core/tiles.ts';

export type Text = (key: string) => string;

/** Fills every `{{name}}` of `template`. */
export function fill(template: string, vars: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (whole, name: string) => String(vars[name] ?? whole));
}

/** "Step up", "Repeat 3 times". */
export function tileLabel(text: Text, tile: Tile): string {
  return tile.kind === 'repeat'
    ? fill(text('coding.tiles.repeat'), { times: tile.times })
    : text(`coding.tiles.${tile.kind}`);
}

/** The tray button: a repeat is just "Repeat". */
export function trayLabel(text: Text, kind: TileKind): string {
  return text(kind === 'repeat' ? 'coding.tiles.repeat-new' : `coding.tiles.${kind}`);
}

/** The button of the tile at `path` in a read-only strip: "Tile 3: Step right" (numbered in display order, a repeat's own tile
 * and each tile inside it counting). */
export function pickLabel(text: Text, program: readonly Tile[], path: readonly number[]): string {
  const tile = tileAt(program, path);
  if (tile === undefined) {
    throw new Error(`no tile at path [${path.join(', ')}]`);
  }
  const n = tilePaths(program).findIndex((candidate) => samePath(candidate, path)) + 1;
  return fill(text('coding.strip.tile'), { n, tile: tileLabel(text, tile) });
}

function escapeRegExp(source: string): string {
  return source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The button of a grid cell: its name starts "Row 2, column 3" and goes on with what is on it. */
export function cellLabelPattern(text: Text, cell: Cell): RegExp {
  const { row, column } = cellPosition(cell);
  return new RegExp(`^${escapeRegExp(fill(text('coding.board.cell'), { row, column }))}(,|$)`);
}
