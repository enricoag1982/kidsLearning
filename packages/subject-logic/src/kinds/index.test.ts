import { describe, expect, it } from 'vitest';
import { CARD_KINDS } from '@learn/platform-core/domain/exercise/kinds/cards/kinds';
import { CARD_SOLUTIONS } from '@learn/platform-core/domain/exercise/kinds/cards/solutions';
import { CARD_SAMPLES } from '@learn/platform-core/testing';
import { LOGIC_CHARACTERS, logicCore } from '../core/logic-core.ts';
import { gridFillKind } from './grid-fill/kind.ts';
import { gridFillSolution, gridFillWrongAction } from './grid-fill/solution.ts';
import { GRID_FILL_SAMPLES } from './grid-fill/samples.ts';
import {
  LOGIC_SOLUTIONS,
  playSolution,
  playWrongThenSolve,
  solutionOf,
  starsFor,
} from '../testing/index.ts';
import { LOGIC_KINDS, kindOf, startExercise } from './index.ts';

const TYPES = ['choice', 'grid-fill', 'number-entry', 'order', 'true-false'];

const SAMPLES = [...Object.values(CARD_SAMPLES), ...Object.values(GRID_FILL_SAMPLES)];

describe('the logic registry', () => {
  it('is the card kit kinds (same objects) and grid-fill, one plain object; logic’s own kinds join it with one line each', () => {
    expect(Object.keys(LOGIC_KINDS).sort()).toEqual(TYPES);
    for (const [type, kind] of Object.entries(CARD_KINDS)) {
      expect(LOGIC_KINDS[type as keyof typeof CARD_KINDS], type).toBe(kind);
    }
    expect(LOGIC_KINDS['grid-fill']).toBe(gridFillKind);
    for (const [type, kind] of Object.entries(LOGIC_KINDS)) {
      expect(kind.type).toBe(type);
    }
  });

  it('is the core registry, and the core is the card core under the subject id with the kit settings and no mode of its own', () => {
    expect(logicCore.kinds).toBe(LOGIC_KINDS);
    expect(logicCore.id).toBe('logic');
    expect(logicCore.characters).toBe(LOGIC_CHARACTERS);
    expect(Object.keys(LOGIC_CHARACTERS)).toEqual(['panda']);
    // `series` comes from the runtime.
    expect(Object.keys(logicCore.modes)).toEqual([]);
    expect(logicCore.context).toBeNull();
  });

  it('has a solution for every kind: the card kit solutions (same objects) and grid-fill’s', () => {
    expect(Object.keys(LOGIC_SOLUTIONS).sort()).toEqual(TYPES);
    for (const [type, solution] of Object.entries(CARD_SOLUTIONS)) {
      expect(LOGIC_SOLUTIONS[type as keyof typeof CARD_SOLUTIONS], type).toBe(solution);
    }
    expect(LOGIC_SOLUTIONS['grid-fill'].solution).toBe(gridFillSolution);
    expect(LOGIC_SOLUTIONS['grid-fill'].wrongAction).toBe(gridFillWrongAction);
  });

  it('finds a kind and a solution by the def type and starts a fresh state', () => {
    expect([...new Set(SAMPLES.map((def) => def.type))].sort()).toEqual(TYPES);
    for (const def of SAMPLES) {
      expect(kindOf(def).type).toBe(def.type);
      expect(solutionOf(def)).toBe(LOGIC_SOLUTIONS[def.type]);
      expect(startExercise(def)).toMatchObject({
        def,
        moves: 0,
        solved: false,
        errors: 0,
        hintLevel: 0,
      });
    }
    // The card kinds share one state with the typed digits.
    expect(startExercise(CARD_SAMPLES['number-entry'])).toMatchObject({ entry: '' });
    // A grid puzzle starts with its givens in place.
    expect(startExercise(GRID_FILL_SAMPLES.lastCell)).toMatchObject({
      marks: {},
      stepHint: 0,
      cells: expect.arrayContaining([3, 4, undefined]) as unknown,
    });
  });

  it('plays every sample to 3 stars, and a wrong try costs exactly 1 error', () => {
    for (const def of SAMPLES) {
      const solved = playSolution(def);
      expect(solved, def.type).toMatchObject({ solved: true, errors: 0 });
      expect(starsFor(solved), def.type).toBe(3);
      expect(playWrongThenSolve(def), def.type).toMatchObject({ solved: true, errors: 1 });
    }
  });
});
