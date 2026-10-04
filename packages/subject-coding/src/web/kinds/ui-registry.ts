// The coding kinds' UI registry, folded into `codingWeb.kinds` (`SubjectWeb`): platform code dispatches through the pack. The card
// kit's four UIs come with the kit.
import { CARD_KIND_UI } from '@learn/platform-web/kinds/cards/ui-registry.ts';
import type { AnyExerciseKindUI } from '@learn/platform-web/kinds/kind-ui.ts';
import { findBugUi } from '../../kinds/find-bug/ui.ts';
import { predictUi } from '../../kinds/predict/ui.ts';
import { programUi } from '../../kinds/program/ui.ts';

export const CODING_KIND_UI: Readonly<Record<string, AnyExerciseKindUI>> = {
  ...CARD_KIND_UI,
  program: programUi,
  predict: predictUi,
  'find-bug': findBugUi,
};
