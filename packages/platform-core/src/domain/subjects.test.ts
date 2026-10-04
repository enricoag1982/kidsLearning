import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { SubjectSettingsSlot } from './subject.ts';
import { createSubjectRuntime } from './runtime.ts';
import {
  SUBJECT_ID_PATTERN,
  assertSubjectIds,
  composeSettingsSlots,
  defaultSubjectStoragePrefix,
  subjectStoragePrefix,
} from './subjects.ts';
import { testSubject } from '../testing/test-subject.ts';

function slot(overrides: Partial<SubjectSettingsSlot> = {}): SubjectSettingsSlot {
  return {
    defaults: {},
    isValid: () => true,
    loadBackupShape: () => Promise.resolve({}),
    ...overrides,
  };
}

describe('assertSubjectIds', () => {
  it('accepts lowercase ids with digits and dashes', () => {
    expect(() => {
      assertSubjectIds(['chess', 'math', 'logic-2']);
    }).not.toThrow();
  });

  it('throws on an empty list', () => {
    expect(() => {
      assertSubjectIds([]);
    }).toThrow(/at least one/);
  });

  it.each(['', 'Chess', '1math', 'a_b', 'a b', '-a', 'a:'])('throws on the id %j', (id) => {
    expect(SUBJECT_ID_PATTERN.test(id)).toBe(false);
    expect(() => {
      assertSubjectIds([id]);
    }).toThrow(/must match/);
  });

  it('throws on a duplicate id, naming it', () => {
    expect(() => {
      assertSubjectIds(['chess', 'math', 'chess']);
    }).toThrow(/duplicate subject id "chess"/);
  });
});

describe('defaultSubjectStoragePrefix', () => {
  it('turns the shared prefix into a sibling, never a nested one', () => {
    expect(defaultSubjectStoragePrefix('kids:', 'chess')).toBe('kids-chess:');
    expect(defaultSubjectStoragePrefix('kids-chess:', 'x').startsWith('kids:')).toBe(false);
    expect('kids-chess:'.startsWith('kids:')).toBe(false);
  });

  it('strips exactly one trailing colon and tolerates none', () => {
    expect(defaultSubjectStoragePrefix('kids::', 'math')).toBe('kids:-math:');
    expect(defaultSubjectStoragePrefix('kids', 'math')).toBe('kids-math:');
  });
});

describe('subjectStoragePrefix', () => {
  it('uses the app override when present', () => {
    const app = { storagePrefix: 'kids:', subjectStoragePrefix: (id: string) => `own-${id}/` };
    expect(subjectStoragePrefix(app, 'chess')).toBe('own-chess/');
  });

  it('falls back to the default when absent', () => {
    expect(subjectStoragePrefix({ storagePrefix: 'kids:' }, 'chess')).toBe('kids-chess:');
  });
});

describe('composeSettingsSlots', () => {
  it('returns a single slot as is', () => {
    const only = slot({ defaults: { a: 1 } });
    expect(composeSettingsSlots([only])).toBe(only);
  });

  it('throws on an empty list', () => {
    expect(() => composeSettingsSlots([])).toThrow(/at least one/);
  });

  it('merges defaults in list order', () => {
    const merged = composeSettingsSlots([
      slot({ defaults: { a: 1, b: 2 } }),
      slot({ defaults: { c: 3 } }),
    ]);
    expect(Object.entries(merged.defaults)).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
  });

  it('throws on a default key in two slots, naming both indexes and the key', () => {
    expect(() =>
      composeSettingsSlots([
        slot({ defaults: { a: 1 } }),
        slot({ defaults: { b: 1 } }),
        slot({ defaults: { a: 2 } }),
      ]),
    ).toThrow(/"a".*slots 0 and 2/);
  });

  it('unions retired (deduplicated) and omits it when no slot has one', () => {
    expect(composeSettingsSlots([slot(), slot()]).retired).toBeUndefined();
    const merged = composeSettingsSlots([
      slot({ retired: ['x', 'y'] }),
      slot(),
      slot({ retired: ['y', 'z'] }),
    ]);
    expect(merged.retired).toEqual(['x', 'y', 'z']);
  });

  it('merges legacyExport and omits it when no slot has one', () => {
    expect(composeSettingsSlots([slot(), slot()]).legacyExport).toBeUndefined();
    const merged = composeSettingsSlots([
      slot({ legacyExport: { p: 1 } }),
      slot(),
      slot({ legacyExport: { q: 2 } }),
    ]);
    expect(merged.legacyExport).toEqual({ p: 1, q: 2 });
  });

  it('isValid needs every slot to accept', () => {
    const yes = slot({ isValid: () => true });
    const no = slot({ isValid: () => false });
    expect(composeSettingsSlots([yes, yes]).isValid({})).toBe(true);
    expect(composeSettingsSlots([yes, no]).isValid({})).toBe(false);
    expect(composeSettingsSlots([no, yes]).isValid({})).toBe(false);
  });

  it('isValid passes the settings to each slot', () => {
    const merged = composeSettingsSlots([
      slot({ isValid: (s) => s.a === 1 }),
      slot({ isValid: (s) => s.b === 2 }),
    ]);
    expect(merged.isValid({ a: 1, b: 2 })).toBe(true);
    expect(merged.isValid({ a: 1, b: 3 })).toBe(false);
  });

  it('loadBackupShape merges every shape', async () => {
    const a = z.string();
    const b = z.number();
    const merged = composeSettingsSlots([
      slot({ loadBackupShape: () => Promise.resolve({ a }) }),
      slot({ loadBackupShape: () => Promise.resolve({ b }) }),
    ]);
    expect(await merged.loadBackupShape()).toEqual({ a, b });
  });

  it('loadBackupShape rejects on a duplicate key', async () => {
    const merged = composeSettingsSlots([
      slot({ loadBackupShape: () => Promise.resolve({ a: z.string() }) }),
      slot({ loadBackupShape: () => Promise.resolve({ a: z.number() }) }),
    ]);
    await expect(merged.loadBackupShape()).rejects.toThrow(/"a".*slots 0 and 1/);
  });
});

describe('createSubjectRuntime settings argument', () => {
  it('defaults to the core settings', () => {
    expect(createSubjectRuntime(testSubject).settings).toBe(testSubject.settings);
  });

  it('exposes a given slot instead', () => {
    const composed = slot({ defaults: { a: 1 } });
    expect(createSubjectRuntime(testSubject, composed).settings).toBe(composed);
  });
});
