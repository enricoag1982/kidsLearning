// The compiled content as the coding subject types it: the platform hands out its base `Lesson` / `MiniGame`, whose exercises are
// the coding defs. Type-only, so nothing here reaches a bundle.
import type { Lesson, MiniGame } from '@learn/platform-core';
import type { CardDemo } from '@learn/platform-core/domain/exercise/kinds/cards/def';
import type { SeriesGameDef } from '@learn/platform-core';
import type { CodingExerciseDef } from '../core/types.ts';

export type CodingLesson = Lesson<CodingExerciseDef, CardDemo>;
export type CodingSeries = MiniGame & SeriesGameDef<CodingExerciseDef>;

export function codingLessons(lessons: readonly Lesson[]): readonly CodingLesson[] {
  return lessons as unknown as readonly CodingLesson[];
}

export function codingSeries(games: readonly MiniGame[]): readonly CodingSeries[] {
  return games as unknown as readonly CodingSeries[];
}

/** Every exercise, in play order: per lesson its guided tries, scored exercises and easier variants; then the rounds of every boss. */
export function allCodingExercises(
  lessons: readonly Lesson[],
  games: readonly MiniGame[],
): readonly CodingExerciseDef[] {
  return [
    ...codingLessons(lessons).flatMap((lesson) => [
      ...lesson.guided,
      ...lesson.exercises,
      ...(lesson.variants ?? []),
    ]),
    ...codingSeries(games).flatMap((game) => game.rounds),
  ];
}
