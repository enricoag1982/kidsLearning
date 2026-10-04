import type { AnswerOutcome } from '@learn/platform-core/domain/exercise/answer';
import type { CardChoiceDef } from '@learn/platform-core/domain/exercise/kinds/cards/def';
import type { AnswerChoiceAction } from '@learn/platform-core/domain/exercise/kinds/choice/def';
import type { CardKindE2E } from '../e2e-registry.ts';
import { cardItemLabel } from '../item-label.ts';

export const choiceE2E: CardKindE2E<CardChoiceDef, AnswerChoiceAction, AnswerOutcome> = {
  async perform(page, action, { def, text }) {
    const option = def.options.find((entry) => entry.id === action.optionId);
    if (!option) throw new Error(`choice "${def.id}": no option "${action.optionId}"`);
    await page.getByRole('button', { name: cardItemLabel(option, text), exact: true }).click();
  },
};
