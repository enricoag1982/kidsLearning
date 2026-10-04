// `@learn/subject-coding`: the coding core (tiles, levels, simulator, solver, defs, kinds, `SubjectCore`). Content and testing
// live behind `/content` and `/testing`.
export type * from './core/types.ts';
export { CODING_CHARACTERS, codingCore } from './core/coding-core.ts';
export type { Level } from './core/level.ts';
export { parseLevel } from './core/level.ts';
export type { RunResult, RunState, StepEvent, StepResult } from './core/simulator.ts';
export { run } from './core/simulator.ts';
export { shortestStraightLength, solvableWithoutRepeat } from './core/solver.ts';
export type { PrimitiveKind, Tile, TileKind } from './core/tiles.ts';
export {
  MAX_REPEAT,
  MAX_REPEAT_BODY,
  MIN_REPEAT,
  PRIMITIVE_KINDS,
  isValidProgram,
  replaceTile,
  samePath,
  sameTile,
  tileAt,
  tileCount,
  tilePaths,
} from './core/tiles.ts';
export type {
  AnyCodingKind,
  CodingAction,
  CodingHint,
  CodingOutcome,
  CodingState,
  ExerciseType,
} from './kinds/index.ts';
export { CODING_KINDS, kindOf, startExercise } from './kinds/index.ts';
export type { PickTileAction, FindBugOutcome } from './kinds/find-bug/kind.ts';
export type { PickCellAction, PredictOutcome } from './kinds/predict/kind.ts';
export type { ProgramAction, ProgramOutcome } from './kinds/program/kind.ts';
export { programProblem } from './kinds/program/kind.ts';
