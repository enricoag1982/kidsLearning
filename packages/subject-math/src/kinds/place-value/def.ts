// `place-value`: the child builds a number with base-ten blocks in place-value columns and taps Check. The blocks being built are the
// UI's draft; the engine hears them as one `build` action when Check is tapped.
import type { ExerciseKind } from '@learn/platform-core/domain/exercise/kind';
import type { CardDefBase } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import type { NumberEntryReason } from '@learn/platform-core/domain/exercise/kinds/number-entry/def';
import type { ExerciseStateBase, HintBase } from '@learn/platform-core/domain/subject';

/** Build `target` with blocks (1 = cube, 10 = rod, 100 = flat, 1000 = big cube) in `columns` columns, then tap Check. */
export interface PlaceValueDef extends CardDefBase {
  readonly type: 'place-value';
  /** The number to build, 1-9999. */
  readonly target: number;
  /** Hundreds, tens, ones (3) or thousands too (4); the target is below `10 ** columns`. */
  readonly columns: 3 | 4;
  /** The counts the columns start with, high to low (default all 0): at most 9 each, and not the target. */
  readonly start?: readonly number[];
  /** Wrong built values with a spoken reason (instead of the default wrong note). */
  readonly reasons?: readonly NumberEntryReason[];
}

/** Level 1: the column labels are emphasised (UI); 2: the numeral of the current build shows beside the blocks (UI); 3: `fill` holds
 * the target's digit in its highest column and 0 in every other, one entry per column, high to low: the UI sets that one column, the
 * child finishes and taps Check. */
export interface PlaceValueHint extends HintBase {
  readonly kind: 'place-value';
  readonly level: 1 | 2 | 3;
  readonly fill?: readonly number[];
}

/** The place-value kind keeps nothing beyond the base state: the blocks being built are the UI's draft. */
export type PlaceValueState<D extends PlaceValueDef = PlaceValueDef> = ExerciseStateBase<D>;

/** Check the build: how many blocks each column holds, high to low (one entry per column, 0-9 each). */
export interface BuildAction {
  readonly type: 'build';
  readonly counts: readonly number[];
}

/** `invalid`: the counts do not fit the exercise (wrong length, a count outside 0-9), nothing counts. `ignored`: any action once
 * solved. `wrong`: the built value (an error counts). */
export type PlaceValueOutcome =
  | { readonly kind: 'invalid' | 'ignored' | 'solved' }
  | { readonly kind: 'wrong'; readonly value: number };

export type PlaceValueKind = ExerciseKind<
  PlaceValueDef,
  PlaceValueState,
  BuildAction,
  PlaceValueOutcome,
  PlaceValueHint,
  null
>;
