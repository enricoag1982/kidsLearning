import { describe, expect, it } from 'vitest';
import { countCrossSolutions } from '../../content/puzzles/cross-count.ts';
import { countSudokuSolutions } from '../../content/puzzles/sudoku-count.ts';
import {
  CROSS_LEVEL,
  LESSON_TECHNIQUES,
  humanSolveCross,
  humanSolveSudoku,
  pictureClues,
} from '../../core/puzzles/index.ts';
import type { GridFillAction, GridFillDef, GridFillState } from './def.ts';
import { gridFillKind } from './kind.ts';
import { GRID_FILL_SAMPLES } from './samples.ts';
import { gridFillSolution, gridFillWrongAction } from './solution.ts';
import { GRID_RULES, rulesOf, targetsOf } from './rules.ts';

const SAMPLES = Object.entries(GRID_FILL_SAMPLES);

function play(
  def: GridFillDef,
  actions: readonly GridFillAction[],
  from?: GridFillState,
): GridFillState {
  return actions.reduce(
    (state, action) => gridFillKind.act(state, action, null).state,
    from ?? gridFillKind.init(def),
  );
}

describe('the samples are well-formed puzzles', () => {
  it.each(SAMPLES)(
    '%s: one solution, solvable with its lesson’s techniques, which it uses',
    (_name, def) => {
      const { puzzle } = def;
      if (puzzle.rules === 'sudoku') {
        expect(countSudokuSolutions(puzzle.size, puzzle.givens)).toBe(1);
        const solved = humanSolveSudoku(
          puzzle.size,
          puzzle.givens,
          LESSON_TECHNIQUES[puzzle.focus],
        );
        expect(solved.solved).toBe(true);
        expect(solved.grid).toEqual(puzzle.solution);
        if (puzzle.focus === 'all') {
          expect(solved.counts['hidden-single'] + solved.counts['naked-single']).toBeGreaterThan(0);
        } else {
          expect(solved.counts[puzzle.focus]).toBeGreaterThan(0);
        }
        return;
      }
      expect(pictureClues(puzzle.size, puzzle.solution)).toEqual({
        rows: puzzle.rows,
        cols: puzzle.cols,
      });
      expect(countCrossSolutions(puzzle.size, puzzle.rows, puzzle.cols)).toBe(1);
      const solved = humanSolveCross(puzzle.size, puzzle.rows, puzzle.cols, puzzle.maxLevel);
      expect(solved.solved).toBe(true);
      expect(solved.steps.some((step) => CROSS_LEVEL[step.technique] === puzzle.maxLevel)).toBe(
        true,
      );
    },
  );

  it('cover a 4 x 4 per focus, a 6 x 6 and a level 1 and a combine picture', () => {
    expect(
      SAMPLES.map(([, def]) =>
        def.puzzle.rules === 'sudoku'
          ? `${String(def.puzzle.size)}x${String(def.puzzle.size)} ${def.puzzle.focus}`
          : `picture ${String(def.puzzle.maxLevel)}`,
      ),
    ).toEqual([
      '4x4 last-cell',
      '4x4 hidden-single',
      '4x4 naked-single',
      '4x4 all',
      '6x6 naked-single',
      'picture 1',
      'picture 3',
    ]);
    const ids = SAMPLES.map(([, def]) => def.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('the solution', () => {
  it.each(SAMPLES)('%s: plays to solved with no error and 3 stars', (_name, def) => {
    const actions = gridFillSolution(def);
    const state = play(def, actions);
    expect(state).toMatchObject({ solved: true, errors: 0, hintLevel: 0 });
    expect(gridFillKind.stars(state)).toBe(3);
    expect(actions.every((action) => action.type === 'set-cell')).toBe(true);
    // Every entry the solution makes is accepted: no move is lost.
    expect(state.moves).toBe(actions.length);
  });

  it('fills every empty sudoku cell once, in the order the hints would show', () => {
    const { lastCell } = GRID_FILL_SAMPLES;
    const actions = gridFillSolution(lastCell);
    expect(actions.map((action) => ('cell' in action ? action.cell : -1))).toHaveLength(5);
    expect(new Set(actions.map((action) => ('cell' in action ? action.cell : -1))).size).toBe(5);
    // The first entry is the step the first hint points at.
    const hint = gridFillKind.hint(gridFillKind.init(lastCell), 1, null);
    const second = gridFillKind.hint(hint.state, 2, null);
    expect(actions[0]).toMatchObject({ type: 'set-cell', cell: second.hint.cell });
  });

  it('a picture’s solution fills every filled cell (crosses where the steps give them)', () => {
    const { castle } = GRID_FILL_SAMPLES;
    const actions = gridFillSolution(castle);
    const fills = actions.filter((action) => action.type === 'set-cell' && action.value === 'fill');
    expect(fills).toHaveLength(20);
    expect(play(castle, actions).solved).toBe(true);
  });

  it('stops at the targets: a guided try with one target is solved by the steps that reach it', () => {
    const { nakedSingle, castle } = GRID_FILL_SAMPLES;
    const rules = rulesOf(nakedSingle.puzzle);
    const first = rules.nextStep(nakedSingle.puzzle, rules.initial(nakedSingle.puzzle));
    expect(first).toBeDefined();
    const guided: GridFillDef = { ...nakedSingle, targets: [first?.cell ?? -1] };
    const actions = gridFillSolution(guided);
    expect(actions).toHaveLength(1);
    expect(play(guided, actions)).toMatchObject({ solved: true, errors: 0 });
    // A target the solver reaches only after other cells: it fills those first.
    const far: GridFillDef = { ...nakedSingle, targets: [12] };
    const farActions = gridFillSolution(far);
    expect(farActions.length).toBeGreaterThan(1);
    expect(farActions.at(-1)).toMatchObject({ cell: 12, value: 4 });
    expect(play(far, farActions).solved).toBe(true);
    expect(gridFillSolution({ ...castle, targets: [0] })).toHaveLength(1);
  });

  it('throws when the grid is stuck before the targets are filled (content verify rules it out)', () => {
    const stuck: GridFillDef = {
      ...GRID_FILL_SAMPLES.lastCell,
      puzzle: {
        ...GRID_FILL_SAMPLES.lastCell.puzzle,
        givens: [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
      } as GridFillDef['puzzle'],
    };
    expect(() => gridFillSolution(stuck)).toThrow(/no step left/);
  });
});

describe('the wrong action', () => {
  it.each(SAMPLES)(
    '%s: costs exactly 1 error, changes nothing else, and never blocks solving',
    (_name, def) => {
      const wrong = gridFillWrongAction(def);
      expect(wrong).toHaveLength(1);
      const fresh = gridFillKind.init(def);
      const after = play(def, wrong);
      expect(after).toMatchObject({ errors: 1, solved: false });
      expect(after.cells).toEqual(fresh.cells);
      const solved = play(def, gridFillSolution(def), after);
      expect(solved).toMatchObject({ solved: true, errors: 1 });
      expect(gridFillKind.stars(solved)).toBe(2);
    },
  );
});

describe('the rules registry', () => {
  it('has one entry per puzzle type, found by `puzzle.rules`', () => {
    expect(Object.keys(GRID_RULES).sort()).toEqual(['picture-cross', 'sudoku']);
    for (const [, def] of SAMPLES) {
      expect(rulesOf(def.puzzle)).toBe(GRID_RULES[def.puzzle.rules]);
    }
  });

  it('defaults the targets to every empty sudoku cell / every filled picture cell', () => {
    expect(targetsOf(GRID_FILL_SAMPLES.lastCell)).toEqual([6, 8, 11, 13, 14]);
    expect(targetsOf(GRID_FILL_SAMPLES.castle)).toHaveLength(20);
    expect(targetsOf({ ...GRID_FILL_SAMPLES.lastCell, targets: [8] })).toEqual([8]);
  });
});
