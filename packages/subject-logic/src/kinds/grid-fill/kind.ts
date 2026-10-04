import { errorHintStars } from '@learn/platform-core/domain/exercise/stars';
import type { ExerciseKind } from '@learn/platform-core/domain/exercise/kind';
import type {
  CellValue,
  GridFillAction,
  GridFillDef,
  GridFillHint,
  GridFillOutcome,
  GridFillState,
  GridPuzzle,
} from './def.ts';
import { cellCount, rulesOf, targetsOf } from './rules.ts';

/** A fresh state: the givens in place, no marks, no hint. */
export function initGridFillState(def: GridFillDef): GridFillState {
  return {
    def,
    moves: 0,
    solved: false,
    errors: 0,
    hintLevel: 0,
    cells: rulesOf(def.puzzle).initial(def.puzzle),
    marks: {},
    stepHint: 0,
  };
}

const IGNORED = (state: GridFillState): { state: GridFillState; outcome: GridFillOutcome } => ({
  state,
  outcome: { kind: 'ignored' },
});

function inGrid(puzzle: GridPuzzle, cell: number): boolean {
  return Number.isInteger(cell) && cell >= 0 && cell < cellCount(puzzle);
}

function withoutMarks(marks: GridFillState['marks'], cell: number): GridFillState['marks'] {
  return Object.fromEntries(Object.entries(marks).filter(([key]) => Number(key) !== cell));
}

/** A right entry takes its place: the cell's marks go, the step starts over, and the exercise is solved once every target is filled.
 * Moves and the hint level are the caller's. */
function place(state: GridFillState, cell: number, value: CellValue): GridFillState {
  const { puzzle } = state.def;
  const cells = state.cells.map((current, at) => (at === cell ? value : current));
  return {
    ...state,
    cells,
    marks: withoutMarks(state.marks, cell),
    stepHint: 0,
    hint: undefined,
    wrong: undefined,
    solved: rulesOf(puzzle).isSolved(puzzle, cells, targetsOf(state.def)),
  };
}

/** The hint when no step is left (the exercise is solved or the grid is stuck): nothing to look at, so the note falls back to the card
 * kit's "look" nudge. The technique is a placeholder no note reads. */
function idleHint(puzzle: GridPuzzle): GridFillHint {
  return {
    kind: 'grid-fill',
    level: 1,
    technique: puzzle.rules === 'sudoku' ? 'last-cell' : 'full-line',
    units: [],
  };
}

export const gridFillKind: ExerciseKind<
  GridFillDef,
  GridFillState,
  GridFillAction,
  GridFillOutcome,
  GridFillHint,
  null
> = {
  type: 'grid-fill',
  input: 'place',
  init: initGridFillState,

  /** `set-cell`: a right entry is placed (`solved` when it finishes the exercise), a wrong one costs an error and changes nothing
   * but `wrong` (with the unit that shows why, if any); right and wrong entries count a move. `toggle-mark` and `clear-cell` (a
   * cross) are free. Anything that is no entry at all (a cell that is a given or already filled, off the grid, a value the puzzle
   * has no use for, a mark on a picture) is ignored, as is every action once solved. */
  act(state, action) {
    if (state.solved) {
      return IGNORED(state);
    }
    const { puzzle } = state.def;
    const rules = rulesOf(puzzle);
    const { cell } = action;
    if (!inGrid(puzzle, cell)) {
      return IGNORED(state);
    }

    if (action.type === 'clear-cell') {
      if (state.cells[cell] !== 'cross') {
        return IGNORED(state);
      }
      return {
        state: {
          ...state,
          cells: state.cells.map((current, at) => (at === cell ? undefined : current)),
          wrong: undefined,
        },
        outcome: { kind: 'marked' },
      };
    }

    if (state.cells[cell] !== undefined || !rules.accepts(puzzle, action.value)) {
      return IGNORED(state);
    }

    if (action.type === 'toggle-mark') {
      const marked = state.marks[cell] ?? [];
      const next = marked.includes(action.value)
        ? marked.filter((value) => value !== action.value)
        : [...marked, action.value].sort((a, b) => a - b);
      return {
        state: {
          ...state,
          marks:
            next.length === 0 ? withoutMarks(state.marks, cell) : { ...state.marks, [cell]: next },
          wrong: undefined,
        },
        outcome: { kind: 'marked' },
      };
    }

    const { value } = action;
    if (rules.isRight(puzzle, cell, value)) {
      const placed = place(state, cell, value);
      return {
        state: { ...placed, moves: state.moves + 1 },
        outcome: { kind: placed.solved ? 'solved' : 'placed' },
      };
    }
    const conflict = rules.conflict(puzzle, state.cells, cell, value);
    const wrong = { cell, value, ...(conflict === undefined ? {} : { conflict }) };
    return {
      state: { ...state, errors: state.errors + 1, moves: state.moves + 1, wrong },
      outcome: { kind: 'wrong', ...wrong },
    };
  },

  /** One press of the step's ladder (the `level` argument is the exercise's, the ladder here restarts at each step): 1 highlights the
   * units of the next step, 2 adds the cell and, for a naked single, the numbers that fit, 3 places the entry. The exercise's hint
   * level is the highest the steps reached. No step left: nothing changes. */
  hint(state) {
    const { puzzle } = state.def;
    const rules = rulesOf(puzzle);
    const step = state.solved ? undefined : rules.nextStep(puzzle, state.cells);
    if (!step) {
      return { state: { ...state, hint: undefined }, hint: idleHint(puzzle) };
    }
    const stepHint = Math.min(3, state.stepHint + 1) as 1 | 2 | 3;
    const hintLevel = Math.max(state.hintLevel, stepHint) as 1 | 2 | 3;
    const hint: GridFillHint = {
      kind: 'grid-fill',
      level: stepHint,
      technique: step.technique,
      units: step.units,
      ...(stepHint >= 2 && rules.pointsAtCell ? { cell: step.cell } : {}),
      ...(stepHint >= 2 && step.candidates !== undefined ? { candidates: step.candidates } : {}),
      ...(stepHint === 3 ? { value: step.value } : {}),
    };
    if (stepHint === 3) {
      return {
        state: { ...place(state, step.cell, step.value), hintLevel, hint },
        hint,
      };
    }
    return { state: { ...state, stepHint, hintLevel, hint, wrong: undefined }, hint };
  },

  stars(state) {
    return errorHintStars(state.hintLevel, state.errors);
  },
};
