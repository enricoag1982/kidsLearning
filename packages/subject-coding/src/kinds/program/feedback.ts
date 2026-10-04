// What the UI tells the child about a Run that did not solve: why it could not start, and what a bump hit.
import { inGrid, step } from '@learn/platform-core/domain/grid';
import type { Cell, Heading } from '@learn/platform-core/domain/grid';
import type { Level } from '../../core/level.ts';
import type { RunResult } from '../../core/simulator.ts';
import { tileCount } from '../../core/tiles.ts';
import type { Tile } from '../../core/tiles.ts';
import type { InvalidReason } from '../../core/notes.ts';
import type { ProgramDef } from '../../core/types.ts';
import { kindsUsed } from './kind.ts';

/** Why the engine refused `program` (`programProblem`), in the child's terms: more tiles than the cap, a tile that is not in the
 * tray, else the strip is unfinished (an empty repeat, or a gap in front of a locked tile). */
export function invalidReason(def: ProgramDef, program: readonly Tile[]): InvalidReason {
  if (tileCount(program) > def.cap) {
    return 'too-many';
  }
  if (kindsUsed(program).some((kind) => !def.tray.includes(kind))) {
    return 'tray';
  }
  return 'incomplete';
}

/** Where the primitive the animal was trying to run would have taken it. */
function target(kind: string, cell: Cell, heading: Heading): Cell {
  switch (kind) {
    case 'up':
    case 'down':
    case 'left':
    case 'right':
      return step(cell, kind);
    case 'jump':
      return step(cell, heading, 2);
    default:
      return step(cell, heading);
  }
}

/** The note of a bump: `step` is how many primitives ran, the bump included; `edge` when it hit the grid's edge, not a rock. */
export function bumpFeedback(
  level: Level,
  run: RunResult,
): { readonly step: number; readonly edge: boolean } {
  const last = run.steps.at(-1);
  const edge =
    last !== undefined &&
    !inGrid(level.size, target(last.kind, last.state.cell, last.state.heading));
  return { step: run.steps.length, edge };
}
