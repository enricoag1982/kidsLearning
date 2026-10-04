// One valid def of each coding kind, for tests (the card kit's own are `CARD_SAMPLES` in `@learn/platform-core/testing`). All three
// use the same board: the animal at the top left, a star at the top right, the flag at the bottom right, a rock in the middle.
//
//   S . . *
//   . # . .
//   . . . F
import { parseLevel } from '../core/level.ts';
import type { Tile } from '../core/tiles.ts';
import type { FindBugDef, PredictDef, ProgramDef } from '../core/types.ts';

const level = parseLevel(['S..*', '.#..', '...F']);

const tiles = (...kinds: readonly Tile['kind'][]): Tile[] =>
  kinds.map((kind) => ({ kind }) as Tile);

const program: ProgramDef = {
  id: 'cp1',
  concept: 'arrows',
  textKey: 'lessons:cp1',
  type: 'program',
  level,
  tray: ['up', 'down', 'left', 'right'],
  cap: 6,
  solution: tiles('right', 'right', 'right', 'down', 'down'),
};

const predict: PredictDef = {
  id: 'cw1',
  concept: 'arrows',
  textKey: 'lessons:cw1',
  type: 'predict',
  level,
  program: tiles('right', 'right', 'right', 'down', 'down', 'left'),
  answer: { x: 2, y: 2 },
};

const findBug: FindBugDef = {
  id: 'cb1',
  concept: 'arrows',
  textKey: 'lessons:cb1',
  type: 'find-bug',
  level,
  program: tiles('right', 'right', 'left', 'down', 'down'),
  bug: [2],
  fix: { kind: 'right' },
};

export const CODING_SAMPLES = { program, predict, 'find-bug': findBug } as const;
