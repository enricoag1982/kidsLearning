// The YAML item shapes the templates write (exactly what an author would put under `exercises:`), one per exercise kind they use:
// a `choice` of shape cards under a row of shapes, a `choice` of rule texts under a row of numbers, a `number-entry` pad. Every
// field is the card kit's own; the expander parses each item with the logic exercise schema, so a shape slip is an issue at build time.
import type { CardShape } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import type { ExerciseYamlBase } from '@learn/platform-content/subject';

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
