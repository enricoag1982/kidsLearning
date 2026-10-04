// `program`: build the program from the tray so the animal reaches the flag and picks up every star.
import { z } from 'zod';
import type { ExerciseKindContent } from '@learn/platform-content/kinds/kind-content';
import { cardExerciseFields } from '@learn/platform-content/kinds/cards/prompt';
import { run } from '../core/simulator.ts';
import { solvableWithoutRepeat } from '../core/solver.ts';
import { PRIMITIVE_KINDS, isValidProgram, sameTile, tileCount } from '../core/tiles.ts';
import type { PrimitiveKind, Tile } from '../core/tiles.ts';
import type { ProgramDef } from '../core/types.ts';
import { kindsUsed } from '../kinds/program/kind.ts';
import { checkLevelSize, compileLevel, levelFields, refineLevel } from './level-yaml.ts';
import { MAX_CAP, tileSchema, traySchema } from './tile-yaml.ts';

const programSchema = z
  .object({
    ...cardExerciseFields,
    type: z.literal('program'),
    ...levelFields,
    tray: traySchema,
    cap: z.number().int().min(1).max(MAX_CAP),
    solution: z.array(tileSchema).min(1),
    prefilled: z.array(tileSchema.nullable()).optional(),
    locked: z.array(z.number().int().nonnegative()).optional(),
    'must-loop': z.boolean().optional(),
  })
  .strict();

function isPrimitiveKind(kind: string): kind is PrimitiveKind {
  return (PRIMITIVE_KINDS as readonly string[]).includes(kind);
}

/** `prefilled` fits the strip and every locked slot holds the solution's own tile there. */
function checkPrefilled(def: ProgramDef, where: string, issues: string[]): void {
  const { prefilled, locked = [], solution, cap } = def;
  if (prefilled === undefined) {
    if (locked.length > 0) {
      issues.push(`${where}: "locked" needs "prefilled"`);
    }
    return;
  }
  if (prefilled.length > cap) {
    issues.push(
      `${where}: prefilled has ${String(prefilled.length)} slots, over the cap of ${String(cap)}`,
    );
  }
  const filled = prefilled.filter((tile): tile is Tile => tile !== null);
  if (!isValidProgram(filled)) {
    issues.push(`${where}: prefilled is not a valid program`);
  }
  for (const index of locked) {
    const fixed = prefilled[index];
    const wanted = solution[index];
    if (fixed === undefined || fixed === null) {
      issues.push(`${where}: locked slot ${String(index)} has no prefilled tile`);
    } else if (wanted === undefined || !sameTile(fixed, wanted)) {
      issues.push(`${where}: locked slot ${String(index)} is not the solution's tile there`);
    }
  }
}

/** The loop lesson needs its loop: the solution has a repeat and no repeat-free program fits the cap. */
function checkMustLoop(def: ProgramDef, where: string, issues: string[]): void {
  if (!def.solution.some((tile) => tile.kind === 'repeat')) {
    issues.push(`${where}: must-loop but the solution has no repeat`);
    return;
  }
  const primitives = def.tray.filter(isPrimitiveKind);
  if (solvableWithoutRepeat(def.level, primitives, def.cap)) {
    issues.push(
      `${where}: must-loop but a program without a repeat reaches the goal in ${String(def.cap)} tiles or fewer`,
    );
  }
}

/** Build the program from the tray: `solution` is a reference that reaches the goal within `cap`, with the tray's tiles only;
 * `prefilled` / `locked` set up a "fill the gap" or "fix it" start; `must-loop` proves the lesson needs a repeat. */
export const program: ExerciseKindContent<ProgramDef, typeof programSchema> = {
  type: 'program',
  schema: programSchema,

  refine: refineLevel,

  compile: (raw, ctx) =>
    ctx.build<ProgramDef>({
      type: 'program',
      level: compileLevel(raw),
      tray: raw.tray,
      cap: raw.cap,
      solution: raw.solution,
      ...(raw.prefilled === undefined ? {} : { prefilled: raw.prefilled }),
      ...(raw.locked === undefined ? {} : { locked: raw.locked }),
      ...(raw['must-loop'] === undefined ? {} : { mustLoop: raw['must-loop'] }),
    }),

  verify(def, where, issues) {
    if (!checkLevelSize(def.level, where, issues)) {
      return;
    }
    if (!isValidProgram(def.solution)) {
      issues.push(`${where}: solution is not a valid program`);
      return;
    }
    if (tileCount(def.solution) > def.cap) {
      issues.push(
        `${where}: solution shows ${String(tileCount(def.solution))} tiles, over the cap of ${String(def.cap)}`,
      );
    }
    const outside = kindsUsed(def.solution).find((kind) => !def.tray.includes(kind));
    if (outside !== undefined) {
      issues.push(`${where}: solution uses "${outside}", which is not in the tray`);
    }
    const outcome = run(def.level, def.solution).outcome;
    if (outcome !== 'success') {
      issues.push(`${where}: solution does not reach the goal (${outcome})`);
    }
    checkPrefilled(def, where, issues);
    if (def.mustLoop === true) {
      try {
        checkMustLoop(def, where, issues);
      } catch (error) {
        issues.push(`${where}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  },
};
