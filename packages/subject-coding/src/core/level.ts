// A coding level: a small grid with rocks, stars, an optional flag, and where the animal starts and faces.
import { parseGridMap } from '@learn/platform-core/domain/grid';
import type { Cell, GridSize, Heading } from '@learn/platform-core/domain/grid';

export interface Level {
  readonly size: GridSize;
  readonly rocks: readonly Cell[];
  readonly stars: readonly Cell[];
  /** The flag: the animal has to stand on it when the program ends. */
  readonly goal?: Cell;
  readonly start: Cell;
  readonly heading: Heading;
}

const MAP_CHARS = 'SF*#.';

/** Map chars: `S` start, `F` flag (goal), `*` star, `#` rock, `.` empty. Exactly one `S`; at most one `F`; at least one star or a
 * flag; no other char. Throws with a clear message otherwise (and on the platform's own map errors: no rows, ragged rows). */
export function parseLevel(map: readonly string[], heading: Heading = 'right'): Level {
  const { size, cells } = parseGridMap(map, MAP_CHARS);
  const unknown = new Set(Array.from(map.join('')).filter((char) => !MAP_CHARS.includes(char)));
  if (unknown.size > 0) {
    const list = [...unknown].map((char) => `"${char}"`).join(', ');
    throw new Error(`Level map has unknown ${list}: use only ${Array.from(MAP_CHARS).join(' ')}`);
  }
  const starts = cells['S'] ?? [];
  const flags = cells['F'] ?? [];
  const stars = cells['*'] ?? [];
  const [start] = starts;
  if (start === undefined || starts.length > 1) {
    throw new Error(`Level map needs exactly one start "S" (found ${String(starts.length)})`);
  }
  const [goal] = flags;
  if (flags.length > 1) {
    throw new Error(`Level map needs at most one flag "F" (found ${String(flags.length)})`);
  }
  if (stars.length === 0 && goal === undefined) {
    throw new Error('Level map needs at least one star "*" or a flag "F"');
  }
  return {
    size,
    rocks: cells['#'] ?? [],
    stars,
    ...(goal === undefined ? {} : { goal }),
    start,
    heading,
  };
}
