// The UI tests' fixture world: one lesson and one boss of hand-built exercises that cover what the kind UIs and e2e drivers have to
// handle (a locked-slot gap, a repeat, a star on the way, a bug), whatever the shipped content is. Texts are the real locale's
// (`lessons:ask-*`), so the tests read the English the app shows. The ids start with `fx-`.
import type { BadgeDef, CompiledContent, TracksCatalog } from '@learn/platform-core';
import { createBundledContentSource } from '@learn/platform-web/adapters/content/bundled-content-source.ts';
import type { LoadedSubject, SubjectEntry, SubjectWeb } from '@learn/platform-web/app/subject.ts';
import en from '../../../dist/locales/en.json';
import type { CodingLesson, CodingSeries } from '../../content/all-exercises.ts';
import { parseLevel } from '../../core/level.ts';
import { run } from '../../core/simulator.ts';
import type { PrimitiveKind, Tile } from '../../core/tiles.ts';
import type { CodingExerciseDef, FindBugDef, PredictDef, ProgramDef } from '../../core/types.ts';
import { codingEntry } from '../../entry.ts';
import { codingWeb } from '../coding-pack.ts';

const tiles = (...kinds: readonly PrimitiveKind[]): Tile[] => kinds.map((kind): Tile => ({ kind }));
const repeat = (times: number, ...body: readonly PrimitiveKind[]): Tile => ({
  kind: 'repeat',
  times,
  body: tiles(...body),
});

const ARROWS = ['up', 'down', 'left', 'right'] as const;
const CONCEPT = 'seq-arrows';

/** `S . . * / . # . . / . . . F`: the sample board of most fixtures. */
const STAR_MAP = ['S..*', '.#..', '...F'];

const base = (id: string, textKey: string) => ({
  id,
  concept: CONCEPT,
  textKey: `lessons:${textKey}`,
});

function program(
  id: string,
  textKey: string,
  map: readonly string[],
  rest: Omit<ProgramDef, 'id' | 'concept' | 'textKey' | 'type' | 'level'>,
): ProgramDef {
  return { ...base(id, textKey), type: 'program', level: parseLevel(map), ...rest };
}

function predictDef(id: string, map: readonly string[], list: readonly Tile[]): PredictDef {
  const level = parseLevel(map);
  return {
    ...base(id, 'ask-predict'),
    type: 'predict',
    level,
    program: list,
    answer: run(level, list).final.cell,
  };
}

function findBugDef(
  id: string,
  map: readonly string[],
  list: readonly Tile[],
  bug: readonly number[],
  fix: Tile,
): FindBugDef {
  return {
    ...base(id, 'ask-bug'),
    type: 'find-bug',
    level: parseLevel(map),
    program: list,
    bug,
    fix,
  };
}

/** Guided: a one-row program with a 2-tile tray and a predict. */
const guidedProgram = program('fx-g1', 'ask-reach-guided', ['S.F'], {
  tray: ['left', 'right'],
  cap: 2,
  solution: tiles('right', 'right'),
});
const guidedPredict = predictDef('fx-g2', ['S..', '.#.', '..F'], tiles('right', 'right', 'down'));

/** Scored: S . . / . . F with a right + down tray, cap 3. */
const reach = program('fx-01', 'ask-reach', ['S..', '..F'], {
  tray: ['right', 'down'],
  cap: 3,
  solution: tiles('right', 'right', 'down'),
});
/** A star on the way: the longer route is the one that picks it up. */
const star = program('fx-02', 'ask-star', STAR_MAP, {
  tray: ARROWS,
  cap: 6,
  solution: tiles('right', 'right', 'right', 'down', 'down'),
});
/** Slots 1 and 4 are locked (right, down); the rock row blocks the middle. */
const gap = program('fx-03', 'ask-reach', ['S..', '##.', '..F'], {
  tray: ARROWS,
  cap: 4,
  solution: tiles('right', 'right', 'down', 'down'),
  prefilled: [{ kind: 'right' }, null, null, { kind: 'down' }],
  locked: [0, 3],
});
const predictLong = predictDef('fx-04', STAR_MAP, tiles('down', 'down', 'right', 'right', 'up'));
/** `right, right, right, up, down`: the 4th tile walks off the grid. */
const bug = findBugDef('fx-05', STAR_MAP, tiles('right', 'right', 'right', 'up', 'down'), [3], {
  kind: 'down',
});

