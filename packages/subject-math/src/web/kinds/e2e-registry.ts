// Math's exercise-kind e2e-driver registry: the only place exercise-type dispatch happens for e2e. `Page` is type-only; this file
// (and each kind's `e2e.ts`) is never reachable from app code, only Playwright specs and tests (eslint.config.js). The card kit's
// four drivers come with the kit; math's own kinds (`number-line`, `place-value`, `array`) join here.
import type { Page } from '@playwright/test';
import { CARD_KIND_E2E } from '@learn/platform-web/kinds/cards/e2e-registry.ts';
import type { MathExerciseDef } from '../../core/types.ts';
import type { DefOf, ExerciseType, MathAction, MathOutcome, MathState } from '../../kinds/index.ts';
import { arrayE2E } from '../../kinds/array/e2e.ts';
import { numberLineE2E } from '../../kinds/number-line/e2e.ts';
import { placeValueE2E } from '../../kinds/place-value/e2e.ts';

/** One kind's e2e driver: reproduces a core `action` (already applied purely, `outcome` / `before` known) as taps and key presses on
 * the page. `text` gives the compiled English text of a key with its `{{vars}}` untouched. */
export interface MathKindE2E<
  D extends MathExerciseDef = MathExerciseDef,
  A extends { readonly type: string } = MathAction,
  O = MathOutcome,
> {
  perform(
    page: Page,
    action: A,
    ctx: {
      readonly def: D;
      readonly before: MathState;
      readonly outcome: O;
      readonly text: (key: string) => string;
    },
  ): Promise<void>;
}

export const MATH_KIND_E2E = {
  ...CARD_KIND_E2E,
  'number-line': numberLineE2E,
  'place-value': placeValueE2E,
  array: arrayE2E,
} satisfies { readonly [T in ExerciseType]: MathKindE2E<DefOf<T>> };

/** `type`'s driver, widened: `perform` is a method, so its parameters widen (bivariance) with no cast. */
export function mathKindE2EOf(type: ExerciseType): MathKindE2E {
  return MATH_KIND_E2E[type];
}
