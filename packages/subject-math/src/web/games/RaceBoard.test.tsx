// Race to 20's board on the platform's duel step, with the real math pack and content: the number track, the lit stones of the last
// move (never colour alone), the step buttons, the hint glow, the lines it speaks (all in the voice inventory), the bot answering after
// its pause (fake timers) and a win worth 3 stars (2 after a hint).
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig, Random } from '@learn/platform-core';
import { createAppServices } from '@learn/platform-web/app/services.ts';
import type { Services } from '@learn/platform-web/app/services.ts';
import { BossStep } from '@learn/platform-web/modes/BossStep.tsx';
import type { DuelBoardProps } from '@learn/platform-web/modes/duel/board.ts';
import { createFakeNarrator } from '@learn/platform-web/testing/fake-narrator.ts';
import type { FakeNarrator } from '@learn/platform-web/testing/fake-narrator.ts';
import { createMemoryStorage } from '@learn/platform-web/testing/memory-storage.ts';
import { renderWithStore } from '@learn/platform-web/testing/render-with-store.tsx';
import bundled from '../../../dist/content.json';
import voiceTexts from '../../../dist/voice-texts.json';
import { race } from '../../core/games/race.ts';
import type { RaceState } from '../../core/games/race.ts';
import type { MathContent, MathDuelGame, MathLesson } from '../../core/types.ts';
import { mathEntry } from '../../entry.ts';
import { RaceBoard } from './RaceBoard.tsx';

const APP: Omit<AppConfig, 'version'> = {
  title: 'Math app',
  storagePrefix: 'math:',
  backupAppId: 'math',
  backupFilePrefix: 'math',
  parentCodeFilePrefix: 'math-code',
};

const content = bundled as unknown as MathContent;
const found = content.minigames.find((game) => game.id === 'race-to-20');
if (found?.mode !== 'duel') throw new Error('the math content has no race-to-20 duel');
const GAME: MathDuelGame = found;
// The lesson the duel unlocks after (its character is the bot's name: Hedgie).
const unlock = content.lessons.find((entry) => entry.id === GAME.unlockAfter);
if (unlock === undefined) throw new Error('the math content has no lesson that unlocks Race to 20');
const LESSON: MathLesson = unlock;
const INVENTORY = new Set(voiceTexts.map((entry) => entry.text));

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** Always answers `value`: 0.99 = the bot never errs (and, when losing, adds 3, the last step). */
const constant = (value: number): Random => ({ next: () => value });

