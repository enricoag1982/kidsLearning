import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { stubMatchMedia } from '@learn/platform-web/testing/mock-media-query.ts';
import { GridFillHarness } from '../../web/testing/GridFillHarness.tsx';
import { renderGridUi } from '../../web/testing/render-grid-ui.tsx';
import type { CellValue, CrossPuzzle, GridFillAction, GridFillDef, GridFillState } from './def.ts';
import { gridFillKind } from './kind.ts';
import { GRID_FILL_SAMPLES } from './samples.ts';
import { gridFillSolution } from './solution.ts';
import { gridFillUi } from './ui.ts';

const { lastCell, hiddenSingle, nakedSingle, all, six, castle, cat } = GRID_FILL_SAMPLES;

afterEach(() => {
  vi.useRealTimers();
});

function mount(def: GridFillDef, props: { guided?: boolean; showHint?: boolean } = {}) {
  return renderGridUi(<GridFillHarness def={def} {...props} />);
}

/** The cell at row-major `index` of `def`'s grid. */
const cell = (def: GridFillDef, index: number): HTMLElement => {
  const { size } = def.puzzle;
  return screen.getByTestId(
    `grid-cell-${String(index % size)}-${String(Math.floor(index / size))}`,
  );
};
const tap = (def: GridFillDef, index: number): void => {
  fireEvent.click(cell(def, index));
};
const put = (digit: number): void => {
  fireEvent.click(screen.getByRole('button', { name: `Put ${String(digit)}` }));
};
const hint = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
};
/** Focuses a cell the way a keyboard user arrives on it (the board follows focus with its selection). */
const focus = (def: GridFillDef, index: number): void => {
  act(() => {
    cell(def, index).focus();
  });
};
const notesToggle = (): HTMLElement => screen.getByRole('button', { name: 'Notes' });
const radio = (name: 'Fill' | 'Cross'): HTMLElement => screen.getByRole('radio', { name });
const note = (): string | undefined => screen.queryByTestId('note')?.textContent ?? undefined;
const session = (): HTMLElement => screen.getByTestId('session');
const errors = (): string | undefined => session().dataset['errors'];
const label = (def: GridFillDef, index: number): string =>
  cell(def, index).getAttribute('aria-label') ?? '';

/** The row-major indices of the cells carrying a ring of `kind`. */
function ringed(def: GridFillDef, kind: string): number[] {
  const { size } = def.puzzle;
  return screen
    .queryAllByTestId(/^grid-highlight-/)
    .filter((element) => element.dataset['kind'] === kind)
    .map((element) => {
      const [x, y] = (element.dataset['testid'] ?? '').replace('grid-highlight-', '').split('-');
      return Number(y) * size + Number(x);
    })
    .sort((a, b) => a - b);
}

/** Plays `def`'s solution through the UI: a sudoku entry is the cell then its number, a picture entry the tool then the cell. */
function playSolution(def: GridFillDef): void {
  for (const action of gridFillSolution(def)) {
    if (action.type !== 'set-cell') {
      throw new Error('a solution is made of entries');
    }
    if (typeof action.value === 'number') {
      tap(def, action.cell);
      put(action.value);
    } else {
      fireEvent.click(radio(action.value === 'fill' ? 'Fill' : 'Cross'));
      tap(def, action.cell);
    }
  }
}

/** The units of the 4 x 4 samples, as row-major indices. */
const ROW = (row: number): number[] => [0, 1, 2, 3].map((column) => row * 4 + column);
const COLUMN = (column: number): number[] => [0, 1, 2, 3].map((row) => row * 4 + column);

