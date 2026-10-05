// The YAML item shapes the templates write (exactly what an author would put under `exercises:`), one per exercise kind they use:
// a `choice` of shape cards under a row of shapes, a `choice` of rule texts under a row of numbers, a `number-entry` pad. Every
// field is the card kit's own (the W3 sudoku item is `grid-fill`'s); the expander parses each item with the logic exercise schema, so a
// shape slip is an issue at build time.
import type { CardShape } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import type { ExerciseYamlBase } from '@learn/platform-content/subject';
import type { SudokuFocus } from '../../core/puzzles/sudoku.ts';

/** A token of a prompt row: a drawn shape or the `gap` (a dashed "?" box). */
export type PromptToken = CardShape | 'gap';

/** A shape card; `reason` is the text ref spoken when this wrong card is picked. */
export interface ShapeOption {
  readonly id: string;
  readonly shape: CardShape;
  readonly reason?: string;
}

/** A card with a sentence on it (a rule text, `lessons:gen.<item id>.<name>`). */
export interface TextOption {
  readonly id: string;
  readonly text: string;
}

export interface ShapeChoiceItem extends ExerciseYamlBase {
  readonly type: 'choice';
  readonly text: string;
  readonly prompt: { readonly shapes: readonly PromptToken[] };
  readonly options: readonly ShapeOption[];
  readonly answer: string;
}

export interface RuleChoiceItem extends ExerciseYamlBase {
  readonly type: 'choice';
  readonly text: string;
  readonly prompt: { readonly big: string };
  readonly options: readonly TextOption[];
  readonly answer: string;
}

/** A wrong value and the text ref of the reason spoken when it is typed. */
export interface ValueReason {
  readonly value: number;
  readonly text: string;
}

/** A number-entry item whose card shows a row of numbers (`big`) or a row of shapes (`shapes`). */
export interface EntryItem extends ExerciseYamlBase {
  readonly type: 'number-entry';
  readonly text: string;
  readonly prompt: { readonly big: string } | { readonly shapes: readonly PromptToken[] };
  readonly answer: number;
  readonly maxDigits?: number;
  readonly reasons?: readonly ValueReason[];
}

/** A number-entry item whose card shows a row of shapes (`grow-next`: "How many in step 5?"). */
export interface ShapeEntryItem extends EntryItem {
  readonly prompt: { readonly shapes: readonly PromptToken[] };
}

/** A `choice` of drawn shapes with no prompt (`odd-one`: the cards are the whole question). */
export interface ShapeCardsItem extends ExerciseYamlBase {
  readonly type: 'choice';
  readonly text: string;
  readonly options: readonly ShapeOption[];
  readonly answer: string;
}

/** What a box / axis rule asks of a card: every fact of `all`, none of `none`. */
export interface RuleYaml {
  readonly all?: readonly string[];
  readonly none?: readonly string[];
}

/** A card of a `group` exercise: a drawn shape (sorting) or an emoji with its tags (animals). */
export interface GroupCardYaml {
  readonly id: string;
  readonly shape?: CardShape;
  readonly emoji?: string;
  readonly tags?: readonly string[];
}

export interface BoxYaml {
  readonly id: string;
  readonly text: string;
  readonly rule: RuleYaml;
}

export interface AxisYaml {
  readonly text: string;
  readonly notText: string;
  readonly rule: RuleYaml;
}

/** A `group` exercise (`sort-boxes`: layout `row`; `carroll`; `venn`), exactly as an author writes it. */
export interface GroupItem extends ExerciseYamlBase {
  readonly type: 'group';
  readonly text: string;
  readonly layout: 'row' | 'carroll' | 'venn';
  readonly boxes?: readonly BoxYaml[];
  readonly axes?: readonly [AxisYaml, AxisYaml];
  readonly items: readonly GroupCardYaml[];
  readonly answer: Readonly<Record<string, string>>;
  readonly allowEmpty?: true;
}

/** An `order` exercise of drawn shapes (`line-up`). */
export interface OrderShapesItem extends ExerciseYamlBase {
  readonly type: 'order';
  readonly text: string;
  readonly items: readonly { readonly id: string; readonly shape: CardShape }[];
  readonly answer: readonly string[];
}

/** A `choice` of rule sentences under a row of shapes (`odd-rule`). */
export interface ShapeRuleItem extends ExerciseYamlBase {
  readonly type: 'choice';
  readonly text: string;
  readonly prompt: { readonly shapes: readonly PromptToken[] };
  readonly options: readonly TextOption[];
  readonly answer: string;
}

/** A `grid-fill` sudoku (W3): rows of `.` and digits, the lesson's focus, and for a guided item the one `[row, column]` target. */
export interface SudokuItem extends ExerciseYamlBase {
  readonly type: 'grid-fill';
  readonly text: string;
  readonly sudoku: readonly string[];
  readonly focus: SudokuFocus;
  readonly targets?: readonly (readonly [number, number])[];
}
