// CI guard: type / mode dispatch stays inside the pack's 3 registries. Scans `src/web`: the card kit's own registries do the
// dispatch for its four kinds; the registries here take math's own kinds (m13.6-m13.8).
import path from 'node:path';
import { dispatchGuard, listSourceFiles } from '@learn/platform-web/testing/dispatch-guard.ts';

const srcDir = import.meta.dirname;

dispatchGuard({
  title: 'subject-math web: type / mode dispatch stays inside the 3 registries',
  root: srcDir,
  files: listSourceFiles(path.join(srcDir)),
  literals: ['choice', 'true-false', 'number-entry', 'order', 'series'],
  allowed: ['kinds/ui-registry.ts', 'kinds/e2e-registry.ts', 'modes/e2e-registry.ts'],
});
