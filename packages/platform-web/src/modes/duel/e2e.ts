// The duel mode's e2e driver: plays a duel boss to its end through the real UI, choosing every kid move from the game's own
// `bestMoves` (or a deliberate non-best one, to lose). Reachable only from Playwright specs (eslint.config.js): a subject's e2e
// registry passes it its `TurnGame`s, e.g. `modes: { duel: createDuelE2E(games) }`.
import type { Page } from '@playwright/test';
import type { DuelGameDef, TurnGame } from '@learn/platform-core';

export interface DuelPlayOptions {
  /** `win` (default) plays a best move every turn, which beats a bot that errs and any bot that is losing; `lose` plays a non-best
   * move every turn, so a perfect bot (level 3) that is winning takes the game. */
  readonly outcome?: 'win' | 'lose';
}

const STEP_SELECTOR = '[data-duel-status]';
const STATE_SELECTOR = '[data-duel-state]';

/** A CSS attribute selector for a move button: `data-move` holds the move's JSON. */
function moveSelector(move: unknown): string {
  const json = JSON.stringify(move).replaceAll('\\', '\\\\').replaceAll("'", "\\'");
  return `[data-move='${json}']`;
}

/** Blocks until the duel shows the kid's turn, or the game is over (also when the step is gone: a result tap moved on). */
export async function waitForDuelTurnOrEnd(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const step = document.querySelector('[data-duel-status]');
      if (step === null) return true;
      const status = step.getAttribute('data-duel-status');
      const turn = step.getAttribute('data-duel-turn');
      return status !== 'playing' || turn === 'kid';
    },
    undefined,
    { timeout: 15000 },
  );
}

function gameOf(game: Pick<DuelGameDef, 'game'>, games: Readonly<Record<string, TurnGame>>) {
  const turnGame = games[game.game];
  if (turnGame === undefined) throw new Error(`duel e2e: no TurnGame "${game.game}"`);
  return turnGame;
}

/** The move the driver plays for the current state: a best move to win (any legal move when the kid is already lost), else the
 * first legal move that is not a best one (any, when every move is best). */
export function chooseKidDuelMove(
  turnGame: TurnGame,
  state: unknown,
  outcome: 'win' | 'lose' = 'win',
): unknown {
  const legal = turnGame.moves(state);
  const best = turnGame.bestMoves(state);
  const worst = legal.find((move) => !best.some((good) => turnGame.sameMove(good, move)));
  const chosen = outcome === 'win' ? (best[0] ?? legal[0]) : (worst ?? legal[0]);
  if (chosen === undefined) throw new Error('duel e2e: the kid has no legal move');
  return chosen;
}

/** Plays exactly one kid move (the a11y walk's mid-game scan needs this on its own; `playDuel` loops it). Assumes the kid's turn. */
export async function playOneKidDuelMove(
  page: Page,
  game: Pick<DuelGameDef, 'game'>,
  games: Readonly<Record<string, TurnGame>>,
  options: DuelPlayOptions = {},
): Promise<void> {
  const turnGame = gameOf(game, games);
  const raw = await page.locator(STATE_SELECTOR).getAttribute('data-duel-state');
  if (raw === null) throw new Error('duel e2e: the board exposes no data-duel-state');
  const move = chooseKidDuelMove(turnGame, JSON.parse(raw) as unknown, options.outcome);
  await page.locator(moveSelector(move)).click();
}

/** Plays a duel boss to its end against the real bot, leaving the page on the result panel (before its own "Next" tap). */
export async function playDuel(
  page: Page,
  game: Pick<DuelGameDef, 'game'>,
  games: Readonly<Record<string, TurnGame>>,
  options: DuelPlayOptions = {},
): Promise<void> {
  for (;;) {
    await waitForDuelTurnOrEnd(page);
    const status = await page.locator(STEP_SELECTOR).getAttribute('data-duel-status');
    if (status !== 'playing') return;
    await playOneKidDuelMove(page, game, games, options);
  }
}

/** A subject's duel e2e driver over its `TurnGame`s. */
export function createDuelE2E(games: Readonly<Record<string, TurnGame>>): {
  play(page: Page, game: Pick<DuelGameDef, 'game'>, options?: DuelPlayOptions): Promise<void>;
} {
  return {
    play: (page, game, options) => playDuel(page, game, games, options),
  };
}
