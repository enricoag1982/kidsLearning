// The mini-game-mode e2e-driver registry: the only place mode dispatch happens for e2e. `Page` is type-only; this file is never
// reachable from app code, only Playwright specs (eslint.config.js).
import type { Page } from '@playwright/test';
import { createDuelE2E } from '@learn/platform-web/modes/duel/e2e.ts';
import { MATH_GAMES } from '../../core/games/index.ts';
import type { MathExerciseDef, MathMiniGame } from '../../core/types.ts';

export type ModeType = MathMiniGame['mode'];
export type GameOf<M extends ModeType> = Extract<MathMiniGame, { readonly mode: M }>;

const duelDriver = createDuelE2E(MATH_GAMES);

/** One mini-game mode's e2e driver: plays `game` to its end (result panel showing, before its own "Next" tap). */
export interface ModeE2E<M extends ModeType> {
  play(
    page: Page,
    game: GameOf<M>,
    ctx: {
      readonly text: (key: string) => string;
      /** Solves one exercise definition's core interaction (one `series` round): the kit's `solveExercise`, passed in so a
       * mode's driver never imports the kit. */
      solve(page: Page, def: MathExerciseDef): Promise<void>;
    },
  ): Promise<void>;
}

export const MINI_GAME_MODE_E2E = {
  /** A `duel` plays through the platform's driver over math's games: a best move every kid turn, which wins against the bot. */
  duel: {
    play: (page, game) => duelDriver.play(page, game),
  },
  /** A `series` boss plays like a normal exercise, round by round, tapping Next between them. */
  series: {
    async play(page, game, ctx) {
      for (const round of game.rounds) {
        await ctx.solve(page, round);
        await page.getByRole('button', { name: /^Next/ }).click();
      }
    },
  },
} satisfies { readonly [M in ModeType]: ModeE2E<M> };

export function modeE2EOf(mode: ModeType): ModeE2E<ModeType> {
  return MINI_GAME_MODE_E2E[mode];
}
