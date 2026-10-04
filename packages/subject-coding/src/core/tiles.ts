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
export const PRIMITIVE_KINDS = [
  'up',
  'down',
  'left',
  'right',
  'forward',
  'turn-left',
  'turn-right',
  'jump',
] as const satisfies readonly PrimitiveKind[];

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

/** Same tile, deeply: same kind and, for a repeat, same count and same body. */
export function sameTile(a: Tile, b: Tile): boolean {
  if (a.kind !== 'repeat' || b.kind !== 'repeat') {
    return a.kind === b.kind;
  }
  return (
    a.times === b.times &&
    a.body.length === b.body.length &&
    a.body.every((tile, index) => {
      const other = b.body[index];
      return other !== undefined && sameTile(tile, other);
    })
  );
}

export function samePath(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((index, at) => index === b[at]);
}

/** Every tile a child can tap, in display order: `[top]` for each top-level tile (a repeat's own tile included) and
 * `[top, body]` for each tile inside a repeat. */
export function tilePaths(program: readonly Tile[]): readonly (readonly number[])[] {
  return program.flatMap((tile, top) => [
    [top],
    ...(tile.kind === 'repeat' ? tile.body.map((_, index) => [top, index]) : []),
  ]);
}

/** The tile at `path` (`[top]` or `[top, body]`), or `undefined` when there is none. */
export function tileAt(program: readonly Tile[], path: readonly number[]): Tile | undefined {
  const [top, inner, ...rest] = path;
  if (top === undefined || rest.length > 0) {
    return undefined;
  }
  const tile = program[top];
  if (inner === undefined) {
    return tile;
  }
  return tile?.kind === 'repeat' ? tile.body[inner] : undefined;
}

/** The program with the tile at `path` replaced; throws when there is no tile there. */
export function replaceTile(program: readonly Tile[], path: readonly number[], tile: Tile): Tile[] {
  if (tileAt(program, path) === undefined) {
    throw new Error(`No tile at path [${path.join(', ')}]`);
  }
  const [top, inner] = path;
  return program.map((existing, index) => {
    if (index !== top) {
      return existing;
    }
    if (inner === undefined || existing.kind !== 'repeat') {
      return tile;
    }
    return { ...existing, body: existing.body.map((t, at) => (at === inner ? tile : t)) };
  });
}
