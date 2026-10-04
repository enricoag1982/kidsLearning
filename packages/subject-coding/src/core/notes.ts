// The Owl bubble's feedback note as data: the coding kinds' own feedback kinds and the wording of their hints, added to the card
// kit's table (`createCardCore({ notes })`). Texts: `coding.notes.*` / `coding.hint.*` in `content/locales/en/common.yaml`.
import type { CardHint } from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { cardHintText } from '@learn/platform-core/domain/exercise/kinds/cards/notes';
import type { NoteEntry, Resolve } from '@learn/platform-core/domain/notes';
import type { FindBugHint, PredictHint, ProgramHint } from './types.ts';

/** Why a Run could not start (`program-invalid`): no tile in the strip, over the cap, a tile outside the tray, or an unfinished strip
 * (an empty repeat, or a gap before a locked tile). */
export type InvalidReason = 'empty' | 'too-many' | 'tray' | 'incomplete';

export type CodingFeedback =
  | { readonly kind: 'instruction' }
  /** program: the run bumped; `step` counts the primitives run so far, the bump included; `edge`: the grid's edge, not a rock. */
  | { readonly kind: 'run-bumped'; readonly step: number; readonly edge: boolean }
  /** program: the run ended without reaching the goal. */
  | { readonly kind: 'run-unfinished' }
  /** program: nothing ran. */
  | { readonly kind: 'program-invalid'; readonly reason: InvalidReason }
  | { readonly kind: 'predict-wrong' }
  | { readonly kind: 'bug-wrong' }
  | { readonly kind: 'hint'; readonly hint: CodingHintPayload }
  | { readonly kind: 'solved' };

/** The hints of the three coding kinds, and the card kit's. */
export type CodingHintPayload = CardHint | ProgramHint | PredictHint | FindBugHint;

type OwnNoteKind =
  'run-bumped' | 'run-unfinished' | 'program-invalid' | 'predict-wrong' | 'bug-wrong';

type NoteFeedback<K extends OwnNoteKind | 'hint'> = Extract<CodingFeedback, { readonly kind: K }>;

const INVALID_TEXT: Readonly<Record<InvalidReason, string>> = {
  empty: 'coding.notes.empty',
  'too-many': 'coding.notes.too-many',
  tray: 'coding.notes.not-in-tray',
  incomplete: 'coding.notes.incomplete',
};

function byLevel(level: 1 | 2 | 3, one: string, two: string, three: string): string {
  return level === 1 ? one : level === 2 ? two : three;
}

/** The nudge of each coding hint level: 1 / 2 / 3 per kind. A card kit hint keeps the kit's wording. */
export function codingHintText(r: Resolve, hint: CodingHintPayload): string {
  if (hint.kind === 'program') {
    return r(byLevel(hint.level, 'coding.hint.first', 'coding.hint.ghost', 'coding.hint.fill'));
  }
  if (hint.kind === 'predict') {
    return r(hint.level === 3 ? 'coding.hint.predict-answer' : 'coding.hint.replay');
  }
  if (hint.kind === 'find-bug') {
    return r(
      byLevel(
        hint.level,
        'coding.hint.bug-replay',
        'coding.hint.bug-candidates',
        'coding.hint.bug-flash',
      ),
    );
  }
  return cardHintText(r, hint);
}

export const CODING_NOTES = {
  'run-bumped': {
    tone: 'attention',
    error: true,
    text: (r, f) =>
      r(f.edge ? 'coding.notes.bumped-edge' : 'coding.notes.bumped', { step: f.step }),
  },
  'run-unfinished': { tone: 'attention', error: true, text: (r) => r('coding.notes.unfinished') },
  'program-invalid': { tone: 'attention', text: (r, f) => r(INVALID_TEXT[f.reason]) },
  'predict-wrong': { tone: 'attention', error: true, text: (r) => r('coding.notes.predict-wrong') },
  'bug-wrong': { tone: 'attention', error: true, text: (r) => r('coding.notes.bug-wrong') },
  hint: { tone: 'attention', text: (r, f) => codingHintText(r, f.hint) },
} as const satisfies { readonly [K in OwnNoteKind | 'hint']: NoteEntry<NoteFeedback<K>> };
