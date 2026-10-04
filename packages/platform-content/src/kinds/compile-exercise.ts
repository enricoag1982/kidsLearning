// Compiles one exercise, or an array of them — a lesson's `guided`/`exercises`/`variants`, or a
// `series` mini-game's `rounds` — through the exercise-kind registry. Entries first expand (`generate/expand.ts`): an authored
// item stays as is, a `generate:` entry becomes its generated items.
import type { ExerciseDefBase } from '@learn/platform-core';
import { expandEntries, type ExpandEnv } from '../generate/expand.ts';
import type { ExerciseEntryYaml } from '../generate/template.ts';
import type { ExerciseYamlBase, StimulusContent } from '../subject.ts';
import type { AnyExerciseKindContent } from './kind-content.ts';
import { makeCompileContext } from './kind-content.ts';

/** Everything compiling a list of entries reads and writes: the expander's environment plus the subject's stimulus and exercise
 * kinds. `issues` is the shared issues list. */
export interface CompileEnv extends ExpandEnv {
  readonly stimulus: StimulusContent;
  readonly kinds: Readonly<Record<string, AnyExerciseKindContent>>;
}

/** Compiles the stimulus (the subject's head / tail), then hands the rest to the kind's `compile` through a `CompileContext`
 * supplying both. */
export function compileExercise(
  relPath: string,
  fieldPath: string,
  raw: ExerciseYamlBase,
  concept: string,
  env: CompileEnv,
): ExerciseDefBase | null {
  const where = `${relPath}: ${fieldPath}`;
  const compiledStimulus = env.stimulus.compile(raw, { where, issues: env.issues });
  if (compiledStimulus === null) {
    return null;
  }
  const ctx = makeCompileContext(
    relPath,
    fieldPath,
    env.issues,
    { id: raw.id, concept, textKey: `lessons:${raw.text ?? raw.id}` },
    raw.easier,
    compiledStimulus,
  );
  return env.kinds[raw.type]?.compile(raw, ctx) ?? null;
}

/** Expands `entries`, then compiles every item; `null` when the expansion or any item reported an issue (the caller skips the
 * lesson / game, so one broken entry does not cascade into more issues). */
export function compileExercises(
  relPath: string,
  fieldPath: string,
  entries: readonly ExerciseEntryYaml[],
  concept: string,
  env: CompileEnv,
): readonly ExerciseDefBase[] | null {
  const issueCountBefore = env.issues.length;
  const raw = expandEntries(entries, `${relPath}: ${fieldPath}`, env);
  const compiled: ExerciseDefBase[] = [];
  let allOk = env.issues.length === issueCountBefore;
  for (const [index, item] of raw.entries()) {
    const exercise = compileExercise(relPath, `${fieldPath}[${String(index)}]`, item, concept, env);
    if (exercise === null) {
      allOk = false;
      continue;
    }
    compiled.push(exercise);
  }
  return allOk ? compiled : null;
}
