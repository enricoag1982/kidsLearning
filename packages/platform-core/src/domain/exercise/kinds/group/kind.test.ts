import { describe, expect, it } from 'vitest';
import { GROUP_SAMPLES } from '../../../../testing/group.ts';
import { CARD_KINDS } from '../cards/kinds.ts';
import { CARD_SOLUTIONS } from '../cards/solutions.ts';
import type { GroupDef, GroupHint, GroupOutcome, GroupState, PutItemAction } from './def.ts';
import { GROUP_KIND } from './kind.ts';
import { GROUP_SOLUTION } from './solution.ts';

const { row, carroll, venn } = GROUP_SAMPLES;
const kind = GROUP_KIND;
const put = (itemId: string, boxId: string): PutItemAction => ({ type: 'put-item', itemId, boxId });

function run(
  def: GroupDef,
  actions: readonly PutItemAction[],
  from: GroupState = kind.init(def),
): GroupState {
  return actions.reduce((state, action) => kind.act(state, action, null).state, from);
}

/** The outcome of one put on a fresh state of `def`. */
function outcomeOf(def: GroupDef, itemId: string, boxId: string): GroupOutcome {
  return kind.act(kind.init(def), put(itemId, boxId), null).outcome;
}

describe('group kind: puts', () => {
  it('a fresh state has nothing placed, nothing crossed out, no error', () => {
    expect(kind.init(row)).toEqual({
      def: row,
      moves: 0,
      solved: false,
      errors: 0,
      hintLevel: 0,
      placed: {},
      ruledOut: [],
    });
  });

  it('a right put places the card; the last one solves with 3 stars', () => {
    const first = kind.act(kind.init(row), put('r-circle', 'red'), null);
    expect(first.outcome).toEqual({ kind: 'placed' });
    expect(first.state).toMatchObject({
      placed: { 'r-circle': 'red' },
      errors: 0,
      moves: 1,
      solved: false,
    });
    const almost = run(row, [put('b-square', 'blue'), put('r-triangle', 'red')], first.state);
    const last = kind.act(almost, put('b-star', 'blue'), null);
    expect(last.outcome).toEqual({ kind: 'solved' });
    expect(last.state).toMatchObject({ solved: true, errors: 0, moves: 4 });
    expect(Object.keys(last.state.placed)).toHaveLength(4);
    expect(kind.stars(last.state)).toBe(3);
  });

  it('a wrong put counts an error and a move, sets `wrong`, and the card stays in the pool', () => {
    const step = kind.act(kind.init(row), put('r-circle', 'blue'), null);
    expect(step.outcome).toEqual({ kind: 'wrong', itemId: 'r-circle', boxId: 'blue' });
    expect(step.state).toMatchObject({
      errors: 1,
      moves: 1,
      placed: {},
      wrong: { itemId: 'r-circle', boxId: 'blue' },
      solved: false,
    });
  });

  it('the next right put clears the wrong flash; the error stays counted', () => {
    const state = run(row, [put('r-circle', 'blue'), put('r-circle', 'red')]);
    expect(state.wrong).toBeUndefined();
    expect(state.errors).toBe(1);
    expect(state.placed).toEqual({ 'r-circle': 'red' });
    expect(
      kind.stars(run(row, [put('r-circle', 'blue'), ...GROUP_SOLUTION.solution(row, null)])),
    ).toBe(2);
  });

  it('a row has no miss; the outcome carries no `miss` key', () => {
    expect(outcomeOf(row, 'r-circle', 'blue')).not.toHaveProperty('miss');
  });

  it('a Carroll put with the right column and the wrong row is a `row` miss; the right row and the wrong column a `column` miss; both wrong none', () => {
    // r-circle belongs in a-b (red column, circle row).
    expect(outcomeOf(carroll, 'r-circle', 'a-not-b')).toMatchObject({ miss: 'row' });
    expect(outcomeOf(carroll, 'r-circle', 'not-a-b')).toMatchObject({ miss: 'column' });
    expect(outcomeOf(carroll, 'r-circle', 'not-a-not-b')).not.toHaveProperty('miss');
    // And from another cell: y-triangle belongs in not-a-not-b.
    expect(outcomeOf(carroll, 'y-triangle', 'not-a-b')).toMatchObject({ miss: 'row' });
    expect(outcomeOf(carroll, 'y-triangle', 'a-not-b')).toMatchObject({ miss: 'column' });
    expect(outcomeOf(carroll, 'y-triangle', 'a-b')).not.toHaveProperty('miss');
  });

  it('a Venn put that involves `both` is an `overlap` miss, else one that involves `neither` an `outside` miss, else none', () => {
    expect(outcomeOf(venn, 'b-square', 'only-a')).toMatchObject({ miss: 'overlap' }); // belongs in both
    expect(outcomeOf(venn, 'r-square', 'both')).toMatchObject({ miss: 'overlap' }); // put in both
    expect(outcomeOf(venn, 'y-circle', 'only-b')).toMatchObject({ miss: 'outside' }); // belongs outside
    expect(outcomeOf(venn, 'b-triangle', 'neither')).toMatchObject({ miss: 'outside' }); // put outside
    expect(outcomeOf(venn, 'r-square', 'only-b')).not.toHaveProperty('miss'); // only a vs only b
    // Both rules apply: the shared region comes first.
    expect(outcomeOf(venn, 'b-square', 'neither')).toMatchObject({ miss: 'overlap' });
  });

  it('ignores a card already placed, an unknown card, an unknown box, and any put once solved', () => {
    const one = run(row, [put('r-circle', 'red')]);
    for (const [itemId, boxId] of [
      ['r-circle', 'red'],
      ['r-circle', 'blue'],
      ['nope', 'red'],
      ['b-square', 'green'],
    ] as const) {
      const step = kind.act(one, put(itemId, boxId), null);
      expect(step.outcome, `${itemId} ${boxId}`).toEqual({ kind: 'ignored' });
      expect(step.state).toBe(one);
    }
    const solved = run(row, GROUP_SOLUTION.solution(row, null));
    const step = kind.act(solved, put('r-circle', 'blue'), null);
    expect(step.outcome).toEqual({ kind: 'ignored' });
    expect(step.state).toBe(solved);
  });

  it('a Carroll and a Venn zone is no box of a row (and the other way round)', () => {
    expect(outcomeOf(row, 'r-circle', 'both')).toEqual({ kind: 'ignored' });
    expect(outcomeOf(carroll, 'r-circle', 'only-a')).toEqual({ kind: 'ignored' });
    expect(outcomeOf(venn, 'b-square', 'a-b')).toEqual({ kind: 'ignored' });
  });
});

