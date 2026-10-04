// How a tile is written in YAML: a primitive's name (`right`), or a repeat (`{ repeat: 3, do: [forward, turn-right] }`). The schema
// reads straight into `Tile` objects, and says what is wrong with a tile at the tile's own path (a plain union would lose it).
import { z } from 'zod';
import { MAX_REPEAT, MAX_REPEAT_BODY, MIN_REPEAT, PRIMITIVE_KINDS } from '../core/tiles.ts';
import type { Tile } from '../core/tiles.ts';

/** The tray holds at most this many tiles (a repeat counts as one). */
export const MAX_TRAY = 8;

/** The program strip never shows more tiles than this (no scrolling on a tablet). */
export const MAX_CAP = 12;

const primitiveSchema = z.enum(PRIMITIVE_KINDS);

/** A repeat holds primitives only: a repeat inside a repeat is not allowed in v1.1. */
const repeatSchema = z
  .object({
    repeat: z.number().int().min(MIN_REPEAT).max(MAX_REPEAT),
    do: z.array(primitiveSchema).min(1).max(MAX_REPEAT_BODY),
  })
  .strict();

const TILE_HELP = `a primitive (${PRIMITIVE_KINDS.join(', ')}) or { repeat: ${String(MIN_REPEAT)}-${String(MAX_REPEAT)}, do: [1-${String(MAX_REPEAT_BODY)} primitives] }`;

/** One tile: a primitive name or a repeat, compiled to its `Tile`. */
export const tileSchema = z.unknown().transform((value, ctx): Tile => {
  const primitive = primitiveSchema.safeParse(value);
  if (primitive.success) {
    return { kind: primitive.data };
  }
  const repeat = repeatSchema.safeParse(value);
  if (repeat.success) {
    return {
      kind: 'repeat',
      times: repeat.data.repeat,
      body: repeat.data.do.map((kind): Tile => ({ kind })),
    };
  }
  const shown =
    typeof value === 'string'
      ? `"${value}"`
      : value === undefined
        ? 'nothing'
        : JSON.stringify(value);
  const nested =
    typeof value === 'object' &&
    value !== null &&
    'do' in value &&
    Array.isArray(value.do) &&
    value.do.some((item) => typeof item === 'object' && item !== null);
  const detail =
    typeof value === 'object' && value !== null
      ? nested
        ? 'a repeat holds primitives only: no repeat inside a repeat'
        : repeat.error.issues
            .map((issue) => `${issue.path.join('.') || 'tile'}: ${issue.message}`)
            .join('; ')
      : undefined;
  ctx.addIssue({
    code: 'custom',
    message: `${shown} is not a tile: write ${TILE_HELP}${detail === undefined ? '' : ` (${detail})`}`,
  });
  return z.NEVER;
});

/** The tiles a tray may offer: any primitive and `repeat`, each once, at most `MAX_TRAY`. */
export const traySchema = z
  .array(z.enum([...PRIMITIVE_KINDS, 'repeat'] as const))
  .min(1)
  .max(MAX_TRAY)
  .refine((kinds) => new Set(kinds).size === kinds.length, { message: 'tray lists a tile twice' });
