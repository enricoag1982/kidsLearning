// The Owl bubble's feedback notes of the `group` kind as data (`GROUP_NOTES`, added to a subject's note table). Texts: `cards.group.*`
// in the platform's `common.yaml`.
import type { NoteEntry, Resolve } from '../../../notes.ts';
import type { CardHint } from '../cards/def.ts';
import { cardHintText } from '../cards/notes.ts';
import type { GroupHint, GroupMiss } from './def.ts';

export type GroupFeedback =
  /** A wrong put; `miss` = what it got half right (Carroll axis, Venn region), absent = a plain miss. */
  | { readonly kind: 'group-wrong'; readonly miss?: GroupMiss }
  /** The kit's `hint` feedback kind: the session reducer always wraps a hint in it, so the entry also words the card kit's hints. */
  | { readonly kind: 'hint'; readonly hint: GroupHint | CardHint };

type NoteFeedback<K extends GroupFeedback['kind']> = Extract<GroupFeedback, { readonly kind: K }>;

/** The text key of a wrong put's note, by what it got half right. */
const WRONG_KEY = {
  row: 'cards.group.wrong-row',
  column: 'cards.group.wrong-column',
  overlap: 'cards.group.wrong-overlap',
  outside: 'cards.group.wrong-outside',
} as const satisfies Readonly<Record<GroupMiss, string>>;

/** The nudge of each hint level: read the boxes, "not here", "watch". */
export function groupHintText(r: Resolve, hint: GroupHint): string {
  return r(`cards.group.hint-${String(hint.level)}`);
}

export const GROUP_NOTES = {
  'group-wrong': {
    tone: 'attention',
    error: true,
    text: (r, f) => r(f.miss === undefined ? 'cards.group.wrong' : WRONG_KEY[f.miss]),
  },
  // A subject with its own `hint` entry (math) words group hints with `groupHintText` there instead of spreading this one.
  hint: {
    tone: 'attention',
    text: (r, f) => (f.hint.kind === 'group' ? groupHintText(r, f.hint) : cardHintText(r, f.hint)),
  },
} as const satisfies { readonly [K in GroupFeedback['kind']]: NoteEntry<NoteFeedback<K>> };
