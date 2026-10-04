// Logic's exercise-kind UI registry, folded into `logicWeb.kinds` (`SubjectWeb`): platform code dispatches through the pack. The card
// kit's four UIs come with the kit; logic's own kinds (`grid-fill` since m14.8, `group` later) join here.
import { CARD_KIND_UI } from '@learn/platform-web/kinds/cards/ui-registry.ts';
import type { AnyExerciseKindUI } from '@learn/platform-web/kinds/kind-ui.ts';
import { gridFillUi } from '../../kinds/grid-fill/ui.ts';

export const LOGIC_KIND_UI: Readonly<Record<string, AnyExerciseKindUI>> = {
  ...CARD_KIND_UI,
  'grid-fill': gridFillUi,
};
