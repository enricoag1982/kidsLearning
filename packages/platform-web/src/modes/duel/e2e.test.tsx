// The duel e2e driver against the real step: `playDuel` over a Playwright-`Page` look-alike on the jsdom document (real timers,
// reduced motion so the bot's pause is 150 ms), and the driver's move choice on its own.
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { Page } from '@playwright/test';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { AppConfig, DuelGameDef, Random, TurnGame } from '@learn/platform-core';
import { takeAwayGame } from '@learn/platform-core/testing';
import type { TakeAwayMove, TakeAwayParams, TakeAwayState } from '@learn/platform-core/testing';
import { createAppServices } from '../../app/services.ts';
import type { Services } from '../../app/services.ts';
import { initI18n } from '../../i18n.ts';
import {
  cardFixture,
  cardLesson,
  cardLocales,
  createCardTestEntry,
} from '../../testing/card-test-entry.tsx';
import { createMemoryStorage } from '../../testing/memory-storage.ts';
import { stubMatchMedia } from '../../testing/mock-media-query.ts';
import { renderWithStore } from '../../testing/render-with-store.tsx';
import { BossStep } from '../BossStep.tsx';
import { chooseKidDuelMove, createDuelE2E, waitForDuelTurnOrEnd } from './e2e.ts';

const APP: Omit<AppConfig, 'version'> = {
  title: 'Cards app',
  storagePrefix: 'cards:',
  backupAppId: 'cards',
  backupFilePrefix: 'cards',
  parentCodeFilePrefix: 'cards-code',
};

const duelGame = cardFixture.content.minigames.find(
  (game): game is DuelGameDef => game.id === 'take-away',
);
if (duelGame === undefined) throw new Error('the card fixture has no duel mini-game');
const GAME: DuelGameDef = duelGame;
const GAMES: Readonly<Record<string, TurnGame>> = { [takeAwayGame.id]: takeAwayGame };
const driver = createDuelE2E(GAMES);

beforeAll(() => {
  initI18n(cardLocales as Parameters<typeof initI18n>[0]);
});

let restoreMotion: (() => void) | undefined;
afterEach(() => {
  restoreMotion?.();
  restoreMotion = undefined;
});

/** The slice of Playwright's `Page` the duel driver calls, answered from the jsdom document. */
function duelPage(): Page {
  const page = {
    locator: (selector: string) => ({
      getAttribute: (name: string) =>
        Promise.resolve(document.querySelector(selector)?.getAttribute(name) ?? null),
      click: async () => {
        const element = await waitFor(() => {
          const found = document.querySelector(selector);
          if (found === null) throw new Error(`no element for ${selector}`);
          return found;
        });
        fireEvent.click(element);
      },
    }),
    waitForFunction: (check: () => boolean, _arg: unknown, options?: { timeout?: number }) =>
      waitFor(
        () => {
          if (!check()) throw new Error('not yet');
        },
        { timeout: options?.timeout ?? 5000 },
      ),
  };
  return page as unknown as Page;
}

async function mountDuel(random: Random): Promise<void> {
  restoreMotion = stubMatchMedia('(prefers-reduced-motion: reduce)');
  const app = createAppServices([createCardTestEntry()], APP, createMemoryStorage());
  const active = await app.activate('cards');
  const services: Services = { ...active, deps: { ...active.deps, random } };
  await renderWithStore(<BossStep lesson={cardLesson} game={GAME} nextStepIndex={0} />, services);
}

const status = (): string | null =>
  document.querySelector('[data-duel-status]')?.getAttribute('data-duel-status') ?? null;
const earned = (): number =>
  screen.getByTestId('stars-row').querySelectorAll('.reward-star-pop').length;

describe('chooseKidDuelMove', () => {
  const at = (pile: number) => takeAwayGame.start({ pile }, 'kid');

  it('wins by a best move, whichever the position', () => {
    expect(chooseKidDuelMove(takeAwayGame, at(4))).toBe(1);
    expect(chooseKidDuelMove(takeAwayGame, at(5))).toBe(2);
    expect(chooseKidDuelMove(takeAwayGame, at(5), 'win')).toBe(2);
  });

  it('loses by the first move that is not a best one', () => {
    expect(chooseKidDuelMove(takeAwayGame, at(4), 'lose')).toBe(2);
    expect(chooseKidDuelMove(takeAwayGame, at(5), 'lose')).toBe(1);
  });

  it('plays any legal move when the position is lost anyway (win) or every move is best (lose)', () => {
    expect(chooseKidDuelMove(takeAwayGame, at(6))).toBe(1);
    expect(chooseKidDuelMove(takeAwayGame, at(3), 'lose')).toBe(1);
    const alwaysBest: TurnGame<TakeAwayParams, TakeAwayState, TakeAwayMove> = {
      ...takeAwayGame,
      bestMoves: (state) => takeAwayGame.moves(state),
    };
    expect(chooseKidDuelMove(alwaysBest, at(4), 'lose')).toBe(1);
  });

  it('throws when there is no legal move', () => {
    expect(() => chooseKidDuelMove(takeAwayGame, { pile: 0, turn: 'kid' })).toThrow(
      'no legal move',
    );
  });
});

describe('the duel e2e driver', () => {
  it('plays a duel to a win through the real UI: waits for each kid turn, reads the state, clicks the best move', async () => {
    await mountDuel({ next: () => 0.99 });
    await driver.play(duelPage(), GAME);
    expect(status()).toBe('won');
    await screen.findByRole('button', { name: /^Next/ });
    expect(earned()).toBe(3);
  });

  it('wins against a bot that errs, too (level 1, every draw a mistake)', async () => {
    await mountDuel({ next: () => 0 });
    await driver.play(duelPage(), GAME);
    expect(status()).toBe('won');
  });

  it('loses on purpose against a bot that plays its best', async () => {
    await mountDuel({ next: () => 0.99 });
    await driver.play(duelPage(), GAME, { outcome: 'lose' });
    expect(status()).toBe('lost');
    await screen.findByRole('button', { name: 'Play again' });
    expect(earned()).toBe(0);
  });

  it('waitForDuelTurnOrEnd returns on the kid turn and on the end, and when the step is gone', async () => {
    await mountDuel({ next: () => 0.99 });
    expect(status()).toBe('playing');
    await waitForDuelTurnOrEnd(duelPage());
    expect(document.querySelector('[data-duel-status]')?.getAttribute('data-duel-turn')).toBe(
      'kid',
    );
    document.body.innerHTML = '';
    await waitForDuelTurnOrEnd(duelPage());
  });
});
