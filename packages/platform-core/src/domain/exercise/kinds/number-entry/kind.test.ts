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
import type { Digit, NumberEntryAction, NumberEntryDef } from './def.ts';
import { createNumberEntryKind } from './kind.ts';
import { numberEntrySolution, numberEntryWrongAction } from './solution.ts';

const def = CARD_SAMPLES['number-entry'];
type State = CardState<NumberEntryDef>;
const kind = createNumberEntryKind<NumberEntryDef, State, null>(initCardState);

const enter = (digit: Digit): NumberEntryAction => ({ type: 'enter-digit', digit });
const erase: NumberEntryAction = { type: 'erase-digit' };
const submit: NumberEntryAction = { type: 'submit-number' };

function run(
  actions: readonly NumberEntryAction[],
  from: State = kind.init(def),
): { state: State; outcomes: readonly string[] } {
  let state = from;
  const outcomes: string[] = [];
  for (const action of actions) {
    const step = kind.act(state, action, null);
    state = step.state;
    outcomes.push(step.outcome.kind);
  }
  return { state, outcomes };
}

describe('number-entry digit rules', () => {
  it('appends digits and reports typed', () => {
    const { state, outcomes } = run([enter(1), enter(2)]);
    expect(state.entry).toBe('12');
    expect(outcomes).toEqual(['typed', 'typed']);
  });

  it('accepts as many digits as the def allows, no more', () => {
    expect(run([enter(1), enter(2), enter(3)]).outcomes).toEqual(['typed', 'typed', 'ignored']);
    const wide: NumberEntryDef = { ...def, answer: 1234, maxDigits: 4 };
    const { state, outcomes } = run(
      [enter(1), enter(2), enter(3), enter(4), enter(5)],
      kind.init(wide),
    );
    expect(state.entry).toBe('1234');
    expect(outcomes).toEqual(['typed', 'typed', 'typed', 'typed', 'ignored']);
    const single: NumberEntryDef = { ...def, answer: 7, maxDigits: 1 };
    expect(run([enter(7), enter(1)], kind.init(single)).state.entry).toBe('7');
  });

  it('takes five digits for an answer up to 99 999 and solves 10 000', () => {
    const five: NumberEntryDef = { ...def, answer: 10000, maxDigits: 5 };
    const typed = [enter(1), enter(0), enter(0), enter(0), enter(0), enter(7)];
    const { state, outcomes } = run(typed, kind.init(five));
    expect(state.entry).toBe('10000');
    expect(outcomes).toEqual(['typed', 'typed', 'typed', 'typed', 'typed', 'ignored']);
    expect(run([...typed, submit], kind.init(five)).state.solved).toBe(true);
  });

  it('replaces a lone 0 instead of appending to it', () => {
    expect(run([enter(0), enter(7)]).state.entry).toBe('7');
    expect(run([enter(0), enter(0)]).state.entry).toBe('0');
    expect(run([enter(1), enter(0)]).state.entry).toBe('10');
  });

  it('erase drops the last digit and is ignored when empty', () => {
    const { state, outcomes } = run([erase, enter(4), enter(2), erase, erase, erase]);
    expect(state.entry).toBe('');
    expect(outcomes).toEqual(['ignored', 'typed', 'typed', 'typed', 'typed', 'ignored']);
  });

  it('submit is ignored when empty and never counts a move', () => {
    const { state, outcomes } = run([submit]);
    expect(outcomes).toEqual(['ignored']);
    expect(state).toMatchObject({ moves: 0, errors: 0, solved: false });
  });

  it('a right number solves and counts the move, with 0 errors', () => {
    const { state, outcomes } = run([enter(1), enter(2), submit]);
    expect(outcomes).toEqual(['typed', 'typed', 'solved']);
    expect(state).toMatchObject({ solved: true, errors: 0, moves: 1, entry: '12' });
  });

  it('a wrong number counts an error and a move, clears the entry and reports the value', () => {
    const step = kind.act(run([enter(4)]).state, submit, null);
    expect(step.outcome).toEqual({ kind: 'wrong', value: 4 });
    expect(step.state).toMatchObject({ errors: 1, moves: 1, entry: '', solved: false });
  });

  it('ignores every action once solved', () => {
    const solved = run([enter(1), enter(2), submit]).state;
    const { state, outcomes } = run([enter(1), erase, submit], solved);
    expect(outcomes).toEqual(['ignored', 'ignored', 'ignored']);
    expect(state).toBe(solved);
  });
});

describe('number-entry hints', () => {
  it('level 1 only raises the level, 2 types the first digit, 3 types the whole answer', () => {
    const first = kind.hint(kind.init(def), 1, null);
    expect(first.hint).toEqual({ kind: 'number-entry', level: 1, reveal: false });
    expect(first.state).toMatchObject({ hintLevel: 1, entry: '' });
    const second = kind.hint(first.state, 2, null);
    expect(second.hint).toEqual({ kind: 'number-entry', level: 2, reveal: false, digit: '1' });
    expect(second.state).toMatchObject({ hintLevel: 2, entry: '1' });
    const third = kind.hint(second.state, 3, null);
    expect(third.hint).toEqual({ kind: 'number-entry', level: 3, reveal: true });
    expect(third.state).toMatchObject({ hintLevel: 3, entry: '12' });
    expect(kind.act(third.state, submit, null).outcome).toEqual({ kind: 'solved' });
  });

  it('level 2 replaces a wrong partial entry with the first digit', () => {
    const typed = run([enter(9)]).state;
    expect(kind.hint(typed, 2, null).state.entry).toBe('1');
  });

  it('caps stars by hint level and errors', () => {
    const solvedAt = (hintLevel: 0 | 1 | 2 | 3, errors: number): number =>
      kind.stars({ ...kind.init(def), solved: true, hintLevel, errors });
    expect([
      solvedAt(0, 0),
      solvedAt(1, 0),
      solvedAt(0, 1),
      solvedAt(0, 2),
      solvedAt(3, 0),
    ]).toEqual([3, 2, 2, 1, 1]);
  });
});

describe('number-entry solution', () => {
  it('types the answer digit by digit and solves with 0 errors and 3 stars', () => {
    expect(numberEntrySolution(def)).toEqual([enter(1), enter(2), submit]);
    const solved = playCardSolution(def);
    expect(solved).toMatchObject({ solved: true, errors: 0 });
    expect(cardStars(solved)).toBe(3);
  });

  it('the wrong action gives exactly 1 error, clears the entry and does not block solving', () => {
    expect(numberEntryWrongAction(def)).toEqual([enter(1), enter(3), submit]);
    expect(playCard(def, numberEntryWrongAction(def))).toMatchObject({
      errors: 1,
      entry: '',
      solved: false,
    });
    const result = playCardWrongThenSolve(def);
    expect(result).toMatchObject({ errors: 1, solved: true });
    expect(cardStars(result)).toBe(2);
  });

  it('the wrong action stays one error for the pad largest number and for 0', () => {
    for (const [answer, maxDigits] of [
      [99, 2],
      [9, 1],
      [9999, 4],
      [99999, 5],
      [0, 2],
    ] as const) {
      const edge: NumberEntryDef = { ...def, answer, maxDigits };
      expect(playCardWrongThenSolve(edge)).toMatchObject({ errors: 1, solved: true });
    }
    expect(numberEntryWrongAction({ ...def, answer: 99, maxDigits: 2 })).toEqual([
      enter(9),
      enter(8),
      submit,
    ]);
  });
});
