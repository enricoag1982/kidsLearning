import type { HintBase } from '../../../subject.ts';
import type { ExerciseProgress } from '../../kind.ts';
import type { CardDefBase } from '../cards/prompt.ts';

/** Say whether the statement (the exercise's text, with its prompt) is true. */
export interface TrueFalseDef extends CardDefBase {
  readonly type: 'true-false';
  readonly answer: boolean;
  /** Spoken on the wrong pick (instead of the default wrong note). */
  readonly reasonKey?: string;
}

/** `wrongOptions` holds `'true'` / `'false'` once picked wrong; the UI disables that button. */
export interface TrueFalseState<D extends TrueFalseDef = TrueFalseDef> extends ExerciseProgress {
  readonly def: D;
  readonly wrongOptions?: readonly string[];
}

export interface AnswerTrueFalseAction {
  readonly type: 'answer-true-false';
  readonly value: boolean;
}

/** Level 1 nudges, level 2 nudges with the key word highlighted (`highlight`; outcome only), level 3 reveals. */
export interface TrueFalseHint extends HintBase {
  readonly kind: 'true-false';
  readonly highlight: boolean;
  readonly reveal: boolean;
}
