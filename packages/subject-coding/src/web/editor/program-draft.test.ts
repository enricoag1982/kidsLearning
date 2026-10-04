import { describe, expect, it } from 'vitest';
import type { Tile } from '../../core/tiles.ts';
import type { ProgramDef } from '../../core/types.ts';
import { CODING_SAMPLES } from '../../testing/samples.ts';
import { draftProgram, initialDraft, reduceDraft } from './program-draft.ts';
import type { DraftOp, ProgramDraft } from './program-draft.ts';

const base: ProgramDef = CODING_SAMPLES.program;
const right: Tile = { kind: 'right' };
const down: Tile = { kind: 'down' };
const repeat = (times: number, ...body: Tile[]): Tile => ({ kind: 'repeat', times, body });

/** Folds `ops` over the initial draft of `def`. */
function fold(def: ProgramDef, ...ops: DraftOp[]): ProgramDraft {
  return ops.reduce((draft, op) => reduceDraft(def, draft, op), initialDraft(def));
}
const add = (kind: Tile['kind']): DraftOp => ({ type: 'add', kind });

describe('initialDraft', () => {
  it('is an empty strip of cap slots with no repeat open', () => {
    expect(initialDraft({ ...base, cap: 4 })).toEqual({
      slots: [null, null, null, null],
      openRepeat: null,
    });
  });

  it('starts from the prefilled slots, padded with empty ones up to the cap', () => {
    const def: ProgramDef = { ...base, cap: 4, prefilled: [right, null, down] };
    expect(initialDraft(def).slots).toEqual([right, null, down, null]);
  });
});

describe('add', () => {
  it('fills the first empty slot, in order', () => {
    const draft = fold({ ...base, cap: 3 }, add('right'), add('down'));
    expect(draft.slots).toEqual([right, down, null]);
  });

  it('skips prefilled slots', () => {
    const def: ProgramDef = { ...base, cap: 3, prefilled: [right, null, down] };
    expect(fold(def, add('up')).slots).toEqual([right, { kind: 'up' }, down]);
  });

  it('does nothing on a full strip (the very same draft)', () => {
    const full = fold({ ...base, cap: 2 }, add('right'), add('down'));
    expect(reduceDraft({ ...base, cap: 2 }, full, add('up'))).toBe(full);
  });

  it('adds a repeat with 3 times and an empty body, and opens it', () => {
    const draft = fold(base, add('right'), add('repeat'));
    expect(draft.slots[1]).toEqual(repeat(3));
    expect(draft.openRepeat).toBe(1);
  });

  it('puts tiles into the open repeat until its body is full (4), then into the strip', () => {
    const def: ProgramDef = { ...base, cap: 6 };
    const draft = fold(def, add('repeat'), ...Array.from({ length: 5 }, () => add('right')));
    expect(draft.slots[0]).toEqual(repeat(3, right, right, right, right));
    expect(draft.slots[1]).toEqual(right);
    expect(draftProgram(draft)).toHaveLength(2);
  });

  it('a second repeat is not nested: it takes the next free slot and becomes the open one', () => {
    const draft = fold(base, add('repeat'), add('right'), add('repeat'), add('down'));
    expect(draft.slots[0]).toEqual(repeat(3, right));
    expect(draft.slots[1]).toEqual(repeat(3, down));
    expect(draft.openRepeat).toBe(1);
  });

  it('with the repeat closed, tiles go to the strip', () => {
    const draft = fold(
      base,
      add('repeat'),
      add('right'),
      { type: 'toggle-repeat', index: 0 },
      add('down'),
    );
    expect(draft.slots.slice(0, 2)).toEqual([repeat(3, right), down]);
    expect(draft.openRepeat).toBeNull();
  });

  it('a locked repeat takes no tiles: they go to the strip', () => {
    const def: ProgramDef = {
      ...base,
      cap: 3,
      prefilled: [repeat(2, right), null, null],
      locked: [0],
    };
    const opened: ProgramDraft = { ...initialDraft(def), openRepeat: 0 };
    const draft = reduceDraft(def, opened, add('down'));
    expect(draft.slots).toEqual([repeat(2, right), down, null]);
  });
});

