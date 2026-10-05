// The Owl bubble's feedback note as data: logic's own feedback kinds (`grid-wrong`, `tap-first`) and the wording of the `grid-fill` hints, added to the
// card kit's table (`createCardCore({ notes })`). Texts: `grid.wrong.*` / `grid.hint.*` in `content/locales/en/common.yaml`, worded by
// technique only: no numbers, no coordinates (docs/subjects/logic/plan.md L6).
import type { CardHint } from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { cardHintText } from '@learn/platform-core/domain/exercise/kinds/cards/notes';
import type { NoteEntry, Resolve } from '@learn/platform-core/domain/notes';
import type { GridFillHint, GridPuzzle } from '../kinds/grid-fill/def.ts';
import { CROSS_LEVEL, type CrossTechnique, type UnitKind } from './puzzles/index.ts';

export type LogicFeedback =
  | { readonly kind: 'instruction' }
  /** grid-fill: a number was pressed with no cell selected (the session's `tap-first`). */
  | { readonly kind: 'tap-first' }
  /** grid-fill: an entry was rejected; `conflict` = the kind of the unit that already shows why (a sudoku's row, column or box; a
   * picture's row or column), none = nothing on the grid shows it. */
  | {
      readonly kind: 'grid-wrong';
      readonly puzzle: GridPuzzle['rules'];
      readonly conflict?: UnitKind;
    }
  | { readonly kind: 'hint'; readonly hint: LogicHintPayload }
  | { readonly kind: 'solved' };

/** The hints of logic's own kinds, and the card kit's. */
export type LogicHintPayload = CardHint | GridFillHint;

type OwnNoteKind = 'grid-wrong' | 'tap-first';

type NoteFeedback<K extends OwnNoteKind | 'hint'> = Extract<LogicFeedback, { readonly kind: K }>;

const SUDOKU_WRONG = {
  row: 'grid.wrong.row',
  column: 'grid.wrong.column',
  box: 'grid.wrong.box',
} as const satisfies Readonly<Record<UnitKind, string>>;

const LOOK = {
  row: 'grid.hint.look-row',
  column: 'grid.hint.look-column',
  box: 'grid.hint.look-box',
} as const satisfies Readonly<Record<UnitKind, string>>;

/** What each technique says at level 2: the strategy by name (docs/subjects/logic/plan.md §1 #1). */
const TECHNIQUE_TEXT = {
  'last-cell': 'grid.hint.last-cell',
  'hidden-single': 'grid.hint.hidden-single',
  'naked-single': 'grid.hint.naked-single',
  'full-line': 'grid.hint.full-line',
  overlap: 'grid.hint.overlap',
  'cross-out': 'grid.hint.cross-out',
  combine: 'grid.hint.combine',
} as const satisfies Readonly<Record<GridFillHint['technique'], string>>;

function isCrossTechnique(technique: GridFillHint['technique']): technique is CrossTechnique {
  return technique in CROSS_LEVEL;
}

function gridWrongKey(feedback: NoteFeedback<'grid-wrong'>): string {
  const { conflict } = feedback;
  if (feedback.puzzle === 'picture-cross') {
    if (conflict === 'row') return 'grid.wrong.cross-row';
    return conflict === 'column' ? 'grid.wrong.cross-column' : 'grid.wrong.cross-plain';
  }
  return conflict === undefined ? 'grid.wrong.plain' : SUDOKU_WRONG[conflict];
}

/** The nudge of each `grid-fill` hint level: 1 where to look (a naked single's cell sits in three units, so it names the cell), 2 the
 * technique, 3 "watch". A hint without a step left is the card kit's "look" nudge. */
function gridHintText(r: Resolve, hint: GridFillHint): string {
  if (hint.level === 3) {
    return r('grid.hint.show');
  }
  if (hint.level === 2) {
    return r(TECHNIQUE_TEXT[hint.technique]);
  }
  const [unit, ...rest] = hint.units;
  if (unit === undefined) {
    return r('cards.hint-look');
  }
  if (rest.length > 0) {
    return r('grid.hint.look-cell');
  }
  if (isCrossTechnique(hint.technique)) {
    return r(unit.kind === 'column' ? 'grid.hint.look-line-column' : 'grid.hint.look-line-row');
  }
  return r(LOOK[unit.kind]);
}

/** The nudge of each hint level of logic's own kinds; a card kit hint keeps the kit's wording. */
export function logicHintText(r: Resolve, hint: LogicHintPayload): string {
  return hint.kind === 'grid-fill' ? gridHintText(r, hint) : cardHintText(r, hint);
}

export const LOGIC_NOTES = {
  // Not an error kind: no easier-variant offer.
  'tap-first': { tone: 'attention', text: (r) => r('grid.pick-cell') },
  'grid-wrong': {
    tone: 'attention',
    error: true,
    text: (r, f) => r(gridWrongKey(f)),
  },
  hint: { tone: 'attention', text: (r, f) => logicHintText(r, f.hint) },
} as const satisfies { readonly [K in OwnNoteKind | 'hint']: NoteEntry<NoteFeedback<K>> };
