import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { fixtureExercise } from '../../web/testing/fixtures.ts';
import { KindHarness } from '../../web/testing/KindHarness.tsx';
import { renderCodingUi } from '../../web/testing/render-coding-ui.tsx';
import { predictUi } from './ui.ts';

/** `fx-04`: down, down, right, right, up on S . . * / . # . . / . . . F: the animal ends at column 3, row 2. */
const def = fixtureExercise('fx-04', 'predict');
const guided = fixtureExercise('fx-g2', 'predict');

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const note = (): string | undefined => screen.queryByTestId('note')?.textContent ?? undefined;
const session = (): HTMLElement => screen.getByTestId('session');
const actorCell = (): string | null => screen.getByTestId('grid-actor').getAttribute('data-cell');
const cell = (x: number, y: number): HTMLElement =>
  screen.getByTestId(`grid-cell-${String(x)}-${String(y)}`);
const highlight = (x: number, y: number): string | null | undefined =>
  screen.queryByTestId(`grid-highlight-${String(x)}-${String(y)}`)?.getAttribute('data-kind');

async function play(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function mount(exercise = def, props: { guided?: boolean } = {}) {
  return renderCodingUi(<KindHarness def={exercise} {...props} />);
}

describe('predict UI', () => {
  it('shows the instruction, the program as a read-only strip, the tappable map and Hint — and no Watch or Run', () => {
    mount();
    expect(screen.getByTestId('instruction').textContent).toBe(
      'Where will Fox stop? Tap the square.',
    );
    expect(
      screen
        .getAllByRole('img', { name: /^Tile \d: / })
        .map((tile) => tile.getAttribute('aria-label')),
    ).toEqual([
      'Tile 1: Step down',
      'Tile 2: Step down',
      'Tile 3: Step right',
      'Tile 4: Step right',
      'Tile 5: Step up',
    ]);
    // The strip is for reading: no tile is a button.
    expect(screen.queryByRole('button', { name: /^Tile \d/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Hint' })).toBeTruthy();
    for (const name of ['Watch', 'Run', 'Reset']) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
    expect(actorCell()).toBe('0,0');
  });

  it('makes every cell a button named by its position and what is on it', () => {
    mount();
    const buttons = screen.getAllByRole('button', { name: /^Row \d, column \d/ });
    expect(buttons).toHaveLength(12);
    expect(screen.getByRole('button', { name: 'Row 1, column 1, Fox' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Row 2, column 2, rock' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Row 1, column 4, star' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Row 3, column 4, flag' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Row 2, column 3' })).toBeTruthy();
  });

  it('a wrong tap marks that cell "not right", says so and counts an error', () => {
    mount();
    fireEvent.click(cell(1, 0));
    expect(highlight(1, 0)).toBe('bad');
    expect(screen.getByRole('button', { name: 'Row 1, column 2, not right' })).toBeTruthy();
    expect(note()).toBe('Not that square. Follow the arrows again!');
    expect(session().dataset['errors']).toBe('1');
    expect(session().dataset['solved']).toBe('false');
    expect(actorCell()).toBe('0,0');
  });

  it('the mark moves with the next wrong tap and goes when a hint is asked for', () => {
    mount();
    fireEvent.click(cell(1, 0));
    fireEvent.click(cell(3, 1));
    expect(highlight(1, 0)).toBeUndefined();
    expect(highlight(3, 1)).toBe('bad');
    expect(session().dataset['errors']).toBe('2');

    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    expect(highlight(3, 1)).toBeUndefined();
  });

  it('the right tap plays the program step by step first; the praise comes when the animal has arrived', async () => {
    mount();
    fireEvent.click(cell(2, 1));
    await play(0);
    expect(actorCell()).toBe('0,1');
    expect(session().dataset['solved']).toBe('false');
    expect(note()).toBeUndefined();
    expect(highlight(2, 1)).toBeUndefined();

    // Taps are ignored while it plays.
    fireEvent.click(cell(1, 0));
    expect(session().dataset['errors']).toBe('0');

    await play(700);
    expect(actorCell()).toBe('0,2');
    expect(screen.getByRole('img', { name: 'Tile 2: Step down' }).dataset['active']).toBe('true');
    await play(3 * 700);
    expect(actorCell()).toBe('2,1');
    expect(session().dataset['solved']).toBe('false');

    await play(700);
    expect(session().dataset['solved']).toBe('true');
    expect(highlight(2, 1)).toBe('good');
    expect(screen.getByRole('button', { name: 'Row 2, column 3, Fox, correct' })).toBeTruthy();
    expect(note()).toBe('Amazing!');
    expect(screen.getByTestId('done').dataset['stars']).toBe('3');
    expect(screen.queryByRole('button', { name: 'Hint' })).toBeNull();
  });

  it('a wrong tap first costs a star: the right one then solves with 2', async () => {
    mount();
    fireEvent.click(cell(0, 0));
    fireEvent.click(cell(2, 1));
    await play(10_000);
    expect(screen.getByTestId('done').dataset['stars']).toBe('2');
    expect(highlight(0, 0)).toBeUndefined();
  });

  describe('hints', () => {
    it('1: plays the first 2 steps, then the animal goes back to the start', async () => {
      mount();
      fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
      expect(note()).toBe('Watch the first steps again.');
      await play(0);
      expect(actorCell()).toBe('0,1');
      await play(700);
      expect(actorCell()).toBe('0,2');
      await play(700);
      // Done: it waits there a moment, then returns.
      expect(actorCell()).toBe('0,2');
      await play(900);
      expect(actorCell()).toBe('0,0');
      expect(screen.queryByTestId('grid-trail-0-1')).toBeNull();
      expect(session().dataset['errors']).toBe('0');
    });

    it('2: plays all but the last step, so the child works out only that one', async () => {
      mount();
      fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
      await play(5000);
      fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
      await play(4 * 700);
      expect(actorCell()).toBe('2,2');
      await play(700 + 900);
      expect(actorCell()).toBe('0,0');
    });

    it('3: points at the answer cell', () => {
      mount();
      for (let hints = 0; hints < 3; hints += 1) {
        fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
      }
      expect(note()).toBe('Fox stops on the glowing square.');
      expect(highlight(2, 1)).toBe('target');
      expect(screen.getByRole('button', { name: 'Row 2, column 3, the answer' })).toBeTruthy();
    });

    it('1 on a guided try comes by itself and plays at once', async () => {
      mount(guided, { guided: true });
      await play(0);
      expect(actorCell()).toBe('1,0');
      expect(session().dataset['hintLevel']).toBe('1');
    });

    it('asked for while the right answer plays, a hint does not cancel the run', async () => {
      mount();
      fireEvent.click(cell(2, 1));
      await play(0);
      fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
      await play(20_000);
      expect(session().dataset['solved']).toBe('true');
      expect(highlight(2, 1)).toBe('good');
    });

    it('a tap during the replay is ignored', async () => {
      mount();
      fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
      await play(0);
      fireEvent.click(cell(1, 0));
      expect(session().dataset['errors']).toBe('0');
    });
  });

  it('is the kind UI of "predict", with the wrong cell as its one extra', () => {
    expect(predictUi.type).toBe('predict');
    expect(predictUi.initUi(def)).toEqual({});
    expect(predictUi.clearWrongUi()).toEqual({ wrongCell: undefined });
  });
});
