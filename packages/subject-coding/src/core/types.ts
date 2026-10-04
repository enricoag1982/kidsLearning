// The coding exercise defs, hints and state: three kinds of its own (`program`, `predict`, `find-bug`) beside the card kit's four.
// Each def extends `CardDefBase`, so a card prompt (an emoji, a big text, an image) may sit above the grid.
import type { CardExerciseDef } from '@learn/platform-core/domain/exercise/kinds/cards/def';
import type { CardDefBase } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import type { ExerciseKind } from '@learn/platform-core/domain/exercise/kind';
import type { Cell } from '@learn/platform-core/domain/grid';
import type { ExerciseStateBase, HintBase } from '@learn/platform-core/domain/subject';
import type { Level } from './level.ts';
import type { PrimitiveKind, Tile, TileKind } from './tiles.ts';

/** Build a program from the tray tiles so the animal reaches the flag and picks up every star. */
export interface ProgramDef extends CardDefBase {
  readonly type: 'program';
  readonly level: Level;
  /** The tiles the child may use. */
  readonly tray: readonly TileKind[];
  /** Most tiles the program may show (`tileCount`: a repeat counts 1 + its body). */
  readonly cap: number;
  /** The reference program (hints, content checks, solutions); not the only one that works. */
  readonly solution: readonly Tile[];
  /** Slots filled when the exercise starts, by top-level index; `null` = an empty slot. */
  readonly prefilled?: readonly (Tile | null)[];
  /** Top-level indices of prefilled tiles the child cannot change. */
  readonly locked?: readonly number[];
  /** The lesson is about the loop: content checks that no program without a repeat fits `cap`. */
  readonly mustLoop?: boolean;
}

/** Read the program, then tap the square where the animal ends. */
export interface PredictDef extends CardDefBase {
  readonly type: 'predict';
  readonly level: Level;
  readonly program: readonly Tile[];
  /** Where the program ends (computed at build). */
  readonly answer: Cell;
}

/** The program fails: tap the one tile that is wrong. */
export interface FindBugDef extends CardDefBase {
  readonly type: 'find-bug';
  readonly level: Level;
  readonly program: readonly Tile[];
  /** Path of the wrong tile: `[top]` or `[top, body]`; the first tile where the run leaves the passing one. */
  readonly bug: readonly number[];
  /** The tile that goes in its place and makes the program succeed. */
  readonly fix: Tile;
}

/** The three coding kinds' defs. */
export type CodingKindDef = ProgramDef | PredictDef | FindBugDef;

/** Every exercise a coding lesson may hold: the card kit's four kinds and the three above. */
export type CodingExerciseDef = CardExerciseDef | CodingKindDef;

/** Level 1: which way first (`firstMove`); 2: a ghost of the first two tiles; 3: the whole solution (the child still taps Run). */
export interface ProgramHint extends HintBase {
  readonly kind: 'program';
  readonly firstMove?: PrimitiveKind;
  readonly ghost?: readonly Tile[];
  readonly reveal?: readonly Tile[];
}

/** Level 1 / 2: replay the first `replaySteps` steps; 3: the answer cell. */
export interface PredictHint extends HintBase {
  readonly kind: 'predict';
  readonly replaySteps?: number;
  readonly reveal?: Cell;
}

/** Level 1: replay up to the tile at `replayUntil` (the departure); 2: three `candidates` left; 3: the bug's path. */
export interface FindBugHint extends HintBase {
  readonly kind: 'find-bug';
  readonly replayUntil?: readonly number[];
  readonly candidates?: readonly (readonly number[])[];
  readonly reveal?: readonly number[];
}

/** The coding kinds keep nothing beyond the base state: the program being built is the UI's draft. */
export type CodingKindState<D extends CodingKindDef = CodingKindDef> = ExerciseStateBase<D>;

export type CodingKind<
  D extends CodingKindDef,
  A extends { readonly type: string },
  O,
  H extends HintBase,
> = ExerciseKind<D, CodingKindState<D>, A, O, H, null>;
