// Math's light entry for the app shell (`docs/multi-subject.md` D7): the manifest the hub and the settings composition need before
// the pack loads, and `load()` for the pack itself. Imports no pack, kind or core statically.
import { CARD_SETTINGS_SLOT } from '@learn/platform-core/domain/exercise/kinds/cards/settings-slot';
import type { SubjectEntry } from '@learn/platform-web/app/subject.ts';
import hedgehog from './web/art/hedgehog.webp';

export const mathEntry: SubjectEntry = {
  manifest: {
    id: 'math',
    // The card kit's empty slot: the same object `createCardCore` puts in the core.
    settings: CARD_SETTINGS_SLOT,
    names: { en: 'Math' },
    icon: hedgehog,
    // The Home "Practice" tile's orange.
    colors: { bg: '#FBE3D2', fg: '#7A3A10', ledge: '#55290B' },
  },
  load: () => import('./web/math-loaded.ts').then((module) => module.mathLoaded),
};
