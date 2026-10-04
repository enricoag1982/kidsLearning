import type { CodingKindDef, CodingKindState } from './types.ts';

/** A fresh state; every coding kind's `init`. */
export function initCodingState<D extends CodingKindDef>(def: D): CodingKindState<D> {
  return { def, moves: 0, solved: false, errors: 0, hintLevel: 0 };
}