describe('group kind: hints and stars', () => {
  it('level 1 only clears the wrong flash and sets the level', () => {
    const wrong = run(row, [put('r-circle', 'blue')]);
    const { state, hint } = kind.hint(wrong, 1, null);
    expect(hint).toEqual({ kind: 'group', level: 1 });
    expect(state).toMatchObject({ hintLevel: 1, placed: {}, ruledOut: [], errors: 1 });
    expect(state.wrong).toBeUndefined();
  });

  it('level 2 crosses out a wrong box of the first card in the pool, then the next wrong box', () => {
    const first = kind.hint(kind.init(carroll), 2, null);
    expect(first.hint).toEqual({ kind: 'group', level: 2, itemId: 'r-circle', boxId: 'a-not-b' });
    expect(first.state.ruledOut).toEqual([{ itemId: 'r-circle', boxId: 'a-not-b' }]);
    const second = kind.hint(first.state, 2, null);
    expect(second.hint).toEqual({ kind: 'group', level: 2, itemId: 'r-circle', boxId: 'not-a-b' });
    expect(second.state.ruledOut).toHaveLength(2);
  });

  it('level 2 never crosses out the right box, and it skips cards already placed', () => {
    const placed = run(row, [put('r-circle', 'red')]);
    const { hint } = kind.hint(placed, 2, null);
    expect(hint).toEqual({ kind: 'group', level: 2, itemId: 'b-square', boxId: 'red' });
    for (const def of Object.values(GROUP_SAMPLES)) {
      let state = kind.init(def);
      for (let i = 0; i < 8; i += 1) {
        const step = kind.hint(state, 2, null);
        if (step.hint.level === 2) {
          expect(step.hint.boxId).not.toBe(def.answer[step.hint.itemId]);
        }
        state = step.state;
      }
    }
  });

  it('level 2 again with every wrong box crossed out repeats one without adding', () => {
    let state = kind.init(row);
    state = kind.hint(state, 2, null).state;
    const again = kind.hint(state, 2, null);
    expect(again.hint).toEqual({ kind: 'group', level: 2, itemId: 'r-circle', boxId: 'blue' });
    expect(again.state.ruledOut).toHaveLength(1);
  });

  it('level 3 places the first card in the pool in its box; the crossed-out boxes of it are gone', () => {
    const crossed = kind.hint(kind.init(carroll), 2, null).state;
    const { state, hint } = kind.hint(crossed, 3, null);
    expect(hint).toEqual({ kind: 'group', level: 3, itemId: 'r-circle', boxId: 'a-b' });
    expect(state.placed).toEqual({ 'r-circle': 'a-b' });
    expect(state.ruledOut).toEqual([]);
    expect(state).toMatchObject({ solved: false, errors: 0 });
  });

  it('level 3 on the last card solves the exercise', () => {
    const almost = run(row, GROUP_SOLUTION.solution(row, null).slice(0, 3));
    const { state } = kind.hint(almost, 3, null);
    expect(state.solved).toBe(true);
  });

  it('with every card placed a hint points at nothing: the level-1 nudge, state unchanged', () => {
    const solved = run(row, GROUP_SOLUTION.solution(row, null));
    for (const level of [2, 3] as const) {
      const step = kind.hint(solved, level, null);
      expect(step.hint).toEqual({ kind: 'group', level: 1 });
      expect(step.state).toEqual({ ...solved, hintLevel: level, wrong: undefined });
    }
  });

  it('hint payloads are assignable to the base hint (kind + level)', () => {
    const hints: readonly GroupHint[] = [
      kind.hint(kind.init(row), 1, null).hint,
      kind.hint(kind.init(row), 2, null).hint,
      kind.hint(kind.init(row), 3, null).hint,
    ];
    expect(hints.map((hint) => [hint.kind, hint.level])).toEqual([
      ['group', 1],
      ['group', 2],
      ['group', 3],
    ]);
  });

  it('stars: 3 clean, 2 with one error or the level-1 hint, 1 with two errors or hint 2 / 3', () => {
    const solution = GROUP_SOLUTION.solution(row, null);
    const stars = (state: GroupState): number => kind.stars(run(row, solution, state));
    expect(stars(kind.init(row))).toBe(3);
    expect(stars(run(row, [put('r-circle', 'blue')]))).toBe(2);
    expect(stars(run(row, [put('r-circle', 'blue'), put('b-square', 'red')]))).toBe(1);
    expect(stars(kind.hint(kind.init(row), 1, null).state)).toBe(2);
    expect(stars({ ...kind.init(row), hintLevel: 2 })).toBe(1);
    expect(stars({ ...kind.init(row), hintLevel: 3 })).toBe(1);
  });
});

