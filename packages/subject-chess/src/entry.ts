// Chess's light entry for the app shell (`docs/multi-subject.md` D7): the manifest the hub and the settings composition
// need before the pack loads, and `load()` for the pack itself. Imports no pack, kind or chess.js statically, so the
// whole chess subject stays out of the entry chunk.
import type { SubjectEntry } from '@learn/platform-web/app/subject.ts';
import { CHESS_SETTINGS_SLOT } from './core/chess/settings-slot.ts';
import icon from './web/art/subject-icon.svg';

export { CHESS_APP_CONFIG } from './core/chess/app-config.ts';

export const chessEntry: SubjectEntry = {
  manifest: {
    id: 'chess',
    settings: CHESS_SETTINGS_SLOT,
    names: { en: 'Chess' },
    icon,
    // The Home "Journey" tile's green.
    colors: { bg: '#DCEFE3', fg: '#1F5A41', ledge: '#163F2E' },
  },
  load: () => import('./web/chess-loaded.ts').then((module) => module.chessLoaded),
};
