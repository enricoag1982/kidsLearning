// The card kinds' e2e-driver registry: the only place exercise-type dispatch happens for their e2e. `Page` is type-only; this file
// (and each kind's `e2e.ts`) is never reachable from app code, only Playwright specs (eslint.config.js). A subject built on the
// card kit passes `CARD_KIND_E2E` on to its own e2e kit.
import type { Page } from '@playwright/test';
import type {
  CardAction,
  CardDefOf,
  CardExerciseDef,
  CardOutcome,
  CardState,
  CardType,
} from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { choiceE2E } from './choice/e2e.ts';
import { numberEntryE2E } from './number-entry/e2e.ts';
import { orderE2E } from './order/e2e.ts';
import { trueFalseE2E } from './true-false/e2e.ts';

/** One kind's e2e driver: reproduces a core `action` (already applied purely, `outcome` / `before` known) as taps / clicks on the page. */
export interface CardKindE2E<
  D extends CardExerciseDef = CardExerciseDef,
  A extends { readonly type: string } = CardAction,
  O = CardOutcome,
> {
  perform(
    page: Page,
    action: A,
    ctx: {
      readonly def: D;
      readonly before: CardState<D>;
      readonly outcome: O;
      readonly text: (key: string) => string;
    },
  ): Promise<void>;
}

export const CARD_KIND_E2E = {
  choice: choiceE2E,
  'true-false': trueFalseE2E,
  'number-entry': numberEntryE2E,
  order: orderE2E,
} satisfies { readonly [T in CardType]: CardKindE2E<CardDefOf<T>> };

/** `type`'s driver, widened: `perform` is a method, so its parameters widen (bivariance) with no cast. */
export function cardKindE2EOf(type: CardType): CardKindE2E {
  return CARD_KIND_E2E[type];
}