/** A small seeded generator (mulberry32) so a "random" game is repeatable. */
function seeded(seed: number): Random {
  let a = seed;
  return {
    next() {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

interface Mounted {
  readonly services: Services;
  readonly narrator: FakeNarrator;
}

/** The math app's services over a fresh storage, with a fake narrator and `random` as the bot's dice. */
async function wire(
  random: Random,
  manual = false,
): Promise<{ readonly services: Services; readonly narrator: FakeNarrator }> {
  const app = createAppServices([mathEntry], APP, createMemoryStorage());
  const active = await app.activate('math');
  const narrator = createFakeNarrator({ manual });
  return { services: { ...active, narrator, deps: { ...active.deps, random } }, narrator };
}

/** The duel step on the real math pack, as the Today session opens it after Take away. */
async function mountStep(random: Random = constant(0.99), manual = false): Promise<Mounted> {
  const { services: wired, narrator } = await wire(random, manual);
  await renderWithStore(<BossStep lesson={LESSON} game={GAME} nextStepIndex={0} />, wired);
  return { services: wired, narrator };
}

const BOT_PAUSE = 900;

async function wait(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

const stone = (n: number): HTMLElement => {
  const element = document.querySelector<HTMLElement>(`[data-stone="${String(n)}"]`);
  if (element === null) throw new Error(`no stone ${String(n)}`);
  return element;
};
const token = (): string | null =>
  document.querySelector('[data-token="true"]')?.getAttribute('data-stone') ?? null;
const looks = (): string =>
  Array.from(document.querySelectorAll('[data-stone]'))
    .map((element) => element.getAttribute('data-look')?.[0] ?? '?')
    .join('');
const step = (n: number): HTMLElement => screen.getByRole('button', { name: `+${String(n)}` });
const banner = (): string | null => screen.getByTestId('duel-turn').textContent;
const raceState = (): RaceState => {
  const raw = document.querySelector('[data-duel-state]')?.getAttribute('data-duel-state');
  if (raw === undefined || raw === null) throw new Error('no duel state');
  return JSON.parse(raw) as RaceState;
};
const status = (): string | null =>
  document.querySelector('[data-duel-status]')?.getAttribute('data-duel-status') ?? null;
const earned = (): number =>
  screen.getByTestId('stars-row').querySelectorAll('.reward-star-pop').length;

/** The kid's best move now (the one that leaves a multiple of 4), tapped. */
function playBest(): void {
  const [best] = race.bestMoves(raceState());
  if (best === undefined) throw new Error('the kid is losing: no best move');
  fireEvent.click(step(best));
}

describe('the race board alone', () => {
  const start: RaceState = { total: 0, toMove: 'bot', target: 20, maxStep: 3 };

  async function mountBoard(props: Partial<DuelBoardProps> = {}): Promise<{
    readonly narrator: FakeNarrator;
    readonly onMove: ReturnType<typeof vi.fn>;
  }> {
    const { services: wired, narrator } = await wire(constant(0.99));
    const onMove = vi.fn();
    const state = (props.state ?? start) as RaceState;
    await renderWithStore(
      <RaceBoard
        state={state}
        legalMoves={race.moves(state)}
        disabled={false}
        bot="Owl"
        onMove={onMove}
        {...props}
      />,
      wired,
    );
    return { narrator, onMove };
  }

  it('draws the start and one stone per number, 0 to 20 in order, the token on the total and the goal marked', async () => {
    await mountBoard();
    const numbers = Array.from(document.querySelectorAll('[data-stone]')).map((element) =>
      Number(element.getAttribute('data-stone')),
    );
    expect(numbers).toEqual(Array.from({ length: 21 }, (_, n) => n));
    expect(screen.getByRole('img', { name: 'Total 0 of 20' })).toBeTruthy();
    expect(token()).toBe('0');
    expect(document.querySelectorAll('[data-token]')).toHaveLength(1);
    expect(stone(0).getAttribute('aria-current')).toBe('step');
    expect(stone(20).className).toContain('border-star');
    expect(stone(19).className).not.toContain('border-star');
    expect(looks()).toBe(`w${'a'.repeat(20)}`);
  });

  it('draws the stones 56 px tall on a tablet (two rows: the start with the first half, 11 then 10) and 44 px on a phone (two rows of 10 under the start)', async () => {
    await mountBoard();
    const track = screen.getByRole('img', { name: 'Total 0 of 20' });
    // A tablet is 640 px wide and 600 px tall up (the board's own media query); jsdom reads the markup, the e2e measures the pixels.
    const tablet = '[@media(min-width:640px)_and_(min-height:600px)]';
    expect(track.style.getPropertyValue('--stones')).toBe('11');
    expect(track.className).toContain('grid-cols-[repeat(10,minmax(0,1fr))]');
    expect(track.className).toContain(`${tablet}:grid-cols-[repeat(var(--stones),minmax(0,1fr))]`);
    expect(stone(7).className).toContain('h-11');
    expect(stone(7).className).toContain(`${tablet}:h-14`);
    expect(stone(7).className).toContain(`${tablet}:text-lg`);
    // The start stone stays alone on the phone's first row (stone 1 starts the second).
    expect(stone(1).className).toContain('col-start-1');
    cleanup();
    const small: RaceState = { total: 4, toMove: 'kid', target: 10, maxStep: 2 };
    await mountBoard({ state: small, legalMoves: race.moves(small) });
    expect(
      screen.getByRole('img', { name: 'Total 4 of 10' }).style.getPropertyValue('--stones'),
    ).toBe('6');
  });

  it('puts the token on the total and lights the stones the last move walked over: blue with a paw for the bot', async () => {
    await mountBoard({
      state: { total: 7, toMove: 'kid', target: 20, maxStep: 3 },
      lastMove: { side: 'bot', move: 3 },
    });
    expect(token()).toBe('7');
    expect(screen.getByRole('img', { name: 'Total 7 of 20' })).toBeTruthy();
    for (const n of [5, 6, 7]) {
      expect(stone(n).getAttribute('data-look'), `stone ${String(n)}`).toBe('bot');
      expect(within(stone(n)).getByTestId('paw'), `paw on ${String(n)}`).toBeTruthy();
    }
    for (const n of [0, 1, 2, 3, 4]) expect(stone(n).getAttribute('data-look')).toBe('walked');
    for (const n of [8, 12, 20]) expect(stone(n).getAttribute('data-look')).toBe('ahead');
    expect(document.querySelectorAll('[data-testid="paw"]')).toHaveLength(3);
    expect(screen.getByTestId('race-line').textContent).toBe("Owl adds 3. Now it's 7.");
  });

  it('lights the kid’s stones green, with no paw: colour is not the only mark of the bot', async () => {
    await mountBoard({
      state: { total: 9, toMove: 'bot', target: 20, maxStep: 3 },
      lastMove: { side: 'kid', move: 2 },
      disabled: true,
      legalMoves: [],
    });
    expect(stone(9).getAttribute('data-look')).toBe('kid');
    expect(stone(8).getAttribute('data-look')).toBe('kid');
    expect(stone(7).getAttribute('data-look')).toBe('walked');
    expect(document.querySelectorAll('[data-testid="paw"]')).toHaveLength(0);
    expect(screen.getByTestId('race-line').textContent).toBe(
      'You add 2. Now it’s 9.'.replace('’', "'"),
    );
  });

  it('has a big step button per step: "+1" "+2" "+3", data-move the JSON of the step, each at least 64 px (h-20)', async () => {
    const { onMove } = await mountBoard();
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((button) => button.textContent)).toEqual(['+1', '+2', '+3']);
    expect(buttons.map((button) => button.getAttribute('data-move'))).toEqual(['1', '2', '3']);
    for (const button of buttons) {
      expect(button.className).toContain('h-20');
      expect(button.className).toContain('min-w-16');
      expect(button.hasAttribute('disabled')).toBe(false);
    }
    fireEvent.click(step(2));
    expect(onMove).toHaveBeenCalledExactlyOnceWith(2);
  });

  it('disables every button off the kid’s turn, and a step that would pass the target', async () => {
    await mountBoard({ disabled: true, legalMoves: [] });
    for (const n of [1, 2, 3]) expect(step(n).hasAttribute('disabled')).toBe(true);
    cleanup();

    const near: RaceState = { total: 18, toMove: 'kid', target: 20, maxStep: 3 };
    const { onMove } = await mountBoard({ state: near, legalMoves: race.moves(near) });
    expect(step(1).hasAttribute('disabled')).toBe(false);
    expect(step(2).hasAttribute('disabled')).toBe(false);
    expect(step(3).hasAttribute('disabled')).toBe(true);
    fireEvent.click(step(3));
    expect(onMove).not.toHaveBeenCalled();
  });

  it('makes the best step button glow on a hint, and only that one', async () => {
    await mountBoard({ hintMoves: [1] });
    expect(step(1).getAttribute('data-hint')).toBe('true');
    expect(step(1).className).toContain('ring-4');
    expect(step(2).getAttribute('data-hint')).toBeNull();
    expect(step(3).className).not.toContain('ring-4');
  });

  it('draws any params: target 10 with steps 1-2 is 11 stones and 2 buttons', async () => {
    const small: RaceState = { total: 4, toMove: 'kid', target: 10, maxStep: 2 };
    await mountBoard({ state: small, legalMoves: race.moves(small) });
    expect(document.querySelectorAll('[data-stone]')).toHaveLength(11);
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['+1', '+2']);
    expect(screen.getByRole('img', { name: 'Total 4 of 10' })).toBeTruthy();
  });

  it('is a wiring mistake to hand it a state that is not a race', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      await expect(mountBoard({ state: { pile: 6 } })).rejects.toThrow(/not a race state/);
    } finally {
      quiet.mockRestore();
    }
  });
});

