// The `duel` boss step over the card fixture subject (its take-away game and board): turn banner, the bot's pause, Hint, the result
// panel with stars and "Play again". The fixture mini-game: pile 6, the bot opens (it is losing there), bot level 1.
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig, DuelGameDef, Random } from '@learn/platform-core';
import { createAppServices } from '../../app/services.ts';
import type { AppStore } from '../../app/store.ts';
import type { Services } from '../../app/services.ts';
import { initI18n } from '../../i18n.ts';
import {
  cardFixture,
  cardLesson,
  cardLocales,
  createCardTestEntry,
} from '../../testing/card-test-entry.tsx';
import { createFakeNarrator } from '../../testing/fake-narrator.ts';
import type { FakeNarrator } from '../../testing/fake-narrator.ts';
import { createMemoryStorage } from '../../testing/memory-storage.ts';
import { stubMatchMedia } from '../../testing/mock-media-query.ts';
import { renderWithStore } from '../../testing/render-with-store.tsx';
import { MiniGameSessionScreen } from '../../ui/MiniGameSessionScreen.tsx';
import { BossStep } from '../BossStep.tsx';

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

beforeAll(() => {
  initI18n(cardLocales as Parameters<typeof initI18n>[0]);
});

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

/** Always answers `value`: 0.99 = the bot never errs (and, when losing, takes 2); 0 = it always errs (and takes 1). */
const constant = (value: number): Random => ({ next: () => value });

interface Mounted {
  readonly store: AppStore;
  readonly services: Services;
  readonly narrator: FakeNarrator;
  readonly profileId: string;
}

async function mount(
  options: {
    readonly random?: Random;
    readonly game?: DuelGameDef;
    /** Play it from the Play screen's standalone session instead of as a lesson boss. */
    readonly standalone?: boolean;
  } = {},
): Promise<Mounted> {
  const { random = constant(0.99), game = GAME, standalone = false } = options;
  const app = createAppServices([createCardTestEntry()], APP, createMemoryStorage());
  const active = await app.activate('cards');
  const narrator = createFakeNarrator();
  const services: Services = {
    ...active,
    narrator,
    deps: { ...active.deps, random },
  };
  const { store } = await renderWithStore(
    standalone ? (
      <MiniGameSessionScreen />
    ) : (
      <BossStep lesson={cardLesson} game={game} nextStepIndex={0} />
    ),
    services,
  );
  if (standalone) {
    await act(async () => {
      store.getState().startMiniGame(game.id);
      await vi.advanceTimersByTimeAsync(0);
    });
  }
  const profile = store.getState().profile;
  if (profile === null) throw new Error('no profile selected');
  return { store, services, narrator, profileId: profile.id };
}

