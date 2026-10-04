import { describe, expect, it } from 'vitest';
import { seededRandom } from '../../../random.ts';
import type { Random } from '../../../random.ts';
import { takeAwayGame } from '../../../../testing/take-away-game.ts';
import type { TakeAwayParams, TakeAwayState } from '../../../../testing/take-away-game.ts';
import type { DuelGameDef, DuelState, TurnGame } from './def.ts';
import { DUEL_MISTAKE_RATE } from './def.ts';
import { botMove, duelHint, duelStars, kidMove, startDuel } from './engine.ts';
import { createDuelMode, isDuelMode } from './mode.ts';

const games: Readonly<Record<string, TurnGame>> = { 'take-away-fixture': takeAwayGame };

function def(overrides: Partial<DuelGameDef> & { readonly pile?: number } = {}): DuelGameDef {
  const { pile = 7, ...rest } = overrides;
  return {
    mode: 'duel',
    id: 'take-away',
    concept: 'nim',
    titleKey: 'lessons:take-away.title',
    goalKey: 'lessons:take-away.goal',
    unlockAfter: 'lesson-1',
    game: 'take-away-fixture',
    params: { pile } satisfies TakeAwayParams,
    level: 3,
    first: 'kid',
    ...rest,
  };
}

/** A random that answers from `values` in order (then 0.5). */
function scripted(...values: number[]): Random {
  let index = 0;
  return {
    next: () => {
      const value = values[index] ?? 0.5;
      index += 1;
      return value;
    },
  };
}

function pileOf(state: DuelState): number {
  return (state.game as TakeAwayState).pile;
}

describe('startDuel', () => {
  it('starts with the first side to move, an empty history and no hints', () => {
    const kid = startDuel(def({ first: 'kid' }), games);
    expect(kid).toMatchObject({ mode: 'duel', status: 'playing', history: [], hintsUsed: 0 });
    expect(takeAwayGame.toMove(kid.game as TakeAwayState)).toBe('kid');
    const bot = startDuel(def({ first: 'bot' }), games);
    expect(takeAwayGame.toMove(bot.game as TakeAwayState)).toBe('bot');
  });

  it('throws on an unknown game id', () => {
    expect(() => startDuel(def({ game: 'nope' }), games)).toThrow('unknown game "nope"');
  });
});

describe('turn order and moves', () => {
  it('alternates kid and bot and records the history', () => {
    let state = startDuel(def({ pile: 7 }), games);
    state = kidMove(state, 1, games);
    expect(pileOf(state)).toBe(6);
    state = botMove(state, games, scripted());
    expect(pileOf(state)).toBe(4); // 6 is lost for the bot: a random legal move (draw 0.5 → index 1 → take 2)
    expect(state.history.map((entry) => entry.side)).toEqual(['kid', 'bot']);
    expect(state.history[0]?.move).toBe(1);
  });

  it('ignores a kid move on the bot turn and a bot move on the kid turn', () => {
    const start = startDuel(def({ first: 'bot' }), games);
    expect(kidMove(start, 1, games)).toBe(start);
    const kidTurn = startDuel(def({ first: 'kid' }), games);
    expect(botMove(kidTurn, games, scripted())).toBe(kidTurn);
  });

  it('ignores an illegal move (not offered, or more than the pile) and moves after the end', () => {
    const start = startDuel(def({ pile: 7 }), games);
    expect(kidMove(start, 3, games)).toBe(start);
    expect(kidMove(start, 'two', games)).toBe(start);
    const nearEnd = startDuel(def({ pile: 1 }), games);
    expect(kidMove(nearEnd, 2, games)).toBe(nearEnd);

    const won = kidMove(nearEnd, 1, games);
    expect(won.status).toBe('won');
    expect(kidMove(won, 1, games)).toBe(won);
    expect(botMove(won, games, scripted())).toBe(won);
  });
});

