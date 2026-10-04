// A kind UI reads its own hint payload out of the session's `HintBase`.
import type { HintBase } from '@learn/platform-core/domain/subject';
import type { FindBugHint, PredictHint, ProgramHint } from '../core/types.ts';

export function programHint(hint: HintBase | null): ProgramHint | null {
  return hint?.kind === 'program' ? (hint as ProgramHint) : null;
}

export function predictHint(hint: HintBase | null): PredictHint | null {
  return hint?.kind === 'predict' ? (hint as PredictHint) : null;
}

export function findBugHint(hint: HintBase | null): FindBugHint | null {
  return hint?.kind === 'find-bug' ? (hint as FindBugHint) : null;
}
