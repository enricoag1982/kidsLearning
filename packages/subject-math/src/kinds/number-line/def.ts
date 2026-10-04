// `number-line`: the child places a marker on a horizontal number line and taps Check. An exact item has its target on a tick and
// accepts only that tick; an estimate item has its target between two ticks and accepts a value within half an interval of it.
import type { NumberEntryReason } from '@learn/platform-core/domain/exercise/kinds/number-entry/def';
import type { CardDefBase } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import type { ExerciseStateBase, HintBase } from '@learn/platform-core/domain/subject';

export interface NumberLineDef extends CardDefBase {
  readonly type: 'number-line';
  /** Left end (an integer, at least 0). */
  readonly from: number;
  /** Right end (more than `from`). */
  readonly to: number;
  /** Tick interval: `(to - from) / step` is a whole number of 2-10 gaps. */
  readonly step: number;
  /** Ticks that show their number: `'ends'` (`from` and `to` only), `'all'`, or a list (each on a tick). */
  readonly labels: 'ends' | 'all' | readonly number[];
  readonly target: number;
  /** 0 = the target is a tick and the answer must be that tick; more = an estimate, accepted within +- `tolerance`. */
  readonly tolerance: number;
  /** A wrong placed value with a spoken reason (instead of the default wrong note). */
  readonly reasons?: readonly NumberEntryReason[];
}

/** Check the marker at `value` (the UI keeps the marker as its own draft until Check). */
export interface PlaceAction {
  readonly type: 'place';
  readonly value: number;
}

/** The engine keeps nothing beyond the base state: where the marker is stays the UI's draft. */
export type NumberLineState = ExerciseStateBase<NumberLineDef>;

export type NumberLineOutcome =
  { readonly kind: 'solved' | 'ignored' } | { readonly kind: 'wrong'; readonly value: number };

/** Level 1: label the tick at `benchmark` (the middle of the line); 2: label every tick; 3: show the marker at `reveal` (the child
 * still taps Check). */
export interface NumberLineHint extends HintBase {
  readonly kind: 'number-line';
  readonly level: 1 | 2 | 3;
  readonly benchmark?: number;
  readonly reveal?: number;
}
