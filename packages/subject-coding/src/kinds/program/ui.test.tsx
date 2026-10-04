import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { fixtureExercise } from '../../web/testing/fixtures.ts';
import { KindHarness } from '../../web/testing/KindHarness.tsx';
import { renderCodingUi } from '../../web/testing/render-coding-ui.tsx';
import { bumpFeedback, invalidReason } from './feedback.ts';
import { programUi } from './ui.ts';
import { run } from '../../core/simulator.ts';
import { parseLevel } from '../../core/level.ts';
import type { ProgramDef } from '../../core/types.ts';

/** `fx-01`: S . . / . . F, tray right + down, cap 3. */
const reach = fixtureExercise('fx-01', 'program');
/** `fx-03`: slots 1 and 4 are locked (right, down); the rock row blocks the middle. */
const gap = fixtureExercise('fx-03', 'program');
/** `fx-r2`: S . . . . F with a repeat, cap 3. */
const loop = fixtureExercise('fx-r2', 'program');
const guided = fixtureExercise('fx-g1', 'program');

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const tap = (name: string): void => {
  fireEvent.click(screen.getByRole('button', { name }));
};
const tray = (...names: string[]): void => {
  for (const name of names) tap(name);
};
const note = (): string | undefined => screen.queryByTestId('note')?.textContent ?? undefined;
const session = (): HTMLElement => screen.getByTestId('session');
const actorCell = (): string | null => screen.getByTestId('grid-actor').getAttribute('data-cell');

/** Lets the animation play through (every step, then done). */
async function play(ms = 10_000): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function mount(def = reach, props: { guided?: boolean } = {}) {
  return renderCodingUi(<KindHarness def={def} {...props} />);
}

