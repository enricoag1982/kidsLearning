import { run } from '../../core/simulator.ts';
import { replaceTile } from '../../core/tiles.ts';
import type { PrimitiveKind, Tile } from '../../core/tiles.ts';
import type { ProgramDef } from '../../core/types.ts';
import { programProblem } from './kind.ts';
import type { ProgramAction } from './kind.ts';

export function programSolution(def: ProgramDef): readonly ProgramAction[] {
  return [{ type: 'run-program', program: def.solution }];
}

/** True when `program` may be run (`programProblem`) and does not reach the goal: the run costs exactly 1 error. */
function failsCleanly(def: ProgramDef, program: readonly Tile[]): boolean {
  return programProblem(def, program) === null && run(def.level, program).outcome !== 'success';
}

/** A runnable program that does not succeed: the solution without its last tile, else without more of its tail (every prefix
 * that keeps the locked slots), else the solution with one open top-level slot swapped for another primitive of the tray. */
function wrongProgram(def: ProgramDef): readonly Tile[] {
  for (let length = def.solution.length - 1; length >= 0; length -= 1) {
    const prefix = def.solution.slice(0, length);
    if (failsCleanly(def, prefix)) {
      return prefix;
    }
  }
  const locked = new Set(def.locked ?? []);
  const primitives = def.tray.filter((kind): kind is PrimitiveKind => kind !== 'repeat');
  for (const [index, tile] of def.solution.entries()) {
    if (locked.has(index)) {
      continue;
    }
    for (const kind of primitives) {
      const swapped = replaceTile(def.solution, [index], { kind });
      if (tile.kind !== kind && failsCleanly(def, swapped)) {
        return swapped;
      }
    }
  }
  throw new Error(`program "${def.id}": no runnable program fails`);
}

/** A program that runs and fails: exactly 1 error, still answerable. */
export function programWrongAction(def: ProgramDef): readonly ProgramAction[] {
  return [{ type: 'run-program', program: wrongProgram(def) }];
}
