// `@learn/subject-math`: math's core (defs, kinds, `SubjectCore`) on the card kit. Content and testing live behind `/content` and
// `/testing`.
export type * from './core/types.ts';
export { MATH_CHARACTERS, mathCore } from './core/math-core.ts';
export type { AnyMathKind, MathAction, MathHint, MathOutcome, MathState } from './kinds/index.ts';
export { MATH_KINDS, kindOf, startExercise } from './kinds/index.ts';
export { MATH_GAMES, race } from './core/games/index.ts';
export type { RaceMove, RaceParams, RaceState } from './core/games/index.ts';
