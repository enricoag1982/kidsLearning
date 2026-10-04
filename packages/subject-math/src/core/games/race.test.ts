// The Race to N rules, exhaustively: every total of the three shipped parameter sets (and the extremes of the schema) is played out
// against every reply, so `bestMoves` is proved to win from a winning total and to be empty exactly on the losing ones.
import { describe, expect, it } from 'vitest';
import type { DuelSide } from '@learn/platform-core';
import { MATH_GAMES } from './index.ts';
import { race } from './race.ts';
import type { RaceParams, RaceState } from './race.ts';

const PARAMS: readonly RaceParams[] = [
  { target: 20, maxStep: 3 },
  { target: 30, maxStep: 4 },
  { target: 10, maxStep: 2 },
  { target: 17, maxStep: 4 },
];

/** A state at `total` with `side` to move. */
function at(params: RaceParams, total: number, side: DuelSide = 'kid'): RaceState {
  return { ...race.start(params, side), total };
}

/** True when the side to move at `state` wins against every reply of the other side, playing `bestMoves` itself. */
function winsAgainstAnyReply(state: RaceState): boolean {
  const mover = race.toMove(state);
  const result = race.result(state);
  if (result !== undefined) return result === mover;
  const best = race.bestMoves(state);
  if (best.length === 0) return false;
  const next = race.play(state, best[0] ?? 0);
  if (race.result(next) !== undefined) return race.result(next) === mover;
  // Every reply of the other side, then the mover plays its best move again.
  return race.moves(next).every((reply) => winsAgainstAnyReply(race.play(next, reply)));
}

/** Brute force by memoised search over the totals (no theory used): can the side to move force `target`? */
function forcedWin(params: RaceParams): ReadonlyMap<number, boolean> {
  const memo = new Map<number, boolean>();
  const wins = (state: RaceState): boolean => {
    const known = memo.get(state.total);
    if (known !== undefined) return known;
    const value = race.moves(state).some((move) => {
      const next = race.play(state, move);
      return race.result(next) !== undefined || !wins(next);
    });
    memo.set(state.total, value);
    return value;
  };
  for (let total = 0; total < params.target; total += 1) {
    wins({ ...race.start(params, 'kid'), total });
  }
  return memo;
}

