import type { CardChoiceDef } from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { createChoiceContent } from '../choice.ts';
import {
  cardExerciseFields,
  cardVisualFields,
  CARD_ITEM_NEEDS,
  compileCardVisual,
} from './prompt.ts';

/** Pick the option (a card) whose id is `answer`: the platform `choice` content with card options. */
export const cardChoice = createChoiceContent<
  CardChoiceDef,
  typeof cardExerciseFields,
  typeof cardVisualFields
>({
  fields: cardExerciseFields,
  option: {
    fields: cardVisualFields,
    refine(raw, ctx) {
      if (
        raw.text === undefined &&
        raw.emoji === undefined &&
        raw.big === undefined &&
        raw.image === undefined
      ) {
        ctx.addIssue({ code: 'custom', message: `option ${CARD_ITEM_NEEDS}` });
      }
    },
    compile: compileCardVisual,
  },
});
