import type { ExerciseDefBase } from '../../../subject.ts';

export const SHAPE_KINDS = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond'] as const;
export const SHAPE_COLOURS = ['red', 'blue', 'yellow', 'green', 'purple', 'orange'] as const;
export const SHAPE_SIZES = ['tiny', 'small', 'medium', 'big', 'huge'] as const;

export type ShapeKind = (typeof SHAPE_KINDS)[number];
export type ShapeColour = (typeof SHAPE_COLOURS)[number];
export type ShapeSize = (typeof SHAPE_SIZES)[number];

/** The size a shape without `size` has. */
export const DEFAULT_SHAPE_SIZE: ShapeSize = 'big';
/** The count a shape without `count` has. */
export const DEFAULT_SHAPE_COUNT = 1;
/** Most tokens in a prompt row. */
export const MAX_PROMPT_SHAPES = 8;
/** Largest `count` of one shape (a 3 × 3 cluster). */
export const MAX_SHAPE_COUNT = 9;

/** A drawn token: kind × colour × size × count (`count` copies of the shape in one cluster). */
export interface CardShape {
  readonly kind: ShapeKind;
  readonly colour: ShapeColour;
  /** Default `big`. */
  readonly size?: ShapeSize;
  /** 1–9, default 1. */
  readonly count?: number;
}

/** Facts for rules and content checks: `['kind:circle', 'colour:red', 'size:big', 'count:1']`, defaults filled in. */
export function shapeFacts(shape: CardShape): readonly string[] {
  return [
    `kind:${shape.kind}`,
    `colour:${shape.colour}`,
    `size:${shape.size ?? DEFAULT_SHAPE_SIZE}`,
    `count:${String(shape.count ?? DEFAULT_SHAPE_COUNT)}`,
  ];
}

/** Fewest and most gaps (`(to - from) / step`) of a prompt's number-line picture. */
export const MIN_LINE_GAPS = 2;
export const MAX_LINE_GAPS = 20;

/** A small number-line picture: ticks every `step` from `from` to `to`, the ends labelled, each mark a dot with its number. Never
 * a place to tap (the math `number-line` kind is that): the prompt only shows where numbers sit. */
export interface CardLine {
  readonly from: number;
  readonly to: number;
  readonly step: number;
  /** Values of the dots, each on the line (`from` to `to`); at least one. */
  readonly marks: readonly number[];
}

/** The card a kid looks at: a big emoji, a big short text (e.g. `7 + 5`, `AB?`), an art image id, a row of shape tokens, a number-line
 * picture — any mix. The question itself is the exercise's spoken `textKey`. */
export interface CardPrompt {
  readonly emoji?: string;
  readonly big?: string;
  readonly image?: string;
  /** 1–8 tokens in a row, at most one `'gap'` (a "?" slot). */
  readonly shapes?: readonly (CardShape | 'gap')[];
  /** A number line with dots, 2–20 gaps. */
  readonly line?: CardLine;
}

/** Every card exercise def carries an optional prompt. */
export interface CardDefBase extends ExerciseDefBase {
  readonly prompt?: CardPrompt;
}

/** A pickable / orderable card: text (`textKey`), emoji, big text, image, shape — at least one (content checks). */
export interface CardItem {
  readonly id: string;
  readonly textKey?: string;
  readonly emoji?: string;
  readonly big?: string;
  readonly image?: string;
  readonly shape?: CardShape;
}
