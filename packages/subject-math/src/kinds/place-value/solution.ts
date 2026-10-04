import type { BuildAction, PlaceValueDef } from './def.ts';
import { MAX_COUNT, digitsOf } from './model.ts';

/** The build of the target's own digits. */
export function placeValueSolution(def: PlaceValueDef): readonly BuildAction[] {
  return [{ type: 'build', counts: digitsOf(def.target, def.columns) }];
}

/** A valid build that is not the target: the `swap` bug (tens and ones swapped, the classic 305 → 350) when the two differ, else one
 * more one (one fewer when the ones are 9): exactly 1 error, still answerable. */
export function placeValueWrongAction(def: PlaceValueDef): readonly BuildAction[] {
  const counts = [...digitsOf(def.target, def.columns)];
  const ones = counts.length - 1;
  const tens = ones - 1;
  const onesCount = counts[ones] ?? 0;
  const tensCount = counts[tens] ?? 0;
  if (tensCount === onesCount) {
    counts[ones] = onesCount === MAX_COUNT ? onesCount - 1 : onesCount + 1;
  } else {
    counts[tens] = onesCount;
    counts[ones] = tensCount;
  }
  return [{ type: 'build', counts }];
}
