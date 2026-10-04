import { useCallback, useReducer } from 'react';
import type { Tile, TileKind } from '../../core/tiles.ts';
import type { ProgramDef } from '../../core/types.ts';
import { draftProgram, initialDraft, reduceDraft } from './program-draft.ts';
import type { DraftOp, ProgramDraft } from './program-draft.ts';

export interface ProgramDraftApi extends ProgramDraft {
  /** The tile `kind` goes into the open repeat's body if it has room, else into the first empty slot (a full strip: nothing). */
  add(kind: TileKind): void;
  /** `[top]` empties a slot (a repeat goes with its body), `[top, body]` takes one tile out of a repeat; a locked slot stays. */
  remove(path: readonly number[]): void;
  /** The repeat's count: 3, 4 … 9, then 2 again. */
  cycleTimes(index: number): void;
  /** Opens the repeat at `index` to receive tapped tiles, or closes it when it is the open one. */
  toggleRepeat(index: number): void;
  /** Back to the prefilled strip. */
  reset(): void;
  /** Replaces the strip with `tiles` (hint 3). */
  load(tiles: readonly Tile[]): void;
  /** The tiles of the strip without the empty slots: what Run sends. */
  program(): Tile[];
}

/** The strip of `def` as UI state: `reduceDraft` behind a hook, one function per edit. */
export function useProgramDraft(def: ProgramDef): ProgramDraftApi {
  const [draft, dispatch] = useReducer(
    (current: ProgramDraft, op: DraftOp) => reduceDraft(def, current, op),
    def,
    initialDraft,
  );
  const add = useCallback((kind: TileKind) => {
    dispatch({ type: 'add', kind });
  }, []);
  const remove = useCallback((path: readonly number[]) => {
    dispatch({ type: 'remove', path });
  }, []);
  const cycleTimes = useCallback((index: number) => {
    dispatch({ type: 'cycle-times', index });
  }, []);
  const toggleRepeat = useCallback((index: number) => {
    dispatch({ type: 'toggle-repeat', index });
  }, []);
  const reset = useCallback(() => {
    dispatch({ type: 'reset' });
  }, []);
  const load = useCallback((tiles: readonly Tile[]) => {
    dispatch({ type: 'load', tiles });
  }, []);
  return {
    ...draft,
    add,
    remove,
    cycleTimes,
    toggleRepeat,
    reset,
    load,
    program: () => draftProgram(draft),
  };
}
