import type {
  OrderDef,
  OrderOutcome,
  PlaceItemAction,
} from '@learn/platform-core/domain/exercise/kinds/order/def';
import type { CardKindE2E } from '../e2e-registry.ts';
import { cardItemLabel } from '../item-label.ts';

export const orderE2E: CardKindE2E<OrderDef, PlaceItemAction, OrderOutcome> = {
  async perform(page, action, { def, text }) {
    const item = def.items.find((entry) => entry.id === action.itemId);
    if (!item) throw new Error(`order "${def.id}": no item "${action.itemId}"`);
    await page.getByRole('button', { name: cardItemLabel(item, text), exact: true }).click();
  },
};
