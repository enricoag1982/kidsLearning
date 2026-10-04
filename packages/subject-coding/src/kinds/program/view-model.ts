// What the program editor shows beyond the strip itself: where a run's step sits in the strip, the faded tiles of hint 2 and the cell
// hint 1 points at. Pure.
import { step } from '@learn/platform-core/domain/grid';
import type { Cell } from '@learn/platform-core/domain/grid';
import type { Level } from '../../core/level.ts';
import { run } from '../../core/simulator.ts';
import type { PrimitiveKind, Tile } from '../../core/tiles.ts';

/** A step's path counts tiles without the empty slots (`draft.program()`); the strip has its empty slots, so the top-level index
 * becomes the index of that slot. */
export function slotPathOf(
  slots: readonly (Tile | null)[],
  path: readonly number[],
): readonly number[] {
  const filled = slots.flatMap((slot, index) => (slot === null ? [] : [index]));
  const [top, ...rest] = path;
  const slot = top === undefined ? undefined : filled[top];
  return slot === undefined ? path : [slot, ...rest];
}

/** Hint 2: the solution's tile for each of the first two empty slots, by slot index (a slot the solution has no tile for stays
 * bare). */
export function ghostSlots(
  slots: readonly (Tile | null)[],
  solution: readonly Tile[],
): Readonly<Record<number, Tile>> {
  const empty = slots.flatMap((slot, index) => (slot === null ? [index] : [])).slice(0, 2);
  return Object.fromEntries(
    empty.flatMap((index) => {
      const tile = solution[index];
      return tile === undefined ? [] : [[index, tile] as const];
    }),
  );
}

/** Hint 1: the cell the solution's first primitive takes the animal to (a turn: the cell it then faces). */
export function firstMoveCell(level: Level, firstMove: PrimitiveKind): Cell {
  const { final } = run(level, [{ kind: firstMove }]);
  return final.cell.x === level.start.x && final.cell.y === level.start.y
    ? step(final.cell, final.heading)
    : final.cell;
}
