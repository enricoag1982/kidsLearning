// The card kinds' UI registry, folded into a card subject's `SubjectWeb.kinds`: platform code dispatches through the pack.
import type { AnyExerciseKindUI } from '../kind-ui.ts';
import { cardChoiceUi } from './choice/ui.ts';
import { numberEntryUi } from './number-entry/ui.ts';
import { orderUi } from './order/ui.ts';
import { trueFalseUi } from './true-false/ui.ts';

export const CARD_KIND_UI: Readonly<Record<string, AnyExerciseKindUI>> = {
  choice: cardChoiceUi,
  'true-false': trueFalseUi,
  'number-entry': numberEntryUi,
  order: orderUi,
};
