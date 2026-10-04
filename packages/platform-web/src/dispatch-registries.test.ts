// CI guard: platform-web allows 0 exercise-type / mini-game-mode dispatch literals; each subject pack
// calls the same guard for its own registries.
import { describe, expect, it } from 'vitest';
import {
  dispatchesOnTypeOrMode,
  dispatchGuard,
  listSourceFiles,
} from './testing/dispatch-guard.ts';

const EXERCISE_TYPES = [
  'collect-stars',
  'capture',
  'select-squares',
  'yes-no',
  'choice',
  'best-move',
  'setup',
  'mate-in-n',
  'number-entry',
  'true-false',
  'order',
  'group',
];
const MODE_TYPES = ['static', 'series', 'versus'];

dispatchGuard({
  title: 'platform-web: no exercise-type / mini-game-mode dispatch literal',
  root: import.meta.dirname,
  files: listSourceFiles(import.meta.dirname),
  literals: [...EXERCISE_TYPES, ...MODE_TYPES],
});

describe('platform-web: the opt-in group kind is a guarded exercise type', () => {
  it('a deliberate dispatch on it is caught (so no UI code branches on it)', () => {
    const literals = [...EXERCISE_TYPES, ...MODE_TYPES];
    expect(dispatchesOnTypeOrMode(`if (def.type === 'group') { sort(); }`, literals)).toBe(true);
    expect(dispatchesOnTypeOrMode(`switch (def.type) { case 'group': break; }`, literals)).toBe(
      true,
    );
    expect(dispatchesOnTypeOrMode(`if (def.layout === 'row') { rows(); }`, literals)).toBe(false);
  });
});
