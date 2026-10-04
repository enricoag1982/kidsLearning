// The group kind's e2e driver: select the card by its name, press the box by its name. Reachable only from Playwright specs
// (eslint.config.js): a subject's e2e registry adds `group: groupE2E`, its solution is `GROUP_SOLUTION`.
import type { Page } from '@playwright/test';
import type { GroupDef, GroupOutcome, GroupState, PutItemAction } from '@learn/platform-core';
import type { ContentText } from '../../content-text.ts';
import { cardItemLabel } from '../cards/item-label.ts';
import { zoneName } from './zone-names.ts';

/** One kind's e2e driver: reproduces a core `action` (already applied purely, `outcome` / `before` known) as taps on the page. */
export interface GroupKindE2E {
  perform(
    page: Page,
    action: PutItemAction,
    ctx: {
      readonly def: GroupDef;
      readonly before: GroupState;
      readonly outcome: GroupOutcome;
      readonly text: ContentText;
    },
  ): Promise<void>;
}

export const GROUP_KIND_E2E: GroupKindE2E = {
  async perform(page, action, { def, text }) {
    const item = def.items.find((entry) => entry.id === action.itemId);
    if (item === undefined) throw new Error(`group "${def.id}": no item "${action.itemId}"`);
    // Scoped, so a card and a box that share a name (a "Red" card, a "Red" box) are never mistaken for each other.
    await page
      .getByRole('group', { name: text('cards.group.pool'), exact: true })
      .getByRole('button', { name: cardItemLabel(item, text), exact: true })
      .click();
    await page
      .locator('[data-group-zones]')
      .getByRole('button', { name: zoneName(def, action.boxId, text), exact: true })
      .click();
  },
};
