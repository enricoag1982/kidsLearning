// CI guard: this subject has no kind or mode code of its own, so nothing under `src` may dispatch on an exercise type or a
// mini-game mode (the card kit's registries do that). Add a kind or a mode of your own and its registry joins `allowed`.
import path from 'node:path';
import { dispatchGuard, listSourceFiles } from '@learn/platform-web/testing/dispatch-guard.ts';

const srcDir = import.meta.dirname;

dispatchGuard({
  title: 'subject-logic: no exercise-type / mini-game-mode dispatch in the subject itself',
  root: srcDir,
  files: listSourceFiles(path.join(srcDir)),
  literals: ['choice', 'true-false', 'number-entry', 'order', 'series'],
});
