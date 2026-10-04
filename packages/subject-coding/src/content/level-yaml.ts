// The board of a coding exercise as written in YAML: `map` rows (`S` start, `F` flag, `*` star, `#` rock, `.` empty) and an
// optional `heading` (default `right`).
import { z } from 'zod';
import type { Heading } from '@learn/platform-core/domain/grid';
import { parseLevel } from '../core/level.ts';
import type { Level } from '../core/level.ts';
import { SOLVER_MAX_SIDE } from '../core/solver.ts';

export const levelFields = {
  map: z.array(z.string().min(1)).min(1),
  heading: z.enum(['up', 'right', 'down', 'left']).optional(),
};

interface LevelYaml {
  readonly map: readonly string[];
  readonly heading?: Heading | undefined;
}

/** A map that does not parse (no start, two flags, no star or flag, ragged rows, an unknown char) is an issue on `map`. */
export function refineLevel(raw: LevelYaml, ctx: z.RefinementCtx): void {
  try {
    parseLevel(raw.map, raw.heading);
  } catch (error) {
    ctx.addIssue({
      code: 'custom',
      path: ['map'],
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export function compileLevel(raw: LevelYaml): Level {
  return parseLevel(raw.map, raw.heading);
}

/** True when the level fits the solver's 6 × 6; otherwise says so and returns false (the other checks stop there). */
export function checkLevelSize(level: Level, where: string, issues: string[]): boolean {
  const { cols, rows } = level.size;
  if (cols > SOLVER_MAX_SIDE || rows > SOLVER_MAX_SIDE) {
    issues.push(
      `${where}: map is ${String(cols)} × ${String(rows)}, over ${String(SOLVER_MAX_SIDE)} × ${String(SOLVER_MAX_SIDE)}`,
    );
    return false;
  }
  return true;
}
