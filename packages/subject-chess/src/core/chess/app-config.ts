// Chess's storage / backup / parent-code identifiers, in a module of its own so the app shell can read them without
// loading the chess core (`entry.ts`).
import type { AppConfig } from '@learn/platform-core/domain/subject';

/** No `version`: it is the running build's, filled in by the platform-web shell (`__APP_VERSION__`). */
export const CHESS_APP_CONFIG: Omit<AppConfig, 'version'> = {
  storagePrefix: 'chess-kids:',
  // Interim (m11.2–m11.5): one store, keys unchanged; m11.6 moves to `kids:` + `kids-<id>:`.
  subjectStoragePrefix: () => 'chess-kids:',
  backupAppId: 'chess-kids',
  backupFilePrefix: 'chess-for-kids',
  parentCodeFilePrefix: 'chess-for-kids-parent-code',
};
