import type { AnswerOutcome } from '@learn/platform-core/domain/exercise/answer';
import type { CardState } from '@learn/platform-core/domain/exercise/kinds/cards/def';
import type {
  AnswerTrueFalseAction,
  TrueFalseDef,
} from '@learn/platform-core/domain/exercise/kinds/true-false/def';
import type { ExerciseKindUI, PlayAreaProps } from '../../kind-ui.ts';
import { PlayArea } from './PlayArea.tsx';

export type TrueFalsePlayAreaProps = PlayAreaProps<
  TrueFalseDef,
  CardState<TrueFalseDef>,
  AnswerTrueFalseAction
>;

/** `true-false`: the prompt card beside a Hint button and two big True / False buttons. */
export const trueFalseUi: ExerciseKindUI<
  TrueFalseDef,
  CardState<TrueFalseDef>,
  AnswerTrueFalseAction,
  AnswerOutcome
> = {
  type: 'true-false',

  initUi: () => ({}),

  clearWrongUi: () => ({}),

  // 'ignored' (already solved): the buttons are hidden by then, unreachable in the UI.
  toUi(outcome, _action, next) {
    if (outcome.kind !== 'wrong') {
      return { feedback: { kind: 'solved' }, hint: null };
    }
    // The statement's reason (when it has one) is spoken instead of the default note.
    const { reasonKey } = next.def;
    return {
      feedback:
        reasonKey === undefined ? { kind: 'wrong-answer' } : { kind: 'wrong-answer', reasonKey },
      hint: null,
    };
  },

  PlayArea,
};