describe('program UI', () => {
  it('shows the instruction, the map, the empty strip, the tray, Hint, Run and Reset', () => {
    mount();
    expect(screen.getByTestId('instruction').textContent).toBe('Help Fox reach the flag.');
    expect(screen.getByRole('group', { name: 'Map, 3 by 2' })).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Your program' })).toBeTruthy();
    expect(
      screen
        .getAllByRole('img', { name: /^Slot \d, empty$/ })
        .map((slot) => slot.getAttribute('aria-label')),
    ).toEqual(['Slot 1, empty', 'Slot 2, empty', 'Slot 3, empty']);
    const trayButtons = within(screen.getByRole('group', { name: 'Tiles' })).getAllByRole('button');
    expect(trayButtons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Step right',
      'Step down',
    ]);
    for (const name of ['Hint', 'Run', 'Reset']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
    expect(note()).toBeUndefined();
    expect(actorCell()).toBe('0,0');
  });

  it('makes the tray tiles 64 px and Run, Reset and Hint at least 56 px', () => {
    mount();
    for (const name of ['Step right', 'Step down']) {
      expect(screen.getByRole('button', { name }).className).toContain('h-16');
    }
    for (const name of ['Hint', 'Run', 'Reset']) {
      expect(screen.getByRole('button', { name }).className).toContain('h-14');
    }
  });

  it('names the map cells: position, then rock / star / flag / the animal', () => {
    mount(fixtureExercise('fx-02', 'program'));
    expect(screen.getByTestId('grid-cell-0-0').getAttribute('aria-label')).toBe(
      'Row 1, column 1, Fox',
    );
    expect(screen.getByTestId('grid-cell-1-1').getAttribute('aria-label')).toBe(
      'Row 2, column 2, rock',
    );
    expect(screen.getByTestId('grid-cell-3-0').getAttribute('aria-label')).toBe(
      'Row 1, column 4, star',
    );
    expect(screen.getByTestId('grid-cell-3-2').getAttribute('aria-label')).toBe(
      'Row 3, column 4, flag',
    );
  });

  it('fills the strip from the tray, takes a tile out on a tap and starts over on Reset', () => {
    mount();
    tray('Step right', 'Step down', 'Step right');
    expect(
      screen
        .getAllByRole('button', { name: /^Slot \d: / })
        .map((slot) => slot.getAttribute('aria-label')),
    ).toEqual(['Slot 1: Step right', 'Slot 2: Step down', 'Slot 3: Step right']);

    tap('Slot 2: Step down');
    expect(screen.getByRole('img', { name: 'Slot 2, empty' })).toBeTruthy();
    tray('Step down');
    expect(screen.getByRole('button', { name: 'Slot 2: Step down' })).toBeTruthy();

    tap('Reset');
    expect(screen.queryAllByRole('button', { name: /^Slot \d: / })).toHaveLength(0);
  });

  it('a full strip takes no more tiles', () => {
    mount();
    tray('Step right', 'Step right', 'Step right', 'Step down');
    expect(screen.getAllByRole('button', { name: /^Slot \d: / })).toHaveLength(3);
  });

  it('plays a correct run step by step, then solves: the praise, the stars and Next come after the animal arrived', async () => {
    mount();
    tray('Step right', 'Step right', 'Step down');
    tap('Run');

    // The run plays; nothing can be changed and the engine has not heard of it.
    await play(0);
    expect(actorCell()).toBe('1,0');
    expect(screen.getByRole('img', { name: 'Slot 1: Step right' }).dataset['active']).toBe('true');
    // While it plays the tiles are pictures: nothing in the strip can be tapped.
    expect(screen.queryAllByRole('button', { name: /^Slot \d: / })).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Run' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Step down' }).hasAttribute('disabled')).toBe(true);
    expect(session().dataset['solved']).toBe('false');
    expect(note()).toBeUndefined();

    await play(700);
    expect(actorCell()).toBe('2,0');
    expect(screen.getByRole('img', { name: 'Slot 2: Step right' }).dataset['active']).toBe('true');
    await play(700);
    expect(actorCell()).toBe('2,1');
    expect(session().dataset['solved']).toBe('false');

    await play(700);
    expect(session().dataset['solved']).toBe('true');
    expect(note()).toBe('Amazing!');
    expect(screen.getByTestId('done').dataset['stars']).toBe('3');
    expect(screen.queryByRole('button', { name: 'Run' })).toBeNull();
    // The finished program stays on screen, nothing in it glows.
    expect(screen.getByRole('img', { name: 'Slot 3: Step down' }).dataset['active']).toBe('false');
  });

  it('shows a trail of footprints behind the animal', async () => {
    mount();
    tray('Step right', 'Step right', 'Step down');
    tap('Run');
    await play(0);
    await play(700);
    expect(actorCell()).toBe('2,0');
    expect(screen.getByTestId('grid-trail-0-0')).toBeTruthy();
    expect(screen.getByTestId('grid-trail-1-0')).toBeTruthy();
    expect(screen.queryByTestId('grid-trail-2-0')).toBeNull();
  });

  it('a run that bumps into a rock says so after it played, counts an error and keeps the strip', async () => {
    mount(fixtureExercise('fx-02', 'program'));
    // down, right: the second step walks into the rock.
    tray('Step down', 'Step right');
    tap('Run');
    await play(0);
    expect(note()).toBeUndefined();
    await play(5000);
    expect(note()).toBe('Oops, bumped into a rock at step 2!');
    expect(note()).toBeDefined();
    expect(session().dataset['errors']).toBe('1');
    expect(session().dataset['solved']).toBe('false');
    expect(actorCell()).toBe('0,1');
    expect(screen.getByTestId('grid-actor').getAttribute('data-heading')).toBeNull();
    expect(screen.getByRole('button', { name: 'Slot 2: Step right' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Run' })).toBeTruthy();
  });

  it('names the grid edge when that is what the animal hit', async () => {
    mount();
    tray('Step down', 'Step down');
    tap('Run');
    await play(5000);
    expect(note()).toBe('Oops, Fox hit the edge at step 2!');
    expect(session().dataset['errors']).toBe('1');
  });

  it('a run that ends short says "not there yet", and the animal goes back to the start on the next edit', async () => {
    mount();
    tray('Step right');
    tap('Run');
    await play(5000);
    expect(note()).toBe('Not there yet — try again!');
    expect(session().dataset['errors']).toBe('1');
    expect(actorCell()).toBe('1,0');

    tray('Step right');
    expect(actorCell()).toBe('0,0');
    expect(screen.queryByTestId('grid-trail-0-0')).toBeNull();
  });

  it('the animal also goes back to the start when a tile is taken out, and a new run starts from the start', async () => {
    mount();
    tray('Step right');
    tap('Run');
    await play(5000);
    expect(actorCell()).toBe('1,0');
    tap('Slot 1: Step right');
    expect(actorCell()).toBe('0,0');

    tray('Step right');
    tap('Run');
    await play(5000);
    expect(actorCell()).toBe('1,0');
    tap('Run');
    expect(actorCell()).toBe('0,0');
    await play(0);
    expect(actorCell()).toBe('1,0');
  });

  it('a failed run can be fixed: the next correct run solves with one error (2 stars)', async () => {
    mount();
    tray('Step right');
    tap('Run');
    await play(5000);
    tray('Step right', 'Step down');
    tap('Run');
    await play(10_000);
    expect(screen.getByTestId('done').dataset['stars']).toBe('2');
    expect(note()).toBe('Well done!');
  });

  it('an empty strip: Run stays on, nothing runs, no error counts and the note asks for tiles', async () => {
    mount(reach);
    expect(screen.getByRole('button', { name: 'Run' })).toHaveProperty('disabled', false);
    tap('Run');
    expect(note()).toBe('Add some tiles first');
    expect(session().dataset['errors']).toBe('0');
    expect(actorCell()).toBe('0,0');
    expect(document.querySelector('.card-shake')).not.toBeNull();
    await play(5000);
    expect(actorCell()).toBe('0,0');
    expect(screen.getByRole('button', { name: 'Run' })).toHaveProperty('disabled', false);
  });

  it('too many tiles: nothing runs, no error counts, the strip shakes and the note says so', async () => {
    mount(loop);
    // Repeat 3 times with 3 tiles inside is 4 tiles on a cap of 3.
    tray('Repeat', 'Step right', 'Step right', 'Step right');
    tap('Run');
    expect(note()).toBe('Too many tiles');
    expect(session().dataset['errors']).toBe('0');
    expect(actorCell()).toBe('0,0');
    expect(document.querySelector('.card-shake')).not.toBeNull();
    await play(5000);
    expect(actorCell()).toBe('0,0');
    expect(screen.getByRole('button', { name: 'Run' })).toBeTruthy();
  });

  it('an unfinished strip (a gap in front of a locked tile) does not run either', () => {
    mount(gap);
    // Slots 1 and 4 are locked; only slot 2 is filled.
    tray('Step right');
    tap('Run');
    expect(note()).toBe('Fill the empty steps first');
    expect(session().dataset['errors']).toBe('0');
  });

  it('an empty repeat is unfinished too', () => {
    mount(loop);
    tray('Repeat');
    tap('Run');
    expect(note()).toBe('Fill the empty steps first');
  });

  it('a locked slot shows its lock, cannot be taken out and survives Reset', () => {
    mount(gap);
    const first = screen.getByRole('img', { name: 'Slot 1: Step right, locked' });
    const last = screen.getByRole('img', { name: 'Slot 4: Step down, locked' });
    expect(first.querySelector('[data-testid="lock-mark"]')).not.toBeNull();
    expect(last.querySelector('[data-testid="lock-mark"]')).not.toBeNull();
    fireEvent.click(first);
    fireEvent.click(last);
    expect(screen.getByRole('img', { name: 'Slot 1: Step right, locked' })).toBeTruthy();

    // The empty slots in between take the tray's tiles; the locked ones stay put.
    tray('Step right', 'Step down');
    expect(screen.getByRole('button', { name: 'Slot 2: Step right' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Slot 3: Step down' })).toBeTruthy();
    tap('Reset');
    expect(screen.getByRole('img', { name: 'Slot 1: Step right, locked' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Slot 4: Step down, locked' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Slot 2, empty' })).toBeTruthy();
  });

  it('solves a fix-the-gaps exercise from its prefilled strip', async () => {
    mount(gap);
    tray('Step right', 'Step down');
    tap('Run');
    await play(10_000);
    expect(session().dataset['solved']).toBe('true');
  });

  describe('a repeat', () => {
    it('opens for tiles, takes the next tiles into its body and shows its count', () => {
      mount(loop);
      tray('Repeat');
      const block = within(screen.getByRole('group', { name: 'Slot 1: Repeat 3 times' }));
      expect(block.getByRole('button', { name: 'Put tiles inside slot 1' }).ariaPressed).toBe(
        'true',
      );
      tray('Step right');
      expect(
        block.getByRole('button', { name: 'Slot 1, inside the repeat: Step right' }),
      ).toBeTruthy();
      expect(
        block.getByRole('button', { name: 'Slot 1: Repeat 3 times, tap to change' }).textContent,
      ).toBe('×3');
    });

    it('cycles its count with a tap, 3 up to 9 and round to 2', () => {
      mount(loop);
      tray('Repeat');
      const counts: (string | null)[] = [];
      for (let taps = 0; taps < 8; taps += 1) {
        const badge = screen.getByRole('button', {
          name: /^Slot 1: Repeat \d times, tap to change$/,
        });
        counts.push(badge.textContent);
        fireEvent.click(badge);
      }
      expect(counts).toEqual(['×3', '×4', '×5', '×6', '×7', '×8', '×9', '×2']);
    });

    it('closes on a second tap on its loop, so the next tile goes after it; a tile inside is taken out by a tap', () => {
      mount(loop);
      tray('Repeat', 'Step right');
      tap('Put tiles inside slot 1');
      expect(
        screen
          .getByRole('button', { name: 'Put tiles inside slot 1' })
          .getAttribute('aria-pressed'),
      ).toBe('false');
      tray('Step right');
      expect(screen.getByRole('button', { name: 'Slot 2: Step right' })).toBeTruthy();
      tap('Slot 1, inside the repeat: Step right');
      expect(screen.queryByRole('button', { name: /inside the repeat: Step right/ })).toBeNull();
    });

    it('plays the loop with a "2 of 5" badge and the body tile glowing, then solves', async () => {
      mount(loop);
      tray('Repeat', 'Step right');
      for (let taps = 0; taps < 2; taps += 1) {
        fireEvent.click(
          screen.getByRole('button', { name: /^Slot 1: Repeat \d times, tap to change$/ }),
        );
      }
      expect(
        screen.getByRole('button', { name: 'Slot 1: Repeat 5 times, tap to change' }),
      ).toBeTruthy();
      tap('Run');
      await play(0);
      await play(700);
      // While it plays the block is a picture: its count shows the round, its tile the step.
      const badge = screen.getByRole('img', { name: 'Slot 1: Repeat 5 times' });
      expect(badge.textContent).toBe('2 of 5');
      expect(badge.dataset['iterating']).toBe('true');
      expect(
        screen.getByRole('img', { name: 'Slot 1, inside the repeat: Step right' }).dataset[
          'active'
        ],
      ).toBe('true');
      expect(screen.queryAllByRole('button', { name: /^Slot 1/ })).toHaveLength(0);
      expect(actorCell()).toBe('2,0');

      await play(10_000);
      expect(session().dataset['solved']).toBe('true');
      expect(screen.getByTestId('done').dataset['stars']).toBe('3');
    });
  });

  describe('hints', () => {
    it('1: lights the first cell the solution moves to, and says so', () => {
      mount();
      tap('Hint');
      expect(note()).toBe('Look at the glowing square. Fox goes there first.');
      expect(screen.getByTestId('grid-highlight-1-0').getAttribute('data-kind')).toBe('hint');
      expect(screen.getAllByTestId(/^grid-highlight-/)).toHaveLength(1);
    });

    it('1 on a guided try comes by itself: the cell lights up, the child is not told', () => {
      mount(guided, { guided: true });
      expect(screen.getByTestId('grid-highlight-1-0').getAttribute('data-kind')).toBe('hint');
      expect(note()).toBeUndefined();
      expect(session().dataset['hintLevel']).toBe('1');
    });

    it("2: fades the solution's tiles into the first two empty slots, and follows the strip as it fills", () => {
      mount();
      tap('Hint');
      tap('Hint');
      expect(note()).toBe('The faded tiles show the first steps.');
      const ghosts = (): (string | undefined)[] =>
        screen
          .getAllByRole('img', { name: /^Slot \d, empty$/ })
          .map((slot) => slot.dataset['ghost']);
      expect(ghosts()).toEqual(['right', 'right', undefined]);

      tray('Step right');
      expect(ghosts()).toEqual(['right', 'down']);
      for (const ghost of screen.getAllByTestId('ghost-tile')) {
        expect(ghost.getAttribute('aria-hidden')).toBe('true');
        expect(ghost.className).toContain('opacity-40');
      }
    });

    it('3: fills the strip with the solution; the child still taps Run', async () => {
      mount();
      tray('Step down');
      tap('Hint');
      tap('Hint');
      tap('Hint');
      expect(note()).toBe('Here are all the steps. Tap Run!');
      expect(
        screen
          .getAllByRole('button', { name: /^Slot \d: / })
          .map((slot) => slot.getAttribute('aria-label')),
      ).toEqual(['Slot 1: Step right', 'Slot 2: Step right', 'Slot 3: Step down']);
      expect(session().dataset['solved']).toBe('false');

      tap('Run');
      await play(10_000);
      expect(session().dataset['solved']).toBe('true');
      // Hint 3 costs stars: it is not a 3-star run.
      expect(screen.getByTestId('done').dataset['stars']).toBe('1');
    });

    it('keeps the cell lit while the animal rests after a failed run, and drops it once solved', async () => {
      mount();
      tap('Hint');
      tray('Step right');
      tap('Run');
      await play(5000);
      expect(note()).toBe('Not there yet — try again!');
      // The footprints are on the board: the hint waits until the animal is back at the start.
      expect(screen.queryByTestId('grid-highlight-1-0')).toBeNull();
      tray('Step right', 'Step down');
      expect(screen.getByTestId('grid-highlight-1-0').getAttribute('data-kind')).toBe('hint');

      tap('Run');
      await play(10_000);
      expect(session().dataset['solved']).toBe('true');
      expect(screen.queryAllByTestId(/^grid-highlight-/)).toHaveLength(0);
    });

    it('asked for while a run plays, a hint does not cancel the run (hint 3 waits for the next tap)', async () => {
      mount();
      tray('Step right', 'Step right', 'Step down');
      tap('Run');
      await play(0);
      tap('Hint');
      tap('Hint');
      tap('Hint');
      await play(10_000);
      expect(session().dataset['solved']).toBe('true');
    });

    it('hides the Hint button when hints are off', () => {
      renderCodingUi(<KindHarness def={reach} showHint={false} />);
      expect(screen.queryByRole('button', { name: 'Hint' })).toBeNull();
    });
  });

  it('shows the heading arrow only when the lesson uses relative tiles', () => {
    mount();
    expect(screen.queryByTestId('grid-actor-heading')).toBeNull();
  });

  it('the glow follows the slot, not the place in the program, when the strip has a gap', async () => {
    mount();
    tray('Step right', 'Step right', 'Step down');
    tap('Slot 2: Step right');
    tap('Run');
    await play(0);
    await play(700);
    expect(screen.getByRole('img', { name: 'Slot 3: Step down' }).dataset['active']).toBe('true');
    expect(screen.getByRole('img', { name: 'Slot 1: Step right' }).dataset['active']).toBe('false');
  });

  describe('relative tiles', () => {
    const relative: ProgramDef = {
      id: 'rel-1',
      concept: 'turns',
      textKey: 'lessons:ask-reach',
      type: 'program',
      level: parseLevel(['S..', '..F']),
      tray: ['forward', 'turn-left', 'turn-right', 'jump'],
      cap: 4,
      solution: [
        { kind: 'forward' },
        { kind: 'forward' },
        { kind: 'turn-right' },
        { kind: 'forward' },
      ],
    };

    it('name the tiles for the animal and show which way it faces', () => {
      mount(relative);
      expect(
        within(screen.getByRole('group', { name: 'Tiles' }))
          .getAllByRole('button')
          .map((button) => button.getAttribute('aria-label')),
      ).toEqual(['Step forward', 'Turn left', 'Turn right', 'Jump']);
      expect(screen.getByTestId('grid-actor-heading').getAttribute('data-heading')).toBe('right');
    });

    it('turn in place: the animal keeps its cell and its arrow turns', async () => {
      mount(relative);
      tray('Step forward', 'Turn right');
      tap('Run');
      await play(0);
      expect(actorCell()).toBe('1,0');
      await play(700);
      expect(actorCell()).toBe('1,0');
      expect(screen.getByTestId('grid-actor-heading').getAttribute('data-heading')).toBe('down');
      expect(screen.getByRole('img', { name: 'Row 1, column 2, Fox, facing down' })).toBeTruthy();
    });

    it('is solved by the reference program', async () => {
      mount(relative);
      tray('Step forward', 'Step forward', 'Turn right', 'Step forward');
      tap('Run');
      await play(0);
      await play(10_000);
      expect(session().dataset['solved']).toBe('true');
    });
  });

  it('is the kind UI of "program", with nothing of its own in the session state', () => {
    expect(programUi.type).toBe('program');
    expect(programUi.initUi(reach)).toEqual({});
    expect(programUi.clearWrongUi()).toEqual({});
  });
});

describe('feedback helpers', () => {
  const level = parseLevel(['S.#', '..F']);

  it('a bump names its step, and the edge when the animal left the grid', () => {
    const rock = run(level, [{ kind: 'right' }, { kind: 'right' }]);
    expect(bumpFeedback(level, rock)).toEqual({ step: 2, edge: false });
    const edge = run(level, [{ kind: 'up' }]);
    expect(bumpFeedback(level, edge)).toEqual({ step: 1, edge: true });
    const jump = run(level, [{ kind: 'jump' }, { kind: 'jump' }]);
    expect(bumpFeedback(level, jump)).toEqual({ step: 1, edge: false });
    const forward = run(level, [{ kind: 'turn-left' }, { kind: 'forward' }]);
    expect(bumpFeedback(level, forward)).toEqual({ step: 2, edge: true });
  });

  it('names why a program was refused: no tile, too many, not in the tray, else unfinished', () => {
    expect(invalidReason(reach, [])).toBe('empty');
    expect(
      invalidReason(reach, [
        { kind: 'right' },
        { kind: 'right' },
        { kind: 'right' },
        { kind: 'right' },
      ]),
    ).toBe('too-many');
    expect(invalidReason(reach, [{ kind: 'up' }])).toBe('tray');
    expect(invalidReason(loop, [{ kind: 'repeat', times: 2, body: [] }])).toBe('incomplete');
    expect(invalidReason(gap, [{ kind: 'right' }])).toBe('incomplete');
  });
});
