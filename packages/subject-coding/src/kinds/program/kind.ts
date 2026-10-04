import { errorHintStars } from '@learn/platform-core/domain/exercise/stars';
import { run } from '../../core/simulator.ts';
import type { RunResult } from '../../core/simulator.ts';
import { initCodingState } from '../../core/state.ts';
import { isValidProgram, sameTile, tileCount } from '../../core/tiles.ts';
import type { PrimitiveKind, Tile, TileKind } from '../../core/tiles.ts';
import type { CodingKind, ProgramDef, ProgramHint } from '../../core/types.ts';

/** Run the program in the strip (the draft is the UI's; the engine keeps none). */
export interface ProgramAction {
  readonly type: 'run-program';
  readonly program: readonly Tile[];
}

/** `invalid`: the program breaks a rule of the exercise (an empty strip included), nothing ran and no error counts. `solved` / `failed`: it ran; the UI
 * animates `run.steps`. `ignored`: any action once solved. */
export type ProgramOutcome =
  | { readonly kind: 'invalid' | 'ignored' }
  | { readonly kind: 'solved' | 'failed'; readonly run: RunResult };

/** Every tile kind a program uses, a repeat and the tiles inside it included. */
export function kindsUsed(program: readonly Tile[]): readonly TileKind[] {
  return program.flatMap((tile): TileKind[] =>
    tile.kind === 'repeat' ? ['repeat', ...kindsUsed(tile.body)] : [tile.kind],
  );
}

/** The first primitive the program runs (the first tile, or the first tile of a leading repeat's body). */
export function firstPrimitive(program: readonly Tile[]): PrimitiveKind | undefined {
  for (const tile of program) {
    if (tile.kind !== 'repeat') {
      return tile.kind;
    }
    const inner = firstPrimitive(tile.body);
    if (inner !== undefined) {
      return inner;
    }
  }
  return undefined;
}

/** Why `program` cannot be run for `def`, or `null` when it can: at least one tile (the empty strip: "Add some tiles first"), a valid
 * program (`isValidProgram`), at most `cap` tiles (`tileCount`), only tray kinds, every locked slot still holding its prefilled
 * tile. */
export function programProblem(def: ProgramDef, program: readonly Tile[]): string | null {
  if (program.length === 0) {
    return 'no tiles';
  }
  if (!isValidProgram(program)) {
    return 'not a valid program';
  }
  const count = tileCount(program);
  if (count > def.cap) {
    return `${String(count)} tiles is over the cap of ${String(def.cap)}`;
  }
  const outside = kindsUsed(program).find((kind) => !def.tray.includes(kind));
  if (outside !== undefined) {
    return `"${outside}" is not in the tray`;
  }
  for (const index of def.locked ?? []) {
    const fixed = def.prefilled?.[index];
    const tile = program[index];
    if (fixed === undefined || fixed === null || tile === undefined || !sameTile(fixed, tile)) {
      return `locked slot ${String(index)} was changed`;
    }
  }
  return null;
}

export const programKind: CodingKind<ProgramDef, ProgramAction, ProgramOutcome, ProgramHint> = {
  type: 'program',
  input: 'place',

  init: initCodingState,

  /** A run that reaches the goal solves; any other run costs an error and returns its steps. */
  act(state, action) {
    if (state.solved) {
      return { state, outcome: { kind: 'ignored' } };
    }
    if (programProblem(state.def, action.program) !== null) {
      return { state, outcome: { kind: 'invalid' } };
    }
    const result = run(state.def.level, action.program);
    if (result.outcome === 'success') {
      return {
        state: { ...state, solved: true, moves: state.moves + 1 },
        outcome: { kind: 'solved', run: result },
      };
    }
    return {
      state: { ...state, errors: state.errors + 1, moves: state.moves + 1 },
      outcome: { kind: 'failed', run: result },
    };
  },

  /** 1: which way first; 2: a ghost of the first two top-level tiles; 3: the whole solution (the child still taps Run). */
  hint(state, level) {
    const bumped = { ...state, hintLevel: level };
    const { solution, id } = state.def;
    if (level === 1) {
      const firstMove = firstPrimitive(solution);
      if (firstMove === undefined) {
        throw new Error(`program "${id}": the solution has no tile`);
      }
      return { state: bumped, hint: { kind: 'program', level, firstMove } };
    }
    if (level === 2) {
      return { state: bumped, hint: { kind: 'program', level, ghost: solution.slice(0, 2) } };
    }
    return { state: bumped, hint: { kind: 'program', level, reveal: solution } };
  },

  stars(state) {
    return errorHintStars(state.hintLevel, state.errors);
  },
};
