import { beforeAll, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import i18next from 'i18next';
import { ArrayHarness } from '../../web/testing/ArrayHarness.tsx';
import { renderArrayUi } from '../../web/testing/render-array-ui.tsx';
import type { ArrayDef } from './def.ts';
import { ARRAY_SAMPLES, ARRAY_SAMPLE_TEXTS } from './samples.ts';
import { arrayUi } from './ui.ts';

const { fixed, free, full, single, withReason } = ARRAY_SAMPLES;

const FILLED = '🔵';
const EMPTY = '⚪';

beforeAll(() => {
  // The samples' instructions and reason: no shipped lesson has them yet.
  i18next.addResourceBundle('en', 'lessons', ARRAY_SAMPLE_TEXTS, true, true);
});

function mount(def: ArrayDef = fixed, props: { guided?: boolean; showHint?: boolean } = {}) {
  return renderArrayUi(<ArrayHarness def={def} {...props} />);
}

const cell = (x: number, y: number): HTMLElement =>
  screen.getByTestId(`grid-cell-${String(x)}-${String(y)}`);
/** Taps the cell that makes an array of `rows` x `cols` (its bottom-right corner). */
const tapShape = (rows: number, cols: number): void => {
  fireEvent.click(cell(cols - 1, rows - 1));
};
const check = (): HTMLButtonElement =>
  screen.getByRole<HTMLButtonElement>('button', { name: 'Check' });
const hint = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
};
const note = (): string | undefined => screen.queryByTestId('note')?.textContent ?? undefined;
const session = (): HTMLElement => screen.getByTestId('session');
const caption = (): string => screen.getByTestId('array-caption').textContent;
const live = (): string => screen.getByTestId('array-live').textContent;
const cells = (): HTMLElement[] => screen.getAllByTestId(/^grid-cell-/);
/** The cells drawn as a filled dot, as "x,y". */
const filled = (): string[] =>
  cells()
    .filter((element) => element.textContent === FILLED)
    .map((element) =>
      (element.dataset['testid'] ?? '').replace('grid-cell-', '').replace('-', ','),
    );
const highlights = (kind?: string): HTMLElement[] =>
  screen
    .queryAllByTestId(/^grid-highlight-/)
    .filter((element) => kind === undefined || element.dataset['kind'] === kind);
const highlightAt = (x: number, y: number): string | undefined =>
  screen.queryByTestId(`grid-highlight-${String(x)}-${String(y)}`)?.dataset['kind'];