describe('group solution', () => {
  it('puts every card, in display order, in its answer box: solves each layout with 0 errors and 3 stars', () => {
    for (const def of Object.values(GROUP_SAMPLES)) {
      const actions = GROUP_SOLUTION.solution(def, null);
      expect(
        actions.map((action) => action.itemId),
        def.layout,
      ).toEqual(def.items.map((item) => item.id));
      const state = run(def, actions);
      expect(state, def.layout).toMatchObject({ solved: true, errors: 0 });
      expect(kind.stars(state)).toBe(3);
    }
  });

  it('the wrong action costs exactly 1 error, places nothing and still lets the solution solve', () => {
    for (const def of Object.values(GROUP_SAMPLES)) {
      const wrong = GROUP_SOLUTION.wrongAction?.(def, null) ?? [];
      expect(wrong, def.layout).toHaveLength(1);
      const after = run(def, wrong);
      expect(after, def.layout).toMatchObject({ errors: 1, solved: false, placed: {} });
      const done = run(def, GROUP_SOLUTION.solution(def, null), after);
      expect(done.solved).toBe(true);
      expect(kind.stars(done)).toBe(2);
    }
  });

  it('a def without an answer for a card throws', () => {
    expect(() => GROUP_SOLUTION.solution({ ...row, answer: {} }, null)).toThrow(/no answer/);
  });
});

describe('group is opt-in', () => {
  it('is not one of the card kit kinds or solutions: a subject registers it itself', () => {
    expect(Object.keys(CARD_KINDS)).not.toContain('group');
    expect(Object.keys(CARD_SOLUTIONS)).not.toContain('group');
    expect(kind.type).toBe('group');
    expect(kind.input).toBe('place');
  });
});
