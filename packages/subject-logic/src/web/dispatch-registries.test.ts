// CI guard: type / mode dispatch stays inside the pack's 2 registries. Scans `src/web`: the card kit's own registries do the
// dispatch for its four kinds; the registries here take logic's own kinds (`grid-fill` since m14.8, `group` later) as they join.
import path from 'node:path';
import { dispatchGuard, listSourceFiles } from '@learn/platform-web/testing/dispatch-guard.ts';

const srcDir = import.meta.dirname;

dispatchGuard({
  title: 'subject-logic web: type / mode dispatch stays inside the 2 registries',
  root: srcDir,
  files: listSourceFiles(path.join(srcDir)),
  literals: ['choice', 'true-false', 'number-entry', 'order', 'grid-fill', 'series'],
  allowed: ['kinds/ui-registry.ts', 'kinds/e2e-registry.ts'],
});
