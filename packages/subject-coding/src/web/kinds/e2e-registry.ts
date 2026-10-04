// The coding kinds' e2e-driver registry: the only place exercise-type dispatch happens for their e2e. `Page` is type-only; this file
// (and each kind's `e2e.ts`) is never reachable from app code, only Playwright specs and tests (eslint.config.js). The card kit's
// four drivers come with the kit.
import type { Page } from '@playwright/test';
import { CARD_KIND_E2E } from '@learn/platform-web/kinds/cards/e2e-registry.ts';
import type { CodingExerciseDef } from '../../core/types.ts';
import { findBugE2E } from '../../kinds/find-bug/e2e.ts';
import type {
  CodingAction,
  CodingOutcome,
  CodingState,
  DefOf,
  ExerciseType,
} from '../../kinds/index.ts';
import { predictE2E } from '../../kinds/predict/e2e.ts';
import { programE2E } from '../../kinds/program/e2e.ts';

/** One kind's e2e driver: reproduces a core `action` (already applied purely, `outcome` / `before` known) as taps on the page.
 * `text` gives the compiled English text of a key with its `{{vars}}` untouched (`e2e-names.ts` fills them). */
export interface CodingKindE2E<
  D extends CodingExerciseDef = CodingExerciseDef,
  A extends { readonly type: string } = CodingAction,
  O = CodingOutcome,
> {
  perform(
    page: Page,
    action: A,
    ctx: {
      readonly def: D;
      readonly before: CodingState;
      readonly outcome: O;
      readonly text: (key: string) => string;
    },
  ): Promise<void>;
}

export const CODING_KIND_E2E = {
  ...CARD_KIND_E2E,
  program: programE2E,
  predict: predictE2E,
  'find-bug': findBugE2E,
} satisfies { readonly [T in ExerciseType]: CodingKindE2E<DefOf<T>> };

/** `type`'s driver, widened: `perform` is a method, so its parameters widen (bivariance) with no cast. */
export function codingKindE2EOf(type: ExerciseType): CodingKindE2E {
  return CODING_KIND_E2E[type];
}
