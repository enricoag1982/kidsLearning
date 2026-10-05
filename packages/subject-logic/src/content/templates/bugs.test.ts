// The bug ids and their reason texts (curriculum §3 "Reasons"): the sentence is spoken alone when the wrong answer matches.
import { describe, expect, it } from 'vitest';
import { BUG_IDS, bugRef } from './bugs.ts';
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

  it('words the four reasons as the curriculum does', () => {
    expect(bugs).toEqual({
      'unit-break': 'Say the pattern from the start. Which part repeats?',
      'first-jump': 'Check every jump, not just the first one.',
      'grow-off': 'Look how many more there are each time.',
      'far-off': 'Count in whole parts, not one by one.',
    });
  });

  it('refs are bugs.<id>', () => {
    expect(BUG_IDS).toEqual(['unit-break', 'first-jump', 'grow-off', 'far-off']);
    expect(bugRef('unit-break')).toBe('bugs.unit-break');
    expect(bugRef('far-off')).toBe('bugs.far-off');
  });
});
