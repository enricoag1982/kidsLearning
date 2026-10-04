import type { ExerciseStateBase, HintBase } from '../../../subject.ts';
import type { CardDefBase } from '../cards/prompt.ts';

export type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const DIGITS: readonly Digit[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** The reason spoken when exactly `value` is typed wrong (a known misconception, e.g. `a + b + 1`). */
export interface NumberEntryReason {
  readonly value: number;
  readonly reasonKey: string;
}

/** Type the answer on a number pad. */
export interface NumberEntryDef extends CardDefBase {
  readonly type: 'number-entry';
  /** A whole number, 0-9999. */
  readonly answer: number;
  /** Digits the pad accepts (content: at least the answer's own, at most 4). */
  readonly maxDigits: number;
  /** Wrong values with a spoken reason (instead of the default wrong note). */
  readonly reasons?: readonly NumberEntryReason[];
}

/** `entry` is the digits typed so far. */
export interface NumberEntryState<
  D extends NumberEntryDef = NumberEntryDef,
> extends ExerciseStateBase<D> {
  readonly entry: string;
}

export type NumberEntryAction =
  | { readonly type: 'enter-digit'; readonly digit: Digit }
  | { readonly type: 'erase-digit' }
  | { readonly type: 'submit-number' };

export type NumberEntryOutcome =
  | { readonly kind: 'typed' | 'solved' | 'ignored' }
  | { readonly kind: 'wrong'; readonly value: number };

/** Level 1 nudges, level 2 shows the answer's first digit (`digit`, typed in), level 3 reveals (the answer typed in). */
export interface NumberEntryHint extends HintBase {
  readonly kind: 'number-entry';
  readonly reveal: boolean;
  readonly digit?: string;
}
