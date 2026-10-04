import { createElement } from 'react';
import type { SubjectSettingsSlot } from '@learn/platform-core';
import { makeContentSource, testSubject } from '@learn/platform-core/testing';
import type { LoadedSubject, SubjectEntry, SubjectWeb } from '../app/subject.ts';

/** A minimal `SubjectWeb` over platform-core's `testSubject` with core id `id`: empty content, no kinds / routes, stub surface.
 * Its settings slot has one own field (`<id>-level`), so several test packs never collide; pass `settings` to override. */
export function createTestPack(
  id: string,
  settings: SubjectSettingsSlot = {
    defaults: { [`${id}-level`]: 1 },
    isValid: () => true,
    loadBackupShape: () => Promise.resolve({}),
  },
): SubjectWeb {
  const stub = (): ReturnType<typeof createElement> => createElement('div');
  return {
    core: { ...testSubject, id, settings },
    createServices: () => ({ content: makeContentSource(), subject: {} }),
    kinds: {},
    modes: {},
    surface: { Story: stub, Demo: stub, View: stub },
    art: {},
    den: { rankGlyph: () => '?' },
    routes: {},
  };
}

/** `pack` as the app shell registers it: manifest from the pack's core id and settings (names `{ en: <names.en or the id> }`, no icon,
 * neutral colours), `load()` resolving to the pack with `locales`. Pass `load` to observe or delay loading. */
export function createTestEntry(
  pack: SubjectWeb,
  options: {
    readonly names?: Readonly<Record<string, string>>;
    readonly locales?: LoadedSubject['locales'];
    readonly load?: () => Promise<LoadedSubject>;
  } = {},
): SubjectEntry {
  const { names = { en: pack.core.id }, locales = {}, load } = options;
  return {
    manifest: {
      id: pack.core.id,
      settings: pack.core.settings,
      names,
      icon: '',
      colors: { bg: '#F1E9D8', fg: '#4B3A63', ledge: '#352945' },
    },
    load: load ?? (() => Promise.resolve({ pack, locales })),
  };
}
