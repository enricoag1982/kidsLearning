// The Owl bubble's feedback note as data: math's own feedback kind (`line-wrong`) and the wording of its hints, added to the card
// kit's table (`createCardCore({ notes })`). Texts: `math.notes.*` / `math.hints.*` in `content/locales/en/common.yaml`.
import type { CardHint } from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { cardHintText } from '@learn/platform-core/domain/exercise/kinds/cards/notes';
import type { NoteEntry, Resolve } from '@learn/platform-core/domain/notes';
import type { NumberLineHint } from '../kinds/number-line/def.ts';

export type MathFeedback =
  | { readonly kind: 'instruction' }
  /** number-line: the marker was checked in the wrong place; `reasonKey` = the reason of that exact value, spoken instead of the
   * default. */
  | { readonly kind: 'line-wrong'; readonly reasonKey?: string }
  | { readonly kind: 'hint'; readonly hint: MathHintPayload }
  | { readonly kind: 'solved' };

/** The hint of the `number-line` kind, and the card kit's. */
export type MathHintPayload = CardHint | NumberLineHint;

type OwnNoteKind = 'line-wrong';

type NoteFeedback<K extends OwnNoteKind | 'hint'> = Extract<MathFeedback, { readonly kind: K }>;

/** The nudge of each `number-line` hint level (1: the middle's number, 2: read every mark, 3: the answer); a card kit hint keeps the
 * kit's wording. */
export function mathHintText(r: Resolve, hint: MathHintPayload): string {
  if (hint.kind !== 'number-line') {
    return cardHintText(r, hint);
  }
  if (hint.level === 3) {
    return r('exercise.hint-answer');
  }
  if (hint.level === 2) {
    return r('math.hints.line-labels');
  }
  return hint.benchmark === undefined
    ? r('cards.hint-look')
    : r('math.hints.line-benchmark', { benchmark: hint.benchmark });
}

export const MATH_NOTES = {
  'line-wrong': {
    tone: 'attention',
    error: true,
    text: (r, f) => r(f.reasonKey ?? 'math.notes.line-wrong'),
  },
  hint: { tone: 'attention', text: (r, f) => mathHintText(r, f.hint) },
} as const satisfies { readonly [K in OwnNoteKind | 'hint']: NoteEntry<NoteFeedback<K>> };
