import type { NumberLineDef, PlaceAction } from './def.ts';

export function numberLineSolution(def: NumberLineDef): readonly PlaceAction[] {
  return [{ type: 'place', value: def.target }];
}

/** One tick right of the target (one left of it when that is past the end): exactly 1 error, still answerable. Further from the
 * target than a whole interval, so an estimate's tolerance (half an interval) never accepts it. */
export function numberLineWrongAction(def: NumberLineDef): readonly PlaceAction[] {
  const right = def.target + def.step;
  return [{ type: 'place', value: right <= def.to ? right : def.target - def.step }];
}
