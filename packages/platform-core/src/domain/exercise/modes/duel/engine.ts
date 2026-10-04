import type { Random } from '../../../random.ts';
import type { Stars } from '../../../progress.ts';
import { DUEL_MISTAKE_RATE } from './def.ts';
import type { DuelGameDef, DuelSide, DuelState, TurnGame } from './def.ts';

type Games = Readonly<Record<string, TurnGame>>;

/** The `TurnGame` a def names; throws on an unknown id (content verify rejects it at build). */
export function duelGameOf(def: DuelGameDef, games: Games): TurnGame {
  const game = games[def.game];
  if (game === undefined) {
    throw new Error(`duel: unknown game "${def.game}"`);
  }
  return game;
}

function statusOf(game: TurnGame, state: unknown): DuelState['status'] {
  const result = game.result(state);
  if (result === undefined) {
    return 'playing';
  }
  if (result === 'draw') {
    return 'draw';
  }
  return result === 'kid' ? 'won' : 'lost';
}

function advance(state: DuelState, game: TurnGame, side: DuelSide, move: unknown): DuelState {
  const next = game.play(state.game, move);
  return {
    ...state,
    game: next,
    history: [...state.history, { side, move }],
    status: statusOf(game, next),
  };
}

export function startDuel(def: DuelGameDef, games: Games): DuelState {
  const game = duelGameOf(def, games);
  const start = game.start(def.params, def.first);
  return {
    mode: 'duel',
    def,
    game: start,
    history: [],
    status: statusOf(game, start),
    hintsUsed: 0,
  };
}

/** The kid's move; unchanged when the game is over, it is not the kid's turn or the move is illegal. */
export function kidMove(state: DuelState, move: unknown, games: Games): DuelState {
  const game = duelGameOf(state.def, games);
  if (state.status !== 'playing' || game.toMove(state.game) !== 'kid') {
    return state;
  }
  const legal = game.moves(state.game).find((candidate) => game.sameMove(candidate, move));
  return legal === undefined ? state : advance(state, game, 'kid', legal);
}

function pick<T>(items: readonly T[], random: Random): T | undefined {
  return items[Math.min(items.length - 1, Math.floor(random.next() * items.length))];
}

/** The bot's move: a best move, unless `random` draws under the level's mistake rate (then a random legal move); a random
 * legal move too when it is losing (no best move). Unchanged when the game is over or it is not the bot's turn. */
export function botMove(state: DuelState, games: Games, random: Random): DuelState {
  const game = duelGameOf(state.def, games);
  if (state.status !== 'playing' || game.toMove(state.game) !== 'bot') {
    return state;
  }
  const best = game.bestMoves(state.game);
  const rate = DUEL_MISTAKE_RATE[state.def.level];
  const mistake = rate > 0 && random.next() < rate;
  const move = best.length > 0 && !mistake ? best[0] : pick(game.moves(state.game), random);
  return move === undefined ? state : advance(state, game, 'bot', move);
}

/** The kid's hint: the best moves now, and a hint counted (`hintsUsed`) — only on the kid's turn while playing, else
 * the state is returned unchanged with no moves. */
export function duelHint(
  state: DuelState,
  games: Games,
): { readonly state: DuelState; readonly moves: readonly unknown[] } {
  const game = duelGameOf(state.def, games);
  if (state.status !== 'playing' || game.toMove(state.game) !== 'kid') {
    return { state, moves: [] };
  }
  return {
    state: { ...state, hintsUsed: state.hintsUsed + 1 },
    moves: game.bestMoves(state.game),
  };
}

/** Won: 3 stars with no hint, 2 with hints; lost, drawn or still playing: 0. */
export function duelStars(state: DuelState): Stars {
  if (state.status !== 'won') {
    return 0;
  }
  return state.hintsUsed === 0 ? 3 : 2;
}
