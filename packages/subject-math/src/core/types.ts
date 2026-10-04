// Math's exercise defs, lessons and content: the card kit's four kinds (a prompt card, choice cards, a number pad), no kind of its
// own yet (`number-line`, `place-value` and `array` join in m13.6-m13.8, each with its def here).
import type {
  CardDemo,
  CardExerciseDef,
} from '@learn/platform-core/domain/exercise/kinds/cards/def';
import type { SeriesGameDef } from '@learn/platform-core/domain/exercise/modes/series/def';
import type { Lesson, MiniGameBase } from '@learn/platform-core/domain/subject';

/** Every exercise a math lesson may hold: the card kit's four kinds. */
export type MathExerciseDef = CardExerciseDef;

export type MathLesson = Lesson<MathExerciseDef, CardDemo>;

export interface MathSeriesGame extends MiniGameBase, SeriesGameDef<MathExerciseDef> {
  readonly mode: 'series';
}

export interface MathContent {
  readonly version: 1;
  readonly lessons: readonly MathLesson[];
  readonly minigames: readonly MathSeriesGame[];
}
