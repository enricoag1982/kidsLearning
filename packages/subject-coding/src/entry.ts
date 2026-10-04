// The coding subject's light entry for the app shell (`docs/multi-subject.md` D7): the manifest the hub and the settings
// composition need before the pack loads, and `load()` for the pack itself. Imports no pack, kind or core statically.
import { CARD_SETTINGS_SLOT } from '@learn/platform-core/domain/exercise/kinds/cards/settings-slot';
import type { SubjectEntry } from '@learn/platform-web/app/subject.ts';
import icon from './web/art/subject-icon.svg';

export const codingEntry: SubjectEntry = {
  manifest: {
    id: 'coding',
    // The card kit's empty slot: the same object `createCardCore` puts in the core.
    settings: CARD_SETTINGS_SLOT,
    names: { en: 'Coding' },
    icon,
    // The hub tile and the Home "Practice" tile colours: the palette's blue (`--color-edge-info` / `--color-ledge-info`), the one chess
    // (green) and math (orange) leave.
    colors: { bg: '#DDE8F6', fg: '#1F3F6D', ledge: '#162C4C' },
  },
  load: () => import('./web/coding-loaded.ts').then((module) => module.codingLoaded),
};
