// The bug models: each wrong answer of the curriculum's §3 table, pinned by hand-worked examples.
import { describe, expect, it } from 'vitest';
import {
  appendPlaces,
  BUG_IDS,
  bugRef,
  digitTensPartner,
  doubleTensOnly,
  dropZero,
  floorTo,
  forgotAdjust,
  halveTensOnly,
  nearestTo,
  onesFirstSign,
  roundDownBug,
  swapHundredsTens,
  swapTensOnes,
  valueOf,
  W1_BUG_IDS,
  W2_BUG_IDS,
  wrongOperation,
  wrongPlace,
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

  it('lists the W1 and the W2 bugs once each', () => {
    expect(W1_BUG_IDS).toHaveLength(7);
    expect(W2_BUG_IDS).toHaveLength(9);
    expect(new Set(BUG_IDS).size).toBe(BUG_IDS.length);
    expect(BUG_IDS).toHaveLength(W1_BUG_IDS.length + W2_BUG_IDS.length);
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

describe('W2 bug models', () => {
  it('digit-tens takes each digit to 10 (64 → 46, not 36); it needs a tens digit and a ones digit, neither 0', () => {
    expect(digitTensPartner(64)).toBe(46);
    expect(digitTensPartner(11)).toBe(99);
    expect(digitTensPartner(99)).toBe(11);
    expect(digitTensPartner(38)).toBe(72);
    expect(digitTensPartner(50)).toBeNull();
    expect(digitTensPartner(5)).toBeNull();
    expect(digitTensPartner(100)).toBeNull();
  });

  it('tens-only doubles the tens and keeps the ones (34 → 64, not 68); halve-tens-only halves the tens and keeps the ones (74 → 39, not 37)', () => {
    expect(doubleTensOnly(34)).toBe(64);
    expect(doubleTensOnly(30)).toBe(60);
    expect(doubleTensOnly(47)).toBe(87);
    expect(doubleTensOnly(7)).toBe(7);
    expect(halveTensOnly(74)).toBe(39);
    expect(halveTensOnly(68)).toBe(38);
    expect(halveTensOnly(40)).toBe(20);
    expect(halveTensOnly(100)).toBe(50);
  });

  it('wrong-place changes the place below the one that should change', () => {
    expect(wrongPlace(347, 10, '+')).toBe(348);
    expect(wrongPlace(347, 100, '+')).toBe(357);
    expect(wrongPlace(347, 10, '-')).toBe(346);
    expect(wrongPlace(347, 100, '-')).toBe(337);
  });

  it('forgot-adjust uses the round number and never puts the 1 back', () => {
    expect(forgotAdjust(46, 99, '+')).toBe(146);
    expect(forgotAdjust(146, 99, '-')).toBe(46);
    expect(forgotAdjust(46, 9, '+')).toBe(56);
    expect(forgotAdjust(46, 9, '-')).toBe(36);
  });

  it('wrong-op takes the larger from the smaller in an addition story and adds in a subtraction story', () => {
    expect(wrongOperation(9, 5, true)).toBe(4);
    expect(wrongOperation(5, 9, true)).toBe(4);
    expect(wrongOperation(17, 12, false)).toBe(29);
  });
});
