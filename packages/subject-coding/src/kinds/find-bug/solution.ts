import { samePath, tilePaths } from '../../core/tiles.ts';
import type { FindBugDef } from '../../core/types.ts';
import type { PickTileAction } from './kind.ts';

export function findBugSolution(def: FindBugDef): readonly PickTileAction[] {
  return [{ type: 'pick-tile', path: def.bug }];
}

/** Another tile of the program (the first one that is not the bug): exactly 1 error, still answerable. */
export function findBugWrongAction(def: FindBugDef): readonly PickTileAction[] {
  const path = tilePaths(def.program).find((candidate) => !samePath(candidate, def.bug));
  if (path === undefined) {
    throw new Error(`find-bug "${def.id}": the program has no tile other than the bug`);
  }
  return [{ type: 'pick-tile', path }];
}
