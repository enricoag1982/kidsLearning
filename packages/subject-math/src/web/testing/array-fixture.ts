// A lesson of `array` exercises, for the App-flow test and the `/#math` playground: no shipped lesson uses the kind yet (World 3 does,
// m13.14). The exercises are the kind's samples; the lesson, its world and its texts are added here. Never imported by app code.
import type { TracksCatalog } from '@learn/platform-core';
import type { MathLesson } from '../../core/types.ts';
import { ARRAY_SAMPLES, ARRAY_SAMPLE_TEXTS } from '../../kinds/array/samples.ts';

const { guided, fixed, free, full, single, withReason } = ARRAY_SAMPLES;

/** One guided try and five scored exercises, taught by Hedgie. */
export const ARRAY_LESSON: MathLesson = {
  id: 'dot-arrays',
  world: 'arrays',
  order: 1,
  concept: 'array',
  character: 'hedgehog',
  titleKey: 'lessons:dot-arrays.title',
  storyKey: 'lessons:dot-arrays.story',
  demo: { textKey: 'lessons:dot-arrays.demo' },
  guided: [guided],
  exercises: [fixed, free, full, single, withReason],
};

/** The lesson's own world and the ranks the Home header needs. */
export const ARRAY_CATALOG: TracksCatalog = {
  tracks: [
    {
      id: 'times',
      kind: 'main',
      titleKey: 'journey:tracks.times',
      worlds: [
        {
          id: 'arrays',
          track: 'times',
          order: 1,
          habitat: 'forest',
          titleKey: 'journey:worlds.arrays',
        },
      ],
    },
  ],
  ranks: [
    { id: 'counter', after: 'start' },
    { id: 'adder', after: 'world:arrays' },
  ],
};

/** The fixture's English by namespace, to merge into the math bundle: the lesson's texts and the samples' instructions (`lessons`),
 * its world and track names (`journey`). */
export const ARRAY_TEXTS = {
  lessons: {
    ...ARRAY_SAMPLE_TEXTS,
    'dot-arrays': {
      title: 'Dot arrays',
      story: 'Dots in rows make an array. Rows go across. Make each one.',
      demo: 'This array has 3 rows of 4 dots.',
    },
  },
  journey: {
    tracks: { times: 'Times' },
    worlds: { arrays: 'Arrays' },
  },
} as const;
