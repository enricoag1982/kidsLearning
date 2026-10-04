// Logic's exercise-kind e2e-driver registry: the only place exercise-type dispatch happens for e2e. `Page` is type-only; this file
// (and each kind's `e2e.ts`) is never reachable from app code, only Playwright specs and tests (eslint.config.js). The card kit's
// four drivers come with the kit; logic's own kinds (`group`, `grid-fill`) join here.
import type { Page } from '@playwright/test';
import { CARD_KIND_E2E } from '@learn/platform-web/kinds/cards/e2e-registry.ts';
import type { LogicExerciseDef } from '../../core/types.ts';
import type {
  DefOf,
  ExerciseType,
  LogicAction,
  LogicOutcome,
  LogicState,
} from '../../kinds/index.ts';

/** One kind's e2e driver: reproduces a core `action` (already applied purely, `outcome` / `before` known) as taps and key presses on
 * the page. `text` gives the compiled English text of a key with its `{{vars}}` untouched. */
export interface LogicKindE2E<
  D extends LogicExerciseDef = LogicExerciseDef,
  A extends { readonly type: string } = LogicAction,
  O = LogicOutcome,
> {
  perform(
    page: Page,
    action: A,
    ctx: {
      readonly def: D;
      readonly before: LogicState;
      readonly outcome: O;
      readonly text: (key: string) => string;
    },
  ): Promise<void>;
}

export const LOGIC_KIND_E2E = {
  ...CARD_KIND_E2E,
} satisfies { readonly [T in ExerciseType]: LogicKindE2E<DefOf<T>> };

/** `type`'s driver, widened: `perform` is a method, so its parameters widen (bivariance) with no cast. */
export function logicKindE2EOf(type: ExerciseType): LogicKindE2E {
  return LOGIC_KIND_E2E[type];
}