describe('array UI: the board', () => {
  it('shows the instruction, the prompt card, a 6 x 6 grid of empty dots, and Hint and Check (Check waits for a tap)', () => {
    mount();
    expect(screen.getByTestId('instruction').textContent).toBe(
      'Make 3 rows of 4 dots. Tap the bottom-right dot.',
    );
    expect(screen.getByText('3 × 4')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Dots, 6 by 6' })).toBeTruthy();
    expect(cells()).toHaveLength(36);
    expect(cells().every((element) => element.textContent === EMPTY)).toBe(true);
    expect(screen.getByRole('button', { name: 'Hint' })).toBeTruthy();
    expect(check().disabled).toBe(true);
  });

  it('draws every cell as a button the child can tap (tap targets, not a picture)', () => {
    mount();
    expect(screen.getAllByRole('button', { name: /^Row \d, column \d/ })).toHaveLength(36);
    expect(cell(0, 0).tagName).toBe('BUTTON');
  });

  it('has no prompt card when the def has none', () => {
    mount({ ...fixed, prompt: undefined });
    expect(screen.queryByText('3 × 4')).toBeNull();
    expect(cells()).toHaveLength(36);
  });

  it('shows no count before a hint or a solve: no caption, and nothing to read the answer off', () => {
    mount();
    expect(caption()).toBe('');
    tapShape(3, 4);
    expect(caption()).toBe('');
  });
});

describe('array UI: making the array', () => {
  it('a tap sets the rows to its row and the columns to its column: dots from the top-left cell to the tapped one', () => {
    mount();
    tapShape(3, 4);
    expect(filled()).toHaveLength(12);
    for (let y = 0; y < 6; y += 1) {
      for (let x = 0; x < 6; x += 1) {
        expect(cell(x, y).textContent, `${String(x)},${String(y)}`).toBe(
          x < 4 && y < 3 ? FILLED : EMPTY,
        );
      }
    }
    expect(check().disabled).toBe(false);
  });

  it('the top-left cell is always the first dot: tapping it makes 1 x 1, the last cell the whole grid', () => {
    mount();
    tapShape(1, 1);
    expect(filled()).toEqual(['0,0']);
    tapShape(6, 6);
    expect(filled()).toHaveLength(36);
    tapShape(1, 5);
    expect(filled()).toEqual(['0,0', '1,0', '2,0', '3,0', '4,0']);
  });

  it('another tap replaces the array (it can shrink as well as grow)', () => {
    mount();
    tapShape(5, 5);
    expect(filled()).toHaveLength(25);
    tapShape(2, 3);
    expect(filled()).toHaveLength(6);
    expect(cell(2, 1).textContent).toBe(FILLED);
    expect(cell(3, 1).textContent).toBe(EMPTY);
    expect(cell(2, 2).textContent).toBe(EMPTY);
  });

  it('the keyboard works too: arrows move between cells and Enter taps', () => {
    mount();
    cell(0, 0).focus();
    fireEvent.keyDown(cell(0, 0), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(cell(1, 0));
    fireEvent.keyDown(cell(1, 0), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(cell(1, 1));
    fireEvent.click(document.activeElement as HTMLElement);
    expect(filled()).toHaveLength(4);
  });
});

describe('array UI: accessible names', () => {
  it('names a cell "Row R, column C" (1 from the top-left), and "in your array" once it is inside', () => {
    mount();
    expect(cell(0, 0).getAttribute('aria-label')).toBe('Row 1, column 1');
    expect(cell(5, 5).getAttribute('aria-label')).toBe('Row 6, column 6');
    tapShape(2, 3);
    expect(cell(0, 0).getAttribute('aria-label')).toBe('Row 1, column 1, in your array');
    expect(cell(2, 1).getAttribute('aria-label')).toBe('Row 2, column 3, in your array');
    expect(cell(3, 1).getAttribute('aria-label')).toBe('Row 2, column 4');
    expect(cell(2, 2).getAttribute('aria-label')).toBe('Row 3, column 3');
    expect(screen.getAllByRole('button', { name: /in your array$/ })).toHaveLength(6);
    expect(screen.getByRole('button', { name: 'Row 2, column 3, in your array' })).toBe(cell(2, 1));
  });

  it('keeps the dot emoji out of the names: only the position and the array', () => {
    mount();
    tapShape(1, 1);
    for (const element of cells()) {
      expect(element.getAttribute('aria-label')).toMatch(/^Row \d, column \d(, in your array)?$/);
    }
  });

  it('announces the new shape after each tap in a live region, even before any count shows', () => {
    mount();
    const region = screen.getByTestId('array-live');
    expect(region.getAttribute('role')).toBe('status');
    expect(region.textContent).toBe('');
    tapShape(3, 4);
    expect(live()).toBe('3 rows, 4 in each row');
    expect(caption()).toBe('');
    tapShape(1, 5);
    expect(live()).toBe('1 row, 5 in each row');
    tapShape(6, 1);
    expect(live()).toBe('6 rows, 1 in each row');
    expect(region.textContent).toBe('6 rows, 1 in each row');
  });

  it('the visible caption is hidden from screen readers (the live region says it)', () => {
    mount();
    expect(screen.getByTestId('array-caption').getAttribute('aria-hidden')).toBe('true');
  });
});

describe('array UI: wrong tries', () => {
  it('a wrong Check says so, counts an error, and marks the corner "not right" (orange, not red) while Check waits', () => {
    mount();
    tapShape(3, 5);
    fireEvent.click(check());
    expect(note()).toBe('Count the rows and the dots in each row.');
    expect(screen.getByTestId('note').dataset['tone']).toBe('attention');
    expect(session().dataset['errors']).toBe('1');
    expect(session().dataset['solved']).toBe('false');
    expect(highlightAt(4, 2)).toBe('bad');
    expect(highlights()).toHaveLength(1);
    expect(filled()).toHaveLength(15);
    expect(check().disabled).toBe(true);
    // No count is shown for the wrong array either.
    expect(caption()).toBe('');
  });

  it('the swapped array (rows fixed) says it is the same number, count the rows again', () => {
    mount();
    tapShape(4, 3);
    fireEvent.click(check());
    expect(note()).toBe('Same number, but count the rows again.');
    expect(session().dataset['errors']).toBe('1');
  });

  it('the same number of dots in another shape is the plain count note, not the swap', () => {
    mount();
    tapShape(2, 6);
    fireEvent.click(check());
    expect(note()).toBe('Count the rows and the dots in each row.');
  });

  it('a shape with a reason speaks it instead of the default note', () => {
    mount(withReason);
    tapShape(2, 4);
    fireEvent.click(check());
    expect(note()).toBe('Each row needs 5 dots. Count along one row.');
    tapShape(2, 6);
    fireEvent.click(check());
    expect(note()).toBe('Count the rows and the dots in each row.');
    expect(session().dataset['errors']).toBe('2');
  });

  it('Check waits until another corner is tapped, so one wrong array never costs two errors', () => {
    mount();
    tapShape(3, 5);
    fireEvent.click(check());
    expect(check().disabled).toBe(true);
    fireEvent.click(check());
    expect(session().dataset['errors']).toBe('1');
    // Tapping the same corner again changes nothing.
    tapShape(3, 5);
    expect(check().disabled).toBe(true);
    expect(highlightAt(4, 2)).toBe('bad');

    tapShape(2, 5);
    expect(check().disabled).toBe(false);
    expect(highlights()).toHaveLength(0);
    fireEvent.click(check());
    expect(session().dataset['errors']).toBe('2');
  });

  it('a hint lets the same array be checked again, and takes the mark off', () => {
    mount();
    tapShape(3, 5);
    fireEvent.click(check());
    hint();
    expect(check().disabled).toBe(false);
    expect(highlightAt(4, 2)).toBeUndefined();
  });

  it('a wrong try never ends the exercise: the right array still solves it', () => {
    mount();
    tapShape(4, 3);
    fireEvent.click(check());
    tapShape(3, 4);
    fireEvent.click(check());
    expect(session().dataset['solved']).toBe('true');
    expect(session().dataset['errors']).toBe('1');
  });
});

describe('array UI: rows fixed or free', () => {
  it('fixed: only rows x columns solves', () => {
    mount();
    tapShape(4, 3);
    fireEvent.click(check());
    expect(session().dataset['solved']).toBe('false');
  });

  it('free: either order solves, with 3 stars', () => {
    mount(free);
    tapShape(3, 4);
    fireEvent.click(check());
    expect(session().dataset['solved']).toBe('true');
    expect(screen.getByTestId('done').dataset['stars']).toBe('3');
    expect(caption()).toBe('3 rows of 4');
  });

  it('free: the shape the def says solves too', () => {
    mount(free);
    tapShape(4, 3);
    fireEvent.click(check());
    expect(session().dataset['solved']).toBe('true');
    expect(caption()).toBe('4 rows of 3');
  });
});

describe('array UI: solved', () => {
  it('the right array solves: praise, 3 stars, the corner in the good colour, the count shown, the grid locked', () => {
    mount();
    tapShape(3, 4);
    expect(highlights()).toHaveLength(0);
    fireEvent.click(check());
    expect(session().dataset['solved']).toBe('true');
    expect(screen.getByTestId('done').dataset['stars']).toBe('3');
    expect(note()).toBe('Amazing!');
    expect(highlightAt(3, 2)).toBe('good');
    expect(highlights()).toHaveLength(1);
    expect(caption()).toBe('3 rows of 4');
    expect(screen.queryByRole('button', { name: 'Check' })).toBeNull();
    // Nothing moves any more.
    tapShape(6, 6);
    expect(filled()).toHaveLength(12);
    expect(caption()).toBe('3 rows of 4');
    expect(live()).toBe('3 rows, 4 in each row');
  });

  it('a one-row array says "1 row of 5"', () => {
    mount(single);
    tapShape(1, 5);
    fireEvent.click(check());
    expect(caption()).toBe('1 row of 5');
  });

  it('the whole grid is a valid array', () => {
    mount(full);
    tapShape(6, 6);
    expect(filled()).toHaveLength(36);
    fireEvent.click(check());
    expect(session().dataset['solved']).toBe('true');
    expect(caption()).toBe('6 rows of 6');
  });

  it('a wrong try first costs a star', () => {
    mount();
    tapShape(3, 5);
    fireEvent.click(check());
    tapShape(3, 4);
    fireEvent.click(check());
    expect(screen.getByTestId('done').dataset['stars']).toBe('2');
    expect(note()).toBe('Well done!');
  });
});

describe('array UI: hints', () => {
  it('hint 1 says rows go across and draws nothing', () => {
    mount();
    hint();
    expect(note()).toBe('Rows go across, like lines in a book.');
    expect(highlights()).toHaveLength(0);
    expect(caption()).toBe('');
  });

  it('hint 2 gives the row total: the first row outlined, the note, and the count once an array is made', () => {
    mount();
    hint();
    hint();
    expect(note()).toBe('Each row has 4.');
    expect(highlights('hint').map((element) => element.dataset['testid'])).toEqual([
      'grid-highlight-0-0',
      'grid-highlight-1-0',
      'grid-highlight-2-0',
      'grid-highlight-3-0',
    ]);
    // Nothing is made yet, so there is nothing to count.
    expect(caption()).toBe('');
    tapShape(2, 2);
    expect(caption()).toBe('2 rows of 2');
    tapShape(3, 4);
    expect(caption()).toBe('3 rows of 4');
  });

  it('hint 3 outlines the rows of the answer; the child still taps the corner and Check', () => {
    mount();
    hint();
    hint();
    hint();
    expect(note()).toBe('Here is the answer.');
    expect(highlights('hint')).toHaveLength(12);
    expect(highlightAt(3, 2)).toBe('hint');
    expect(highlightAt(4, 2)).toBeUndefined();
    expect(highlightAt(3, 3)).toBeUndefined();
    expect(session().dataset['solved']).toBe('false');
    expect(filled()).toHaveLength(0);
    expect(check().disabled).toBe(true);
    tapShape(3, 4);
    expect(highlightAt(3, 2)).toBe('hint');
    fireEvent.click(check());
    expect(session().dataset['solved']).toBe('true');
    expect(screen.getByTestId('done').dataset['stars']).toBe('1');
    expect(highlightAt(3, 2)).toBe('good');
  });

  it('the hint outlines read the def: a single row, the whole grid, a free item', () => {
    mount(single);
    hint();
    hint();
    expect(highlights('hint')).toHaveLength(5);
    hint();
    expect(highlights('hint')).toHaveLength(5);
  });

  it('the whole grid outlined by hint 3', () => {
    mount(full);
    hint();
    hint();
    expect(highlights('hint')).toHaveLength(6);
    hint();
    expect(highlights('hint')).toHaveLength(36);
  });

  it('a free item outlines its own shape (rows x columns of the def)', () => {
    mount(free);
    hint();
    hint();
    hint();
    expect(highlights('hint')).toHaveLength(12);
    expect(highlightAt(2, 3)).toBe('hint');
    expect(highlightAt(3, 0)).toBeUndefined();
  });

  it('the outlines stay after a wrong try (the wrong corner is marked over them)', () => {
    mount();
    hint();
    hint();
    hint();
    tapShape(3, 5);
    fireEvent.click(check());
    expect(highlights('hint')).toHaveLength(12);
    expect(highlightAt(4, 2)).toBe('bad');
  });

  it('a guided try starts with hint 1 (the bubble stays quiet, nothing is drawn)', () => {
    mount(ARRAY_SAMPLES.guided, { guided: true });
    expect(session().dataset['hintLevel']).toBe('1');
    expect(note()).toBeUndefined();
    expect(highlights()).toHaveLength(0);
  });

  it('without hints (an assessment task) there is no Hint button', () => {
    mount(fixed, { showHint: false });
    expect(screen.queryByRole('button', { name: 'Hint' })).toBeNull();
    expect(check()).toBeTruthy();
  });
});

describe('array UI: the kind UI itself', () => {
  it('clears the wrong mark on a hint, and starts with none', () => {
    expect(arrayUi.clearWrongUi()).toEqual({ wrongShape: undefined });
    expect(arrayUi.initUi(fixed)).toEqual({});
  });

  it('turns a wrong outcome into the array note (the reason, the swap, or the plain one) with the checked shape', () => {
    const state = { def: fixed, moves: 1, solved: false, errors: 1, hintLevel: 0 } as const;
    const reasoned = { ...state, def: withReason } as const;
    const make = (rows: number, cols: number) => ({ type: 'make-array', rows, cols }) as const;
    expect(arrayUi.toUi({ kind: 'wrong', rows: 3, cols: 5 }, make(3, 5), state)).toEqual({
      feedback: { kind: 'array-wrong' },
      hint: null,
      wrongShape: { rows: 3, cols: 5 },
    });
    expect(arrayUi.toUi({ kind: 'wrong', rows: 4, cols: 3 }, make(4, 3), state)).toEqual({
      feedback: { kind: 'array-wrong', swapped: true },
      hint: null,
      wrongShape: { rows: 4, cols: 3 },
    });
    expect(arrayUi.toUi({ kind: 'wrong', rows: 2, cols: 4 }, make(2, 4), reasoned)).toEqual({
      feedback: { kind: 'array-wrong', reasonKey: 'lessons:bugs.array-short' },
      hint: null,
      wrongShape: { rows: 2, cols: 4 },
    });
  });

  it('a reason beats the swap note', () => {
    const state = {
      def: { ...fixed, reasons: [{ rows: 4, cols: 3, reasonKey: 'lessons:bugs.turned' }] },
      moves: 1,
      solved: false,
      errors: 1,
      hintLevel: 0,
    } as const;
    expect(
      arrayUi.toUi(
        { kind: 'wrong', rows: 4, cols: 3 },
        { type: 'make-array', rows: 4, cols: 3 },
        state,
      ).feedback,
    ).toEqual({ kind: 'array-wrong', reasonKey: 'lessons:bugs.turned' });
  });

  it('turns a solved (or late, ignored) outcome into praise and clears the mark; an invalid size is no note', () => {
    const state = { def: fixed, moves: 1, solved: true, errors: 0, hintLevel: 0 } as const;
    const action = { type: 'make-array', rows: 3, cols: 4 } as const;
    expect(arrayUi.toUi({ kind: 'solved' }, action, state)).toEqual({
      feedback: { kind: 'solved' },
      hint: null,
      wrongShape: undefined,
    });
    expect(arrayUi.toUi({ kind: 'ignored' }, action, state).feedback).toEqual({ kind: 'solved' });
    expect(arrayUi.toUi({ kind: 'invalid' }, action, state).feedback).toEqual({
      kind: 'instruction',
    });
  });
});
