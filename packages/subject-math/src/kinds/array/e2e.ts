import { gridCell } from '@learn/platform-web/e2e/grid.ts';
import type { MathKindE2E } from '../../web/kinds/e2e-registry.ts';
import type { ArrayAction, ArrayDef, ArrayOutcome } from './def.ts';

/** Taps the cell that becomes the array's bottom-right corner (column `cols`, row `rows`, as the grid's test ids count from 0), then
 * Check. A wrong shape plays the same way. */
export const arrayE2E: MathKindE2E<ArrayDef, ArrayAction, ArrayOutcome> = {
  async perform(page, action, { text }) {
    await gridCell(page, action.cols - 1, action.rows - 1).click();
    await page.getByRole('button', { name: text('exercise.check'), exact: true }).click();
  },
};
