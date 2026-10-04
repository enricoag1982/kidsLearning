// Math's exercise-kind UI registry, folded into `mathWeb.kinds` (`SubjectWeb`): platform code dispatches through the pack. The card
// kit's four UIs come with the kit; math's own kinds (`number-line`; m13.7-m13.8: `place-value`, `array`) join here.
import { CARD_KIND_UI } from '@learn/platform-web/kinds/cards/ui-registry.ts';
import type { AnyExerciseKindUI } from '@learn/platform-web/kinds/kind-ui.ts';
import { numberLineUi } from '../../kinds/number-line/ui.ts';

export const MATH_KIND_UI: Readonly<Record<string, AnyExerciseKindUI>> = {
  ...CARD_KIND_UI,
  'number-line': numberLineUi,
};
