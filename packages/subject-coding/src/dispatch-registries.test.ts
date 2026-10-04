// CI guard: nothing under `src` dispatches on an exercise type or a mini-game mode except the kind registries (the card kit's
// own do that for its four kinds; `kinds/index.ts` and `kinds/solutions.ts` map the three coding kinds by type).
import path from 'node:path';
import { dispatchGuard, listSourceFiles } from '@learn/platform-web/testing/dispatch-guard.ts';

const srcDir = import.meta.dirname;

dispatchGuard({
  title: 'subject-coding: no exercise-type / mini-game-mode dispatch outside the registries',
  root: srcDir,
  files: listSourceFiles(path.join(srcDir)),
  literals: [
    'choice',
    'true-false',
    'number-entry',
    'order',
    'program',
    'predict',
    'find-bug',
    'series',
  ],
  allowed: ['kinds/index.ts', 'kinds/solutions.ts'],
});
