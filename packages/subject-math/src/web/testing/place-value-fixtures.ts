// The App-flow and playground world of place-value exercises (`testing/place-value-samples.ts`): one lesson of hand-built exercises
// in the demo world's track, texts of its own on top of the real locale. Nothing here ships: the lesson is not in the content.
import type { BadgeDef, CompiledContent, TracksCatalog } from '@learn/platform-core';
import { createBundledContentSource } from '@learn/platform-web/adapters/content/bundled-content-source.ts';
import type { LoadedSubject, SubjectEntry, SubjectWeb } from '@learn/platform-web/app/subject.ts';
import en from '../../../dist/locales/en.json';
import type { MathLesson } from '../../core/types.ts';
import { mathEntry } from '../../entry.ts';
import { PLACE_VALUE_SAMPLES } from '../../testing/place-value-samples.ts';
import { mathWeb } from '../math-pack.ts';

const { hto, zero, thousands, start, nine } = PLACE_VALUE_SAMPLES;

/** The English `lessons` texts of the fixture: the lesson's own and every exercise's instruction and reason. */
export const PLACE_VALUE_TEXTS = {
  'pv-fx': {
    title: 'Blocks',
    story:
      'Owl shows you blocks. A one is a small cube, a ten is a rod, a hundred is a flat square.',
    demo: 'Three hundreds, no tens and five ones make three hundred and five.',
  },
  'pvfx-hto': 'Build 243 with the blocks.',
  'pvfx-zero': 'Build 305 with the blocks.',
  'pvfx-thousands': 'Build 4072 with the blocks.',
  'pvfx-start': 'Change the blocks to make 128.',
  'pvfx-nine': 'Build 3956 with the blocks.',
  'pvfx-bug-swap': 'Look at the order: hundreds, then tens, then ones.',
} as const;

/** Guided: no zero. Scored: a zero and its reason, 4 columns, a start to take blocks away from, a 9. */
export const fixtureLesson: MathLesson = {
  id: 'pv-fx',
  world: 'adding',
  order: 1,
  concept: 'pv-fx',
  character: 'hedgehog',
  titleKey: 'lessons:pv-fx.title',
  storyKey: 'lessons:pv-fx.story',
  demo: { textKey: 'lessons:pv-fx.demo', prompt: { big: '305' } },
  guided: [hto],
  exercises: [zero, thousands, start, nine],
};

const content: CompiledContent = { version: 1, lessons: [fixtureLesson], minigames: [] };

const tracks: TracksCatalog = {
  tracks: [
    {
      id: 'numbers',
      kind: 'main',
      titleKey: 'journey:tracks.numbers',
      worlds: [
        {
          id: 'adding',
          track: 'numbers',
          order: 1,
          habitat: 'meadow',
          titleKey: 'journey:worlds.adding',
        },
      ],
    },
  ],
  ranks: [
    { id: 'counter', after: 'start' },
    { id: 'adder', after: 'world:adding' },
  ],
};

/** The math pack over the fixture lesson: the real kinds, UIs, notes and texts. */
export const fixturePack: SubjectWeb = {
  ...mathWeb,
  createServices: () => ({
    ...mathWeb.createServices(),
    content: createBundledContentSource({ content, tracks, badges: [] as readonly BadgeDef[] }),
  }),
};

/** The built English locale with the fixture's `lessons` texts added. */
export const fixtureLocale = { ...en, lessons: { ...en.lessons, ...PLACE_VALUE_TEXTS } };

const fixtureLoaded: LoadedSubject = { pack: fixturePack, locales: { en: fixtureLocale } };

/** `mathEntry`'s manifest with the fixture pack: what the App-flow test activates. */
export const fixtureEntry: SubjectEntry = {
  manifest: mathEntry.manifest,
  load: () => Promise.resolve(fixtureLoaded),
};
