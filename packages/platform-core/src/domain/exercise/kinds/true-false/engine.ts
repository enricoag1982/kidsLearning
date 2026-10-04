import type { ChoiceDefBase, ChoiceState } from '../choice/def.ts';
import { answerChoice } from '../choice/engine.ts';
import type { TrueFalseHint, TrueFalseState } from './def.ts';

const OPTIONS = [{ id: 'true' }, { id: 'false' }] as const;

export const optionIdOf = (value: boolean): string => (value ? 'true' : 'false');

/** The def as a two-option `choice` (`true` / `false`): the choice engine's rules apply unchanged. */
function choiceView(state: TrueFalseState): ChoiceState {
  const { id, concept, textKey, answer } = state.def;
  const def: ChoiceDefBase = {
    id,
    concept,
    textKey,
    type: 'choice',
    options: OPTIONS,
    answer: optionIdOf(answer),
  };
  return {
    def,
    solved: state.solved,
    errors: state.errors,
    hintLevel: state.hintLevel,
    ...(state.wrongOptions === undefined ? {} : { wrongOptions: state.wrongOptions }),
  };
}

/** Correct → solved; wrong → errors + 1 and that button joins `wrongOptions`. No-op once solved. */
export function answerTrueFalse<S extends TrueFalseState>(state: S, value: boolean): S {
  const before = choiceView(state);
  const after = answerChoice(before, optionIdOf(value));
  if (after === before) {
    return state;
  }
  return {
    ...state,
    solved: after.solved,
    errors: after.errors,
    ...(after.wrongOptions === undefined ? {} : { wrongOptions: after.wrongOptions }),
  };
}

/** There are only 2 answers, so no level rules one out: 1 nudges, 2 nudges with the key word highlighted, 3 reveals. */
export function trueFalseHint(level: 1 | 2 | 3): TrueFalseHint {
  return { kind: 'true-false', level, highlight: level === 2, reveal: level === 3 };
}
