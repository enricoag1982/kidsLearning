import { describe, expect, it } from 'vitest';
import type { GridFillAction, GridFillDef, GridFillState } from './def.ts';
import { nextCrossStep } from '../../core/puzzles/index.ts';
import { gridFillKind, initGridFillState } from './kind.ts';
import { GRID_FILL_SAMPLES } from './samples.ts';

const { lastCell, nakedSingle, hiddenSingle, six, castle, cat } = GRID_FILL_SAMPLES;

/** The kind's own `act` folded over `actions` from `from`. */
function run(
  from: GridFillState,
  ...actions: readonly GridFillAction[]
): { readonly state: GridFillState; readonly outcomes: readonly string[] } {
  let state = from;
  const outcomes: string[] = [];
  for (const action of actions) {
    const step = gridFillKind.act(state, action, null);
    state = step.state;
    outcomes.push(step.outcome.kind);
  }
  return { state, outcomes };
}

const set = (cell: number, value: number | 'fill' | 'cross'): GridFillAction => ({
  type: 'set-cell',
  cell,
  value,
});
const mark = (cell: number, value: number): GridFillAction => ({
  type: 'toggle-mark',
  cell,
  value,
});
const clear = (cell: number): GridFillAction => ({ type: 'clear-cell', cell });

const start = (def: GridFillDef): GridFillState => initGridFillState(def);

describe('grid-fill: a fresh state', () => {
  it('holds the givens of a sudoku (open cells undefined) and an empty picture, nothing scored', () => {
    expect(start(lastCell)).toEqual({
      def: lastCell,
      moves: 0,
      solved: false,
      errors: 0,
      hintLevel: 0,
      cells: [
        3,
        4,
        1,
        2,
        1,
        2,
        undefined,
        3,
        undefined,
        3,
        2,
        undefined,
        2,
        undefined,
        undefined,
        4,
      ],
      marks: {},
      stepHint: 0,
    });
    const picture = start(castle);
    expect(picture.cells).toHaveLength(25);
    expect(picture.cells.every((cell) => cell === undefined)).toBe(true);
    expect(gridFillKind.input).toBe('place');
    expect(gridFillKind.type).toBe('grid-fill');
    expect(gridFillKind.init(castle)).toEqual(picture);
  });
});

describe('grid-fill: a right entry', () => {
  it('is placed: the cell holds it, a move counts, no error', () => {
    const { state, outcomes } = run(start(lastCell), set(6, 4));
    expect(outcomes).toEqual(['placed']);
    expect(state.cells[6]).toBe(4);
    expect(state).toMatchObject({ moves: 1, errors: 0, solved: false });
  });

  it('clears the cell’s marks, the hint and the last wrong entry, and starts the next step at level 0', () => {
    const { state: hinted } = run(start(lastCell), mark(6, 2), mark(6, 4), mark(8, 1), set(6, 1));
    expect(hinted.wrong).toMatchObject({ cell: 6, value: 1 });
    const withHint = gridFillKind.hint(hinted, 1, null).state;
    expect(withHint.stepHint).toBe(1);
    expect(withHint.hint).toBeDefined();
    const { state } = run(withHint, set(6, 4));
    expect(state.marks).toEqual({ 8: [1] });
    expect(state.stepHint).toBe(0);
    expect(state.hint).toBeUndefined();
    expect(state.wrong).toBeUndefined();
    // The hint level of the exercise keeps what the step reached.
    expect(state.hintLevel).toBe(1);
  });

  it('is solved when it fills the last target (the outcome says so)', () => {
    const guided: GridFillDef = { ...lastCell, targets: [6] };
    const { state, outcomes } = run(start(guided), set(6, 4));
    expect(outcomes).toEqual(['solved']);
    expect(state.solved).toBe(true);
    // Every action is ignored once solved.
    const after = run(state, set(8, 4), mark(8, 1), clear(8), set(8, 3));
    expect(after.outcomes).toEqual(['ignored', 'ignored', 'ignored', 'ignored']);
    expect(after.state).toBe(state);
  });

  it('solves a whole sudoku only when every empty cell is filled', () => {
    const empties = lastCell.puzzle.rules === 'sudoku' ? lastCell.puzzle.givens : [];
    const cells = empties.flatMap((value, cell) => (value === 0 ? [cell] : []));
    expect(cells).toHaveLength(5);
    const solution = lastCell.puzzle.rules === 'sudoku' ? lastCell.puzzle.solution : [];
    let state = start(lastCell);
    cells.forEach((cell, index) => {
      const step = gridFillKind.act(state, set(cell, solution[cell] ?? 0), null);
      state = step.state;
      expect(step.outcome.kind).toBe(index === cells.length - 1 ? 'solved' : 'placed');
    });
    expect(state.solved).toBe(true);
    expect(state.moves).toBe(5);
  });
});

