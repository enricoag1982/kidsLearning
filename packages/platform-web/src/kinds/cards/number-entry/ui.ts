import type { CardState } from '@learn/platform-core/domain/exercise/kinds/cards/def';
import type {
  NumberEntryAction,
  NumberEntryDef,
  NumberEntryOutcome,
} from '@learn/platform-core/domain/exercise/kinds/number-entry/def';
import type { ExerciseKindUI, PlayAreaProps } from '../../kind-ui.ts';
import { PlayArea } from './PlayArea.tsx';

/** `wrongValue`: the last wrong answer, shown struck through until the next digit. */
export interface NumberEntryExtra {
  readonly wrongValue?: number;
}

export type NumberEntryPlayAreaProps = PlayAreaProps<
  NumberEntryDef,
  CardState<NumberEntryDef>,
  NumberEntryAction,
  NumberEntryExtra
>;

/** `number-entry`: the prompt card, what has been typed, a Hint button and the number pad. */
export const numberEntryUi: ExerciseKindUI<
  NumberEntryDef,
  CardState<NumberEntryDef>,
  NumberEntryAction,
  NumberEntryOutcome,
  NumberEntryExtra
> = {
  type: 'number-entry',

  initUi: () => ({}),

  clearWrongUi: () => ({ wrongValue: undefined }),

  toUi(outcome) {
    if (outcome.kind === 'wrong') {
      return { feedback: { kind: 'number-wrong' }, hint: null, wrongValue: outcome.value };
    }
    if (outcome.kind === 'solved') {
      return { feedback: { kind: 'solved' }, hint: null, wrongValue: undefined };
    }
    // 'typed', or 'ignored' (Delete on an empty entry, a digit past the last): the struck-through value goes.
    return { feedback: { kind: 'instruction' }, wrongValue: undefined };
  },

  PlayArea,
};
