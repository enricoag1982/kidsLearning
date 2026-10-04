import type { MiniGameMode } from '../../mode.ts';
import type { AnyMode } from '../../../subject.ts';
import type { DuelGameDef, DuelState, TurnGame } from './def.ts';
import { duelStars, startDuel } from './engine.ts';

/** The `duel` mode plus the `TurnGame` registry it plays, so a step that only holds the subject's runtime (`modes[game.mode]`) can
 * drive the engine (`kidMove`, `botMove`, `duelHint`) and list legal moves. */
export interface DuelMode extends MiniGameMode<DuelGameDef, DuelState> {
  readonly games: Readonly<Record<string, TurnGame>>;
}

/** Opt-in: a subject registers `modes: { duel: createDuelMode({ <id>: game }) }` (the platform adds only `series`). */
export function createDuelMode(games: Readonly<Record<string, TurnGame>>): DuelMode {
  return {
    mode: 'duel',
    games,

    start(def) {
      return startDuel(def, games);
    },

    isOver(state) {
      return state.status !== 'playing';
    },

    isWin(state) {
      return state.status === 'won';
    },

    stars(state) {
      return duelStars(state);
    },

    summarise(state) {
      return {
        conceptId: state.def.concept,
        stars: duelStars(state),
        correct: state.status === 'won',
        hints: state.hintsUsed,
        errors: state.status === 'won' ? 0 : 1,
        moves: state.history.length,
      };
    },
  };
}

/** True for a registered `duel` mode (what `createDuelMode` returns): narrows a runtime's `AnyMode`. */
export function isDuelMode(mode: AnyMode | undefined): mode is DuelMode {
  return mode !== undefined && mode.mode === 'duel' && 'games' in mode;
}