describe('grid-fill UI: the board', () => {
  it('shows a sudoku as a labelled board with its givens, the number pad (1..size), Notes and Hint', () => {
    mount(lastCell);
    expect(screen.getByTestId('instruction').textContent).toBe(
      'Fill the grid: each row, column and box has every number once.',
    );
    expect(screen.getByRole('group', { name: 'Sudoku, 4 by 4' })).toBeTruthy();
    expect(screen.getAllByTestId(/^grid-cell-/)).toHaveLength(16);
    expect(label(lastCell, 0)).toBe('row 1, column 1, 3, given');
    expect(label(lastCell, 6)).toBe('row 2, column 3');
    expect(
      Array.from(screen.getByTestId('grid-digits').querySelectorAll('button')).map((button) =>
        button.getAttribute('aria-label'),
      ),
    ).toEqual(['Put 1', 'Put 2', 'Put 3', 'Put 4']);
    expect(notesToggle().getAttribute('aria-pressed')).toBe('false');
    expect(notesToggle().querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Hint' })).toBeTruthy();
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('a 6 x 6 has a pad of 1..6 and boxes of 3 columns by 2 rows; a 4 x 4 has 2 x 2 boxes (thick edges between them)', () => {
    const view = mount(lastCell);
    expect(cell(lastCell, 5).dataset['boxEdges']).toBe('right bottom');
    expect(cell(lastCell, 0).dataset['boxEdges']).toBeUndefined();
    view.unmount();

    mount(six);
    expect(screen.getByRole('group', { name: 'Sudoku, 6 by 6' })).toBeTruthy();
    expect(screen.getByTestId('grid-digits').querySelectorAll('button')).toHaveLength(6);
    // Column 3 (x = 2) ends the first box row-wise; row 2 (y = 1) ends the first box column-wise.
    expect(cell(six, 8).dataset['boxEdges']).toBe('right bottom');
    expect(cell(six, 6).dataset['boxEdges']).toBe('bottom');
    expect(cell(six, 3).dataset['boxEdges']).toBe('left');
  });

  it('draws a given in bold ink and an entry in its own style, and names a given "given"', () => {
    mount(lastCell);
    const style = (index: number): string | undefined =>
      cell(lastCell, index).querySelector<HTMLElement>('[data-style]')?.dataset['style'];
    expect(style(0)).toBe('given');
    tap(lastCell, 6);
    put(4);
    expect(style(6)).toBe('entry');
    expect(label(lastCell, 6)).toBe('row 2, column 3, 4, selected');
  });

  it('a picture cross has clue lanes (a column clue above, a row clue left), the tools Fill and Cross, and no number pad', () => {
    mount(castle);
    expect(screen.getByTestId('instruction').textContent).toBe(
      'Fill the cells to match the clues. Find the picture!',
    );
    expect(screen.getByRole('group', { name: 'Picture cross, 5 by 5' })).toBeTruthy();
    expect(screen.getByTestId('grid-clue-top-2').textContent).toBe('22');
    expect(screen.getByTestId('grid-clue-top-0').textContent).toBe('5');
    expect(screen.getByTestId('grid-clue-left-0').textContent).toBe('111');
    expect(label(castle, 7)).toContain('column clue 2 2');
    expect(label(castle, 7)).toContain('row clue 5');
    expect(screen.getByRole('radiogroup', { name: 'Tool' })).toBeTruthy();
    expect(screen.queryByTestId('grid-digits')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Notes' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Hint' })).toBeTruthy();
  });

  it('every control is a 56 px target: the pad, Notes, the tools and Hint', () => {
    mount(six);
    const classes = (element: HTMLElement): string => element.className;
    for (const button of screen.getByTestId('grid-digits').querySelectorAll('button')) {
      expect(button.className).toMatch(/\bh-14\b/);
      expect(button.className).toMatch(/\bmin-w-14\b/);
    }
    expect(classes(notesToggle())).toMatch(/\bh-14\b/);
    expect(classes(screen.getByRole('button', { name: 'Hint' }))).toMatch(/\bh-14\b/);
  });

  it('the tools are 56 px targets too', () => {
    mount(castle);
    expect(radio('Fill').className).toMatch(/\bh-14\b/);
    expect(radio('Cross').className).toMatch(/\bh-14\b/);
  });

  it('shows the prompt card above the board when the def has one, and none otherwise', () => {
    const view = mount(lastCell);
    expect(screen.queryByText('🧩')).toBeNull();
    view.unmount();
    mount({ ...lastCell, prompt: { emoji: '🧩' } });
    expect(screen.getByText('🧩')).toBeTruthy();
    expect(screen.getAllByTestId(/^grid-cell-/)).toHaveLength(16);
  });

  it('has no Hint button when hints are off (an assessment)', () => {
    mount(lastCell, { showHint: false });
    expect(screen.queryByRole('button', { name: 'Hint' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Notes' })).toBeTruthy();
  });
});

describe('grid-fill UI: playing to the end', () => {
  // One test per sample: each plays its whole solution through the real controls (a 6 x 6 or a picture is 12 to 25 entries).
  it.each(Object.values(GRID_FILL_SAMPLES))(
    'plays $id to solved through the UI with 3 stars: no error, no hint, no number pad or tools left',
    (def) => {
      mount(def);
      playSolution(def);
      expect(session().dataset['solved']).toBe('true');
      expect(session().dataset['errors']).toBe('0');
      expect(session().dataset['hintLevel']).toBe('0');
      expect(screen.getByTestId('done').dataset['stars']).toBe('3');
      expect(screen.queryByRole('button', { name: 'Hint' })).toBeNull();
      expect(screen.queryByTestId('grid-digits')).toBeNull();
      expect(screen.queryByRole('radiogroup')).toBeNull();
    },
  );

  it('a right entry goes back to the instruction: no note under it, until the last one brings the praise', () => {
    mount(lastCell);
    tap(lastCell, 6);
    put(4);
    expect(note()).toBeUndefined();
    expect(session().dataset['moves']).toBe('1');
    tap(lastCell, 8);
    put(4);
    tap(lastCell, 11);
    put(1);
    tap(lastCell, 13);
    put(1);
    tap(lastCell, 14);
    put(3);
    expect(note()).toBe('Amazing!');
    expect(screen.getByTestId('note').dataset['tone']).toBe('praise');
  });

  it('a solved grid takes no more taps and shows no selection', () => {
    mount(lastCell);
    playSolution(lastCell);
    expect(ringed(lastCell, 'selected')).toEqual([]);
    tap(lastCell, 0);
    expect(ringed(lastCell, 'selected')).toEqual([]);
  });
});

describe('grid-fill UI: selecting and notes', () => {
  it('a tap selects a cell (a ring and "selected" in its name); another tap moves the selection; a given can be selected', () => {
    mount(lastCell);
    expect(ringed(lastCell, 'selected')).toEqual([]);
    tap(lastCell, 6);
    expect(ringed(lastCell, 'selected')).toEqual([6]);
    expect(label(lastCell, 6)).toBe('row 2, column 3, selected');
    tap(lastCell, 0);
    expect(ringed(lastCell, 'selected')).toEqual([0]);
  });

  it('a number pressed over a given or an entry changes nothing and costs nothing', () => {
    mount(lastCell);
    tap(lastCell, 0);
    put(2);
    expect(label(lastCell, 0)).toBe('row 1, column 1, 3, selected, given');
    expect(errors()).toBe('0');
    expect(session().dataset['moves']).toBe('0');
    expect(note()).toBeUndefined();
  });

  it('Notes mode names the pad "Note d" and puts a pencil mark in the selected cell: no move, no error, no note', () => {
    mount(lastCell);
    tap(lastCell, 6);
    fireEvent.click(notesToggle());
    expect(notesToggle().getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Note 3' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Put 3' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Note 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Note 1' }));
    expect(screen.getByTestId('grid-marks-2-1').textContent).toBe('13');
    expect(label(lastCell, 6)).toBe('row 2, column 3, selected, notes 1 and 3');
    expect(session().dataset['moves']).toBe('0');
    expect(errors()).toBe('0');
    expect(note()).toBeUndefined();
  });

  it('a note put in notes mode can be a wrong number: nothing is checked, it is only a mark', () => {
    mount(lastCell);
    tap(lastCell, 6);
    fireEvent.click(notesToggle());
    fireEvent.click(screen.getByRole('button', { name: 'Note 1' }));
    expect(errors()).toBe('0');
    expect(note()).toBeUndefined();
    expect(ringed(lastCell, 'bad')).toEqual([]);
  });

  it('the same note again takes the mark back; the last mark gone, the cell is empty again', () => {
    mount(lastCell);
    tap(lastCell, 6);
    fireEvent.click(notesToggle());
    fireEvent.click(screen.getByRole('button', { name: 'Note 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Note 3' }));
    expect(screen.queryByTestId('grid-marks-2-1')).toBeNull();
  });

  it('Notes off brings "Put d" back; a right number clears the cell’s marks', () => {
    mount(lastCell);
    tap(lastCell, 6);
    fireEvent.click(notesToggle());
    fireEvent.click(screen.getByRole('button', { name: 'Note 2' }));
    fireEvent.click(notesToggle());
    expect(notesToggle().getAttribute('aria-pressed')).toBe('false');
    put(4);
    expect(screen.queryByTestId('grid-marks-2-1')).toBeNull();
    expect(label(lastCell, 6)).toBe('row 2, column 3, 4, selected');
  });

  it('notes mode stays on from cell to cell (it is a mode, not a one-off)', () => {
    mount(lastCell);
    fireEvent.click(notesToggle());
    tap(lastCell, 6);
    fireEvent.click(screen.getByRole('button', { name: 'Note 4' }));
    tap(lastCell, 8);
    fireEvent.click(screen.getByRole('button', { name: 'Note 4' }));
    expect(screen.getByTestId('grid-marks-2-1').textContent).toBe('4');
    expect(screen.getByTestId('grid-marks-0-2').textContent).toBe('4');
  });

  it('a number with no cell selected does nothing but ask for a cell: "Tap a cell first."', () => {
    mount(lastCell);
    put(3);
    expect(note()).toBe('Tap a cell first.');
    expect(screen.getByTestId('note').dataset['tone']).toBe('attention');
    expect(errors()).toBe('0');
    expect(session().dataset['moves']).toBe('0');
    expect(label(lastCell, 6)).toBe('row 2, column 3');

    // Notes mode asks the same.
    fireEvent.click(notesToggle());
    fireEvent.click(screen.getByRole('button', { name: 'Note 3' }));
    expect(note()).toBe('Tap a cell first.');

    // A cell and a right number: the note is gone.
    fireEvent.click(notesToggle());
    tap(lastCell, 6);
    put(4);
    expect(note()).toBeUndefined();
  });
});

describe('grid-fill UI: a rejected entry', () => {
  it('a number already in the column: the cell shakes, the column rings "not right" for a moment, the Owl names the column', () => {
    vi.useFakeTimers();
    mount(lastCell);
    tap(lastCell, 8);
    put(1);
    expect(note()).toBe('That number is already in this column.');
    expect(screen.getByTestId('note').dataset['tone']).toBe('attention');
    expect(errors()).toBe('1');
    expect(ringed(lastCell, 'bad')).toEqual(COLUMN(0));
    expect(cell(lastCell, 8).classList.contains('card-shake')).toBe(true);
    // The entry is not kept: the cell is named for its ring only.
    expect(label(lastCell, 8)).toBe('row 3, column 1, not right');

    act(() => {
      vi.advanceTimersByTime(1199);
    });
    expect(ringed(lastCell, 'bad')).toEqual(COLUMN(0));
    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(ringed(lastCell, 'bad')).toEqual([]);
    // The note stays until the next action.
    expect(note()).toBe('That number is already in this column.');
    // The selection is back once the rings are gone.
    expect(ringed(lastCell, 'selected')).toEqual([8]);
  });

  it('a number already in the row rings the row', () => {
    mount(lastCell);
    tap(lastCell, 6);
    put(1);
    expect(note()).toBe('That number is already in this row.');
    expect(ringed(lastCell, 'bad')).toEqual(ROW(1));
  });

  it('a number already in the box rings the box (cells 8, 9, 12, 13 of the 4 x 4)', () => {
    mount(hiddenSingle);
    tap(hiddenSingle, 12);
    put(4);
    expect(note()).toBe('That number is already in this box.');
    expect(ringed(hiddenSingle, 'bad')).toEqual([8, 9, 12, 13]);
  });

  it('a wrong number that no unit shows asks which numbers can still go there, and rings nothing', () => {
    mount(hiddenSingle);
    tap(hiddenSingle, 14);
    put(1);
    expect(note()).toBe('Not yet. Which numbers can still go here?');
    expect(ringed(hiddenSingle, 'bad')).toEqual([]);
    expect(errors()).toBe('1');
    expect(cell(hiddenSingle, 14).classList.contains('card-shake')).toBe(true);
  });

  it('shakes again when the same cell is rejected twice, and the shake is gone once the animation ends', () => {
    mount(lastCell);
    tap(lastCell, 8);
    put(1);
    const target = cell(lastCell, 8);
    expect(target.classList.contains('card-shake')).toBe(true);
    fireEvent.animationEnd(target);
    expect(target.classList.contains('card-shake')).toBe(false);
    put(1);
    expect(target.classList.contains('card-shake')).toBe(true);
    expect(errors()).toBe('2');
  });

  it('with reduced motion nothing shakes; the ring and the note are all there is', () => {
    const restore = stubMatchMedia('(prefers-reduced-motion: reduce)');
    try {
      mount(lastCell);
      tap(lastCell, 8);
      put(1);
      expect(cell(lastCell, 8).classList.contains('card-shake')).toBe(false);
      expect(ringed(lastCell, 'bad')).toEqual(COLUMN(0));
      expect(note()).toBe('That number is already in this column.');
    } finally {
      restore();
    }
  });

  it('a right number after a wrong one takes the note and the rings away; the error stays counted (2 stars)', () => {
    mount(lastCell);
    tap(lastCell, 8);
    put(1);
    put(4);
    expect(note()).toBeUndefined();
    expect(ringed(lastCell, 'bad')).toEqual([]);
    expect(errors()).toBe('1');
    tap(lastCell, 6);
    put(4);
    tap(lastCell, 11);
    put(1);
    tap(lastCell, 13);
    put(1);
    tap(lastCell, 14);
    put(3);
    expect(screen.getByTestId('done').dataset['stars']).toBe('2');
  });

  it('a picture entry the clues rule out is rejected, not kept: its row rings and the Owl names the clue', () => {
    mount(castle);
    fireEvent.click(radio('Cross'));
    tap(castle, 0);
    expect(note()).toBe("That does not match this row's clue.");
    expect(ringed(castle, 'bad')).toEqual([0, 1, 2, 3, 4]);
    expect(errors()).toBe('1');
    // Not kept: the cell is still empty.
    expect(label(castle, 0)).not.toContain('crossed');
  });

  it('a picture fill the clues rule out is rejected the same way', () => {
    mount(castle);
    tap(castle, 1);
    expect(note()).toBe("That does not match this row's clue.");
    expect(ringed(castle, 'bad')).toEqual([0, 1, 2, 3, 4]);
    expect(label(castle, 1)).not.toContain('filled');
  });

  it('a picture entry no line shows is "not this one"', () => {
    mount(cat);
    tap(cat, 0);
    expect(note()).toBe('Not this one. Check the clues again.');
    expect(ringed(cat, 'bad')).toEqual([]);
  });
});

describe('grid-fill UI: hints', () => {
  it('hint 1 rings the unit of the step and asks to look at it; hint 2 names the technique and rings the cell; hint 3 fills it and flashes', () => {
    vi.useFakeTimers();
    mount(lastCell);
    hint();
    expect(note()).toBe('Look at this row.');
    expect(ringed(lastCell, 'hint')).toEqual(ROW(1));
    expect(ringed(lastCell, 'target')).toEqual([]);

    hint();
    expect(note()).toBe('Only one cell is empty here. Which number is missing?');
    expect(ringed(lastCell, 'target')).toEqual([6]);
    expect(ringed(lastCell, 'hint')).toEqual([4, 5, 7]);

    hint();
    expect(note()).toBe('Watch: here it goes.');
    expect(label(lastCell, 6)).toBe('row 2, column 3, 4, correct');
    expect(ringed(lastCell, 'good')).toEqual([6]);
    expect(ringed(lastCell, 'hint')).toEqual([]);
    expect(ringed(lastCell, 'target')).toEqual([]);
    expect(session().dataset['hintLevel']).toBe('3');
    expect(errors()).toBe('0');

    act(() => {
      vi.advanceTimersByTime(1201);
    });
    expect(ringed(lastCell, 'good')).toEqual([]);
    expect(label(lastCell, 6)).toBe('row 2, column 3, 4');
  });

  it('a naked single rings its row, column and box and says to look at the cell; hint 2 says it has one number left', () => {
    mount(nakedSingle);
    hint();
    expect(note()).toBe('Look at this cell and the row, column and box around it.');
    expect(ringed(nakedSingle, 'hint')).toEqual([0, 1, 2, 3, 4, 5, 8, 12]);
    hint();
    expect(note()).toBe('This cell has only one number left. Cross out the others.');
    expect(ringed(nakedSingle, 'target')).toEqual([0]);
    // The hint names no number: the cell itself is still empty.
    expect(label(nakedSingle, 0)).toBe('row 1, column 1, target');
  });

  it('a 6 x 6 naked single rings three units (its row, column and box of 3 x 2)', () => {
    mount(six);
    hint();
    expect(note()).toBe('Look at this cell and the row, column and box around it.');
    // Row 0, column 3 and box 1 (columns 3..5 of rows 0..1).
    expect(ringed(six, 'hint')).toEqual([0, 1, 2, 3, 4, 5, 9, 10, 11, 15, 21, 27, 33]);
  });

  it('a right entry takes the rings away and the next hint starts again at level 1 (the exercise keeps the highest level)', () => {
    mount(lastCell);
    hint();
    hint();
    expect(ringed(lastCell, 'target')).toEqual([6]);
    tap(lastCell, 6);
    put(4);
    expect(ringed(lastCell, 'hint')).toEqual([]);
    expect(ringed(lastCell, 'target')).toEqual([]);
    expect(note()).toBeUndefined();
    hint();
    expect(note()).toBe('Look at this column.');
    expect(ringed(lastCell, 'hint')).toEqual(COLUMN(0));
    expect(session().dataset['hintLevel']).toBe('2');
  });

  it('a wrong entry after a hint rings its unit instead for a moment, then the hint is back; the hint note gives way to the wrong note', () => {
    vi.useFakeTimers();
    mount(lastCell);
    hint();
    tap(lastCell, 8);
    put(1);
    expect(note()).toBe('That number is already in this column.');
    expect(ringed(lastCell, 'bad')).toEqual(COLUMN(0));
    act(() => {
      vi.advanceTimersByTime(1300);
    });
    expect(ringed(lastCell, 'bad')).toEqual([]);
    expect(ringed(lastCell, 'hint')).toEqual(ROW(1));
    // The next hint press goes on with the ladder.
    hint();
    expect(note()).toBe('Only one cell is empty here. Which number is missing?');
  });

  it('a note put while a hint shows keeps the hint and its note', () => {
    mount(lastCell);
    hint();
    tap(lastCell, 8);
    fireEvent.click(notesToggle());
    fireEvent.click(screen.getByRole('button', { name: 'Note 2' }));
    expect(note()).toBe('Look at this row.');
    expect(ringed(lastCell, 'hint')).toEqual(ROW(1));
  });

  it('hint 3 can finish the exercise: the cell flashes, the exercise is solved with 1 star', () => {
    mount(lastCell);
    for (const [cellIndex, digit] of [
      [6, 4],
      [8, 4],
      [11, 1],
      [13, 1],
    ] as const) {
      tap(lastCell, cellIndex);
      put(digit);
    }
    hint();
    hint();
    hint();
    expect(session().dataset['solved']).toBe('true');
    expect(ringed(lastCell, 'good')).toEqual([14]);
    expect(screen.getByTestId('done').dataset['stars']).toBe('1');
  });

  it('a picture hint rings the line of its step and names the technique; level 2 rings no cell; level 3 fills the cell it names and flashes it', () => {
    mount(castle);
    hint();
    expect(note()).toBe('Look at this row and its clue.');
    expect(ringed(castle, 'hint')).toEqual([0, 1, 2, 3, 4]);
    hint();
    expect(note()).toBe('This clue fills the whole line.');
    expect(ringed(castle, 'target')).toEqual([]);
    expect(ringed(castle, 'hint')).toEqual([0, 1, 2, 3, 4]);
    hint();
    expect(note()).toBe('Watch: here it goes.');
    expect(label(castle, 0)).toContain('filled');
    expect(ringed(castle, 'good')).toEqual([0]);
    expect(ringed(castle, 'hint')).toEqual([]);
  });

  it('a column step says "look at this column and its clue"', () => {
    mount(castle);
    // Fill row 0 and row 1 as the solver would, then the next step is another line.
    hint();
    hint();
    hint();
    hint();
    expect(note()).toMatch(/^Look at this (row|column) and its clue\.$/);
    expect(ringed(castle, 'hint').length).toBe(5);
  });

  it('a guided try shows hint 1 by itself: the units are ringed with no note under the instruction', () => {
    mount(lastCell, { guided: true });
    expect(ringed(lastCell, 'hint')).toEqual(ROW(1));
    expect(note()).toBeUndefined();
    expect(session().dataset['hintLevel']).toBe('1');
  });

  it('a hint with no step left (a grid the lesson’s technique cannot move) says the kit’s nudge and rings nothing', () => {
    const puzzle = lastCell.puzzle;
    if (puzzle.rules !== 'sudoku') {
      throw new Error('lastCell is a sudoku');
    }
    // No given at all: no cell is the last of its unit.
    const stuck: GridFillDef = {
      ...lastCell,
      puzzle: { ...puzzle, givens: new Array<number>(16).fill(0) },
    };
    mount(stuck);
    hint();
    expect(note()).toBe('Look closely.');
    expect(ringed(stuck, 'hint')).toEqual([]);
    expect(ringed(stuck, 'target')).toEqual([]);
    expect(session().dataset['hintLevel']).toBe('0');
  });
});

describe('grid-fill UI: the picture tools', () => {
  it('Fill is the tool at the start: a radio group with Fill checked and Cross not', () => {
    mount(castle);
    expect(radio('Fill').getAttribute('aria-checked')).toBe('true');
    expect(radio('Cross').getAttribute('aria-checked')).toBe('false');
    expect(radio('Fill').getAttribute('tabindex')).toBe('0');
    expect(radio('Cross').getAttribute('tabindex')).toBe('-1');
    expect(radio('Fill').textContent).toContain('■');
    expect(radio('Cross').textContent).toContain('✕');
  });

  it('a tap with Fill fills a cell the clues allow (the cell is named "filled"); a tap with Cross crosses one the picture leaves empty', () => {
    mount(castle);
    tap(castle, 0);
    expect(label(castle, 0)).toContain('filled');
    fireEvent.click(radio('Cross'));
    expect(radio('Cross').getAttribute('aria-checked')).toBe('true');
    tap(castle, 1);
    expect(label(castle, 1)).toContain('crossed out');
    expect(errors()).toBe('0');
    expect(session().dataset['moves']).toBe('2');
  });

  it('Cross on a crossed cell takes the cross back, for free', () => {
    mount(castle);
    fireEvent.click(radio('Cross'));
    tap(castle, 1);
    tap(castle, 1);
    expect(label(castle, 1)).not.toContain('crossed');
    expect(errors()).toBe('0');
    expect(session().dataset['moves']).toBe('1');
    // The cell can be crossed again.
    tap(castle, 1);
    expect(label(castle, 1)).toContain('crossed out');
  });

  it('Fill on a crossed cell, and either tool on a filled cell, change nothing', () => {
    mount(castle);
    tap(castle, 0);
    fireEvent.click(radio('Cross'));
    tap(castle, 0);
    expect(label(castle, 0)).toContain('filled');
    tap(castle, 1);
    fireEvent.click(radio('Fill'));
    tap(castle, 1);
    expect(label(castle, 1)).toContain('crossed out');
    expect(errors()).toBe('0');
    expect(session().dataset['moves']).toBe('2');
  });

  it('the arrow keys move between the tools like a native radio group, and wrap', () => {
    mount(castle);
    radio('Fill').focus();
    fireEvent.keyDown(radio('Fill'), { key: 'ArrowRight' });
    expect(radio('Cross').getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(radio('Cross'));
    fireEvent.keyDown(radio('Cross'), { key: 'ArrowRight' });
    expect(radio('Fill').getAttribute('aria-checked')).toBe('true');
    fireEvent.keyDown(radio('Fill'), { key: 'ArrowLeft' });
    expect(radio('Cross').getAttribute('aria-checked')).toBe('true');
  });

  it('a solved picture shows its reveal over the board and takes the tools away', () => {
    mount(castle);
    expect(screen.queryByTestId('grid-reveal')).toBeNull();
    playSolution(castle);
    const reveal = screen.getByRole('img', { name: 'Picture revealed' });
    expect(reveal.textContent).toBe('🏰');
    expect(reveal.dataset['testid']).toBe('grid-reveal');
    expect(screen.getByTestId('done').dataset['stars']).toBe('3');
  });

  it('shows the reveal of the picture that was solved (the cat), and none before the last cell', () => {
    mount(cat);
    const actions = gridFillSolution(cat);
    for (const action of actions.slice(0, -1)) {
      if (action.type === 'set-cell' && typeof action.value === 'string') {
        fireEvent.click(radio(action.value === 'fill' ? 'Fill' : 'Cross'));
        tap(cat, action.cell);
      }
    }
    expect(screen.queryByTestId('grid-reveal')).toBeNull();
    const last = actions[actions.length - 1];
    if (last?.type === 'set-cell' && typeof last.value === 'string') {
      fireEvent.click(radio(last.value === 'fill' ? 'Fill' : 'Cross'));
      tap(cat, last.cell);
    }
    expect(screen.getByTestId('grid-reveal').textContent).toBe('🐱');
  });

  it('a picture without a reveal, and a sudoku, show nothing over the board when solved', () => {
    const puzzle = castle.puzzle as CrossPuzzle;
    const bare: GridFillDef = {
      ...castle,
      puzzle: {
        rules: 'picture-cross',
        size: puzzle.size,
        rows: puzzle.rows,
        cols: puzzle.cols,
        solution: puzzle.solution,
        maxLevel: puzzle.maxLevel,
      },
    };
    const view = mount(bare);
    playSolution(bare);
    expect(session().dataset['solved']).toBe('true');
    expect(screen.queryByTestId('grid-reveal')).toBeNull();
    view.unmount();

    mount(lastCell);
    playSolution(lastCell);
    expect(screen.queryByTestId('grid-reveal')).toBeNull();
  });
});

describe('grid-fill UI: the keyboard', () => {
  it('the arrow keys move the focus over the board and the selection with it (a sudoku)', () => {
    mount(lastCell);
    focus(lastCell, 5);
    expect(ringed(lastCell, 'selected')).toEqual([5]);
    fireEvent.keyDown(cell(lastCell, 5), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(cell(lastCell, 6));
    expect(ringed(lastCell, 'selected')).toEqual([6]);
    fireEvent.keyDown(cell(lastCell, 6), { key: 'ArrowDown' });
    expect(ringed(lastCell, 'selected')).toEqual([10]);
    fireEvent.keyDown(cell(lastCell, 10), { key: 'ArrowLeft' });
    fireEvent.keyDown(cell(lastCell, 9), { key: 'ArrowUp' });
    expect(ringed(lastCell, 'selected')).toEqual([5]);
    // The edge keeps the selection where it is.
    focus(lastCell, 0);
    fireEvent.keyDown(cell(lastCell, 0), { key: 'ArrowUp' });
    expect(ringed(lastCell, 'selected')).toEqual([0]);
  });

  it('a digit key puts the number into the selected cell (a note in notes mode)', () => {
    mount(lastCell);
    focus(lastCell, 6);
    fireEvent.keyDown(cell(lastCell, 6), { key: '4' });
    expect(label(lastCell, 6)).toBe('row 2, column 3, 4, selected');
    expect(session().dataset['moves']).toBe('1');

    focus(lastCell, 8);
    fireEvent.keyDown(cell(lastCell, 8), { key: '1' });
    expect(note()).toBe('That number is already in this column.');
    expect(errors()).toBe('1');

    fireEvent.click(notesToggle());
    fireEvent.keyDown(cell(lastCell, 8), { key: '2' });
    expect(screen.getByTestId('grid-marks-0-2').textContent).toBe('2');
    expect(errors()).toBe('1');
  });

  it('a digit key with no cell selected asks for one; a key that is no digit of the grid does nothing', () => {
    mount(lastCell);
    const board = screen.getByTestId('grid-fill-board');
    fireEvent.keyDown(board, { key: '3' });
    expect(note()).toBe('Tap a cell first.');

    tap(lastCell, 6);
    fireEvent.keyDown(cell(lastCell, 6), { key: '5' });
    fireEvent.keyDown(cell(lastCell, 6), { key: '0' });
    fireEvent.keyDown(cell(lastCell, 6), { key: 'a' });
    fireEvent.keyDown(cell(lastCell, 6), { key: '4', ctrlKey: true });
    fireEvent.keyDown(cell(lastCell, 6), { key: '4', metaKey: true });
    expect(label(lastCell, 6)).toBe('row 2, column 3, selected');
    expect(errors()).toBe('0');
  });

  it('a 6 x 6 takes the digits 1 to 6', () => {
    mount(six);
    const [first] = gridFillSolution(six);
    if (first?.type !== 'set-cell' || typeof first.value !== 'number') {
      throw new Error('a sudoku entry');
    }
    focus(six, first.cell);
    fireEvent.keyDown(cell(six, first.cell), { key: String(first.value) });
    expect(label(six, first.cell)).toContain(`${String(first.value)}, selected`);
  });

  it('the cells are buttons, so Enter and Space activate them natively; a picture cell applies the tool', () => {
    mount(castle);
    expect(cell(castle, 0).tagName).toBe('BUTTON');
    focus(castle, 0);
    fireEvent.keyDown(cell(castle, 0), { key: 'ArrowRight' });
    fireEvent.keyDown(cell(castle, 1), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(cell(castle, 2));
    // The click a browser makes of Enter / Space.
    fireEvent.click(cell(castle, 2));
    expect(label(castle, 2)).toContain('filled');
  });
});

describe('grid-fill UI: toUi', () => {
  /** One action on a state: the engine's outcome and what the UI makes of it. */
  function apply(state: GridFillState, action: GridFillAction) {
    const { state: next, outcome } = gridFillKind.act(state, action, null);
    return { next, outcome, patch: gridFillUi.toUi(outcome, action, next) };
  }
  const entry = (cell: number, value: CellValue): GridFillAction => ({
    type: 'set-cell',
    cell,
    value,
  });

  it('speaks the unit that shows a rejected sudoku entry, and none when no unit does', () => {
    const row = apply(gridFillKind.init(lastCell), entry(6, 1));
    expect(row.patch.feedback).toEqual({ kind: 'grid-wrong', puzzle: 'sudoku', conflict: 'row' });
    const column = apply(gridFillKind.init(lastCell), entry(8, 1));
    expect(column.patch.feedback).toEqual({
      kind: 'grid-wrong',
      puzzle: 'sudoku',
      conflict: 'column',
    });
    const box = apply(gridFillKind.init(hiddenSingle), entry(12, 4));
    expect(box.patch.feedback).toEqual({ kind: 'grid-wrong', puzzle: 'sudoku', conflict: 'box' });
    const plain = apply(gridFillKind.init(hiddenSingle), entry(14, 1));
    expect(plain.patch.feedback).toEqual({ kind: 'grid-wrong', puzzle: 'sudoku' });
    expect(plain.patch).toEqual({
      feedback: { kind: 'grid-wrong', puzzle: 'sudoku' },
      hint: null,
    });
  });

  it('speaks the line that shows a rejected picture entry', () => {
    const row = apply(gridFillKind.init(castle), entry(0, 'cross'));
    expect(row.patch.feedback).toEqual({
      kind: 'grid-wrong',
      puzzle: 'picture-cross',
      conflict: 'row',
    });
    const plain = apply(gridFillKind.init(cat), entry(0, 'fill'));
    expect(plain.patch.feedback).toEqual({ kind: 'grid-wrong', puzzle: 'picture-cross' });
  });

  it('a right entry goes back to the instruction and clears the UI hint; the last one is the praise', () => {
    expect(apply(gridFillKind.init(lastCell), entry(6, 4)).patch).toEqual({
      feedback: { kind: 'instruction' },
      hint: null,
    });
    const last = { ...lastCell, targets: [6] };
    expect(apply(gridFillKind.init(last), entry(6, 4)).patch).toEqual({
      feedback: { kind: 'solved' },
      hint: null,
    });
  });

  it('a mark keeps the step’s hint note, else the instruction; a cross taken back and an ignored action after the end likewise', () => {
    const fresh = gridFillKind.init(lastCell);
    expect(apply(fresh, { type: 'toggle-mark', cell: 6, value: 2 }).patch).toEqual({
      feedback: { kind: 'instruction' },
    });

    const hinted = gridFillKind.hint(fresh, 1, null);
    expect(apply(hinted.state, { type: 'toggle-mark', cell: 8, value: 2 }).patch).toEqual({
      feedback: { kind: 'hint', hint: hinted.hint },
    });

    const crossed = apply(gridFillKind.init(castle), entry(1, 'cross'));
    const back = apply(crossed.next, { type: 'clear-cell', cell: 1 });
    expect(back.outcome.kind).toBe('marked');
    expect(back.patch).toEqual({ feedback: { kind: 'instruction' } });

    const solved = apply(gridFillKind.init({ ...lastCell, targets: [6] }), entry(6, 4));
    const after = apply(solved.next, entry(8, 4));
    expect(after.outcome.kind).toBe('ignored');
    expect(after.patch).toEqual({ feedback: { kind: 'solved' } });
  });

  it('has no UI state of its own: nothing to start, nothing to clear', () => {
    expect(gridFillUi.initUi(lastCell)).toEqual({});
    expect(gridFillUi.clearWrongUi()).toEqual({});
    expect(gridFillUi.type).toBe('grid-fill');
  });
});

describe('grid-fill UI: another sample set', () => {
  it('plays `all` (every technique allowed) and the `hidden single` 4 x 4 through the same pad', () => {
    for (const def of [all, hiddenSingle, nakedSingle]) {
      const view = mount(def);
      playSolution(def);
      expect(screen.getByTestId('done').dataset['stars'], def.id).toBe('3');
      view.unmount();
    }
  });
});
