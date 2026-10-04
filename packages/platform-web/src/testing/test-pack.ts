import { createElement } from 'react';
import type { ContentSource, SubjectSettingsSlot } from '@learn/platform-core';
import { makeContentSource, makeLesson, testSubject } from '@learn/platform-core/testing';
import type { LoadedSubject, SubjectEntry, SubjectWeb } from '../app/subject.ts';

/** A one-lesson content (`<id>-lesson`, in the only world `<id>-world`) with a catalog, so a Journey loads: two test packs with
 * `createTestContent` differ in what they offer. */
export function createTestContent(id: string): ContentSource {
  return makeContentSource({
    lessons: [makeLesson({ id: `${id}-lesson`, world: `${id}-world` })],
    catalog: {
      tracks: [
        {
          id: `${id}-track`,
          kind: 'main',
          titleKey: `${id}-track`,
          worlds: [
            {
              id: `${id}-world`,
              track: `${id}-track`,
              order: 1,
              habitat: 'meadow',
              titleKey: `${id}-world`,
            },
          ],
        },
      ],
      ranks: [{ id: 'pawn', after: 'start' }],
    },
  });
}

/** A minimal `SubjectWeb` over platform-core's `testSubject` with core id `id`: no kinds / routes, stub surface; `content` defaults
 * to an empty one (no catalog, no Journey: {@link createTestContent} has one).
 * Its settings slot has one own field (`<id>-level`), so several test packs never collide; pass `settings` to override. */
export function createTestPack(
  id: string,
  settings: SubjectSettingsSlot = {
    defaults: { [`${id}-level`]: 1 },
    isValid: () => true,
    loadBackupShape: () => Promise.resolve({}),
  },
  content: ContentSource = makeContentSource(),
): SubjectWeb {
  const stub = (): ReturnType<typeof createElement> => createElement('div');
  return {
    core: { ...testSubject, id, settings },
    createServices: () => ({ content, subject: {} }),
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