describe('grid-fill: a wrong sudoku entry', () => {
  it('is rejected, costs an error and a move, leaves the cells as they were, and names the row that already holds the number', () => {
    const before = start(lastCell);
    // Cell 6 is the open cell in row 1 (1, 2, _, 3): the 1 is already there.
    const { state, outcomes } = run(before, set(6, 1));
    expect(outcomes).toEqual(['wrong']);
    expect(state.cells).toBe(before.cells);
    expect(state).toMatchObject({
      errors: 1,
      moves: 1,
      solved: false,
      wrong: { cell: 6, value: 1, conflict: { kind: 'row', index: 1 } },
    });
    const step = gridFillKind.act(before, set(6, 1), null);
    expect(step.outcome).toEqual({
      kind: 'wrong',
      cell: 6,
      value: 1,
      conflict: { kind: 'row', index: 1 },
    });
  });

  it('names the column when only the column holds the number', () => {
    // Cell 8 (row 2, column 0): the 1 sits in column 0 (row 1) and nowhere in row 2.
    const { state } = run(start(lastCell), set(8, 1));
    expect(state.wrong).toEqual({ cell: 8, value: 1, conflict: { kind: 'column', index: 0 } });
  });

  it('names the box when only the box holds the number', () => {
    // Cell 1 (row 0, column 1): the 2 sits in its box (row 1, column 1) and neither in row 0 nor column 1.
    const { state } = run(start(nakedSingle), set(1, 2));
    expect(state.wrong).toEqual({ cell: 1, value: 2, conflict: { kind: 'box', index: 0 } });
  });

  it('names no unit when the number fits the grid but is not the answer', () => {
    // Cell 12 (row 3, column 0) takes 3 or 4 so far; the answer is 4.
    const { state, outcomes } = run(start(nakedSingle), set(12, 3));
    expect(outcomes).toEqual(['wrong']);
    expect(state.wrong).toEqual({ cell: 12, value: 3 });
    expect(state.wrong).not.toHaveProperty('conflict');
    expect(gridFillKind.act(start(nakedSingle), set(12, 3), null).outcome).toEqual({
      kind: 'wrong',
      cell: 12,
      value: 3,
    });
  });

  it('counts every rejected entry, and a later right entry clears the wrong one', () => {
    const { state } = run(start(lastCell), set(6, 1), set(6, 2), set(6, 4));
    expect(state).toMatchObject({ errors: 2, moves: 3 });
    expect(state.cells[6]).toBe(4);
    expect(state.wrong).toBeUndefined();
  });
});

describe('grid-fill: entries that are no entry', () => {
  it('ignores a given, a cell already filled, a cell off the grid and a value the puzzle has no use for, scoring nothing', () => {
    const before = start(lastCell);
    const { state, outcomes } = run(
      before,
      set(0, 3), // a given, even the right number
      set(0, 1), // a given, a wrong number
      set(-1, 1),
      set(16, 1),
      set(1.5, 1),
      set(6, 0),
      set(6, 5),
      set(6, 2.5),
      set(6, 'fill'),
      set(6, 'cross'),
    );
    expect(outcomes).toEqual(new Array<string>(10).fill('ignored'));
    expect(state).toBe(before);

    const placed = run(before, set(6, 4)).state;
    expect(run(placed, set(6, 4), set(6, 1)).outcomes).toEqual(['ignored', 'ignored']);
  });

  it('ignores marks on a given, a filled cell, off the grid or with a number outside 1 to the size', () => {
    const before = start(lastCell);
    const { state, outcomes } = run(
      before,
      mark(0, 1),
      mark(16, 1),
      mark(6, 0),
      mark(6, 5),
      mark(6, 1.5),
      clear(6),
      clear(0),
      clear(99),
    );
    expect(outcomes).toEqual(new Array<string>(8).fill('ignored'));
    expect(state).toBe(before);
  });

  it('ignores marks and crosses on the wrong kind of puzzle', () => {
    const picture = start(castle);
    expect(run(picture, mark(0, 1), mark(0, 3)).outcomes).toEqual(['ignored', 'ignored']);
    expect(run(picture, set(0, 1)).outcomes).toEqual(['ignored']);
    expect(run(start(lastCell), set(6, 'fill')).outcomes).toEqual(['ignored']);
  });
});

