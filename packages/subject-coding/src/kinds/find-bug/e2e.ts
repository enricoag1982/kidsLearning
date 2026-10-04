import type { FindBugDef } from '../../core/types.ts';
import { pickLabel } from '../../web/kinds/e2e-names.ts';
import type { CodingKindE2E } from '../../web/kinds/e2e-registry.ts';
import type { FindBugOutcome, PickTileAction } from './kind.ts';

export const findBugE2E: CodingKindE2E<FindBugDef, PickTileAction, FindBugOutcome> = {
  async perform(page, action, { def, text }) {
    await page
      .getByRole('button', { name: pickLabel(text, def.program, action.path), exact: true })
      .click();
  },
};
