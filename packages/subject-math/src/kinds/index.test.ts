import { describe, expect, it } from 'vitest';
import { isDuelMode } from '@learn/platform-core';
import { CARD_KINDS } from '@learn/platform-core/domain/exercise/kinds/cards/kinds';
import { CARD_SOLUTIONS } from '@learn/platform-core/domain/exercise/kinds/cards/solutions';
import { CARD_SAMPLES } from '@learn/platform-core/testing';
import { MATH_GAMES } from '../core/games/index.ts';
import { MATH_CHARACTERS, mathCore } from '../core/math-core.ts';
import { MATH_NOTES } from '../core/notes.ts';
import {
  ARRAY_SAMPLES,
  MATH_SOLUTIONS,
  NUMBER_LINE_SAMPLES,
  PLACE_VALUE_SAMPLES,
  playSolution,
  playWrongThenSolve,
  solutionOf,
  starsFor,
} from '../testing/index.ts';
import { MATH_KINDS, kindOf, startExercise } from './index.ts';

const TYPES = [
  'array',
  'choice',
  'number-entry',
  'number-line',
  'order',
  'place-value',
  'true-false',
];

const SAMPLES = [
  ...Object.values(CARD_SAMPLES),
  ...Object.values(NUMBER_LINE_SAMPLES),
  ...Object.values(PLACE_VALUE_SAMPLES),
  ...Object.values(ARRAY_SAMPLES),
];

describe('the math registry', () => {
  it("is the card kit kinds (same objects) plus math's own, one plain object", () => {
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
    // The opt-in `duel` mode over math's own games is its one mode (`series` comes from the runtime).
    expect(Object.keys(mathCore.modes)).toEqual(['duel']);
    expect(isDuelMode(mathCore.modes.duel)).toBe(true);
    expect(isDuelMode(mathCore.modes.duel) && mathCore.modes.duel.games).toBe(MATH_GAMES);
    expect(mathCore.context).toBeNull();
  });

  it("the core notes are the card kit notes plus math's own (the line note, and a hint note that words the line hints)", () => {
    expect(mathCore.notes['line-wrong']).toBe(MATH_NOTES['line-wrong']);
    expect(mathCore.notes['array-wrong']).toBe(MATH_NOTES['array-wrong']);
    expect(mathCore.notes['hint']).toBe(MATH_NOTES.hint);
    for (const kind of ['wrong-answer', 'number-wrong', 'order-wrong', 'solved']) {
      expect(mathCore.notes[kind], kind).toBeDefined();
    }
  });

  it("has a solution for every kind: the card kit solutions (same objects) plus math's own", () => {
    expect(Object.keys(MATH_SOLUTIONS).sort()).toEqual(TYPES);
    for (const [type, solution] of Object.entries(CARD_SOLUTIONS)) {
      expect(MATH_SOLUTIONS[type as keyof typeof CARD_SOLUTIONS], type).toBe(solution);
    }
  });

  it('finds a kind and a solution by the def type and starts a fresh state', () => {
    for (const def of SAMPLES) {
      expect(kindOf(def).type).toBe(def.type);
      expect(solutionOf(def)).toBe(MATH_SOLUTIONS[def.type]);
      expect(startExercise(def)).toMatchObject({
        def,
        moves: 0,
        solved: false,
        errors: 0,
        hintLevel: 0,
      });
    }
    // The card kinds share one state with the typed digits; place-value keeps nothing beyond the base state.
    expect(startExercise(CARD_SAMPLES['number-entry'])).toMatchObject({ entry: '' });
    expect(startExercise(PLACE_VALUE_SAMPLES.zero)).not.toHaveProperty('entry');
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
