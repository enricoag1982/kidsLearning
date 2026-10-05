// The app's storage / backup / parent-code identifiers (`docs/multi-subject.md` D2). The shared store is `kids:`; each
// subject gets the default `kids-<id>:` (no `subjectStoragePrefix`).
import type { AppConfig } from '@learn/platform-core/domain/subject';

/** No `version`: it is the running build's, filled in by the platform-web shell (`__APP_VERSION__`). */
export const KIDS_APP_CONFIG: Omit<AppConfig, 'version'> = {
  storagePrefix: 'kids:',
  backupAppId: 'kids-learning',
  backupFilePrefix: 'kids-learning',
  parentCodeFilePrefix: 'kids-learning-parent-code',
  title: 'Kids Learning',
  // Older single-subject apps' backup files (schema <= 5) import into the subject that took over their data.
  legacyBackupApps: { 'chess-kids': 'chess', 'math-demo': 'math' },
  // Chess for Kids ran on this origin (`enricoag1982.github.io`): its `chess-kids:` store is offered once on the first run.
  legacyStorePrefixes: { 'chess-kids': 'chess-kids:' },
};
