// The card kit's shared YAML shapes: the `prompt` every exercise may carry and the card items (choice options, order
// items) — a text, an emoji, a big text, an art image id, at least one.
import type { CardItem, CardPrompt } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
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

/** The visual fields of a prompt and of a card item. */
export const cardVisualFields = {
  emoji: emojiSchema.optional(),
  big: bigSchema.optional(),
  image: imageSchema.optional(),
};

const visualSchema = z.object(cardVisualFields).strict();

/** `{ emoji?, big?, image? }`, at least one. */
export const promptSchema = visualSchema.refine(
  (prompt) => prompt.emoji !== undefined || prompt.big !== undefined || prompt.image !== undefined,
  { message: 'prompt needs "emoji", "big" or "image"' },
);

/** What every card exercise's YAML has besides its kind's own fields. */
export const cardExerciseFields = { ...exerciseBaseFields, prompt: promptSchema.optional() };

type PromptRaw = z.output<typeof visualSchema>;

/** The compiled prompt, keys in `emoji`, `big`, `image` order. */
export function compilePrompt(raw: PromptRaw): CardPrompt {
  return {
    ...(raw.emoji === undefined ? {} : { emoji: raw.emoji }),
    ...(raw.big === undefined ? {} : { big: raw.big }),
    ...(raw.image === undefined ? {} : { image: raw.image }),
  };
}

/** An item as authored (`id`, `text` and the visual fields). */
export const cardItemSchema = z
  .object({ id: keySchema, text: textRefSchema.optional(), ...cardVisualFields })
  .strict();

export type CardItemRaw = z.output<typeof cardItemSchema>;

/** The kit's one rule for an option / item: something to show. */
export function hasCardContent(raw: CardItemRaw): boolean {
  return (
    raw.text !== undefined ||
    raw.emoji !== undefined ||
    raw.big !== undefined ||
    raw.image !== undefined
  );
}

export const CARD_ITEM_NEEDS = 'needs "text", "emoji", "big" or "image"';

/** The item's compiled visual fields, keys in `emoji`, `big`, `image` order. */
export function compileCardVisual(raw: PromptRaw): Omit<CardItem, 'id' | 'textKey'> {
  return compilePrompt(raw);
}

/** A compiled item: `id`, `textKey` (the text ref in the `lessons` namespace), then the visual fields. */
export function compileCardItem(raw: CardItemRaw): CardItem {
  return {
    id: raw.id,
    ...(raw.text === undefined ? {} : { textKey: `lessons:${raw.text}` }),
    ...compileCardVisual(raw),
  };
}
