// The card kit's shared YAML shapes: the `prompt` every exercise may carry and the card items (choice options, order
// items) — a text, an emoji, a big text, an art image id, a shape token (a row of them for a prompt), at least one.
import type {
  CardItem,
  CardLine,
  CardPrompt,
  CardShape,
} from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import {
  MAX_SHAPE_COUNT,
  SHAPE_COLOURS,
  SHAPE_KINDS,
  SHAPE_SIZES,
} from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import { z } from 'zod';
import { exerciseBaseFields, keySchema, textRefSchema } from '../../schema.ts';

/** A real emoji has at least one non-ASCII character (an authoring slip like `lion` is caught here, not on screen). */
const emojiSchema = z
  .string()
  .min(1)
  .max(16)
  .refine((text) => /\P{ASCII}/u.test(text), { message: 'not an emoji' });

/** A big, short text: a sum, a letter pattern, a number (`big: 3` in YAML is a number: read as `"3"`). */
const bigSchema = z
  .union([z.string(), z.number().int()])
  .transform(String)
  .pipe(z.string().min(1).max(16));

/** An id of the subject's art (`SubjectWeb.art`). */
const imageSchema = keySchema;

/** The visual fields a prompt and a card item share. */
export const cardVisualFields = {
  emoji: emojiSchema.optional(),
  big: bigSchema.optional(),
  image: imageSchema.optional(),
};

/** A drawn shape token: strict enums for `kind`, `colour`, `size` (default `big`), `count` 1–9 (default 1). */
export const shapeSchema = z
  .object({
    kind: z.enum(SHAPE_KINDS),
    colour: z.enum(SHAPE_COLOURS),
    size: z.enum(SHAPE_SIZES).optional(),
    count: z.number().int().min(1).max(MAX_SHAPE_COUNT).optional(),
  })
  .strict();

export type ShapeRaw = z.output<typeof shapeSchema>;

/** The compiled token, keys in `kind`, `colour`, `size`, `count` order. */
export function compileShape(raw: ShapeRaw): CardShape {
  return {
    kind: raw.kind,
    colour: raw.colour,
    ...(raw.size === undefined ? {} : { size: raw.size }),
    ...(raw.count === undefined ? {} : { count: raw.count }),
  };
}

/** A number-line picture: whole numbers, `step` 1 or more, at least one mark. That the line goes up, has 2-20 gaps and holds its
 * marks are verify rules (`line-verify.ts`). */
export const lineSchema = z
  .object({
    from: z.number().int(),
    to: z.number().int(),
    step: z.number().int().min(1),
    marks: z.array(z.number().int()).min(1),
  })
  .strict();

export type LineRaw = z.output<typeof lineSchema>;

/** The compiled picture, keys in `from`, `to`, `step`, `marks` order. */
export function compileLine(raw: LineRaw): CardLine {
  return { from: raw.from, to: raw.to, step: raw.step, marks: [...raw.marks] };
}

/** A prompt's visual fields: the shared ones, `shapes` (tokens and `gap`; their number and the single gap are verify rules,
 * `shape-verify.ts`) and `line`. */
const promptVisualFields = {
  ...cardVisualFields,
  shapes: z.array(z.union([z.literal('gap'), shapeSchema])).optional(),
  line: lineSchema.optional(),
};

/** A card item's visual fields: the shared ones and one `shape`. */
export const cardItemVisualFields = { ...cardVisualFields, shape: shapeSchema.optional() };

const visualSchema = z.object(promptVisualFields).strict();

/** `{ emoji?, big?, image?, shapes?, line? }`, at least one. */
export const promptSchema = visualSchema.refine(
  (prompt) =>
    prompt.emoji !== undefined ||
    prompt.big !== undefined ||
    prompt.image !== undefined ||
    prompt.shapes !== undefined ||
    prompt.line !== undefined,
  { message: 'prompt needs "emoji", "big", "image", "shapes" or "line"' },
);

/** What every card exercise's YAML has besides its kind's own fields. */
export const cardExerciseFields = { ...exerciseBaseFields, prompt: promptSchema.optional() };

type PromptRaw = z.output<typeof visualSchema>;

/** The `emoji`, `big`, `image` part of a compiled prompt or item, in that order. */
function compileCommonVisual(raw: {
  readonly emoji?: string;
  readonly big?: string;
  readonly image?: string;
}): Pick<CardItem, 'emoji' | 'big' | 'image'> {
  return {
    ...(raw.emoji === undefined ? {} : { emoji: raw.emoji }),
    ...(raw.big === undefined ? {} : { big: raw.big }),
    ...(raw.image === undefined ? {} : { image: raw.image }),
  };
}

/** The compiled prompt, keys in `emoji`, `big`, `image`, `shapes`, `line` order. */
export function compilePrompt(raw: PromptRaw): CardPrompt {
  return {
    ...compileCommonVisual(raw),
    ...(raw.shapes === undefined
      ? {}
      : { shapes: raw.shapes.map((token) => (token === 'gap' ? token : compileShape(token))) }),
    ...(raw.line === undefined ? {} : { line: compileLine(raw.line) }),
  };
}

/** An item as authored (`id`, `text` and the visual fields). */
export const cardItemSchema = z
  .object({ id: keySchema, text: textRefSchema.optional(), ...cardItemVisualFields })
  .strict();

export type CardItemRaw = z.output<typeof cardItemSchema>;

/** The kit's one rule for an option / item: something to show. */
export function hasCardContent(raw: CardItemRaw): boolean {
  return (
    raw.text !== undefined ||
    raw.emoji !== undefined ||
    raw.big !== undefined ||
    raw.image !== undefined ||
    raw.shape !== undefined
  );
}

export const CARD_ITEM_NEEDS = 'needs "text", "emoji", "big", "image" or "shape"';

type ItemVisualRaw = z.output<z.ZodObject<typeof cardItemVisualFields>>;

/** The item's compiled visual fields, keys in `emoji`, `big`, `image`, `shape` order. */
export function compileCardVisual(raw: ItemVisualRaw): Omit<CardItem, 'id' | 'textKey'> {
  return {
    ...compileCommonVisual(raw),
    ...(raw.shape === undefined ? {} : { shape: compileShape(raw.shape) }),
  };
}

/** A compiled item: `id`, `textKey` (the text ref in the `lessons` namespace), then the visual fields. */
export function compileCardItem(raw: CardItemRaw): CardItem {
  return {
    id: raw.id,
    ...(raw.text === undefined ? {} : { textKey: `lessons:${raw.text}` }),
    ...compileCardVisual(raw),
  };
}
