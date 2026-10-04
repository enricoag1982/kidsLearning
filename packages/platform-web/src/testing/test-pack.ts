import { createElement } from 'react';
import type { SubjectSettingsSlot } from '@learn/platform-core';
import { makeContentSource, testSubject } from '@learn/platform-core/testing';
import type { SubjectWeb } from '../app/subject.ts';

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
