import type {
  NumberEntryAction,
  NumberEntryDef,
  NumberEntryOutcome,
} from '@learn/platform-core/domain/exercise/kinds/number-entry/def';
import type { CardKindE2E } from '../e2e-registry.ts';

export const numberEntryE2E: CardKindE2E<NumberEntryDef, NumberEntryAction, NumberEntryOutcome> = {
  async perform(page, action, { text }) {
    switch (action.type) {
      case 'enter-digit':
        await page.getByRole('button', { name: String(action.digit), exact: true }).click();
        return;
      case 'erase-digit':
        await page.getByRole('button', { name: text('cards.erase'), exact: true }).click();
        return;
      case 'submit-number':
        await page.getByRole('button', { name: text('exercise.check'), exact: true }).click();
        return;
    }
  },
};
