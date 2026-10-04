// Chess's settings slot (`SubjectCore.settings`), built from the plain values in `settings.ts` so the light `entry.ts`
// manifest and `chessCore` share one object without the entry pulling in the core (chess.js, kinds).
import type { SubjectSettingsSlot } from '@learn/platform-core/domain/subject';
import {
  CHESS_LEGACY_EXPORT,
  CHESS_RETIRED_SETTINGS,
  CHESS_SETTINGS_DEFAULTS,
  isValidComputerLevel,
} from './settings.ts';

export const CHESS_SETTINGS_SLOT: SubjectSettingsSlot = {
  defaults: CHESS_SETTINGS_DEFAULTS,
  retired: CHESS_RETIRED_SETTINGS,
  legacyExport: CHESS_LEGACY_EXPORT,
  isValid: (s) => isValidComputerLevel(s.computerLevel),
  loadBackupShape: async () => (await import('./settings-backup.ts')).chessSettingsBackupShape,
};