describe('the bot', () => {
  it('level 3 plays the best move every time (never rolls a mistake)', () => {
    // pile 4, bot to move: best is take 1 (leaves 3).
    const state = startDuel(def({ pile: 4, first: 'bot', level: 3 }), games);
    expect(pileOf(botMove(state, games, scripted(0)))).toBe(3);
  });

  it('level 3 never loses a winning position: from every pile up to 20, whoever starts, it beats every kid reply', () => {
    function botWinsAgainstEveryKid(state: DuelState): boolean {
      if (state.status === 'lost') return true;
      if (state.status !== 'playing') return false;
      if (takeAwayGame.toMove(state.game as TakeAwayState) === 'bot') {
        return botWinsAgainstEveryKid(botMove(state, games, scripted()));
      }
      return takeAwayGame
        .moves(state.game as TakeAwayState)
        .every((move) => botWinsAgainstEveryKid(kidMove(state, move, games)));
    }
    for (let pile = 1; pile <= 20; pile += 1) {
      for (const first of ['bot', 'kid'] as const) {
        const state = startDuel(def({ pile, first, level: 3 }), games);
        // The mover wins unless the pile is a multiple of 3.
        const botIsWinning = (first === 'bot') === (pile % 3 !== 0);
        expect(botWinsAgainstEveryKid(state)).toBe(botIsWinning);
      }
    }
  });

  it('level 1 plays a non-best move when the draw is under 0.4 (and the random pick lands on one)', () => {
    // pile 4, bot to move: moves [1, 2], best 1. Draw 0.39 < 0.4 → mistake; pick index floor(0.9 * 2) = 1 → take 2.
    const state = startDuel(def({ pile: 4, first: 'bot', level: 1 }), games);
    expect(DUEL_MISTAKE_RATE[1]).toBe(0.4);
    expect(pileOf(botMove(state, games, scripted(0.39, 0.9)))).toBe(2);
  });

  it('level 1 plays the best move when the draw is at or over 0.4', () => {
    const state = startDuel(def({ pile: 4, first: 'bot', level: 1 }), games);
    expect(pileOf(botMove(state, games, scripted(0.4)))).toBe(3);
    expect(pileOf(botMove(state, games, scripted(0.99)))).toBe(3);
  });

  it('level 2 uses a 20 % rate', () => {
    const state = startDuel(def({ pile: 4, first: 'bot', level: 2 }), games);
    expect(pileOf(botMove(state, games, scripted(0.19, 0.9)))).toBe(2);
    expect(pileOf(botMove(state, games, scripted(0.2)))).toBe(3);
  });

  it('mistakes follow the level rate over a seeded random: level 1 > level 2 > level 3 = 0', () => {
    // pile 4, bot to move: moves [1, 2], best 1; a mistake lands on the other move half the time.
    const wrongMoves = (level: 1 | 2 | 3): number => {
      const random = seededRandom(42);
      const start = startDuel(def({ pile: 4, first: 'bot', level }), games);
      let wrong = 0;
      for (let draw = 0; draw < 2000; draw += 1) {
        wrong += pileOf(botMove(start, games, random)) === 2 ? 1 : 0;
      }
      return wrong;
    };
    const [one, two, three] = [wrongMoves(1), wrongMoves(2), wrongMoves(3)];
    expect(three).toBe(0);
    expect(one).toBeGreaterThan(300); // ≈ 0.4 × ½ of 2000 = 400
    expect(one).toBeLessThan(500);
    expect(two).toBeGreaterThan(130); // ≈ 0.2 × ½ of 2000 = 200
    expect(two).toBeLessThan(270);
  });

  it('plays a random legal move when it is losing (no best move), at any level', () => {
    const lost = startDuel(def({ pile: 6, first: 'bot', level: 3 }), games);
    expect(takeAwayGame.bestMoves(lost.game as TakeAwayState)).toEqual([]);
    expect(pileOf(botMove(lost, games, scripted(0.0)))).toBe(5); // index 0 → take 1
    expect(pileOf(botMove(lost, games, scripted(0.9)))).toBe(4); // index 1 → take 2
  });

  it('is deterministic for a seeded random', () => {
    const run = (seed: number): readonly unknown[] => {
      const random = seededRandom(seed);
      let state = startDuel(def({ pile: 20, first: 'bot', level: 1 }), games);
      while (state.status === 'playing') {
        state =
          takeAwayGame.toMove(state.game as TakeAwayState) === 'bot'
            ? botMove(state, games, random)
            : kidMove(state, 1, games);
      }
      return state.history.map((entry) => entry.move);
    };
    expect(run(5)).toEqual(run(5));
  });
});

describe('result and stars', () => {
  it('the kid taking the last one wins: 3 stars with no hint', () => {
    const won = kidMove(startDuel(def({ pile: 2 }), games), 2, games);
    expect(won.status).toBe('won');
    expect(duelStars(won)).toBe(3);
  });

  it('a hint costs a star: won with hints = 2', () => {
    const start = startDuel(def({ pile: 2 }), games);
    const { state } = duelHint(start, games);
    const won = kidMove(state, 2, games);
    expect(won.status).toBe('won');
    expect(duelStars(won)).toBe(2);
  });

  it('the bot taking the last one loses the kid the game: 0 stars', () => {
    const lost = botMove(
      kidMove(startDuel(def({ pile: 3, level: 3 }), games), 1, games),
      games,
      scripted(),
    );
    expect(lost.status).toBe('lost');
    expect(duelStars(lost)).toBe(0);
  });

  it('is 0 stars while playing', () => {
    const start = startDuel(def(), games);
    expect(start.status).toBe('playing');
    expect(duelStars(start)).toBe(0);
  });

  it('maps a drawn result to status draw with 0 stars', () => {
    const drawGame: TurnGame<null, { readonly done: boolean }, string> = {
      id: 'draw-fixture',
      start: () => ({ done: false }),
      toMove: () => 'kid',
      moves: ({ done }) => (done ? [] : ['pass']),
      play: () => ({ done: true }),
      result: ({ done }) => (done ? 'draw' : undefined),
      bestMoves: () => ['pass'],
      sameMove: (a, b) => a === b,
    };
    const registry = { 'draw-fixture': drawGame };
    const drawn = kidMove(startDuel(def({ game: 'draw-fixture' }), registry), 'pass', registry);
    expect(drawn.status).toBe('draw');
    expect(duelStars(drawn)).toBe(0);
  });
});

