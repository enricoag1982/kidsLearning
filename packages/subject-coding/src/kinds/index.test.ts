import { describe, expect, it } from 'vitest';
import { CARD_KINDS } from '@learn/platform-core/domain/exercise/kinds/cards/kinds';
import { CARD_SOLUTIONS } from '@learn/platform-core/domain/exercise/kinds/cards/solutions';
import { CARD_SAMPLES } from '@learn/platform-core/testing';
import { CODING_CHARACTERS, codingCore } from '../core/coding-core.ts';
import { CODING_SAMPLES, playSolution, playWrongThenSolve, starsFor } from '../testing/index.ts';
import { CODING_SOLUTIONS, solutionOf } from '../testing/index.ts';
import { CODING_KINDS, kindOf, startExercise } from './index.ts';

const TYPES = ['choice', 'find-bug', 'number-entry', 'order', 'predict', 'program', 'true-false'];

describe('the coding registry', () => {
  it('is the card kit kinds (same objects) plus the three coding kinds, one plain object', () => {
    expect(Object.keys(CODING_KINDS).sort()).toEqual(TYPES);
    for (const [type, kind] of Object.entries(CARD_KINDS)) {
      expect(CODING_KINDS[type as keyof typeof CARD_KINDS], type).toBe(kind);
    }
    for (const [type, kind] of Object.entries(CODING_KINDS)) {
      expect(kind.type).toBe(type);
    }
  });

  it('is the core registry, and the core is the card core under the subject id with the kit settings', () => {
    expect(codingCore.kinds).toBe(CODING_KINDS);
    expect(codingCore.id).toBe('coding');
    expect(codingCore.characters).toBe(CODING_CHARACTERS);
    expect(codingCore.modes).toEqual({});
    expect(codingCore.context).toBeNull();
  });

  it('has a solution for every kind: the card kit solutions (same objects) plus the three coding kinds', () => {
    expect(Object.keys(CODING_SOLUTIONS).sort()).toEqual(TYPES);
    for (const [type, solution] of Object.entries(CARD_SOLUTIONS)) {
      expect(CODING_SOLUTIONS[type as keyof typeof CARD_SOLUTIONS], type).toBe(solution);
    }
  });

  it('finds a kind and a solution by the def type and starts a fresh state', () => {
    for (const def of Object.values(CODING_SAMPLES)) {
      expect(kindOf(def).type).toBe(def.type);
      expect(solutionOf(def)).toBe(CODING_SOLUTIONS[def.type]);
      expect(startExercise(def)).toMatchObject({
        def,
        moves: 0,
        solved: false,
        errors: 0,
        hintLevel: 0,
      });
    }
  });

  it('plays every sample of every kind (card and coding) to 3 stars, and a wrong try costs exactly 1 error', () => {
    for (const def of [...Object.values(CARD_SAMPLES), ...Object.values(CODING_SAMPLES)]) {
      const solved = playSolution(def);
      expect(solved, def.type).toMatchObject({ solved: true, errors: 0 });
      expect(starsFor(solved), def.type).toBe(3);
      expect(playWrongThenSolve(def), def.type).toMatchObject({ solved: true, errors: 1 });
    }
  });
});
