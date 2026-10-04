import type { AnswerTrueFalseAction, TrueFalseDef } from './def.ts';

export function trueFalseSolution(def: TrueFalseDef): readonly AnswerTrueFalseAction[] {
  return [{ type: 'answer-true-false', value: def.answer }];
}

/** The other button: exactly 1 error, then still answerable. */
export function trueFalseWrongAction(def: TrueFalseDef): readonly AnswerTrueFalseAction[] {
  return [{ type: 'answer-true-false', value: !def.answer }];
}
