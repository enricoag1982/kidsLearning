import { describe, expect, it } from 'vitest';
import { parseLevel } from '../../core/level.ts';
import type { Tile } from '../../core/tiles.ts';
import type { ProgramDef } from '../../core/types.ts';
import { CODING_SAMPLES } from '../../testing/samples.ts';
import { play, playSolution, playWrongThenSolve, starsFor } from '../../testing/play.ts';
import { firstPrimitive, programKind as kind, programProblem } from './kind.ts';
import type { ProgramAction } from './kind.ts';
import { failingProgram, programSolution, programWrongAction } from './solution.ts';

const def = CODING_SAMPLES.program;
const tiles = (...kinds: readonly Tile['kind'][]): Tile[] =>
  kinds.map((k) => ({ kind: k }) as Tile);
const repeat = (times: number, ...body: readonly Tile['kind'][]): Tile => ({
  kind: 'repeat',
  times,
  body: tiles(...body),
});
const runIt = (program: readonly Tile[]): ProgramAction => ({ type: 'run-program', program });

describe('program: a run', () => {
  it('a program that reaches the flag with the star solves, counts the move and 0 errors, and returns the run', () => {
    const step = kind.act(kind.init(def), runIt(def.solution), null);
    expect(step.outcome).toMatchObject({ kind: 'solved', run: { outcome: 'success' } });
    expect(step.state).toMatchObject({ solved: true, errors: 0, moves: 1 });
    const outcome = step.outcome;
    expect('run' in outcome && outcome.run.steps).toHaveLength(5);
  });

  it('any other program costs 1 error and 1 move, returns the run and stays unsolved: unfinished, then bumped', () => {
    const short = kind.act(kind.init(def), runIt(tiles('right', 'right')), null);
    expect(short.outcome).toMatchObject({ kind: 'failed', run: { outcome: 'unfinished' } });
    expect(short.state).toMatchObject({ solved: false, errors: 1, moves: 1 });
    const bump = kind.act(short.state, runIt(tiles('down', 'right')), null);
    expect(bump.outcome).toMatchObject({ kind: 'failed', run: { outcome: 'bumped' } });
    expect(bump.state).toMatchObject({ errors: 2, moves: 2 });
  });

  it('solves after failures and keeps their errors', () => {
    const failed = kind.act(kind.init(def), runIt(tiles('up')), null).state;
    const solved = kind.act(failed, runIt(def.solution), null).state;
    expect(solved).toMatchObject({ solved: true, errors: 1, moves: 2 });
  });

  it('ignores every action once solved: no rescoring', () => {
    const solved = kind.act(kind.init(def), runIt(def.solution), null).state;
    const step = kind.act(solved, runIt([]), null);
    expect(step.outcome).toEqual({ kind: 'ignored' });
    expect(step.state).toBe(solved);
  });

  it('runs a repeat with its iterations', () => {
    const loop: ProgramDef = {
      ...def,
      level: parseLevel(['S....F']),
      tray: ['right', 'repeat'],
      cap: 3,
      solution: [repeat(5, 'right')],
    };
    const step = kind.act(kind.init(loop), runIt(loop.solution), null);
    expect(step.outcome).toMatchObject({ kind: 'solved' });
    const outcome = step.outcome;
    expect('run' in outcome && outcome.run.steps.map((s) => s.iteration)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('program: a program that cannot run is invalid, counts no error and changes nothing', () => {
  const invalid = (program: readonly Tile[], from: ProgramDef = def): void => {
    const state = kind.init(from);
    const step = kind.act(state, runIt(program), null);
    expect(step.outcome).toEqual({ kind: 'invalid' });
    expect(step.state).toBe(state);
  };

  it('over the cap, counting a repeat as 1 + its body', () => {
    invalid(tiles('right', 'right', 'right', 'right', 'right', 'right', 'right'));
    const looped = { ...def, tray: ['right', 'repeat'] as const, cap: 2 } as ProgramDef;
    invalid([repeat(3, 'right', 'right')], looped);
    expect(kind.act(kind.init(looped), runIt([repeat(3, 'right')]), null).outcome.kind).toBe(
      'failed',
    );
  });

  it('with a tile outside the tray, also inside a repeat, or a repeat the tray lacks', () => {
    invalid(tiles('forward'));
    invalid([repeat(3, 'right')]);
    const looped = { ...def, tray: ['right', 'repeat'] as const } as ProgramDef;
    invalid([repeat(3, 'jump')], looped);
  });

  it('that is not a valid program: a repeat inside a repeat, a count out of range', () => {
    const looped = { ...def, tray: ['right', 'repeat'] as const } as ProgramDef;
    invalid([{ kind: 'repeat', times: 2, body: [repeat(2, 'right')] }], looped);
    invalid([repeat(1, 'right')], looped);
    invalid([repeat(10, 'right')], looped);
  });

  it('that changes a locked slot, or lacks it', () => {
    const locked: ProgramDef = {
      ...def,
      prefilled: [{ kind: 'right' }, null, { kind: 'right' }],
      locked: [0, 2],
    };
    invalid(tiles('down', 'right', 'right'), locked);
    invalid(tiles('right', 'right', 'up'), locked);
    invalid(tiles('right'), locked);
    expect(
      kind.act(kind.init(locked), runIt(tiles('right', 'right', 'right', 'down', 'down')), null)
        .outcome,
    ).toMatchObject({ kind: 'solved' });
  });

  it('with no tile at all: Run on an empty strip counts no error and no move', () => {
    invalid([]);
    const step = kind.act(kind.init(def), runIt([]), null);
    expect(step.state).toMatchObject({ errors: 0, moves: 0, solved: false });
  });

  it('never counts a move', () => {
    const step = kind.act(kind.init(def), runIt(tiles('forward')), null);
    expect(step.state.moves).toBe(0);
  });
});

describe('programProblem', () => {
  it('is null for a runnable program and says why otherwise', () => {
    expect(programProblem(def, def.solution)).toBeNull();
    expect(programProblem(def, [])).toBe('no tiles');
    expect(programProblem(def, tiles('forward'))).toBe('"forward" is not in the tray');
    expect(programProblem(def, tiles('up', 'up', 'up', 'up', 'up', 'up', 'up'))).toBe(
      '7 tiles is over the cap of 6',
    );
    expect(programProblem(def, [repeat(1, 'up')])).toBe('not a valid program');
    expect(
      programProblem({ ...def, prefilled: [{ kind: 'up' }], locked: [0] }, tiles('down')),
    ).toBe('locked slot 0 was changed');
  });

  it('a locked slot with nothing prefilled can never be satisfied', () => {
    expect(programProblem({ ...def, prefilled: [null], locked: [0] }, tiles('up'))).toBe(
      'locked slot 0 was changed',
    );
    expect(programProblem({ ...def, locked: [0] }, tiles('up'))).toBe('locked slot 0 was changed');
  });
});

describe('program: hints', () => {
  const looping: ProgramDef = {
    ...def,
    level: parseLevel(['S....F']),
    tray: ['right', 'repeat'],
    cap: 3,
    solution: [repeat(5, 'right')],
  };

  it('1 names the first move, 2 shows a ghost of the first two tiles, 3 reveals the solution', () => {
    const first = kind.hint(kind.init(def), 1, null);
    expect(first.hint).toEqual({ kind: 'program', level: 1, firstMove: 'right' });
    expect(first.state).toMatchObject({ hintLevel: 1, errors: 0 });
    const second = kind.hint(first.state, 2, null);
    expect(second.hint).toEqual({ kind: 'program', level: 2, ghost: def.solution.slice(0, 2) });
    const third = kind.hint(second.state, 3, null);
    expect(third.hint).toEqual({ kind: 'program', level: 3, reveal: def.solution });
    expect(third.state.hintLevel).toBe(3);
  });

  it('the first move of a solution that starts with a repeat is the first tile in its body', () => {
    expect(kind.hint(kind.init(looping), 1, null).hint).toMatchObject({ firstMove: 'right' });
    expect(firstPrimitive([repeat(2, 'down', 'right'), ...tiles('left')])).toBe('down');
    expect(firstPrimitive([])).toBeUndefined();
  });

  it('the ghost of a one-tile solution is that tile; level 3 does not run anything', () => {
    expect(kind.hint(kind.init(looping), 2, null).hint).toMatchObject({ ghost: looping.solution });
    const revealed = kind.hint(kind.init(def), 3, null).state;
    expect(revealed).toMatchObject({ solved: false, moves: 0, errors: 0 });
  });

  it('throws on a def whose solution is empty (the content build rejects it)', () => {
    expect(() => kind.hint(kind.init({ ...def, solution: [] }), 1, null)).toThrow('no tile');
  });
});

describe('program: stars', () => {
  it('cap stars by hints and errors', () => {
    const solvedAt = (hintLevel: 0 | 1 | 2 | 3, errors: number): number =>
      kind.stars({ ...kind.init(def), solved: true, hintLevel, errors });
    expect([
      solvedAt(0, 0),
      solvedAt(1, 0),
      solvedAt(0, 1),
      solvedAt(0, 2),
      solvedAt(3, 0),
    ]).toEqual([3, 2, 2, 1, 1]);
  });
});

describe('program: solution and wrong action', () => {
  it('the solution is one run of the reference program and solves with 0 errors and 3 stars', () => {
    expect(programSolution(def)).toEqual([runIt(def.solution)]);
    const solved = playSolution(def);
    expect(solved).toMatchObject({ solved: true, errors: 0 });
    expect(starsFor(solved)).toBe(3);
  });

  it('the wrong action is exactly 1 error and does not block solving', () => {
    const wrong = play(def, programWrongAction(def));
    expect(wrong).toMatchObject({ errors: 1, solved: false });
    const result = playWrongThenSolve(def);
    expect(result).toMatchObject({ errors: 1, solved: true });
    expect(starsFor(result)).toBe(2);
  });

  it('the wrong action is the solution without its last tile', () => {
    expect(programWrongAction(def)).toEqual([runIt(def.solution.slice(0, -1))]);
  });

  it('falls back to a shorter tail when the last tile is redundant', () => {
    const slack: ProgramDef = {
      ...def,
      cap: 8,
      solution: tiles('right', 'right', 'right', 'down', 'down', 'up', 'down'),
    };
    const [action] = programWrongAction(slack);
    expect(action?.program).toEqual(tiles('right', 'right', 'right', 'down', 'down', 'up'));
    expect(play(slack, programWrongAction(slack)).errors).toBe(1);
    expect(playWrongThenSolve(slack)).toMatchObject({ errors: 1, solved: true });
  });

  it('with locked slots the wrong action keeps them (an empty strip would be invalid and count nothing)', () => {
    const locked: ProgramDef = {
      ...def,
      prefilled: [{ kind: 'right' }, null, null, null, { kind: 'down' }],
      locked: [0, 4],
    };
    const wrong = play(locked, programWrongAction(locked));
    expect(wrong.errors).toBe(1);
    expect(playWrongThenSolve(locked)).toMatchObject({ errors: 1, solved: true });
  });

  it('a one-tile solution that is locked is swapped for another tile', () => {
    const one: ProgramDef = {
      ...def,
      level: parseLevel(['SF']),
      solution: tiles('right'),
      prefilled: [{ kind: 'right' }],
      locked: [0],
    };
    expect(() => programWrongAction(one)).toThrow('no runnable program fails');
    const open: ProgramDef = { ...one, locked: [] };
    expect(play(open, programWrongAction(open)).errors).toBe(1);
  });

  it('a solution made of a repeat is swapped for a single tile: the wrong action is never an empty program', () => {
    const loop: ProgramDef = {
      ...def,
      level: parseLevel(['S....F']),
      tray: ['right', 'repeat'],
      cap: 3,
      solution: [repeat(5, 'right')],
    };
    expect(programWrongAction(loop)).toEqual([runIt(tiles('right'))]);
    expect(playWrongThenSolve(loop)).toMatchObject({ errors: 1, solved: true });
  });

  it('failingProgram is never empty, and is null when no runnable program fails', () => {
    expect(failingProgram(def)).toEqual(def.solution.slice(0, -1));
    const one: ProgramDef = {
      ...def,
      level: parseLevel(['SF']),
      tray: ['right'],
      solution: tiles('right'),
    };
    // The only prefix is the empty program (not runnable) and the tray has no other tile to swap in.
    expect(failingProgram(one)).toBeNull();
    expect(() => programWrongAction(one)).toThrow('no runnable program fails');
    for (const sample of [def, { ...def, cap: 8 }]) {
      expect(failingProgram(sample)?.length).toBeGreaterThan(0);
    }
  });
});
