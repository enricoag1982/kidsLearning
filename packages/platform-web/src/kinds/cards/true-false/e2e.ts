import type { AnswerOutcome } from '@learn/platform-core/domain/exercise/answer';
import type {
  AnswerTrueFalseAction,
  TrueFalseDef,
} from '@learn/platform-core/domain/exercise/kinds/true-false/def';
import type { CardKindE2E } from '../e2e-registry.ts';

export const trueFalseE2E: CardKindE2E<TrueFalseDef, AnswerTrueFalseAction, AnswerOutcome> = {
  async perform(page, action, { text }) {
    await page
      .getByRole('button', { name: text(action.value ? 'cards.true' : 'cards.false'), exact: true })
      .click();
  },
};
