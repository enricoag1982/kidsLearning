import type { OrderDef, PlaceItemAction } from './def.ts';

export function orderSolution(def: OrderDef): readonly PlaceItemAction[] {
  return def.answer.map((itemId): PlaceItemAction => ({ type: 'place-item', itemId }));
}

/** Any item other than the first of the answer: exactly 1 error, nothing placed, still answerable. */
export function orderWrongAction(def: OrderDef): readonly PlaceItemAction[] {
  const wrong = def.items.find((item) => item.id !== def.answer[0]);
  if (wrong === undefined) {
    throw new Error(`order "${def.id}": no item other than the first of the answer`);
  }
  return [{ type: 'place-item', itemId: wrong.id }];
}
