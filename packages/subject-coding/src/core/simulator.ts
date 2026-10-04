// The simulator: runs a program on a level one step at a time, so the UI can animate the steps, the content build can prove a
// lesson solvable, and the solver can search over the same move rules.
import {
  cellKey,
  inGrid,
  sameCell,
  step,
  turnLeft,
  turnRight,
} from '@learn/platform-core/domain/grid';
import type { Cell, Heading } from '@learn/platform-core/domain/grid';
import type { Level } from './level.ts';
import type { PrimitiveKind, Tile } from './tiles.ts';

export interface RunState {
  readonly cell: Cell;
  readonly heading: Heading;
  /** Keys (`cellKey`) of the star cells picked up so far, in the order they were reached. */
  readonly collected: readonly string[];
}

export type StepResult = 'moved' | 'turned' | 'jumped' | 'bumped';

export interface StepEvent {
  /** `[topIndex]`, or `[topIndex, bodyIndex]` for a tile inside a repeat. */
  readonly path: readonly number[];
  /** 1-based repeat iteration; only for a tile inside a repeat. */
  readonly iteration?: number;
  readonly kind: PrimitiveKind;
  readonly result: StepResult;
  /** The state after the step (the position is unchanged on a bump). */
  readonly state: RunState;
}

export interface RunResult {
  readonly steps: readonly StepEvent[];
  /** `success`: every star picked up and, with a flag, the animal stands on it when the program ends. `bumped`: the run stopped at
   * a rock or the grid's edge. `unfinished`: the program ended without either. */
  readonly outcome: 'success' | 'bumped' | 'unfinished';
  readonly final: RunState;
}

export function startState(level: Level): RunState {
  return { cell: level.start, heading: level.heading, collected: [] };
}

function isRock(level: Level, cell: Cell): boolean {
  return level.rocks.some((rock) => sameCell(rock, cell));
}

/** Moves to `target`, or bumps when it is off the grid or a rock; stepping on a star picks it up. */
function moveTo(
  level: Level,
  state: RunState,
  target: Cell,
  result: 'moved' | 'jumped',
): { readonly result: StepResult; readonly state: RunState } {
  if (!inGrid(level.size, target) || isRock(level, target)) {
    return { result: 'bumped', state };
  }
  const key = cellKey(target);
  const picks =
    level.stars.some((star) => sameCell(star, target)) && !state.collected.includes(key);
  return {
    result,
    state: {
      ...state,
      cell: target,
      collected: picks ? [...state.collected, key] : state.collected,
    },
  };
}

/** One primitive from `state`: absolute arrows and `forward` move one cell, `jump` two along the heading (the cell jumped over may
 * be a rock, the landing cell may not), turns rotate in place. */
export function applyPrimitive(
  level: Level,
  state: RunState,
  kind: PrimitiveKind,
): { readonly result: StepResult; readonly state: RunState } {
  switch (kind) {
    case 'up':
    case 'down':
    case 'left':
    case 'right':
      return moveTo(level, state, step(state.cell, kind), 'moved');
    case 'forward':
      return moveTo(level, state, step(state.cell, state.heading), 'moved');
    case 'jump':
      return moveTo(level, state, step(state.cell, state.heading, 2), 'jumped');
    case 'turn-left':
      return { result: 'turned', state: { ...state, heading: turnLeft(state.heading) } };
    case 'turn-right':
      return { result: 'turned', state: { ...state, heading: turnRight(state.heading) } };
  }
}

/** Every star picked up and, with a flag, standing on it. */
export function isSuccess(level: Level, state: RunState): boolean {
  return (
    state.collected.length === level.stars.length &&
    (level.goal === undefined || sameCell(level.goal, state.cell))
  );
}

interface Planned {
  readonly path: readonly number[];
  readonly iteration?: number;
  readonly kind: PrimitiveKind;
}

/** The primitives in run order, with where each one sits: a repeat runs its body `times` times, numbering the iterations from 1. */
function plan(program: readonly Tile[]): readonly Planned[] {
  const planned: Planned[] = [];
  program.forEach((tile, top) => {
    if (tile.kind !== 'repeat') {
      planned.push({ path: [top], kind: tile.kind });
      return;
    }
    for (let iteration = 1; iteration <= tile.times; iteration += 1) {
      tile.body.forEach((inner, index) => {
        if (inner.kind === 'repeat') {
          throw new Error('A repeat inside a repeat is not supported');
        }
        planned.push({ path: [top, index], iteration, kind: inner.kind });
      });
    }
  });
  return planned;
}

/** Runs the whole program (success is judged at its end, never early) unless it bumps, which stops the run on the spot. */
export function run(level: Level, program: readonly Tile[]): RunResult {
  const steps: StepEvent[] = [];
  let state = startState(level);
  for (const planned of plan(program)) {
    const next = applyPrimitive(level, state, planned.kind);
    state = next.state;
    steps.push({
      path: planned.path,
      ...(planned.iteration === undefined ? {} : { iteration: planned.iteration }),
      kind: planned.kind,
      result: next.result,
      state,
    });
    if (next.result === 'bumped') {
      return { steps, outcome: 'bumped', final: state };
    }
  }
  return { steps, outcome: isSuccess(level, state) ? 'success' : 'unfinished', final: state };
}
