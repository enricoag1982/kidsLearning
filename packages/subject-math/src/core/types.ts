// Math's exercise defs, lessons and content: the card kit's four kinds (a prompt card, choice cards, a number pad) and math's own
// (`number-line` since m13.6, `place-value` since m13.7, `array` since m13.8, each with its def under `kinds/<kind>/def.ts`).
import type {
  CardDemo,
  CardExerciseDef,
} from '@learn/platform-core/domain/exercise/kinds/cards/def';
import type { DuelGameDef } from '@learn/platform-core/domain/exercise/modes/duel/def';
import type { SeriesGameDef } from '@learn/platform-core/domain/exercise/modes/series/def';
import type { Lesson, MiniGameBase } from '@learn/platform-core/domain/subject';
import type { ArrayDef } from '../kinds/array/def.ts';
import type { NumberLineDef } from '../kinds/number-line/def.ts';
import type { PlaceValueDef } from '../kinds/place-value/def.ts';

export type { ArrayAction, ArrayDef, ArrayHint, ArrayReason } from '../kinds/array/def.ts';
export type { NumberLineDef, NumberLineHint, PlaceAction } from '../kinds/number-line/def.ts';
export type { PlaceValueDef, PlaceValueHint, PlaceValueState } from '../kinds/place-value/def.ts';

/** Every exercise a math lesson may hold: the card kit's four kinds and math's own. */
export type MathExerciseDef = CardExerciseDef | NumberLineDef | PlaceValueDef | ArrayDef;

export type MathLesson = Lesson<MathExerciseDef, CardDemo>;

export interface MathSeriesGame extends MiniGameBase, SeriesGameDef<MathExerciseDef> {
  readonly mode: 'series';
}

/** A `duel` mini-game (m13.13: Race to 20): the platform's def, whose `params` is the game's own (`RaceParams`). */
export type MathDuelGame = DuelGameDef;

/** Every mini-game math has: a `series` of rounds, or a turn-based `duel` against a bot. */
export type MathMiniGame = MathSeriesGame | MathDuelGame;

export interface MathContent {
  readonly version: 1;
  readonly lessons: readonly MathLesson[];
  readonly minigames: readonly MathMiniGame[];
}
