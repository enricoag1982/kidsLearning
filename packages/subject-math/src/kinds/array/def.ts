// `array`: the child makes a rows x columns array of dots on a 6 x 6 grid by tapping the cell that becomes its bottom-right corner
// (the top-left is fixed), then taps Check. The engine checks the shape; which cell was tapped stays the UI's draft until Check.
import type { CardDefBase } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import type { ExerciseStateBase, HintBase } from '@learn/platform-core/domain/subject';

export interface ArrayDef extends CardDefBase {
  readonly type: 'array';
  /** 1-6. */
  readonly rows: number;
  /** 1-6. */
  readonly cols: number;
  /** true: the text fixes which number is the rows ("3 rows of 4"), so only rows x cols counts; false: cols x rows is also right. */
  readonly fixedRows: boolean;
  /** A wrong shape with a spoken reason (instead of the default wrong note). */
  readonly reasons?: readonly ArrayReason[];
}

export interface ArrayReason {
  readonly rows: number;
  readonly cols: number;
  readonly reasonKey: string;
}

/** Check the array of `rows` x `cols` dots (the UI keeps the tapped corner as its own draft until Check). */
export interface ArrayAction {
  readonly type: 'make-array';
  readonly rows: number;
  readonly cols: number;
}

/** The engine keeps nothing beyond the base state: which corner is tapped stays the UI's draft. */
export type ArrayState = ExerciseStateBase<ArrayDef>;

/** `invalid`: a size outside 1-6 (nothing is checked, no error counts); `ignored`: any action once solved. */
export type ArrayOutcome =
  | { readonly kind: 'solved' | 'ignored' | 'invalid' }
  | { readonly kind: 'wrong'; readonly rows: number; readonly cols: number };

/** Level 1: "rows go across"; 2: the number of dots in a row (`cols`), shown on the first row and in the note; 3: the rows outlined
 * (`fillRows` of them; the child still taps the corner and Check). */
export interface ArrayHint extends HintBase {
  readonly kind: 'array';
  readonly level: 1 | 2 | 3;
  readonly cols?: number;
  readonly fillRows?: number;
}
