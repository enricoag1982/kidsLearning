import { describe, expect, it } from 'vitest';
import {
  CARD_SAMPLES,
  cardStars,
  playCard,
  playCardSolution,
  playCardWrongThenSolve,
} from '../../../../testing/cards.ts';
import { initCardState } from '../cards/def.ts';
import type { CardState } from '../cards/def.ts';
import type { AnswerTrueFalseAction, TrueFalseDef } from './def.ts';
import { answerTrueFalse, trueFalseHint } from './engine.ts';
import { createTrueFalseKind } from './kind.ts';
import { trueFalseSolution, trueFalseWrongAction } from './solution.ts';

const def = CARD_SAMPLES['true-false'];
const falseDef: TrueFalseDef = { ...def, id: 'ct2', answer: false };

const kind = createTrueFalseKind<TrueFalseDef, CardState<TrueFalseDef>, null>(initCardState);
const answer = (value: boolean): AnswerTrueFalseAction => ({ type: 'answer-true-false', value });

describe('true-false kind', () => {
  it('the right button solves with 3 stars', () => {
    const { state, outcome } = kind.act(kind.init(def), answer(true), null);
    expect(outcome).toEqual({ kind: 'solved' });
    expect(state.solved).toBe(true);
    expect(kind.stars(state)).toBe(3);
    expect(kind.act(kind.init(falseDef), answer(false), null).outcome).toEqual({ kind: 'solved' });
  });

  it('the wrong button counts an error and joins wrongOptions', () => {
    const { state, outcome } = kind.act(kind.init(def), answer(false), null);
    expect(outcome).toEqual({ kind: 'wrong' });
    expect(state).toMatchObject({ errors: 1, solved: false, wrongOptions: ['false'] });
    expect(kind.act(kind.init(falseDef), answer(true), null).state.wrongOptions).toEqual(['true']);
  });

  it('the same wrong button twice is one entry but two errors', () => {
    const state = answerTrueFalse(answerTrueFalse(kind.init(def), false), false);
    expect(state.errors).toBe(2);
    expect(state.wrongOptions).toEqual(['false']);
  });

  it('ignores an answer once solved', () => {
    const solved = playCardSolution(def);
    const step = kind.act(solved as CardState<TrueFalseDef>, answer(false), null);
    expect(step.state).toBe(solved);
    expect(step.outcome).toEqual({ kind: 'ignored' });
  });

  it('hints: 1 nudges, 2 nudges with the key word highlighted, 3 reveals; none changes the answer state', () => {
    expect(trueFalseHint(1)).toEqual({
      kind: 'true-false',
      level: 1,
      highlight: false,
      reveal: false,
    });
    expect(trueFalseHint(2)).toEqual({
      kind: 'true-false',
      level: 2,
      highlight: true,
      reveal: false,
    });
    expect(trueFalseHint(3)).toEqual({
      kind: 'true-false',
      level: 3,
      highlight: false,
      reveal: true,
    });
    const first = kind.hint(kind.init(def), 1, null);
    expect(first.state).toMatchObject({ hintLevel: 1, errors: 0, solved: false });
    expect(first.state.wrongOptions).toBeUndefined();
    expect(kind.hint(first.state, 3, null).hint).toMatchObject({ level: 3, reveal: true });
  });

  it('stars: 3 clean, 2 after one error or hint level 1, 1 after level 2 or 3 or two errors', () => {
    const at = (hintLevel: 0 | 1 | 2 | 3, errors: number): number =>
      kind.stars({ ...kind.init(def), solved: true, hintLevel, errors });
    expect([at(0, 0), at(1, 0), at(0, 1), at(2, 0), at(3, 0), at(0, 2)]).toEqual([
      3, 2, 2, 1, 1, 1,
    ]);
  });

  it('the solution solves with 0 errors, the wrong action gives exactly 1', () => {
    expect(trueFalseSolution(def)).toEqual([answer(true)]);
    expect(trueFalseWrongAction(def)).toEqual([answer(false)]);
    expect(trueFalseWrongAction(falseDef)).toEqual([answer(true)]);
    for (const d of [def, falseDef]) {
      expect(playCardSolution(d)).toMatchObject({ solved: true, errors: 0 });
      expect(playCard(d, trueFalseWrongAction(d))).toMatchObject({ solved: false, errors: 1 });
      const recovered = playCardWrongThenSolve(d);
      expect(recovered).toMatchObject({ solved: true, errors: 1 });
      expect(cardStars(recovered)).toBe(2);
    }
  });
});
