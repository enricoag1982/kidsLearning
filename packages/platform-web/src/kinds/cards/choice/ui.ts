import type {
  CardChoiceDef,
  CardState,
} from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { createChoiceUi } from '../../choice/create-choice-ui.tsx';
import { CARD_CHOICE_LOOK } from './look.tsx';
import { CardStimulus } from './stimulus.tsx';

/** `choice` with card options (emoji / big text / image / text) and the prompt card beside them. */
export const cardChoiceUi = createChoiceUi<CardChoiceDef, CardState<CardChoiceDef>, object>({
  initUi: () => ({}),
  clearWrongUi: () => ({}),
  stimulus: CardStimulus,
  look: CARD_CHOICE_LOOK,
  controlsSize: 'large',
});
