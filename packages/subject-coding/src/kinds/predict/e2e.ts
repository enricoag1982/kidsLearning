import type { PredictDef } from '../../core/types.ts';
import { cellLabelPattern } from '../../web/kinds/e2e-names.ts';
import type { CodingKindE2E } from '../../web/kinds/e2e-registry.ts';
import type { PickCellAction, PredictOutcome } from './kind.ts';

export const predictE2E: CodingKindE2E<PredictDef, PickCellAction, PredictOutcome> = {
  async perform(page, action, { text }) {
    await page.getByRole('button', { name: cellLabelPattern(text, action.cell) }).click();
  },
};
