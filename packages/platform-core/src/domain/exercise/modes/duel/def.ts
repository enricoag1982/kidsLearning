import type { MiniGameBase } from '../../../subject.ts';

export type DuelSide = 'kid' | 'bot';

/** A pure, serialisable two-player game; the subject supplies it (math race-to-n, logic nim). Method syntax is deliberate:
 * bivariant checking lets a precise `TurnGame<P, S, M>` widen to `TurnGame` (`Record<string, TurnGame>` registries) with no cast. */
export interface TurnGame<P = unknown, S = unknown, M = unknown> {
  readonly id: string;
  start(params: P, first: DuelSide): S;
  toMove(state: S): DuelSide;
  moves(state: S): readonly M[];
  /** Throws on an illegal move. */
  play(state: S, move: M): S;
  result(state: S): DuelSide | 'draw' | undefined;
  /** Moves that keep a won position won (`[]` when the mover is losing): bot perfect play, kid hint, content verify. */
  bestMoves(state: S): readonly M[];
  /** Same move check for actions coming from the UI (structural equality). */
  sameMove(a: M, b: M): boolean;
}

/** A `duel` mini-game: the kid plays a subject's `TurnGame` against a bot. */
export interface DuelGameDef extends MiniGameBase {
  readonly mode: 'duel';
  /** `TurnGame` id. */
  readonly game: string;
  /** Parsed by the subject's game params schema at content build. */
  readonly params: unknown;
  /** Bot mistake rate 40 / 20 / 0 % (`DUEL_MISTAKE_RATE`). */
  readonly level: 1 | 2 | 3;
  readonly first: DuelSide;
  /** The game's own hint text key (full `lessons:` key); absent = the platform's `boss.duel.hint`. */
  readonly hintKey?: string;
}

export interface DuelState {
  readonly mode: 'duel';
  readonly def: DuelGameDef;
  /** The `TurnGame` state. */
  readonly game: unknown;
  readonly history: readonly { readonly side: DuelSide; readonly move: unknown }[];
  readonly status: 'playing' | 'won' | 'lost' | 'draw';
  readonly hintsUsed: number;
}

/** Share of the bot's turns (in a winning position) where it plays a random legal move instead of a best one, by `level`. */
export const DUEL_MISTAKE_RATE = { 1: 0.4, 2: 0.2, 3: 0 } as const;
