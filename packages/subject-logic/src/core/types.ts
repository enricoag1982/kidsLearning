// Logic's exercise defs, lessons and content: the card kit's four kinds (cards, an order, a number pad, true / false). Logic's own
// kinds (`group`, `grid-fill`) join `LogicExerciseDef` with a def under `kinds/<kind>/def.ts`, as math's do.
import type {
  CardDemo,
  CardExerciseDef,
} from '@learn/platform-core/domain/exercise/kinds/cards/def';
import type { SeriesGameDef } from '@learn/platform-core/domain/exercise/modes/series/def';
import type { Lesson, MiniGameBase } from '@learn/platform-core/domain/subject';

/** Every exercise a logic lesson may hold: the card kit's four kinds. */
export type LogicExerciseDef = CardExerciseDef;

export type LogicLesson = Lesson<LogicExerciseDef, CardDemo>;

export interface LogicSeriesGame extends MiniGameBase, SeriesGameDef<LogicExerciseDef> {
  readonly mode: 'series';
}

/** Every mini-game logic has: a `series` of rounds (a world boss). */
export type LogicMiniGame = LogicSeriesGame;

export interface LogicContent {
  readonly version: 1;
  readonly lessons: readonly LogicLesson[];
  readonly minigames: readonly LogicMiniGame[];
}
