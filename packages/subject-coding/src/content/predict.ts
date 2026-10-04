// `predict`: read the program, then tap the square where the animal ends.
import { z } from 'zod';
import { sameCell } from '@learn/platform-core/domain/grid';
import type { ExerciseKindContent } from '@learn/platform-content/kinds/kind-content';
import { cardExerciseFields } from '@learn/platform-content/kinds/cards/prompt';
import { run } from '../core/simulator.ts';
import { isValidProgram } from '../core/tiles.ts';
import type { PredictDef } from '../core/types.ts';
import { checkLevelSize, compileLevel, levelFields, refineLevel } from './level-yaml.ts';
import { tileSchema } from './tile-yaml.ts';

const predictSchema = z
  .object({
    ...cardExerciseFields,
    type: z.literal('predict'),
    ...levelFields,
    program: z.array(tileSchema).min(1),
  })
  .strict();

/** Read the program and tap where the animal ends. The answer is not written: the build runs the program and stores its final
 * square. The program must run to its end without bumping, so the answer is where it really stops. */
export const predict: ExerciseKindContent<PredictDef, typeof predictSchema> = {
  type: 'predict',
  schema: predictSchema,

  refine: refineLevel,

  compile(raw, ctx) {
    const level = compileLevel(raw);
    const program = raw.program;
    return ctx.build<PredictDef>({
      type: 'predict',
      level,
      program,
      answer: run(level, program).final.cell,
    });
  },

  verify(def, where, issues) {
    if (!checkLevelSize(def.level, where, issues)) {
      return;
    }
    if (!isValidProgram(def.program)) {
      issues.push(`${where}: program is not a valid program`);
      return;
    }
    const result = run(def.level, def.program);
    if (result.outcome === 'bumped') {
      issues.push(`${where}: program bumps (a prediction needs a program that runs to its end)`);
    }
    if (!sameCell(def.answer, result.final.cell)) {
      issues.push(
        `${where}: answer (${String(def.answer.x)}, ${String(def.answer.y)}) is not where the program ends (${String(result.final.cell.x)}, ${String(result.final.cell.y)})`,
      );
    }
  },
};