/** Lets the bot's pause (and the saves behind the result panel) run. */
async function wait(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

const BOT_PAUSE = 900;
const pile = (): string | null =>
  screen.getByRole('img', { name: /stones$/ }).getAttribute('aria-label');
const banner = (): string | null => screen.getByTestId('duel-turn').textContent;
const take = (count: 1 | 2): HTMLElement =>
  screen.getByRole('button', { name: `Take ${String(count)}` });
const step = (): Element => {
  const root = document.querySelector('[data-duel-status]');
  if (root === null) throw new Error('no duel step on screen');
  return root;
};
const earned = (): number =>
  screen.getByTestId('stars-row').querySelectorAll('.reward-star-pop').length;

function click(count: 1 | 2): void {
  fireEvent.click(take(count));
}

/** Pile 6, the bot opens by taking 2: 4 left and the kid's turn. */
async function kidTurnAtFour(): Promise<Mounted> {
  const mounted = await mount();
  await wait(BOT_PAUSE);
  expect(pile()).toBe('4 stones');
  return mounted;
}

describe('the duel step', () => {
  it('shows the game title once, as the step heading: as a lesson boss and played from the Play screen (no second copy in the top bar)', async () => {
    await mount();
    expect(screen.getAllByText('Take Away')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Take Away', level: 2 })).toBeTruthy();
    cleanup();
    await mount({ standalone: true });
    expect(screen.getAllByText('Take Away')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Take Away', level: 2 })).toBeTruthy();
    // The top bar keeps its close button.
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });

  it("hands the board the bot's name as the banner shows it", async () => {
    await mount();
    expect(banner()).toBe("Fox's turn");
    expect(document.querySelector('[data-bot]')?.getAttribute('data-bot')).toBe('Fox');
  });

  it("shows the bot's turn first, and the bot moves after its pause, not before", async () => {
    await mount();
    expect(banner()).toBe("Fox's turn");
    expect(step().getAttribute('data-duel-turn')).toBe('bot');
    expect(step().getAttribute('data-duel-status')).toBe('playing');
    expect(document.querySelector('[data-duel-state]')?.getAttribute('data-duel-state')).toBe(
      JSON.stringify({ pile: 6, turn: 'bot' }),
    );
    expect(pile()).toBe('6 stones');
    expect(take(1).hasAttribute('disabled')).toBe(true);
    expect(take(2).hasAttribute('disabled')).toBe(true);

    await wait(BOT_PAUSE - 1);
    expect(pile()).toBe('6 stones');
    await wait(1);

    expect(pile()).toBe('4 stones');
    expect(banner()).toBe('Your turn');
    expect(step().getAttribute('data-duel-turn')).toBe('kid');
    expect(screen.getByTestId('last-move').textContent).toBe('bot took 2');
    expect(take(1).hasAttribute('disabled')).toBe(false);
    expect(take(2).hasAttribute('disabled')).toBe(false);
  });

  it('moves the bot after 150 ms with reduced motion, never instantly', async () => {
    const restore = stubMatchMedia('(prefers-reduced-motion: reduce)');
    try {
      await mount();
      await wait(149);
      expect(pile()).toBe('6 stones');
      await wait(1);
      expect(pile()).toBe('4 stones');
    } finally {
      restore();
    }
  });

  it('plays the kid move at once, then hands the turn to the bot, who answers after its pause', async () => {
    await kidTurnAtFour();
    click(1);
    expect(pile()).toBe('3 stones');
    expect(banner()).toBe("Fox's turn");
    expect(take(1).hasAttribute('disabled')).toBe(true);
    expect(screen.getByTestId('last-move').textContent).toBe('kid took 1');

    await wait(BOT_PAUSE);
    expect(pile()).toBe('1 stones'); // 3 is lost for the bot: it takes 2
    expect(banner()).toBe('Your turn');
    // Only the legal moves are open: one stone is left.
    expect(take(1).hasAttribute('disabled')).toBe(false);
    expect(take(2).hasAttribute('disabled')).toBe(true);
  });

  it('plays the bot by the draw of services.deps.random: under the mistake rate it errs, over it it plays the best move', async () => {
    // Pile 7, the kid opens with 2: 5 left, a won position for the bot (best: take 2 → 3).
    const sevenKidFirst: DuelGameDef = { ...GAME, first: 'kid', params: { pile: 7 } };
    await mount({ random: constant(0.99), game: sevenKidFirst });
    click(2);
    await wait(BOT_PAUSE);
    expect(pile()).toBe('3 stones');
    cleanup();

    await mount({ random: constant(0), game: sevenKidFirst });
    click(2);
    await wait(BOT_PAUSE);
    expect(pile()).toBe('4 stones'); // a mistake: a random legal move, here the first (take 1)
  });

  it('Hint shows the best move on the board and speaks the game text, and the next move clears it', async () => {
    const { narrator } = await kidTurnAtFour();
    expect(take(1).getAttribute('data-hint')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    expect(take(1).getAttribute('data-hint')).toBe('true'); // 4 → leave 3
    expect(take(2).getAttribute('data-hint')).toBeNull();
    expect(screen.getByText('Leave me a pile of 3.')).toBeTruthy();
    expect(narrator.spoken.at(-1)).toBe('Leave me a pile of 3.');

    click(1);
    expect(take(1).getAttribute('data-hint')).toBeNull();
    expect(screen.queryByText('Leave me a pile of 3.')).toBeNull();
  });

  it("speaks the platform's hint line for a game with no hint text of its own", async () => {
    const plain: DuelGameDef = { ...GAME };
    Reflect.deleteProperty(plain, 'hintKey');
    const { narrator } = await mount({ game: plain });
    await wait(BOT_PAUSE);
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    expect(screen.getByText('Look for a move that leaves me stuck.')).toBeTruthy();
    expect(narrator.spoken.at(-1)).toBe('Look for a move that leaves me stuck.');
  });

  it('speaks the goal, then each turn, in a bounded set of lines', async () => {
    const { narrator } = await kidTurnAtFour();
    click(1);
    await wait(BOT_PAUSE);
    expect(new Set(narrator.spoken)).toEqual(
      new Set([
        'Take 1 or 2 stones. Whoever takes the last stone wins!',
        "Fox's turn",
        'Your turn',
      ]),
    );
    expect(narrator.spoken[0]).toBe('Take 1 or 2 stones. Whoever takes the last stone wins!');
  });

  it('a win with no hint: the result panel with 3 stars, saved as a boss result', async () => {
    const { services, narrator, profileId } = await kidTurnAtFour();
    click(1); // 4 → 3
    await wait(BOT_PAUSE); // the bot takes 2: 1 left
    click(1); // 1 → 0: the kid took the last stone
    await wait(50);

    expect(step().getAttribute('data-duel-status')).toBe('won');
    expect(screen.getByText('You won! Great thinking!')).toBeTruthy();
    expect(narrator.spoken.at(-1)).toBe('You won! Great thinking!');
    expect(earned()).toBe(3);
    expect(screen.queryByTestId('duel-turn')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Hint' })).toBeNull();
    // A lesson boss won outright continues: no "Play again" outside a standalone session.
    expect(screen.getByRole('button', { name: /^Next/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Play again' })).toBeNull();

    const attempts = await services.deps.progress.listAttempts(profileId);
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({
      exerciseId: 'take-away',
      stars: 3,
      correct: true,
      hints: 0,
    });
  });

  it('a win after a hint: 2 stars', async () => {
    const { services, profileId } = await kidTurnAtFour();
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    click(1);
    await wait(BOT_PAUSE);
    click(1);
    await wait(50);

    expect(step().getAttribute('data-duel-status')).toBe('won');
    expect(earned()).toBe(2);
    const attempts = await services.deps.progress.listAttempts(profileId);
    expect(attempts[0]).toMatchObject({ stars: 2, correct: true, hints: 1 });
  });

  it('a loss: 0 stars, the lost line, and "Play again" restarts the duel with the bot to open', async () => {
    const { services, narrator, profileId } = await kidTurnAtFour();
    click(2); // 4 → 2: the bot takes both
    await wait(BOT_PAUSE);
    await wait(50);

    expect(step().getAttribute('data-duel-status')).toBe('lost');
    expect(screen.getByText('I won this time. Try again!')).toBeTruthy();
    expect(narrator.spoken.at(-1)).toBe('I won this time. Try again!');
    expect(earned()).toBe(0);
    expect(pile()).toBe('0 stones');
    expect(take(1).hasAttribute('disabled')).toBe(true);
    const attempts = await services.deps.progress.listAttempts(profileId);
    expect(attempts[0]).toMatchObject({ stars: 0, correct: false, errors: 1 });

    fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
    expect(step().getAttribute('data-duel-status')).toBe('playing');
    expect(step().getAttribute('data-duel-turn')).toBe('bot');
    expect(pile()).toBe('6 stones');
    expect(screen.queryByRole('button', { name: 'Play again' })).toBeNull();

    // The restarted run plays and saves on its own.
    await wait(BOT_PAUSE);
    click(1);
    await wait(BOT_PAUSE);
    click(1);
    await wait(50);
    expect(step().getAttribute('data-duel-status')).toBe('won');
    expect(earned()).toBe(3);
    expect(await services.deps.progress.listAttempts(profileId)).toHaveLength(2);
  });

  it('played from the Play screen, a win offers "Play again" next to the session action and saves the mini-game progress', async () => {
    const { services, profileId } = await mount({ standalone: true });
    await wait(BOT_PAUSE);
    click(1);
    await wait(BOT_PAUSE);
    click(1);
    await wait(50);

    expect(step().getAttribute('data-duel-status')).toBe('won');
    expect(earned()).toBe(3);
    expect(screen.getByRole('button', { name: 'Play again' })).toBeTruthy();
    expect((await services.deps.progress.getMiniGame(profileId, 'take-away'))?.bestStars).toBe(3);
    const [attempt] = await services.deps.progress.listAttempts(profileId);
    expect(attempt).toMatchObject({ exerciseId: 'take-away', scored: false, stars: 3 });

    fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
    expect(step().getAttribute('data-duel-status')).toBe('playing');
    expect(pile()).toBe('6 stones');
  });
});
