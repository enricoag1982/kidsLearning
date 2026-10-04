import { describe, expect, it } from 'vitest';
import * as logic from './logic.ts';

describe('@learn/subject-logic', () => {
  it('exports the core, its characters and the kind registry (types aside)', () => {
    expect(Object.keys(logic).sort()).toEqual([
      'LOGIC_CHARACTERS',
      'LOGIC_KINDS',
      'kindOf',
      'logicCore',
      'startExercise',
    ]);
  });
});
