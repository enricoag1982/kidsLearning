// Math's exercise-kind e2e-driver registry: the only place exercise-type dispatch happens for e2e. `Page` is type-only; this file
// (and each kind's `e2e.ts`) is never reachable from app code, only Playwright specs and tests (eslint.config.js). The card kit's
// four drivers come with the kit; math's own kinds (m13.6-m13.8) join here.
import { CARD_KIND_E2E } from '@learn/platform-web/kinds/cards/e2e-registry.ts';
import type { CardKindE2E } from '@learn/platform-web/kinds/cards/e2e-registry.ts';
import type { DefOf, ExerciseType } from '../../kinds/index.ts';

export const MATH_KIND_E2E = {
  ...CARD_KIND_E2E,
} satisfies { readonly [T in ExerciseType]: CardKindE2E<DefOf<T>> };

/** `type`'s driver, widened: `perform` is a method, so its parameters widen (bivariance) with no cast. */
export function mathKindE2EOf(type: ExerciseType): CardKindE2E {
  return MATH_KIND_E2E[type];
}
