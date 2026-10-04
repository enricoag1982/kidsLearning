// Math's storage / backup / parent-code identifiers, in a module of its own so the app shell can read them without
// loading the math core (`entry.ts`).
import type { AppConfig } from '@learn/platform-core/domain/subject';

/** No `version`: it is the running build's, filled in by the platform-web shell. */
export const MATH_APP_CONFIG: Omit<AppConfig, 'version'> = {
  title: 'Math for Kids',
  storagePrefix: 'math-demo:',
  // Interim (m11.2–m11.5): one store, keys unchanged; m11.6 moves to `kids:` + `kids-<id>:`.
  subjectStoragePrefix: () => 'math-demo:',
  backupAppId: 'math-demo',
  backupFilePrefix: 'math-demo',
  parentCodeFilePrefix: 'math-demo-parent-code',
};
