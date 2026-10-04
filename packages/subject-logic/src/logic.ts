// `@learn/subject-logic`: logic's core (defs, kinds, `SubjectCore`) on the card kit. Content and testing live behind `/content` and
// `/testing`.
export type * from './core/types.ts';
export { LOGIC_CHARACTERS, logicCore } from './core/logic-core.ts';
export type {
  AnyLogicKind,
  LogicAction,
  LogicHint,
  LogicOutcome,
  LogicState,
} from './kinds/index.ts';
export { LOGIC_KINDS, kindOf, startExercise } from './kinds/index.ts';
