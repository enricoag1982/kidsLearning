// The program the child is building: the strip's slots and which repeat block is taking taps. Pure reducer (the hook is
// `use-program-draft.ts`); `ProgramDef` rules (cap, tray, locked slots) are the engine's, this only edits.
import { MAX_REPEAT, MAX_REPEAT_BODY, MIN_REPEAT } from '../../core/tiles.ts';
import type { Tile, TileKind } from '../../core/tiles.ts';
import type { ProgramDef } from '../../core/types.ts';

export interface ProgramDraft {
  /** `def.cap` top-level slots; `null` = empty. */
  readonly slots: readonly (Tile | null)[];
  /** The repeat (top-level index) whose body receives the next tapped tile; set when a repeat is added or its block tapped. */
  readonly openRepeat: number | null;
}

export type DraftOp =
  | { readonly type: 'add'; readonly kind: TileKind }
  | { readonly type: 'remove'; readonly path: readonly number[] }
  | { readonly type: 'cycle-times'; readonly index: number }
  | { readonly type: 'toggle-repeat'; readonly index: number }
  | { readonly type: 'reset' }
  | { readonly type: 'load'; readonly tiles: readonly Tile[] };

/** A new repeat runs its (empty) body this many times until the child taps its count. */
export const DEFAULT_TIMES = 3;

/** The strip as an exercise starts: `prefilled` (padded with empty slots up to the cap), else all empty. */
export function initialDraft(def: ProgramDef): ProgramDraft {
  const slots = Array.from({ length: def.cap }, (_unused, index) => def.prefilled?.[index] ?? null);
  return { slots, openRepeat: null };
}

/** The tiles of the strip, in order, without the empty slots. */
export function draftProgram(draft: ProgramDraft): Tile[] {
  return draft.slots.filter((slot): slot is Tile => slot !== null);
}

/** Top-level index of the first empty slot, or `-1` when the strip is full. */
function firstEmpty(draft: ProgramDraft): number {
  return draft.slots.findIndex((slot) => slot === null);
}

function withSlot(draft: ProgramDraft, index: number, tile: Tile | null): readonly (Tile | null)[] {
  return draft.slots.map((slot, at) => (at === index ? tile : slot));
}

function isLocked(def: ProgramDef, index: number): boolean {
  return def.locked?.includes(index) === true;
}

function add(def: ProgramDef, draft: ProgramDraft, kind: TileKind): ProgramDraft {
  const open = draft.openRepeat === null ? undefined : draft.slots[draft.openRepeat];
  if (
    kind !== 'repeat' &&
    draft.openRepeat !== null &&
    open?.kind === 'repeat' &&
    !isLocked(def, draft.openRepeat) &&
    open.body.length < MAX_REPEAT_BODY
  ) {
    const body = [...open.body, { kind }];
    return { ...draft, slots: withSlot(draft, draft.openRepeat, { ...open, body }) };
  }
  const index = firstEmpty(draft);
  if (index < 0) {
    return draft;
  }
  if (kind === 'repeat') {
    const tile: Tile = { kind: 'repeat', times: DEFAULT_TIMES, body: [] };
    return { slots: withSlot(draft, index, tile), openRepeat: index };
  }
  return { ...draft, slots: withSlot(draft, index, { kind }) };
}

function remove(def: ProgramDef, draft: ProgramDraft, path: readonly number[]): ProgramDraft {
  const [top, inner] = path;
  const tile = top === undefined ? undefined : draft.slots[top];
  if (top === undefined || !tile || isLocked(def, top)) {
    return draft;
  }
  if (inner === undefined) {
    return {
      slots: withSlot(draft, top, null),
      openRepeat: draft.openRepeat === top ? null : draft.openRepeat,
    };
  }
  if (tile.kind !== 'repeat' || inner >= tile.body.length) {
    return draft;
  }
  const body = tile.body.filter((_unused, at) => at !== inner);
  return { ...draft, slots: withSlot(draft, top, { ...tile, body }) };
}

function cycleTimes(def: ProgramDef, draft: ProgramDraft, index: number): ProgramDraft {
  const tile = draft.slots[index];
  if (tile?.kind !== 'repeat' || isLocked(def, index)) {
    return draft;
  }
  const times = tile.times >= MAX_REPEAT ? MIN_REPEAT : tile.times + 1;
  return { ...draft, slots: withSlot(draft, index, { ...tile, times }) };
}

function toggleRepeat(def: ProgramDef, draft: ProgramDraft, index: number): ProgramDraft {
  const tile = draft.slots[index];
  if (tile?.kind !== 'repeat' || isLocked(def, index)) {
    return draft;
  }
  return { ...draft, openRepeat: draft.openRepeat === index ? null : index };
}

/** Puts `tiles` in the first slots (hint 3 fills the strip with the solution) and clears the rest, locked slots included: the
 * solution holds their own tiles. */
function load(def: ProgramDef, tiles: readonly Tile[]): ProgramDraft {
  const slots = Array.from({ length: def.cap }, (_unused, index) => tiles[index] ?? null);
  return { slots, openRepeat: null };
}

/** One edit of the strip. A tap that cannot do anything (a full strip, a locked slot, an empty slot) returns `draft` itself. */
export function reduceDraft(def: ProgramDef, draft: ProgramDraft, op: DraftOp): ProgramDraft {
  switch (op.type) {
    case 'add':
      return add(def, draft, op.kind);
    case 'remove':
      return remove(def, draft, op.path);
    case 'cycle-times':
      return cycleTimes(def, draft, op.index);
    case 'toggle-repeat':
      return toggleRepeat(def, draft, op.index);
    case 'reset':
      return initialDraft(def);
    case 'load':
      return load(def, op.tiles);
  }
}
