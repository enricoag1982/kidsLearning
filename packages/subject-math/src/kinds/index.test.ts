import { describe, expect, it } from 'vitest';
import { CARD_KINDS } from '@learn/platform-core/domain/exercise/kinds/cards/kinds';
import { CARD_SOLUTIONS } from '@learn/platform-core/domain/exercise/kinds/cards/solutions';
import { CARD_SAMPLES } from '@learn/platform-core/testing';
import { MATH_CHARACTERS, mathCore } from '../core/math-core.ts';
import {
  MATH_SOLUTIONS,
  playSolution,
  playWrongThenSolve,
  solutionOf,
  starsFor,
} from '../testing/index.ts';
import { MATH_KINDS, kindOf, startExercise } from './index.ts';

const TYPES = ['choice', 'number-entry', 'order', 'true-false'];

describe('the math registry', () => {
  it('is the card kit kinds (same objects), one plain object math adds its own kinds to', () => {
    expect(Object.keys(MATH_KINDS).sort()).toEqual(TYPES);
    for (const [type, kind] of Object.entries(CARD_KINDS)) {
      expect(MATH_KINDS[type as keyof typeof CARD_KINDS], type).toBe(kind);
    }
    for (const [type, kind] of Object.entries(MATH_KINDS)) {
      expect(kind.type).toBe(type);
    }
  });

  it('is the core registry, and the core is the card core under the subject id with the kit settings', () => {
    expect(mathCore.kinds).toBe(MATH_KINDS);
    expect(mathCore.id).toBe('math');
    expect(mathCore.characters).toBe(MATH_CHARACTERS);
    expect(Object.keys(MATH_CHARACTERS)).toEqual(['hedgehog']);
    expect(mathCore.modes).toEqual({});
    expect(mathCore.context).toBeNull();
  });

  it('has a solution for every kind: the card kit solutions (same objects)', () => {
    expect(Object.keys(MATH_SOLUTIONS).sort()).toEqual(TYPES);
    for (const [type, solution] of Object.entries(CARD_SOLUTIONS)) {
      expect(MATH_SOLUTIONS[type as keyof typeof CARD_SOLUTIONS], type).toBe(solution);
    }
  });

  it('finds a kind and a solution by the def type and starts a fresh state', () => {
    for (const def of Object.values(CARD_SAMPLES)) {
      expect(kindOf(def).type).toBe(def.type);
      expect(solutionOf(def)).toBe(MATH_SOLUTIONS[def.type]);
      expect(startExercise(def)).toMatchObject({
        def,
        moves: 0,
        solved: false,
        errors: 0,
        hintLevel: 0,
        entry: '',
      });
    }
  });

  it('plays every sample to 3 stars, and a wrong try costs exactly 1 error', () => {
    for (const def of Object.values(CARD_SAMPLES)) {
      const solved = playSolution(def);
      expect(solved, def.type).toMatchObject({ solved: true, errors: 0 });
      expect(starsFor(solved), def.type).toBe(3);
      expect(playWrongThenSolve(def), def.type).toMatchObject({ solved: true, errors: 1 });
    }
  });
});
