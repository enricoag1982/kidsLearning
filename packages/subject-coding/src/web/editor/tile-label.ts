// The names a screen reader reads for tiles, and the spoken form of a tile: one place so the editor, the kind UIs and the e2e
// drivers agree (`coding.tiles.*` in `content/locales/en/common.yaml`).
import type { TFunction } from 'i18next';
import { tContent } from '@learn/platform-web/content-text.ts';
import type { Tile, TileKind } from '../../core/tiles.ts';

/** The tile as the strip shows it: "Step up", "Turn left", "Repeat 3 times". */
export function tileName(t: TFunction, tile: Tile): string {
  return tile.kind === 'repeat'
    ? tContent(t, 'coding.tiles.repeat', { times: tile.times })
    : tContent(t, `coding.tiles.${tile.kind}`);
}

/** The tray button of `kind`: the same, except a repeat is just "Repeat" (its count is set afterwards). */
export function trayName(t: TFunction, kind: TileKind): string {
  return tContent(t, kind === 'repeat' ? 'coding.tiles.repeat-new' : `coding.tiles.${kind}`);
}
