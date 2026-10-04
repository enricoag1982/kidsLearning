// The M12.3 fixture world as the UI tests see it: its exercises by id, taken from the compiled content the pack serves.
import type { Lesson } from '@learn/platform-core';
import type { CodingExerciseDef } from '../../core/types.ts';
import { codingWeb } from '../coding-pack.ts';

const content = codingWeb.createServices().content;

export const fixtureLesson = content.lesson('seq-arrows') as Lesson<CodingExerciseDef> | undefined;
if (fixtureLesson === undefined) {
  throw new Error('the coding fixture has no lesson "seq-arrows"');
}

/** The boss's rounds (a find-bug and a loop program). */
const bossRounds = (
  content.minigame('fixture-boss') as unknown as {
    readonly rounds: readonly CodingExerciseDef[];
  }
).rounds;

/** Every fixture exercise, in lesson order: guided tries, scored exercises, then the boss rounds. */
export const fixtureExercises: readonly CodingExerciseDef[] = [
  ...fixtureLesson.guided,
  ...fixtureLesson.exercises,
  ...bossRounds,
];

export function fixtureExercise<T extends CodingExerciseDef['type']>(
  id: string,
  type: T,
): Extract<CodingExerciseDef, { readonly type: T }> {
  const def = fixtureExercises.find((candidate) => candidate.id === id);
  if (def === undefined || def.type !== type) {
    throw new Error(`the coding fixture has no ${type} exercise "${id}"`);
  }
  return def as Extract<CodingExerciseDef, { readonly type: T }>;
}
