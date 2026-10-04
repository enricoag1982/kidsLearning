// The Owl bubble's feedback note as data: one entry per `CardFeedback` kind, read by the platform's `exerciseNote`.
import { choiceHintText, praiseText } from '../../../note-text.ts';
import type { NoteEntry, Resolve } from '../../../notes.ts';
import type { CardHint } from './def.ts';

export type CardFeedback =
  | { readonly kind: 'instruction' }
  /** choice / true-false: a wrong answer. */
  | { readonly kind: 'wrong-answer' }
  | { readonly kind: 'number-wrong' }
  | { readonly kind: 'order-wrong' }
  | { readonly kind: 'hint'; readonly hint: CardHint }
  | { readonly kind: 'solved' };

export type CardNoteKind = Exclude<CardFeedback['kind'], 'instruction'>;

type NoteFeedback<K extends CardNoteKind> = Extract<CardFeedback, { readonly kind: K }>;

/** Level 3 gives the answer away in every kind; below it each kind words its own nudge. */
export function cardHintText(r: Resolve, hint: CardHint): string {
  if (hint.level === 3) return r('exercise.hint-answer');
  if (hint.kind === 'choice') return choiceHintText(r, hint);
  if (hint.kind === 'number-entry') {
    return hint.digit === undefined
      ? r('cards.hint-look')
      : r('cards.hint-first-digit', { digit: hint.digit });
  }
  if (hint.kind === 'order') {
    return hint.ruledOutId === undefined ? r('cards.order-hint') : r('exercise.hint-remove-option');
  }
  return r('cards.hint-look');
}

export const CARD_NOTES = {
  'wrong-answer': { tone: 'attention', error: true, text: (r) => r('exercise.answer-wrong') },
  'number-wrong': { tone: 'attention', error: true, text: (r) => r('cards.number-wrong') },
  'order-wrong': { tone: 'attention', error: true, text: (r) => r('cards.order-wrong') },
  hint: { tone: 'attention', text: (r, f) => cardHintText(r, f.hint) },
  solved: { tone: 'praise', text: (r, _f, { stars }) => praiseText(r, stars) },
} as const satisfies { readonly [K in CardNoteKind]: NoteEntry<NoteFeedback<K>> };
