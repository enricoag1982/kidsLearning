// The YAML item shapes the templates write (exactly what an author would put under `exercises:`), one per exercise kind they use.
// Every field is the kind's own (`kinds/number-line`, `kinds/place-value`, the card kit's `choice` / `number-entry` / `order` /
// `true-false`); the expander parses each item with the math exercise schema, so a shape slip is an issue at build time.
import type { ExerciseYamlBase } from '@learn/platform-content/subject';

/** A big numeral / sum on the card. */
export interface BigPrompt {
  readonly big: string;
}

/** A big text with a picture over it (`groups`: "3 groups of 4" and the thing counted). */
export interface PicturePrompt extends BigPrompt {
  readonly emoji: string;
}

/** A wrong value and the text ref of the reason spoken when it is answered. */
export interface ValueReason {
  readonly value: number;
  readonly text: string;
}

export interface PlaceValueItem extends ExerciseYamlBase {
  readonly type: 'place-value';
  readonly text: string;
  readonly prompt: BigPrompt;
  readonly target: number;
  readonly columns: 3 | 4;
  readonly reasons?: readonly ValueReason[];
}

export interface NumberEntryItem extends ExerciseYamlBase {
  readonly type: 'number-entry';
  readonly text: string;
  readonly prompt: BigPrompt;
  readonly answer: number;
  readonly maxDigits?: number;
  readonly reasons?: readonly ValueReason[];
}

/** A number-entry item whose card also shows a picture (`groups`). */
export interface PictureNumberEntryItem extends NumberEntryItem {
  readonly prompt: PicturePrompt;
}

/** A choice option made of a numeral or sign; `reason` is the text ref spoken when this wrong option is picked. */
export interface BigOption {
  readonly id: string;
  readonly big: string;
  readonly reason?: string;
}

export interface ChoiceItem extends ExerciseYamlBase {
  readonly type: 'choice';
  readonly text: string;
  readonly prompt?: BigPrompt;
  readonly options: readonly BigOption[];
  readonly answer: string;
}

export interface OrderCard {
  readonly id: string;
  readonly big: string;
}

export interface OrderItem extends ExerciseYamlBase {
  readonly type: 'order';
  readonly text: string;
  readonly items: readonly OrderCard[];
  readonly answer: readonly string[];
}

export interface TrueFalseItem extends ExerciseYamlBase {
  readonly type: 'true-false';
  readonly text: string;
  readonly prompt: BigPrompt;
  readonly answer: boolean;
  readonly reason?: string;
}

export type LineLabels = 'ends' | 'all' | readonly number[];

export interface NumberLineItem extends ExerciseYamlBase {
  readonly type: 'number-line';
  readonly text: string;
  readonly prompt: BigPrompt;
  readonly from: number;
  readonly to: number;
  readonly step: number;
  readonly labels: LineLabels;
  readonly target: number;
  readonly estimate?: boolean;
  readonly reasons?: readonly ValueReason[];
}

/** A wrong array shape and the text ref of the reason spoken when it is checked. */
export interface ShapeReason {
  readonly rows: number;
  readonly cols: number;
  readonly text: string;
}

export interface ArrayItem extends ExerciseYamlBase {
  readonly type: 'array';
  readonly text: string;
  readonly prompt: BigPrompt;
  readonly rows: number;
  readonly cols: number;
  /** Omitted when `true` (the kind's default): the text fixes which number is the rows. */
  readonly 'fixed-rows'?: boolean;
  readonly reasons?: readonly ShapeReason[];
}
