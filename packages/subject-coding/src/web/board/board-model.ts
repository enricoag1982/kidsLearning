// What the grid shows for a level and the steps of a run played so far: pure, so it is tested without a browser.
import { cellKey, sameCell } from '@learn/platform-core/domain/grid';
import type { Cell, Heading } from '@learn/platform-core/domain/grid';
import type { GridCellContent } from '@learn/platform-web/ui/grid/GridBoard.tsx';
import type { Level } from '../../core/level.ts';
import { startState } from '../../core/simulator.ts';
import type { RunState, StepEvent } from '../../core/simulator.ts';
import type { TileKind } from '../../core/tiles.ts';

export interface BoardModel {
  /** Rocks, the stars still to collect, the flag; keyed by `cellKey`. */
  readonly cells: Readonly<Record<string, GridCellContent>>;
  readonly actor: { readonly cell: Cell; readonly heading: Heading; readonly bumped: boolean };
  /** Footprints of the cells the actor has left, in order, the start first; none while it rests. */
  readonly trail: readonly Cell[];
  readonly state: RunState;
}

/** The tiles whose meaning depends on where the animal faces: the board then shows a heading arrow beside it. */
const RELATIVE: readonly TileKind[] = ['forward', 'turn-left', 'turn-right', 'jump'];

export function usesHeading(kinds: Iterable<TileKind>): boolean {
  return [...kinds].some((kind) => RELATIVE.includes(kind));
}

/** The board after `played` (the steps shown so far; none = the animal at the start). */
export function boardModel(level: Level, played: readonly StepEvent[]): BoardModel {
  const last = played.at(-1);
  const state = last?.state ?? startState(level);
  const cells: Record<string, GridCellContent> = {};
  for (const rock of level.rocks) {
    cells[cellKey(rock)] = { wall: true };
  }
  for (const star of level.stars) {
    if (!state.collected.includes(cellKey(star))) {
      cells[cellKey(star)] = { star: true };
    }
  }
  if (level.goal !== undefined) {
    const key = cellKey(level.goal);
    cells[key] = { ...cells[key], goal: true };
  }
  const visited =
    played.length === 0 ? [] : [level.start, ...played.map((step) => step.state.cell)];
  const trail = visited.filter(
    (cell, index) =>
      !sameCell(cell, state.cell) && visited.findIndex((other) => sameCell(other, cell)) === index,
  );
  return {
    cells,
    actor: { cell: state.cell, heading: state.heading, bumped: last?.result === 'bumped' },
    trail,
    state,
  };
}