/** The boss's rounds: a bug in the last tile, and a corridor only a repeat fits in 3 tiles. */
const roundBug = findBugDef(
  'fx-r1',
  STAR_MAP,
  tiles('right', 'right', 'right', 'down', 'left'),
  [4],
  { kind: 'down' },
);
const roundLoop = program('fx-r2', 'ask-reach', ['S....F'], {
  tray: ['right', 'repeat'],
  cap: 3,
  solution: [repeat(5, 'right')],
  mustLoop: true,
});

export const fixtureLesson: CodingLesson = {
  id: 'seq-arrows',
  world: 'meadow-steps',
  order: 1,
  concept: CONCEPT,
  character: 'fox',
  titleKey: 'lessons:seq-arrows.title',
  storyKey: 'lessons:seq-arrows.story',
  demo: { textKey: 'lessons:seq-arrows.demo', prompt: { big: '→ → ↓' } },
  guided: [guidedProgram, guidedPredict],
  exercises: [reach, star, gap, predictLong, bug],
};

const bossRounds: readonly CodingExerciseDef[] = [roundBug, roundLoop];

/** Every fixture exercise, in lesson order: guided tries, scored exercises, then the boss rounds. */
export const fixtureExercises: readonly CodingExerciseDef[] = [
  ...fixtureLesson.guided,
  ...fixtureLesson.exercises,
  ...bossRounds,
];

export function fixtureExercise<T extends CodingExerciseDef['type']>(
  id: string,
  type: T,
): Extract<CodingExerciseDef, { readonly type: T }> {
  const def = fixtureExercises.find((candidate) => candidate.id === id);
  if (def === undefined || def.type !== type) {
    throw new Error(`the coding fixture has no ${type} exercise "${id}"`);
  }
  return def as Extract<CodingExerciseDef, { readonly type: T }>;
}

const fixtureBoss: CodingSeries = {
  mode: 'series',
  id: 'fx-boss',
  concept: CONCEPT,
  titleKey: 'lessons:bug-squash.title',
  goalKey: 'lessons:bug-squash.goal',
  unlockAfter: fixtureLesson.id,
  rounds: bossRounds,
  errors3: 0,
  errors2: 2,
};

const content: CompiledContent = {
  version: 1,
  lessons: [fixtureLesson],
  minigames: [fixtureBoss],
};

const tracks: TracksCatalog = {
  tracks: [
    {
      id: 'basics',
      kind: 'main',
      titleKey: 'journey:tracks.basics',
      worlds: [
        {
          id: 'meadow-steps',
          track: 'basics',
          order: 1,
          habitat: 'meadow',
          titleKey: 'journey:worlds.meadow-steps',
        },
      ],
    },
  ],
  ranks: [
    { id: 'starter', after: 'start' },
    { id: 'stepper', after: 'world:meadow-steps' },
  ],
};

/** The coding pack over the fixture world: the real kinds, UIs, notes and texts, one lesson of hand-built exercises. */
export const fixturePack: SubjectWeb = {
  ...codingWeb,
  createServices: () => ({
    ...codingWeb.createServices(),
    content: createBundledContentSource({ content, tracks, badges: [] as readonly BadgeDef[] }),
  }),
};

const fixtureLoaded: LoadedSubject = { pack: fixturePack, locales: { en } };

/** `codingEntry`'s manifest with the fixture pack: what the app-flow test activates. */
export const fixtureEntry: SubjectEntry = {
  manifest: codingEntry.manifest,
  load: () => Promise.resolve(fixtureLoaded),
};
