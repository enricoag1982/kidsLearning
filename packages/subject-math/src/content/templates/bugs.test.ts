// The bug models: each wrong answer of the curriculum's §3 table, pinned by hand-worked examples.
import { describe, expect, it } from 'vitest';
import {
  appendPlaces,
  BUG_IDS,
  bugRef,
  dropZero,
  floorTo,
  nearestTo,
  onesFirstSign,
  roundDownBug,
  swapHundredsTens,
  swapTensOnes,
  valueOf,
} from './bugs.ts';
import { AUTHORED_LOCALES } from './testing.ts';

describe('bug texts', () => {
  const bugs = AUTHORED_LOCALES.en?.lessons?.bugs;

  it('has one kid-sized sentence (at most 14 words) for every bug id, and no other', () => {
    expect(typeof bugs === 'object' ? Object.keys(bugs).sort() : bugs).toEqual([...BUG_IDS].sort());
    for (const id of BUG_IDS) {
      const text = typeof bugs === 'object' ? bugs[id] : undefined;
      expect(typeof text, id).toBe('string');
      expect((typeof text === 'string' ? text : '').split(/\s+/).length, id).toBeLessThanOrEqual(
        14,
      );
    }
  });

  it('refs are bugs.<id>', () => {
    expect(bugRef('swap')).toBe('bugs.swap');
    expect(bugRef('ticks-not-gaps')).toBe('bugs.ticks-not-gaps');
  });
});

describe('bug models', () => {
  it('swap exchanges the tens and the ones (205 → 250), or the hundreds and the tens', () => {
    expect(swapTensOnes([2, 0, 5])).toBe(250);
    expect(swapTensOnes([3, 4, 0, 5])).toBe(3450);
    expect(swapTensOnes([4, 6, 6])).toBe(466);
    expect(swapHundredsTens([2, 0, 5])).toBe(25);
    expect(swapHundredsTens([1, 2, 0, 5])).toBe(1025);
    expect(() => swapHundredsTens([5, 6])).toThrow(RangeError);
  });

  it('append writes the place values one after another without the zero place (2 H 0 T 5 O → 2005)', () => {
    expect(appendPlaces([2, 0, 5])).toBe(2005);
    expect(appendPlaces([2, 3, 0])).toBe(20030);
    expect(appendPlaces([1, 2, 0, 5])).toBe(10002005);
    expect(appendPlaces([2, 3, 5])).toBeNull();
  });

  it('drop-zero joins the digits without the zero (3000 + 400 + 5 → 345)', () => {
    expect(dropZero([3, 4, 0, 5])).toBe(345);
    expect(dropZero([3, 4, 5, 0])).toBe(345);
    expect(valueOf([3, 4, 0, 5])).toBe(3405);
  });

  it('ones-first compares from the ones place up and stops at the first difference', () => {
    expect(onesFirstSign(406, 460)).toBe('>');
    expect(onesFirstSign(460, 406)).toBe('<');
    expect(onesFirstSign(417, 427)).toBe('<');
    expect(onesFirstSign(3406, 3416)).toBe('<');
    expect(onesFirstSign(305, 305)).toBe('=');
    expect(onesFirstSign(95, 105)).toBe('>');
  });

  it('rounding: nearest goes up at exactly half-way; the round-down bug is truncate, or five-down at half-way', () => {
    expect(floorTo(47, 10)).toBe(40);
    expect(nearestTo(47, 10)).toBe(50);
    expect(nearestTo(44, 10)).toBe(40);
    expect(nearestTo(45, 10)).toBe(50);
    expect(nearestTo(250, 100)).toBe(300);
    expect(nearestTo(9960, 100)).toBe(10000);
    expect(roundDownBug(47, 10)).toBe('truncate');
    expect(roundDownBug(45, 10)).toBe('five-down');
    expect(roundDownBug(350, 100)).toBe('five-down');
    expect(roundDownBug(367, 100)).toBe('truncate');
  });
});
