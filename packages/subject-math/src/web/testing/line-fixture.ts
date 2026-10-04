// A lesson of `number-line` exercises, for the App-flow test and the `/#math` playground: no shipped lesson uses the kind yet (World 1
// does, m13.10). The exercises are the kind's samples; the lesson, its world and its texts are added here. Never imported by app code.
import type { TracksCatalog } from '@learn/platform-core';
import type { MathLesson } from '../../core/types.ts';
import { NUMBER_LINE_SAMPLES, NUMBER_LINE_SAMPLE_TEXTS } from '../../kinds/number-line/samples.ts';

const { guided, exact100, exact10, exact50, estimate, labelList, withReason } = NUMBER_LINE_SAMPLES;

/** One guided try and six scored exercises, taught by Hedgie. */
export const LINE_LESSON: MathLesson = {
  id: 'line-up',
  world: 'lines',
  order: 1,
  concept: 'number-line',
  character: 'hedgehog',
  titleKey: 'lessons:line-up.title',
  storyKey: 'lessons:line-up.story',
  demo: { textKey: 'lessons:line-up.demo' },
  guided: [guided],
  exercises: [exact100, exact10, exact50, estimate, labelList, withReason],
};

/** The lesson's own world and the ranks the Home header needs. */
export const LINE_CATALOG: TracksCatalog = {
  tracks: [
    {
      id: 'numbers',
      kind: 'main',
      titleKey: 'journey:tracks.numbers',
      worlds: [
        {
          id: 'lines',
          track: 'numbers',
          order: 1,
          habitat: 'meadow',
          titleKey: 'journey:worlds.lines',
        },
      ],
    },
  ],
  ranks: [
    { id: 'counter', after: 'start' },
    { id: 'adder', after: 'world:lines' },
  ],
};

/** The fixture's English by namespace, to merge into the math bundle: the lesson's texts and the samples' instructions (`lessons`),
 * its world and track names (`journey`). */
export const LINE_TEXTS = {
  lessons: {
    ...NUMBER_LINE_SAMPLE_TEXTS,
    'line-up': {
      title: 'The number line',
      story: 'Marks on a line are numbers in order. Find where each one goes.',
      demo: 'The marker sits on 300, the third mark after 0.',
    },
  },
  journey: {
    tracks: { numbers: 'Numbers' },
    worlds: { lines: 'Lines' },
  },
} as const;
