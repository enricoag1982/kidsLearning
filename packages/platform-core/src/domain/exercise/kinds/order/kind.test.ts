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
import type { OrderDef, PlaceItemAction } from './def.ts';
import { createOrderKind } from './kind.ts';
import { orderSolution, orderWrongAction } from './solution.ts';

const def = CARD_SAMPLES.order;
type State = CardState<OrderDef>;
const kind = createOrderKind<OrderDef, State, null>(initCardState);
const place = (itemId: string): PlaceItemAction => ({ type: 'place-item', itemId });

function run(actions: readonly PlaceItemAction[], from: State = kind.init(def)): State {
  return actions.reduce((state, action) => kind.act(state, action, null).state, from);
}

describe('order kind', () => {
  it('places the next right item and solves with the last one', () => {
    const first = kind.act(kind.init(def), place('one'), null);
    expect(first.outcome).toEqual({ kind: 'placed' });
    expect(first.state).toMatchObject({ placed: ['one'], errors: 0, solved: false, moves: 1 });
    const second = kind.act(first.state, place('two'), null);
    expect(second.outcome).toEqual({ kind: 'placed' });
    const last = kind.act(second.state, place('three'), null);
    expect(last.outcome).toEqual({ kind: 'solved' });
    expect(last.state).toMatchObject({ placed: ['one', 'two', 'three'], solved: true, errors: 0 });
    expect(kind.stars(last.state)).toBe(3);
  });

  it('a wrong item counts an error, sets wrongItemId and places nothing', () => {
    const step = kind.act(kind.init(def), place('three'), null);
    expect(step.outcome).toEqual({ kind: 'wrong', itemId: 'three' });
    expect(step.state).toMatchObject({
      errors: 1,
      moves: 1,
      placed: [],
      wrongItemId: 'three',
      solved: false,
    });
  });

  it('the next right item clears the wrong flash', () => {
    const state = run([place('three'), place('one')]);
    expect(state.placed).toEqual(['one']);
    expect(state.wrongItemId).toBeUndefined();
    expect(state.errors).toBe(1);
  });

  it('ignores an item already placed, an unknown id, and any tap once solved', () => {
    const one = run([place('one')]);
    for (const itemId of ['one', 'nope']) {
      const step = kind.act(one, place(itemId), null);
      expect(step.outcome).toEqual({ kind: 'ignored' });
      expect(step.state).toBe(one);
    }
    const solved = playCardSolution(def) as State;
    const step = kind.act(solved, place('three'), null);
    expect(step.outcome).toEqual({ kind: 'ignored' });
    expect(step.state).toBe(solved);
  });

  it('keeps `placed` a prefix of the answer whatever is tapped', () => {
    let state = kind.init(def);
    for (const itemId of ['two', 'three', 'one', 'one', 'three', 'two', 'two', 'three']) {
      state = kind.act(state, place(itemId), null).state;
      expect(def.answer.slice(0, state.placed.length)).toEqual(state.placed);
    }
    expect(state.solved).toBe(true);
  });
});

describe('order hints', () => {
  it('level 1 flags the next slot and changes nothing else', () => {
    const state = run([place('one')]);
    const { hint, state: next } = kind.hint(state, 1, null);
    expect(hint).toEqual({ kind: 'order', level: 1, reveal: false, nextSlot: 1 });
    expect(next).toMatchObject({ hintLevel: 1, placed: ['one'], ruledOut: [] });
  });

  it('level 2 rules out one wrong card at a time, never the next right one, never a placed one', () => {
    const first = kind.hint(kind.init(def), 2, null);
    // Display order is three, one, two; the next right card is one: three is the first wrong candidate.
    expect(first.hint).toEqual({
      kind: 'order',
      level: 2,
      reveal: false,
      nextSlot: 0,
      ruledOutId: 'three',
    });
    expect(first.state.ruledOut).toEqual(['three']);
    const second = kind.hint(first.state, 2, null);
    expect(second.hint).toMatchObject({ ruledOutId: 'two' });
    expect(second.state.ruledOut).toEqual(['three', 'two']);
    const third = kind.hint(second.state, 2, null);
    expect(third.hint).toEqual({ kind: 'order', level: 2, reveal: false, nextSlot: 0 });
    expect(third.state.ruledOut).toEqual(['three', 'two']);
  });

  it('a ruled-out card is free again once the slot is filled', () => {
    const hinted = kind.hint(kind.init(def), 2, null).state;
    const placed = run([place('one')], hinted);
    expect(placed.ruledOut).toEqual([]);
    expect(kind.hint(placed, 2, null).hint).toMatchObject({ ruledOutId: 'three' });
  });

  it('level 3 places the next right card and can finish the exercise', () => {
    const first = kind.hint(kind.init(def), 3, null);
    expect(first.hint).toEqual({
      kind: 'order',
      level: 3,
      reveal: true,
      nextSlot: 0,
      placedId: 'one',
    });
    expect(first.state).toMatchObject({ placed: ['one'], hintLevel: 3, errors: 0, solved: false });
    const second = kind.hint(first.state, 3, null);
    const third = kind.hint(second.state, 3, null);
    expect(third.state).toMatchObject({ placed: ['one', 'two', 'three'], solved: true });
    expect(kind.stars(third.state)).toBe(1);
    expect(kind.hint(third.state, 3, null).hint).toEqual({
      kind: 'order',
      level: 3,
      reveal: true,
      nextSlot: 3,
    });
  });

  it('a hint clears the last wrong flash', () => {
    const wrong = run([place('three')]);
    expect(wrong.wrongItemId).toBe('three');
    expect(kind.hint(wrong, 1, null).state.wrongItemId).toBeUndefined();
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

describe('order solution', () => {
  it('places every item in the answer order and solves with 0 errors', () => {
    expect(orderSolution(def)).toEqual([place('one'), place('two'), place('three')]);
    const solved = playCardSolution(def);
    expect(solved).toMatchObject({ solved: true, errors: 0 });
    expect(cardStars(solved)).toBe(3);
  });

  it('the wrong action gives exactly 1 error, places nothing and does not block solving', () => {
    expect(orderWrongAction(def)).toEqual([place('three')]);
    expect(playCard(def, orderWrongAction(def))).toMatchObject({
      errors: 1,
      placed: [],
      solved: false,
    });
    const result = playCardWrongThenSolve(def);
    expect(result).toMatchObject({ errors: 1, solved: true });
    expect(cardStars(result)).toBe(2);
  });

  it('a def whose answer starts with the only item has no wrong action', () => {
    const single: OrderDef = { ...def, items: [{ id: 'one', big: '1' }], answer: ['one'] };
    expect(() => orderWrongAction(single)).toThrow(
      'order "co1": no item other than the first of the answer',
    );
  });
});
