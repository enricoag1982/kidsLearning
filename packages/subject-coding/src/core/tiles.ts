// The coding tiles: the primitives a child drags into the program strip and the `repeat` block that wraps a few of them.

/** `up` / `down` / `left` / `right` move one cell in that direction whatever the animal faces; `forward` moves along the heading,
 * `turn-left` / `turn-right` rotate in place, `jump` moves two cells along the heading (over one rock). */
export type PrimitiveKind =
  'up' | 'down' | 'left' | 'right' | 'forward' | 'turn-left' | 'turn-right' | 'jump';

export type Tile =
  | { readonly kind: PrimitiveKind }
  | { readonly kind: 'repeat'; readonly times: number; readonly body: readonly Tile[] };

export type TileKind = Tile['kind'];

/** Every primitive, in tray order. */
export const PRIMITIVE_KINDS: readonly PrimitiveKind[] = [
  'up',
  'down',
  'left',
  'right',
  'forward',
  'turn-left',
  'turn-right',
  'jump',
];

/** Most tiles inside one repeat. */
export const MAX_REPEAT_BODY = 4;
/** Fewest and most times a repeat runs its body. */
export const MIN_REPEAT = 2;
export const MAX_REPEAT = 9;

/** Number of tiles a program shows: a repeat counts 1 + its body. */
export function tileCount(program: readonly Tile[]): number {
  return program.reduce(
    (count, tile) => count + (tile.kind === 'repeat' ? 1 + tileCount(tile.body) : 1),
    0,
  );
}

function isPrimitive(tile: Tile): boolean {
  return tile.kind !== 'repeat' && PRIMITIVE_KINDS.includes(tile.kind);
}

/** A repeat inside a repeat is not allowed in v1.1 (validation helper): every repeat runs `MIN_REPEAT`-`MAX_REPEAT` whole times
 * over 1-`MAX_REPEAT_BODY` primitive tiles, and every other tile is a known primitive. */
export function isValidProgram(program: readonly Tile[]): boolean {
  return program.every((tile) => {
    if (tile.kind !== 'repeat') {
      return isPrimitive(tile);
    }
    return (
      Number.isInteger(tile.times) &&
      tile.times >= MIN_REPEAT &&
      tile.times <= MAX_REPEAT &&
      tile.body.length >= 1 &&
      tile.body.length <= MAX_REPEAT_BODY &&
      tile.body.every(isPrimitive)
    );
  });
}
