import type { TextKeyRef } from '@learn/platform-core';
import type { OrderDef } from '@learn/platform-core/domain/exercise/kinds/order/def';
import { z } from 'zod';
import { keySchema } from '../../schema.ts';
import type { ExerciseKindContent } from '../kind-content.ts';
import {
  CARD_ITEM_NEEDS,
  cardExerciseFields,
  cardItemSchema,
  compileCardItem,
  hasCardContent,
} from './prompt.ts';

const itemSchema = cardItemSchema.refine(hasCardContent, { message: `item ${CARD_ITEM_NEEDS}` });

const orderSchema = z
  .object({
    ...cardExerciseFields,
    type: z.literal('order'),
    items: z.array(itemSchema).min(2),
    answer: z.array(keySchema).min(2),
  })
  .strict();

/** Tap the cards in the right order: `items` in display order, `answer` = every item id once, in the right order. */
export const order: ExerciseKindContent<OrderDef, typeof orderSchema> = {
  type: 'order',
  schema: orderSchema,

  refine(raw, ctx) {
    const ids = new Set<string>();
    for (const { id } of raw.items) {
      if (ids.has(id)) {
        ctx.addIssue({ code: 'custom', path: ['items'], message: `duplicate item id "${id}"` });
      }
      ids.add(id);
    }
    const seen = new Set<string>();
    for (const id of raw.answer) {
      if (!ids.has(id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['answer'],
          message: `"answer" references "${id}", which is not in "items"`,
        });
      } else if (seen.has(id)) {
        ctx.addIssue({ code: 'custom', path: ['answer'], message: `"answer" repeats "${id}"` });
      }
      seen.add(id);
    }
    for (const id of ids) {
      if (!seen.has(id)) {
        ctx.addIssue({ code: 'custom', path: ['answer'], message: `"answer" is missing "${id}"` });
      }
    }
    if (raw.answer.join(' ') === raw.items.map((item) => item.id).join(' ')) {
      ctx.addIssue({
        code: 'custom',
        path: ['answer'],
        message: '"answer" must differ from the order of "items" (nothing to sort)',
      });
    }
  },

  compile: (raw, ctx) =>
    ctx.build<OrderDef>({
      type: 'order',
      items: raw.items.map(compileCardItem),
      answer: raw.answer,
    }),

  textKeys: (def): readonly TextKeyRef[] =>
    def.items.flatMap((item) =>
      item.textKey === undefined ? [] : [{ key: item.textKey, label: `item "${item.id}"` }],
    ),
};
