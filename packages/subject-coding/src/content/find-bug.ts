// `find-bug`: the program fails; tap the one tile that is wrong.
import { z } from 'zod';
import type { ExerciseKindContent } from '@learn/platform-content/kinds/kind-content';
import { cardExerciseFields } from '@learn/platform-content/kinds/cards/prompt';
import { run } from '../core/simulator.ts';
import type { RunResult, StepEvent } from '../core/simulator.ts';
import { isValidProgram, replaceTile, samePath, sameTile, tileAt } from '../core/tiles.ts';
import type { FindBugDef } from '../core/types.ts';
import { checkLevelSize, compileLevel, levelFields, refineLevel } from './level-yaml.ts';
import { tileSchema } from './tile-yaml.ts';

const findBugSchema = z
  .object({
    ...cardExerciseFields,
    type: z.literal('find-bug'),
    ...levelFields,
    program: z.array(tileSchema).min(1),
    /** `[top]` or `[top, body]`. */
    bug: z.array(z.number().int().nonnegative()).min(1).max(2),
    fix: tileSchema,
  })
  .strict();

function sameStep(a: StepEvent, b: StepEvent): boolean {
  return (
    samePath(a.path, b.path) &&
    a.iteration === b.iteration &&
    a.kind === b.kind &&
    a.result === b.result &&
    a.state.heading === b.state.heading &&
    a.state.cell.x === b.state.cell.x &&
    a.state.cell.y === b.state.cell.y &&
    a.state.collected.join(' ') === b.state.collected.join(' ')
  );
}

/** Index of the first step where the two runs part (or where the shorter one ends). */
function departure(a: RunResult, b: RunResult): number {
  let index = 0;
  while (index < a.steps.length && index < b.steps.length) {
    const left = a.steps[index];
    const right = b.steps[index];
    if (left === undefined || right === undefined || !sameStep(left, right)) {
      break;
    }
    index += 1;
  }
  return index;
}

/** The program fails; putting `fix` at `bug` makes it succeed, and that is the only change. Both runs are the same up to the bug
 * tile, so the bug is where the run first goes wrong, the tile the child should tap. */
export const findBug: ExerciseKindContent<FindBugDef, typeof findBugSchema> = {
  type: 'find-bug',
  schema: findBugSchema,

  refine: refineLevel,

  compile: (raw, ctx) =>
    ctx.build<FindBugDef>({
      type: 'find-bug',
      level: compileLevel(raw),
      program: raw.program,
      bug: raw.bug,
      fix: raw.fix,
    }),

  verify(def, where, issues) {
    if (!checkLevelSize(def.level, where, issues)) {
      return;
    }
    if (!isValidProgram(def.program) || !isValidProgram([def.fix])) {
      issues.push(`${where}: program and fix must be valid tiles`);
      return;
    }
    const buggy = tileAt(def.program, def.bug);
    if (buggy === undefined) {
      issues.push(`${where}: bug [${def.bug.join(', ')}] is not a tile of the program`);
      return;
    }
    if (sameTile(buggy, def.fix)) {
      issues.push(`${where}: fix is the tile it replaces`);
      return;
    }
    const failing = run(def.level, def.program);
    if (failing.outcome === 'success') {
      issues.push(`${where}: the program already reaches the goal (there is no bug)`);
      return;
    }
    const fixed = replaceTile(def.program, def.bug, def.fix);
    if (!isValidProgram(fixed)) {
      issues.push(`${where}: the program with the fix is not a valid program`);
      return;
    }
    const passing = run(def.level, fixed);
    if (passing.outcome !== 'success') {
      issues.push(
        `${where}: the program with the fix does not reach the goal (${passing.outcome})`,
      );
      return;
    }
    // Same run up to the first step of the bug tile, which is the first step that differs: the bug is the first departure.
    const at = departure(failing, passing);
    const first = failing.steps[at] ?? passing.steps[at];
    const inBug = (path: readonly number[] | undefined): boolean =>
      path !== undefined && def.bug.every((index, depth) => path[depth] === index);
    if (!inBug(failing.steps[at]?.path) && !inBug(passing.steps[at]?.path)) {
      issues.push(
        `${where}: the run first goes wrong at tile [${(first?.path ?? []).join(', ')}], not at the bug [${def.bug.join(', ')}]`,
      );
    }
  },
};
