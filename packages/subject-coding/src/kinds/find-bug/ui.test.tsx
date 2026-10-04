import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { parseLevel } from '../../core/level.ts';
import type { FindBugDef } from '../../core/types.ts';
import { fixtureExercise } from '../../web/testing/fixtures.ts';
import { KindHarness } from '../../web/testing/KindHarness.tsx';
import { renderCodingUi } from '../../web/testing/render-coding-ui.tsx';
import { findBugUi } from './ui.ts';

/** `arrows-05`: right, right, right, up, down on S . . * / . # . . / . . . F; "up" (tile 4) walks off the grid. */
const def = fixtureExercise('arrows-05', 'find-bug');

/** The loop's own count is the bug: 4 times on a row that needs 5. */
const loopBug: FindBugDef = {
  id: 'loop-bug',
  concept: 'repeat',
  textKey: 'lessons:arrows-05',
  type: 'find-bug',
  level: parseLevel(['S....F']),
  program: [{ kind: 'repeat', times: 4, body: [{ kind: 'right' }] }],
  bug: [0],
  fix: { kind: 'repeat', times: 5, body: [{ kind: 'right' }] },
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const note = (): string | undefined => screen.queryByTestId('note')?.textContent ?? undefined;
const session = (): HTMLElement => screen.getByTestId('session');
const actorCell = (): string | null => screen.getByTestId('grid-actor').getAttribute('data-cell');
const tile = (name: string): HTMLElement => screen.getByRole('button', { name });

async function play(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function mount(exercise: FindBugDef = def, props: { guided?: boolean } = {}) {
  return renderCodingUi(<KindHarness def={exercise} {...props} />);
}

describe('find-bug UI', () => {
  it('shows the instruction, every tile of the program as a button, Watch and Hint', () => {
    mount();
    expect(screen.getByTestId('instruction').textContent).toBe(
      'Fox does not reach the flag. Tap the step that is wrong.',
    );
    expect(
      screen
        .getAllByRole('button', { name: /^Tile \d: / })
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual([
      'Tile 1: Step right',
      'Tile 2: Step right',
      'Tile 3: Step right',
      'Tile 4: Step up',
      'Tile 5: Step down',
    ]);
    for (const name of ['Watch', 'Hint']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
    expect(screen.queryByRole('button', { name: 'Run' })).toBeNull();
    // The map is a picture here: its cells are not buttons.
    expect(screen.queryByRole('button', { name: /^Row \d/ })).toBeNull();
    expect(actorCell()).toBe('0,0');
  });

  it('makes the tiles raised buttons of at least 56 px', () => {
    mount();
    const first = tile('Tile 1: Step right');
    expect(first.className).toContain('tap-raised');
    expect(first.className).toContain('h-14');
    expect(first.className).toContain('w-14');
  });

  describe('Watch', () => {
    it('plays the failing run, any time, without costing anything', async () => {
      mount();
      fireEvent.click(screen.getByRole('button', { name: 'Watch' }));
      await play(0);
      expect(actorCell()).toBe('1,0');
      await play(700);
      expect(actorCell()).toBe('2,0');
      expect(screen.getByRole('button', { name: 'Watch' }).hasAttribute('disabled')).toBe(true);
      await play(5000);
      // It ends where it bumped: the star was picked up on the way.
      expect(actorCell()).toBe('3,0');
      expect(screen.getByTestId('grid-cell-3-0').getAttribute('aria-label')).toBe(
        'Row 1, column 4, Fox',
      );
      expect(session().dataset['errors']).toBe('0');
      expect(note()).toBeUndefined();
      expect(screen.getByRole('button', { name: 'Watch' }).hasAttribute('disabled')).toBe(false);
    });

    it('glows the tile it is on and can be watched again, even after a wrong tap', async () => {
      mount();
      fireEvent.click(tile('Tile 1: Step right'));
      fireEvent.click(screen.getByRole('button', { name: 'Watch' }));
      await play(0);
      await play(700);
      expect(tile('Tile 2: Step right').dataset['active']).toBe('true');
      await play(5000);
      fireEvent.click(screen.getByRole('button', { name: 'Watch' }));
      await play(0);
      expect(actorCell()).toBe('1,0');
      expect(session().dataset['errors']).toBe('1');
    });

    it('cannot be tapped while it plays: the tiles wait', async () => {
      mount();
      fireEvent.click(screen.getByRole('button', { name: 'Watch' }));
      await play(0);
      expect(tile('Tile 4: Step up').hasAttribute('disabled')).toBe(true);
      fireEvent.click(tile('Tile 4: Step up'));
      await play(10_000);
      expect(session().dataset['solved']).toBe('false');
    });
  });

  it('a wrong tile shakes, the note says it is fine, and an error counts', () => {
    mount();
    fireEvent.click(tile('Tile 1: Step right'));
    const wrong = tile('Tile 1: Step right');
    expect(wrong.className).toContain('card-shake');
    expect(wrong.className).toContain('border-today');
    expect(wrong.dataset['wrong']).toBe('true');
    expect(note()).toBe('That step is fine. Look again!');
    expect(session().dataset['errors']).toBe('1');
    expect(session().dataset['solved']).toBe('false');

    // Only the last wrong tile shakes.
    fireEvent.click(tile('Tile 2: Step right'));
    expect(tile('Tile 1: Step right').className).not.toContain('card-shake');
    expect(tile('Tile 2: Step right').className).toContain('card-shake');
    expect(session().dataset['errors']).toBe('2');
  });

  it('the right tile turns red with a cross, the fix goes in, the fixed run plays, then it is solved', async () => {
    mount();
    fireEvent.click(tile('Tile 4: Step up'));
    expect(session().dataset['solved']).toBe('false');
    const bug = screen.getByRole('img', { name: 'Tile 4: Step up, the bug' });
    expect(bug.className).toContain('border-today');
    expect(bug.querySelector('[data-testid="bug-mark"]')).not.toBeNull();
    expect(actorCell()).toBe('0,0');

    // The cross stays a moment, then the tile becomes the fix and the program runs.
    await play(700);
    expect(screen.queryByTestId('bug-mark')).toBeNull();
    expect(screen.getByRole('img', { name: 'Tile 4: Step down' })).toBeTruthy();
    expect(session().dataset['solved']).toBe('false');
    await play(0);
    expect(actorCell()).toBe('1,0');
    await play(4 * 700);
    expect(actorCell()).toBe('3,2');
    expect(session().dataset['solved']).toBe('false');

    await play(700);
    expect(session().dataset['solved']).toBe('true');
    expect(note()).toBe('Amazing!');
    expect(screen.getByTestId('done').dataset['stars']).toBe('3');
    // The mended program stays, as a picture.
    expect(screen.getByRole('img', { name: 'Tile 4: Step down' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Tile \d/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Watch' })).toBeNull();
  });

  it('a wrong tile first, then the right one: 2 stars', async () => {
    mount();
    fireEvent.click(tile('Tile 2: Step right'));
    fireEvent.click(tile('Tile 4: Step up'));
    await play(700);
    await play(20_000);
    expect(screen.getByTestId('done').dataset['stars']).toBe('2');
  });

  describe('hints', () => {
    it('1: replays the run up to the bug and pauses there, the bug tile glowing', async () => {
      mount();
      fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
      expect(note()).toBe('Watch Fox. Where does it go wrong?');
      await play(0);
      await play(3 * 700);
      expect(actorCell()).toBe('3,0');
      expect(tile('Tile 4: Step up').dataset['active']).toBe('true');
      // It stays put: no return to the start.
      await play(10_000);
      expect(actorCell()).toBe('3,0');
      expect(tile('Tile 4: Step up').dataset['active']).toBe('true');
      expect(session().dataset['errors']).toBe('0');
    });

    it('2: greys out all but three tiles, the bug among them; the greyed ones cannot be tapped', async () => {
      mount();
      fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
      await play(10_000);
      fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
      expect(note()).toBe('The bug is one of the bright steps.');
      for (const name of ['Tile 1: Step right', 'Tile 2: Step right']) {
        const dim = tile(name);
        expect(dim.hasAttribute('disabled')).toBe(true);
        expect(dim.className).toContain('opacity-40');
      }
      for (const name of ['Tile 3: Step right', 'Tile 4: Step up', 'Tile 5: Step down']) {
        const bright = tile(name);
        expect(bright.hasAttribute('disabled')).toBe(false);
        expect(bright.className).not.toContain('opacity-40');
      }
      fireEvent.click(tile('Tile 1: Step right'));
      expect(session().dataset['errors']).toBe('0');
    });

    it('3: flashes the bug tile', () => {
      mount();
      for (let hints = 0; hints < 3; hints += 1) {
        fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
      }
      expect(note()).toBe('The flashing step is the bug.');
      expect(tile('Tile 4: Step up').className).toContain('animate-pulse');
      expect(tile('Tile 3: Step right').className).not.toContain('animate-pulse');
    });

    it('keeps the greyed tiles after a wrong tap among the bright ones', async () => {
      mount();
      fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
      await play(10_000);
      fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
      fireEvent.click(tile('Tile 3: Step right'));
      expect(note()).toBe('That step is fine. Look again!');
      expect(tile('Tile 1: Step right').hasAttribute('disabled')).toBe(true);
    });

    it('1 on a guided try comes by itself and plays at once', async () => {
      mount(def, { guided: true });
      await play(0);
      expect(actorCell()).toBe('1,0');
      expect(session().dataset['hintLevel']).toBe('1');
    });
  });

  describe('a repeat with the wrong count', () => {
    it('is its own tile to tap: "Tile 1: Repeat 4 times", the tiles inside numbered after it', () => {
      mount(loopBug);
      expect(tile('Tile 1: Repeat 4 times')).toBeTruthy();
      expect(tile('Tile 2: Step right')).toBeTruthy();
    });

    it('a tap on a tile inside it is wrong, a tap on the repeat is the bug', async () => {
      mount(loopBug);
      fireEvent.click(tile('Tile 2: Step right'));
      expect(note()).toBe('That step is fine. Look again!');
      fireEvent.click(tile('Tile 1: Repeat 4 times'));
      expect(screen.getByRole('img', { name: 'Tile 1: Repeat 4 times, the bug' })).toBeTruthy();
      await play(700);
      expect(screen.getByRole('img', { name: 'Tile 1: Repeat 5 times' })).toBeTruthy();
      await play(0);
      await play(700);
      expect(screen.getByRole('img', { name: 'Tile 1: Repeat 5 times' }).textContent).toBe(
        '2 of 5',
      );
      await play(20_000);
      expect(session().dataset['solved']).toBe('true');
    });

    it('hint 1 pauses after the whole loop', async () => {
      mount(loopBug);
      fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
      await play(10_000);
      expect(actorCell()).toBe('4,0');
    });
  });

  it('is the kind UI of "find-bug", with the wrong tile as its one extra', () => {
    expect(findBugUi.type).toBe('find-bug');
    expect(findBugUi.initUi(def)).toEqual({});
    expect(findBugUi.clearWrongUi()).toEqual({ wrongPath: undefined });
  });
});