describe('the duel step with the race board', () => {
  it('opens on the bot’s turn with the track at 0 and every step button disabled, then the bot adds after its pause', async () => {
    await mountStep();
    expect(banner()).toBe("Hedgie's turn");
    expect(screen.getByRole('heading', { name: 'Race to 20' })).toBeTruthy();
    expect(token()).toBe('0');
    for (const n of [1, 2, 3]) expect(step(n).hasAttribute('disabled')).toBe(true);

    await wait(BOT_PAUSE - 1);
    expect(token()).toBe('0');
    await wait(1);

    // From 0 the bot is losing, so it plays a random step (0.99 → the last, 3).
    expect(token()).toBe('3');
    expect(banner()).toBe('Your turn');
    expect(stone(1).getAttribute('data-look')).toBe('bot');
    expect(stone(3).getAttribute('data-look')).toBe('bot');
    expect(screen.getByTestId('race-line').textContent).toBe("Hedgie adds 3. Now it's 3.");
    for (const n of [1, 2, 3]) expect(step(n).hasAttribute('disabled')).toBe(false);
  });

  it('speaks the goal at the start, then the bot’s line and "Your turn!" after its move, then the kid’s line', async () => {
    const { narrator } = await mountStep();
    expect(narrator.spoken.at(-1)).toBe('Take turns adding 1, 2 or 3. Whoever says 20 wins!');

    await wait(BOT_PAUSE);
    expect(narrator.spoken.slice(-2)).toEqual(["Hedgie adds 3. Now it's 3.", 'Your turn!']);

    fireEvent.click(step(1));
    await wait(0);
    expect(narrator.spoken.at(-1)).toBe("You add 1. Now it's 4.");
    expect(narrator.spoken).not.toContain("Hedgie's turn​");
  });

  it('plays the kid move at once: the token moves, the stones turn green, the buttons close, and the bot answers after its pause', async () => {
    await mountStep();
    await wait(BOT_PAUSE);
    fireEvent.click(step(1));

    expect(token()).toBe('4');
    expect(stone(4).getAttribute('data-look')).toBe('kid');
    expect(stone(3).getAttribute('data-look')).toBe('walked');
    expect(document.querySelectorAll('[data-testid="paw"]')).toHaveLength(0);
    expect(banner()).toBe("Hedgie's turn");
    for (const n of [1, 2, 3]) expect(step(n).hasAttribute('disabled')).toBe(true);

    await wait(BOT_PAUSE);
    expect(token()).toBe('7'); // 4 is lost for the bot: a random step, 3
    expect(screen.getByTestId('race-line').textContent).toBe("Hedgie adds 3. Now it's 7.");
  });

  it('Hint makes the best step glow, speaks the game’s hint, and the next move clears it', async () => {
    const { narrator } = await mountStep();
    await wait(BOT_PAUSE); // total 3: the best step is +1 (to 4)
    expect(step(1).getAttribute('data-hint')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    expect(step(1).getAttribute('data-hint')).toBe('true');
    expect(step(2).getAttribute('data-hint')).toBeNull();
    expect(step(3).getAttribute('data-hint')).toBeNull();
    expect(screen.getByText('Try to land on 4, 8, 12 or 16.')).toBeTruthy();
    expect(narrator.spoken.at(-1)).toBe('Try to land on 4, 8, 12 or 16.');

    fireEvent.click(step(1));
    expect(step(1).getAttribute('data-hint')).toBeNull();
    expect(screen.queryByText('Try to land on 4, 8, 12 or 16.')).toBeNull();
  });

  it('a hint pressed while the bot’s line is still being spoken is not followed by "Your turn!" over it', async () => {
    const { narrator } = await mountStep(constant(0.99), true);
    await wait(BOT_PAUSE);
    // The bot's line is pending (a manual narrator): the hint cancels it and is spoken instead.
    expect(narrator.spoken.at(-1)).toBe("Hedgie adds 3. Now it's 3.");
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    await wait(0);
    expect(narrator.spoken).not.toContain('Your turn!');
    expect(narrator.spoken.at(-1)).toBe('Try to land on 4, 8, 12 or 16.');
  });

  it('a win with no hint: the kid lands on 4, 8, 12, 16, 20; 3 stars; no "Now it’s 20" line is spoken over the result', async () => {
    const { narrator } = await mountStep();
    await wait(BOT_PAUSE);
    for (const expected of [4, 8, 12, 16]) {
      playBest();
      expect(token()).toBe(String(expected));
      await wait(BOT_PAUSE);
    }
    expect(token()).toBe('19'); // the bot added 3 from 16
    playBest(); // +1: the kid says 20
    await wait(50);

    expect(token()).toBe('20');
    expect(status()).toBe('won');
    expect(screen.getByText('You won! Great thinking!')).toBeTruthy();
    expect(narrator.spoken.at(-1)).toBe('You won! Great thinking!');
    expect(narrator.spoken.join('|')).not.toContain("Now it's 20");
    expect(earned()).toBe(3);
    for (const n of [1, 2, 3]) expect(step(n).hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('button', { name: 'Hint' })).toBeNull();
  });

  it('a win after a hint: 2 stars', async () => {
    await mountStep();
    await wait(BOT_PAUSE);
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    for (let turn = 0; turn < 5; turn += 1) {
      playBest();
      await wait(BOT_PAUSE);
    }
    await wait(50);
    expect(status()).toBe('won');
    expect(earned()).toBe(2);
  });

  it('a loss: the bot says 20, the result is spoken, 0 stars', async () => {
    const { narrator } = await mountStep();
    await wait(BOT_PAUSE); // total 3
    fireEvent.click(step(3)); // 6: the bot (best move) leaves 8
    await wait(BOT_PAUSE);
    expect(token()).toBe('8');
    // Keep adding 3: 11 → the bot adds 1 to 12 → 15 → 16 → 18 (kid adds 2) → the bot adds 2.
    fireEvent.click(step(3));
    await wait(BOT_PAUSE);
    fireEvent.click(step(3));
    await wait(BOT_PAUSE);
    expect(token()).toBe('16');
    fireEvent.click(step(2));
    await wait(BOT_PAUSE);
    await wait(50);
    expect(token()).toBe('20');
    expect(status()).toBe('lost');
    expect(narrator.spoken.at(-1)).toBe('I won this time. Try again!');
    expect(earned()).toBe(0);
  });

  it('every line the step and the board speak over many games is in the voice inventory (so it has generated audio)', async () => {
    const spoken = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const random = seeded(seed);
      const { narrator } = await mountStep(random);
      for (let turns = 0; turns < 30 && status() === 'playing'; turns += 1) {
        await wait(BOT_PAUSE);
        if (status() !== 'playing') break;
        // The kid plays its best move most of the time, a random legal step otherwise (so the bot wins some games).
        const state = raceState();
        const legal = race.moves(state);
        const best = race.bestMoves(state);
        const pick =
          best[0] !== undefined && random.next() < 0.7
            ? best[0]
            : (legal[Math.min(legal.length - 1, Math.floor(random.next() * legal.length))] ?? 1);
        if (random.next() < 0.15) {
          const hint = screen.queryByRole('button', { name: 'Hint' });
          if (hint !== null) fireEvent.click(hint);
        }
        fireEvent.click(step(pick));
        await wait(0);
      }
      await wait(BOT_PAUSE + 50);
      expect(status(), `seed ${String(seed)} ended`).not.toBe('playing');
      for (const line of narrator.spoken) spoken.add(line);
      cleanup();
    }
    const missing = [...spoken].filter((line) => !INVENTORY.has(line));
    expect(missing).toEqual([]);
    // A fair spread of the bounded set was exercised, both voices.
    expect([...spoken].filter((line) => line.startsWith('Hedgie adds')).length).toBeGreaterThan(10);
    expect([...spoken].filter((line) => line.startsWith('You add')).length).toBeGreaterThan(10);
    expect(spoken.has('Your turn!')).toBe(true);
  });
});