describe('race: the rules', () => {
  const params = { target: 20, maxStep: 3 };

  it('starts at 0 with the given side to move, JSON-plain, no last move', () => {
    expect(race.start(params, 'bot')).toEqual({ total: 0, toMove: 'bot', target: 20, maxStep: 3 });
    expect(race.start(params, 'kid').toMove).toBe('kid');
    expect('last' in race.start(params, 'kid')).toBe(false);
    const state = race.play(race.start(params, 'bot'), 2);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it('plays a step: the total grows, the other side moves, the last move is remembered', () => {
    const state = race.play(race.start(params, 'bot'), 3);
    expect(state).toEqual({
      total: 3,
      toMove: 'kid',
      target: 20,
      maxStep: 3,
      last: { side: 'bot', step: 3 },
    });
    expect(race.toMove(state)).toBe('kid');
  });

  it('offers steps 1..maxStep that do not pass the target', () => {
    expect(race.moves(at(params, 0))).toEqual([1, 2, 3]);
    expect(race.moves(at(params, 17))).toEqual([1, 2, 3]);
    expect(race.moves(at(params, 18))).toEqual([1, 2]);
    expect(race.moves(at(params, 19))).toEqual([1]);
    expect(race.moves({ ...at(params, 20), last: { side: 'kid', step: 1 } })).toEqual([]);
    expect(race.moves(at({ target: 10, maxStep: 2 }, 0))).toEqual([1, 2]);
    expect(race.moves(at({ target: 30, maxStep: 4 }, 0))).toEqual([1, 2, 3, 4]);
  });

  it('throws on an illegal step: zero, too big, fractional, or passing the target', () => {
    expect(() => race.play(at(params, 0), 0)).toThrow();
    expect(() => race.play(at(params, 0), 4)).toThrow();
    expect(() => race.play(at(params, 0), 1.5)).toThrow();
    expect(() => race.play(at(params, 19), 2)).toThrow(/passes 20/);
  });

  it('is won by the side that says the target, and over for no one before it', () => {
    expect(race.result(at(params, 19, 'bot'))).toBeUndefined();
    expect(race.result(race.play(at(params, 19, 'bot'), 1))).toBe('bot');
    expect(race.result(race.play(at(params, 17, 'kid'), 3))).toBe('kid');
    expect(race.result(race.start(params, 'kid'))).toBeUndefined();
  });

  it('compares moves by value', () => {
    expect(race.sameMove(2, 2)).toBe(true);
    expect(race.sameMove(2, 3)).toBe(false);
  });

  it('is registered as the math duel game "race"', () => {
    expect(MATH_GAMES.race).toBe(race);
    expect(race.id).toBe('race');
  });
});

describe.each(PARAMS)('race to $target by 1..$maxStep, over every total', (params) => {
  const block = params.maxStep + 1;
  const totals = Array.from({ length: params.target }, (_, total) => total);

  it('bestMoves is the step that leaves a multiple of maxStep + 1 to go, and nothing from such a total', () => {
    for (const total of totals) {
      const left = params.target - total;
      const best = race.bestMoves(at(params, total));
      if (left % block === 0) {
        expect(best, `total ${String(total)}`).toEqual([]);
      } else {
        expect(best, `total ${String(total)}`).toEqual([left % block]);
        expect((params.target - (total + (best[0] ?? 0))) % block).toBe(0);
        expect(race.moves(at(params, total))).toContain(best[0]);
      }
    }
    expect(
      race.bestMoves({ ...at(params, params.target), last: { side: 'kid', step: 1 } }),
    ).toEqual([]);
  });

  it('a best move from a winning total wins against any reply (both sides, every total)', () => {
    for (const side of ['kid', 'bot'] as const) {
      for (const total of totals) {
        const state = at(params, total, side);
        const winning = race.bestMoves(state).length > 0;
        expect(winsAgainstAnyReply(state), `${side} at ${String(total)}`).toBe(winning);
      }
    }
  });

  it('a total returns [] exactly when brute force finds no forced win (the theory matches the game)', () => {
    const brute = forcedWin(params);
    expect(brute.size).toBe(params.target);
    for (const total of totals) {
      const state = at(params, total);
      expect(race.bestMoves(state).length > 0, `total ${String(total)}`).toBe(brute.get(total));
    }
  });

  it('a losing total loses to a perfect reply, whatever it plays (so the bot, moving first from 0, is the one at a loss)', () => {
    for (const total of totals) {
      const state = at(params, total);
      if (race.bestMoves(state).length > 0) continue;
      for (const move of race.moves(state)) {
        const next = race.play(state, move);
        expect(race.bestMoves(next).length, `${String(total)} + ${String(move)}`).toBeGreaterThan(
          0,
        );
      }
    }
  });
});

describe('race to 20 by 1..3 (the shipped game)', () => {
  const params = { target: 20, maxStep: 3 };

  it('the mover wins from 1, 2, 3 and loses from 0: land on 4, 8, 12, 16 to win', () => {
    expect(race.bestMoves(at(params, 0))).toEqual([]);
    expect(race.bestMoves(at(params, 1))).toEqual([3]);
    expect(race.bestMoves(at(params, 2))).toEqual([2]);
    expect(race.bestMoves(at(params, 3))).toEqual([1]);
    expect(race.bestMoves(at(params, 16))).toEqual([]);
    expect(race.bestMoves(at(params, 17))).toEqual([3]);
    expect(race.bestMoves(at(params, 19))).toEqual([1]);
  });
});