describe('duelHint', () => {
  it('returns the best moves and counts the hint', () => {
    const start = startDuel(def({ pile: 7 }), games);
    const first = duelHint(start, games);
    expect(first.moves).toEqual([1]);
    expect(first.state.hintsUsed).toBe(1);
    expect(duelHint(first.state, games).state.hintsUsed).toBe(2);
    expect(start.hintsUsed).toBe(0);
  });

  it('is empty (and free) off the kid turn or after the end', () => {
    const botTurn = startDuel(def({ first: 'bot' }), games);
    expect(duelHint(botTurn, games)).toEqual({ state: botTurn, moves: [] });
    const won = kidMove(startDuel(def({ pile: 1 }), games), 1, games);
    expect(duelHint(won, games)).toEqual({ state: won, moves: [] });
  });

  it('is an empty list in a lost position, still counted', () => {
    const lost = startDuel(def({ pile: 6 }), games);
    const { state, moves } = duelHint(lost, games);
    expect(moves).toEqual([]);
    expect(state.hintsUsed).toBe(1);
  });
});

describe('createDuelMode', () => {
  const mode = createDuelMode(games);

  it('is the duel mode over the registry, found by isDuelMode', () => {
    expect(mode.mode).toBe('duel');
    expect(mode.games).toBe(games);
    expect(isDuelMode(mode)).toBe(true);
    expect(isDuelMode(undefined)).toBe(false);
    expect(isDuelMode({ ...mode, mode: 'other' })).toBe(false);
  });

  it('start / isOver / isWin / stars follow the engine', () => {
    const start = mode.start(def({ pile: 1 }));
    expect(mode.isOver(start)).toBe(false);
    expect(mode.isWin(start)).toBe(false);
    expect(mode.stars(start)).toBe(0);
    const won = kidMove(start, 1, games);
    expect(mode.isOver(won)).toBe(true);
    expect(mode.isWin(won)).toBe(true);
    expect(mode.stars(won)).toBe(3);
  });

  it('summarises a win (no errors) and a loss (one error), with hints and the move count', () => {
    const start = mode.start(def({ pile: 3 }));
    const { state: hinted } = duelHint(start, games);
    const lost = botMove(kidMove(hinted, 1, games), games, scripted());
    expect(mode.summarise(lost)).toEqual({
      conceptId: 'nim',
      stars: 0,
      correct: false,
      hints: 1,
      errors: 1,
      moves: 2,
    });
    const won = kidMove(mode.start(def({ pile: 2 })), 2, games);
    expect(mode.summarise(won)).toEqual({
      conceptId: 'nim',
      stars: 3,
      correct: true,
      hints: 0,
      errors: 0,
      moves: 1,
    });
  });

  it('keeps the state serialisable: a JSON round trip changes nothing', () => {
    let state = mode.start(def({ pile: 9, first: 'bot' }));
    state = botMove(state, games, scripted(0.1, 0.2));
    state = duelHint(state, games).state;
    state = kidMove(state, 1, games);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    // and play carries on from the round-tripped copy
    const revived = JSON.parse(JSON.stringify(state)) as DuelState;
    expect(kidMove(botMove(revived, games, scripted()), 1, games).history.length).toBe(
      state.history.length + 2,
    );
  });
});

describe('the take-away fixture game', () => {
  it('the mover wins exactly when the pile is not a multiple of 3, and best moves leave a multiple of 3', () => {
    for (let pile = 1; pile <= 20; pile += 1) {
      const state: TakeAwayState = { pile, turn: 'kid' };
      const best = takeAwayGame.bestMoves(state);
      expect(best.length).toBe(pile % 3 === 0 ? 0 : 1);
      for (const move of best) {
        expect(takeAwayGame.play(state, move).pile % 3).toBe(0);
      }
    }
  });

  it('offers only moves within the pile, throws on an illegal one and names the last taker the winner', () => {
    expect(takeAwayGame.moves({ pile: 1, turn: 'kid' })).toEqual([1]);
    expect(() => takeAwayGame.play({ pile: 1, turn: 'kid' }, 2)).toThrow('cannot take 2');
    expect(takeAwayGame.result({ pile: 0, turn: 'bot' })).toBe('kid');
    expect(takeAwayGame.result({ pile: 0, turn: 'kid' })).toBe('bot');
    expect(takeAwayGame.result({ pile: 2, turn: 'kid' })).toBeUndefined();
  });
});