describe('remove', () => {
  it('empties a top-level slot and keeps the others where they are', () => {
    const draft = fold({ ...base, cap: 3 }, add('right'), add('down'), add('up'), {
      type: 'remove',
      path: [1],
    });
    expect(draft.slots).toEqual([right, null, { kind: 'up' }]);
    expect(draftProgram(draft)).toEqual([right, { kind: 'up' }]);
  });

  it('a removed slot is the first empty one again', () => {
    const draft = fold(
      { ...base, cap: 3 },
      add('right'),
      add('down'),
      { type: 'remove', path: [0] },
      add('up'),
    );
    expect(draft.slots).toEqual([{ kind: 'up' }, down, null]);
  });

  it('takes a repeat out with its body, and closes it when it was the open one', () => {
    const draft = fold(base, add('repeat'), add('right'), { type: 'remove', path: [0] });
    expect(draft.slots[0]).toBeNull();
    expect(draft.openRepeat).toBeNull();
  });

  it('takes one tile out of a repeat body', () => {
    const draft = fold(base, add('repeat'), add('right'), add('down'), {
      type: 'remove',
      path: [0, 0],
    });
    expect(draft.slots[0]).toEqual(repeat(3, down));
  });

  it('does nothing on an empty slot, a missing body tile or a missing slot', () => {
    const draft = fold(base, add('right'));
    for (const path of [[1], [0, 0], [9], []]) {
      expect(reduceDraft(base, draft, { type: 'remove', path })).toBe(draft);
    }
  });

  it('does not remove a locked slot (nor a tile inside a locked repeat)', () => {
    const def: ProgramDef = {
      ...base,
      cap: 3,
      prefilled: [right, null, repeat(2, down)],
      locked: [0, 2],
    };
    const draft = initialDraft(def);
    expect(reduceDraft(def, draft, { type: 'remove', path: [0] })).toBe(draft);
    expect(reduceDraft(def, draft, { type: 'remove', path: [2] })).toBe(draft);
    expect(reduceDraft(def, draft, { type: 'remove', path: [2, 0] })).toBe(draft);
  });

  it('removes an unlocked prefilled tile', () => {
    const def: ProgramDef = { ...base, cap: 2, prefilled: [right, down], locked: [0] };
    const draft = reduceDraft(def, initialDraft(def), { type: 'remove', path: [1] });
    expect(draft.slots).toEqual([right, null]);
  });
});

describe('cycleTimes', () => {
  const times = (draft: ProgramDraft): number | undefined => {
    const slot = draft.slots[0];
    return slot?.kind === 'repeat' ? slot.times : undefined;
  };

  it('goes 3, 4 … 9, then back to 2, then 3 again', () => {
    const cycle: DraftOp = { type: 'cycle-times', index: 0 };
    let draft = fold(base, add('repeat'));
    const seen = [times(draft)];
    for (let tap = 0; tap < 8; tap += 1) {
      draft = reduceDraft(base, draft, cycle);
      seen.push(times(draft));
    }
    expect(seen).toEqual([3, 4, 5, 6, 7, 8, 9, 2, 3]);
  });

  it('keeps the body and does nothing on a non-repeat, an empty slot or a locked repeat', () => {
    const withBody = fold(base, add('repeat'), add('right'), { type: 'cycle-times', index: 0 });
    expect(withBody.slots[0]).toEqual(repeat(4, right));
    const plain = fold(base, add('right'));
    expect(reduceDraft(base, plain, { type: 'cycle-times', index: 0 })).toBe(plain);
    expect(reduceDraft(base, plain, { type: 'cycle-times', index: 3 })).toBe(plain);
    const def: ProgramDef = { ...base, cap: 2, prefilled: [repeat(2, right)], locked: [0] };
    const locked = initialDraft(def);
    expect(reduceDraft(def, locked, { type: 'cycle-times', index: 0 })).toBe(locked);
  });
});

describe('toggleRepeat', () => {
  it('opens a repeat, and closes it when tapped again', () => {
    const closed = fold(base, add('repeat'), { type: 'toggle-repeat', index: 0 });
    expect(closed.openRepeat).toBeNull();
    const reopened = reduceDraft(base, closed, { type: 'toggle-repeat', index: 0 });
    expect(reopened.openRepeat).toBe(0);
  });

  it('opening one repeat closes the other', () => {
    const draft = fold(base, add('repeat'), add('repeat'), { type: 'toggle-repeat', index: 0 });
    expect(draft.openRepeat).toBe(0);
  });

  it('does nothing on a non-repeat slot or a locked repeat', () => {
    const plain = fold(base, add('right'));
    expect(reduceDraft(base, plain, { type: 'toggle-repeat', index: 0 })).toBe(plain);
    const def: ProgramDef = { ...base, cap: 2, prefilled: [repeat(2, right)], locked: [0] };
    const locked = initialDraft(def);
    expect(reduceDraft(def, locked, { type: 'toggle-repeat', index: 0 })).toBe(locked);
  });
});

describe('reset and load', () => {
  it('reset goes back to the prefilled strip, locked slots included, and closes the repeat', () => {
    const def: ProgramDef = { ...base, cap: 3, prefilled: [right, null, null], locked: [0] };
    const edited = fold(def, add('repeat'), add('down'), { type: 'remove', path: [1, 0] });
    expect(reduceDraft(def, edited, { type: 'reset' })).toEqual(initialDraft(def));
  });

  it('load puts the tiles in the first slots and clears the rest', () => {
    const def: ProgramDef = { ...base, cap: 4, prefilled: [right, null, null, down] };
    const draft = reduceDraft(def, initialDraft(def), {
      type: 'load',
      tiles: [right, repeat(2, down)],
    });
    expect(draft.slots).toEqual([right, repeat(2, down), null, null]);
    expect(draft.openRepeat).toBeNull();
  });
});

describe('draftProgram', () => {
  it('lists the tiles without the empty slots', () => {
    const draft = fold({ ...base, cap: 4 }, add('right'), add('down'), add('up'), {
      type: 'remove',
      path: [1],
    });
    expect(draftProgram(draft)).toEqual([right, { kind: 'up' }]);
  });

  it('is empty for an empty strip', () => {
    expect(draftProgram(initialDraft(base))).toEqual([]);
  });
});