describe('grid-fill: pencil marks', () => {
  it('toggle on and off, stay ascending, and are free', () => {
    const { state, outcomes } = run(start(lastCell), mark(6, 4), mark(6, 2), mark(6, 3));
    expect(outcomes).toEqual(['marked', 'marked', 'marked']);
    expect(state.marks).toEqual({ 6: [2, 3, 4] });
    expect(state).toMatchObject({ errors: 0, moves: 0, hintLevel: 0, solved: false });
    const off = run(state, mark(6, 3), mark(6, 2), mark(6, 4));
    expect(off.state.marks).toEqual({});
    expect(off.state.cells).toBe(state.cells);
  });

  it('keep one list per cell and never change the cells or the score', () => {
    const { state } = run(start(six), mark(3, 1), mark(9, 2), mark(3, 6));
    expect(state.marks).toEqual({ 3: [1, 6], 9: [2] });
    expect(state).toMatchObject({ errors: 0, moves: 0 });
  });

  it('clear the last wrong entry, like any accepted action', () => {
    const { state } = run(start(lastCell), set(6, 1), mark(6, 4));
    expect(state.wrong).toBeUndefined();
    expect(state.errors).toBe(1);
  });
});

describe('grid-fill: a picture cross', () => {
  // castle: rows `#.#.#`, `#####`, `##.##`, `#####`, `#.#.#`.
  it('takes a fill on a filled cell and a cross on an empty one', () => {
    const { state, outcomes } = run(start(castle), set(0, 'fill'), set(1, 'cross'));
    expect(outcomes).toEqual(['placed', 'placed']);
    expect(state.cells.slice(0, 2)).toEqual(['fill', 'cross']);
    expect(state).toMatchObject({ errors: 0, moves: 2 });
  });

  it('rejects a cross on a filled cell and a fill on an empty one', () => {
    const cross = run(start(castle), set(0, 'cross'));
    expect(cross.outcomes).toEqual(['wrong']);
    expect(cross.state.cells[0]).toBeUndefined();
    expect(cross.state.errors).toBe(1);
    expect(run(start(castle), set(1, 'fill')).outcomes).toEqual(['wrong']);
  });

  it('names the row whose clue has no place left for the entry', () => {
    // Row 0 is [1, 1, 1]: with cells 0 and 2 filled, a fill at 1 leaves the clue no placement.
    const { state } = run(start(castle), set(0, 'fill'), set(2, 'fill'), set(1, 'fill'));
    expect(state.wrong).toEqual({ cell: 1, value: 'fill', conflict: { kind: 'row', index: 0 } });
  });

  it('names the column when only the column’s clue has no place left', () => {
    // cat: column 0 is [2] and rows 1-2 hold it; row 4 is [1], so a fill at column 0 fits its row but not the column.
    const { state } = run(start(cat), set(5, 'fill'), set(10, 'fill'), set(20, 'fill'));
    expect(state.wrong).toEqual({
      cell: 20,
      value: 'fill',
      conflict: { kind: 'column', index: 0 },
    });
    expect(state.errors).toBe(1);
  });

  it('names nothing when both clues still allow the entry somewhere else', () => {
    // cat: row 0 is [1, 1] and column 2 is [4]; a fill at row 0, column 2 fits both, the picture has a cross there.
    const plain = run(start(cat), set(2, 'fill'));
    expect(plain.outcomes).toEqual(['wrong']);
    expect(plain.state.wrong).toEqual({ cell: 2, value: 'fill' });
  });

  it('takes a cross back with clear-cell (free) and nothing else', () => {
    const crossed = run(start(castle), set(1, 'cross'), set(0, 'fill')).state;
    const { state, outcomes } = run(crossed, clear(1), clear(0), clear(2), set(1, 'cross'));
    expect(outcomes).toEqual(['marked', 'ignored', 'ignored', 'placed']);
    expect(state.cells.slice(0, 2)).toEqual(['fill', 'cross']);
    expect(state).toMatchObject({ errors: 0, moves: 3 });
    expect(run(crossed, clear(1)).state.cells[1]).toBeUndefined();
  });

  it('is solved by the last fill: crosses are optional', () => {
    const fills = castle.puzzle.rules === 'picture-cross' ? castle.puzzle.solution : [];
    const cells = fills.flatMap((filled, cell) => (filled ? [cell] : []));
    expect(cells).toHaveLength(20);
    const { state, outcomes } = run(start(castle), ...cells.map((cell) => set(cell, 'fill')));
    expect(outcomes.at(-1)).toBe('solved');
    expect(outcomes.slice(0, -1).every((kind) => kind === 'placed')).toBe(true);
    expect(state).toMatchObject({ solved: true, errors: 0, moves: 20 });
    expect(state.cells.filter((cell) => cell === 'cross')).toHaveLength(0);
  });

  it('honours the def’s targets', () => {
    const guided: GridFillDef = { ...castle, targets: [0] };
    expect(run(start(guided), set(0, 'fill')).outcomes).toEqual(['solved']);
  });
});

