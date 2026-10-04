import type { ExerciseDefBase } from '../../../subject.ts';

/** The card a kid looks at: a big emoji, a big short text (e.g. `7 + 5`, `AB?`), an art image id — any mix. The question
 * itself is the exercise's spoken `textKey`. */
export interface CardPrompt {
  readonly emoji?: string;
  readonly big?: string;
  readonly image?: string;
}

/** Every card exercise def carries an optional prompt. */
export interface CardDefBase extends ExerciseDefBase {
  readonly prompt?: CardPrompt;
}

/** A pickable / orderable card: text (`textKey`), emoji, big text, image — at least one (content checks). */
export interface CardItem {
  readonly id: string;
  readonly textKey?: string;
  readonly emoji?: string;
  readonly big?: string;
  readonly image?: string;
}
