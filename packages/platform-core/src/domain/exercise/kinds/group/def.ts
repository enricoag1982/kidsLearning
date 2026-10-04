import type { ExerciseStateBase } from '../../../subject.ts';
import type { CardDefBase, CardItem, CardShape } from '../cards/prompt.ts';

/** A card to sort: its facts are `shapeFacts(shape)` plus its own `tags` (content rules read them). */
export interface GroupItem extends CardItem {
  readonly tags?: readonly string[];
}

/** What a zone asks of an item, over its facts: every fact of `all` present, no fact of `none` present. */
export interface ZoneRule {
  readonly all?: readonly string[];
  readonly none?: readonly string[];
}

/** One box of a `row`: a label (text, emoji or shape; content checks) and, optionally, the rule the content verifies. */
export interface GroupBox {
  readonly id: string;
  readonly textKey?: string;
  readonly emoji?: string;
  readonly shape?: CardShape;
  readonly rule?: ZoneRule;
}

/** One axis of a Carroll table or a Venn: `textKey` names the yes side ("Red"), `notTextKey` the other ("Not red"); `rule` is
 * what the yes side asks of an item, the other side is everything else. */
export interface GroupAxis {
  readonly textKey: string;
  readonly notTextKey: string;
  readonly rule?: ZoneRule;
}

/** `row`: 2-4 boxes side by side. `carroll`: a 2 x 2 table, axis a = the columns, axis b = the rows. `venn`: two circles. */
export type GroupLayout = 'row' | 'carroll' | 'venn';

/** The four Carroll cells (box ids): `a` = axis 0 (the columns), `b` = axis 1 (the rows). */
export const CARROLL_ZONES = ['a-b', 'a-not-b', 'not-a-b', 'not-a-not-b'] as const;
/** The four Venn regions (box ids): inside both circles, only the first, only the second, outside both. */
export const VENN_ZONES = ['both', 'only-a', 'only-b', 'neither'] as const;

/** Sort the cards into the boxes: tap a card, then the box it belongs in. */
export interface GroupDef extends CardDefBase {
  readonly type: 'group';
  readonly layout: GroupLayout;
  /** `row` only: 2-4 boxes. */
  readonly boxes?: readonly GroupBox[];
  /** `carroll` and `venn` only; their four zones are `CARROLL_ZONES` / `VENN_ZONES`. */
  readonly axes?: readonly [GroupAxis, GroupAxis];
  /** 3-8 cards, in display order. */
  readonly items: readonly GroupItem[];
  /** Item id → box / zone id, for every item. */
  readonly answer: Readonly<Record<string, string>>;
  /** Content only: the Venn's `neither` region may hold no item. */
  readonly allowEmpty?: true;
}

export interface GroupState extends ExerciseStateBase<GroupDef> {
  /** Item id → the box / zone it was put in (always the right one). */
  readonly placed: Readonly<Record<string, string>>;
  /** Boxes a level-2 hint crossed out for one item each (cleared when that item is placed). */
  readonly ruledOut: readonly { readonly itemId: string; readonly boxId: string }[];
  /** The last wrong put (cleared by the next right put or a hint): the UI flashes that box. */
  readonly wrong?: { readonly itemId: string; readonly boxId: string };
}

export interface PutItemAction {
  readonly type: 'put-item';
  readonly itemId: string;
  readonly boxId: string;
}

/** What a wrong put got half right: `column` / `row` = the Carroll axis that was wrong while the other was right; `overlap` = a
 * Venn put that involves the shared region; `outside` = one that involves the region outside both circles. */
export type GroupMiss = 'row' | 'column' | 'overlap' | 'outside';

export type GroupOutcome =
  | { readonly kind: 'placed' }
  | { readonly kind: 'solved' }
  | { readonly kind: 'ignored' }
  | {
      readonly kind: 'wrong';
      readonly itemId: string;
      readonly boxId: string;
      readonly miss?: GroupMiss;
    };

/** Level 1: read what each box wants (the UI marks the headers). Level 2: `boxId` is not where `itemId` goes. Level 3: `itemId` was
 * put in `boxId`. */
export type GroupHint =
  | { readonly kind: 'group'; readonly level: 1 }
  | { readonly kind: 'group'; readonly level: 2; readonly itemId: string; readonly boxId: string }
  | { readonly kind: 'group'; readonly level: 3; readonly itemId: string; readonly boxId: string };
