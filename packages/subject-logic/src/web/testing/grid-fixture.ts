// A lesson of `grid-fill` exercises, for the App-flow tests and the `/#logic` playground (World 3, m14.11, has its own). The exercises
// are the kind's samples (each sudoku focus, a 6 x 6, two pictures); the lesson and its texts are added
// here, in Pattern Pond, the one world logic has. Never imported by app code.
import type { TracksCatalog } from '@learn/platform-core';
import type { GridFillDef } from '../../kinds/grid-fill/def.ts';
import type { LogicLesson } from '../../core/types.ts';
import { GRID_FILL_SAMPLES } from '../../kinds/grid-fill/samples.ts';

const { lastCell, hiddenSingle, nakedSingle, all, six, castle, cat } = GRID_FILL_SAMPLES;

/** A guided try: the last-cell sample with one cell to fill (the first step of its solution). */
export const GRID_GUIDED: GridFillDef = { ...lastCell, id: 'fx-grid-guided', targets: [6] };

/** One guided try and seven scored exercises, taught by Pip. */
export const GRID_LESSON: LogicLesson = {
  id: 'fx-grid',
  world: 'pattern-pond',
  order: 1,
  concept: 'grid-fill',
  character: 'panda',
  titleKey: 'lessons:fx-grid.title',
  storyKey: 'lessons:fx-grid.story',
  demo: { textKey: 'lessons:fx-grid.demo' },
  guided: [GRID_GUIDED],
  exercises: [lastCell, hiddenSingle, nakedSingle, all, six, castle, cat],
};

/** The lesson's own world (the real Pattern Pond, with its real names) and the one rank the Home header needs. */
export const GRID_CATALOG: TracksCatalog = {
  tracks: [
    {
      id: 'puzzles',
      kind: 'main',
      titleKey: 'journey:tracks.puzzles',
      worlds: [
        {
          id: 'pattern-pond',
          track: 'puzzles',
          order: 1,
          habitat: 'river',
          titleKey: 'journey:worlds.pattern-pond',
        },
      ],
    },
  ],
  ranks: [{ id: 'thinker', after: 'start' }],
};

/** The fixture's English by namespace, to merge into the logic bundle: the lesson's texts (`lessons`). The samples' instructions are
 * the kind's own (`common`: `grid.instruction.*`). */
export const GRID_TEXTS = {
  lessons: {
    'fx-grid': {
      title: 'Grid puzzles',
      story: 'Pip likes grids. Every row, column and box holds each number once.',
      demo: 'This row has 1, 2 and 3. Only 4 is missing.',
    },
  },
} as const;
