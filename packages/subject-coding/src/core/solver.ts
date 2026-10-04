// The solver: breadth-first search over straight-line programs (no repeat), used by the content build to prove a loop lesson
// needs its loop and to know how short a program can be. It plays the simulator's own move rules.
import { cellKey } from '@learn/platform-core/domain/grid';
import type { Level } from './level.ts';
import { applyPrimitive, isSuccess, startState } from './simulator.ts';
import type { RunState } from './simulator.ts';
import type { PrimitiveKind } from './tiles.ts';

/** The search keeps every (cell, heading, stars picked) it has seen: bounded so it stays instant (6 × 6 × 4 × 2^6 states). */
export const SOLVER_MAX_SIDE = 6;
export const SOLVER_MAX_STARS = 6;

function guardSize(level: Level): void {
  const { cols, rows } = level.size;
  if (cols > SOLVER_MAX_SIDE || rows > SOLVER_MAX_SIDE) {
    throw new Error(
      `Solver: ${String(cols)} × ${String(rows)} grid is over ${String(SOLVER_MAX_SIDE)} × ${String(SOLVER_MAX_SIDE)}`,
    );
  }
  if (level.stars.length > SOLVER_MAX_STARS) {
    throw new Error(
      `Solver: ${String(level.stars.length)} stars is over ${String(SOLVER_MAX_STARS)}`,
    );
  }
}

/** Shortest straight-line programs (no repeat) over `tray` primitives that succeed, by BFS over (cell, heading, collected stars).
 * `maxLength` bound; returns the length of the shortest, or `null` when none is that short. A step that bumps ends the program
 * in failure, so the search never goes through one. */
export function shortestStraightLength(
  level: Level,
  tray: readonly PrimitiveKind[],
  maxLength: number,
): number | null {
  guardSize(level);
  const starIndex = new Map(level.stars.map((star, index) => [cellKey(star), index]));
  const keyOf = (state: RunState): string => {
    const picked = state.collected.reduce(
      (mask, key) => mask | (1 << (starIndex.get(key) ?? 0)),
      0,
    );
    return `${cellKey(state.cell)}|${state.heading}|${String(picked)}`;
  };
  const primitives = [...new Set(tray)];

  const first = startState(level);
  if (isSuccess(level, first)) {
    return 0;
  }
  const seen = new Set([keyOf(first)]);
  let frontier: readonly RunState[] = [first];
  for (let length = 1; length <= maxLength && frontier.length > 0; length += 1) {
    const next: RunState[] = [];
    for (const state of frontier) {
      for (const kind of primitives) {
        const moved = applyPrimitive(level, state, kind);
        if (moved.result === 'bumped') {
          continue;
        }
        const key = keyOf(moved.state);
        if (seen.has(key)) {
          continue;
        }
        if (isSuccess(level, moved.state)) {
          return length;
        }
        seen.add(key);
        next.push(moved.state);
      }
    }
    frontier = next;
  }
  return null;
}

/** True when some program of at most `cap` top-level slots without any repeat succeeds (used to prove a loop lesson needs its
 * loop). Without a repeat a slot is a tile, so this is "the shortest straight-line program fits `cap`". */
export function solvableWithoutRepeat(
  level: Level,
  tray: readonly PrimitiveKind[],
  cap: number,
): boolean {
  const length = shortestStraightLength(level, tray, cap);
  return length !== null && length <= cap;
}