describe('grid-fill: the hint ladder', () => {
  it('goes units, then the cell, then fills it; the exercise keeps the highest level', () => {
    // lastCell: the first step is a unit with one empty cell.
    const one = gridFillKind.hint(start(lastCell), 1, null);
    expect(one.hint).toEqual({
      kind: 'grid-fill',
      level: 1,
      technique: 'last-cell',
      units: [{ kind: 'row', index: 1 }],
    });
    expect(one.state).toMatchObject({ stepHint: 1, hintLevel: 1, hint: one.hint });
    expect(one.state.cells).toEqual(start(lastCell).cells);

    const two = gridFillKind.hint(one.state, 2, null);
    expect(two.hint).toEqual({
      kind: 'grid-fill',
      level: 2,
      technique: 'last-cell',
      units: [{ kind: 'row', index: 1 }],
      cell: 6,
    });
    expect(two.state).toMatchObject({ stepHint: 2, hintLevel: 2 });
    expect(two.state.cells).toEqual(start(lastCell).cells);

    const three = gridFillKind.hint(two.state, 3, null);
    expect(three.hint).toEqual({ ...two.hint, level: 3, value: 4 });
    expect(three.state.cells[6]).toBe(4);
    expect(three.state).toMatchObject({ stepHint: 0, hintLevel: 3, hint: three.hint, errors: 0 });
  });

  it('starts over at level 1 on the next step while the exercise keeps level 3, and caps at 3', () => {
    let state = start(lastCell);
    for (let press = 0; press < 3; press += 1) {
      state = gridFillKind.hint(state, 1, null).state;
    }
    expect(state).toMatchObject({ stepHint: 0, hintLevel: 3 });
    const next = gridFillKind.hint(state, 1, null);
    expect(next.hint.level).toBe(1);
    expect(next.state).toMatchObject({ stepHint: 1, hintLevel: 3 });
    // A right entry at level 2 of a step: the step starts again, the exercise stays at 3.
    const placed = run(gridFillKind.hint(next.state, 2, null).state, set(8, 4)).state;
    expect(placed).toMatchObject({ stepHint: 0, hintLevel: 3 });
  });

  it('level 3 can finish the exercise', () => {
    const guided: GridFillDef = { ...lastCell, targets: [6] };
    let state = start(guided);
    for (let press = 0; press < 3; press += 1) {
      state = gridFillKind.hint(state, 1, null).state;
    }
    expect(state.solved).toBe(true);
    expect(gridFillKind.stars(state)).toBe(1);
  });

  it('a naked single names the cell and its row / column / box, never the numbers that fit (they are the answer)', () => {
    const one = gridFillKind.hint(start(nakedSingle), 1, null);
    expect(one.hint.technique).toBe('naked-single');
    expect(one.hint.units).toHaveLength(3);
    expect(one.hint.units.map((unit) => unit.kind)).toEqual(['row', 'column', 'box']);
    expect(one.hint).not.toHaveProperty('cell');
    expect(one.hint).not.toHaveProperty('candidates');
    const two = gridFillKind.hint(one.state, 2, null);
    expect(two.hint.cell).toBeDefined();
    expect(two.hint).not.toHaveProperty('candidates');
    const three = gridFillKind.hint(two.state, 3, null);
    expect(three.hint.value).toBeDefined();
    expect(three.state.cells[two.hint.cell ?? -1]).toBe(three.hint.value);
  });

  it('prefers the lesson’s technique: only place first for hidden-single', () => {
    let state = start(hiddenSingle);
    const techniques: string[] = [];
    for (let step = 0; step < 3; step += 1) {
      const hint = gridFillKind.hint(state, 1, null);
      techniques.push(hint.hint.technique);
      state = gridFillKind.hint(gridFillKind.hint(hint.state, 2, null).state, 3, null).state;
    }
    expect(techniques[0]).toBe('hidden-single');
    expect(state.errors).toBe(0);
  });

  it('a picture’s hint names the line, never a cell; level 3 fills the line’s first new cell', () => {
    const one = gridFillKind.hint(start(castle), 1, null);
    expect(one.hint).toEqual({
      kind: 'grid-fill',
      level: 1,
      technique: 'full-line',
      units: [{ kind: 'row', index: 0 }],
    });
    const two = gridFillKind.hint(one.state, 2, null);
    expect(two.hint).toEqual({ ...one.hint, level: 2 });
    const three = gridFillKind.hint(two.state, 3, null);
    expect(three.hint).toEqual({ ...one.hint, level: 3, value: 'fill' });
    expect(three.state.cells[0]).toBe('fill');
    expect(three.state).toMatchObject({ stepHint: 0, hintLevel: 3 });
  });

  it('a picture whose entries leave only a higher technique than the lesson allows still gets a hint', () => {
    // castle allows full lines only. With the first, third and last column filled, every line has known cells or needs an overlap.
    const column = (index: number, rows: readonly number[]): readonly GridFillAction[] =>
      rows.map((row) => set(row * 5 + index, 'fill'));
    const { state } = run(
      start(castle),
      ...column(0, [0, 1, 2, 3, 4]),
      ...column(2, [0, 1, 3, 4]),
      ...column(4, [0, 1, 2, 3, 4]),
    );
    expect(state.errors).toBe(0);
    const { puzzle } = castle;
    if (puzzle.rules !== 'picture-cross') throw new Error('castle is a picture');
    const known = state.cells.map((cell) =>
      cell === 'fill' || cell === 'cross' ? cell : undefined,
    );
    expect(nextCrossStep(puzzle.size, puzzle.rows, puzzle.cols, known, 1)).toBeUndefined();
    const hint = gridFillKind.hint(state, 1, null);
    expect(hint.hint).toEqual({
      kind: 'grid-fill',
      level: 1,
      technique: 'cross-out',
      units: [{ kind: 'row', index: 0 }],
    });
    expect(hint.state.stepHint).toBe(1);
  });

  it('with no step left nothing changes: the hint level stays and the hint has nothing to look at', () => {
    // A hand-built grid the lesson’s techniques cannot move (no unit with one empty cell).
    const stuck: GridFillDef = {
      ...lastCell,
      puzzle: {
        ...lastCell.puzzle,
        givens: [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
        focus: 'last-cell',
      } as GridFillDef['puzzle'],
    };
    const before = start(stuck);
    const idle = gridFillKind.hint(before, 1, null);
    expect(idle.state).toEqual({ ...before, hint: undefined });
    expect(idle.hint).toMatchObject({ kind: 'grid-fill', level: 1, units: [] });
    // A solved exercise has no step either.
    const solved = run({ ...before, solved: true }).state;
    expect(gridFillKind.hint(solved, 1, null).state.hintLevel).toBe(0);
  });
});

describe('grid-fill: stars', () => {
  it('are the card kit’s: 3 clean, 2 with one error or hint level 1, else 1', () => {
    const solved = (patch: Partial<GridFillState>): GridFillState => ({
      ...start(lastCell),
      solved: true,
      ...patch,
    });
    expect(gridFillKind.stars(solved({}))).toBe(3);
    expect(gridFillKind.stars(solved({ errors: 1 }))).toBe(2);
    expect(gridFillKind.stars(solved({ hintLevel: 1 }))).toBe(2);
    expect(gridFillKind.stars(solved({ hintLevel: 1, errors: 1 }))).toBe(2);
    expect(gridFillKind.stars(solved({ errors: 2 }))).toBe(1);
    expect(gridFillKind.stars(solved({ hintLevel: 2 }))).toBe(1);
    expect(gridFillKind.stars(solved({ hintLevel: 3 }))).toBe(1);
  });

  it('count the rejected entries and the highest step hint of a played exercise', () => {
    const guided: GridFillDef = { ...lastCell, targets: [6] };
    const wrong = run(start(guided), set(6, 1), set(6, 4));
    expect(wrong.state.solved).toBe(true);
    expect(gridFillKind.stars(wrong.state)).toBe(2);
    const hinted = run(gridFillKind.hint(start(guided), 1, null).state, set(6, 4)).state;
    expect(gridFillKind.stars(hinted)).toBe(2);
    const both = run(
      gridFillKind.hint(gridFillKind.hint(start(guided), 1, null).state, 2, null).state,
      set(6, 4),
    ).state;
    expect(gridFillKind.stars(both)).toBe(1);
  });
});
