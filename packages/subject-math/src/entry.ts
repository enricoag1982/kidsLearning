// Math's light entry for the app shell (`docs/multi-subject.md` D7): the manifest the hub and the settings composition
// need before the pack loads, and `load()` for the pack itself. Imports no pack or kind statically.
import type { SubjectEntry } from '@learn/platform-web/app/subject.ts';
import { MATH_SETTINGS_SLOT } from './core/settings-slot.ts';
import hedgehog from './web/art/hedgehog.webp';

export { MATH_APP_CONFIG } from './core/app-config.ts';

export const mathEntry: SubjectEntry = {
  manifest: {
    id: 'math',
    settings: MATH_SETTINGS_SLOT,
    names: { en: 'Math' },
    icon: hedgehog,
    // The Home "Practice" tile's orange.
    colors: { bg: '#FBE3D2', fg: '#7A3A10', ledge: '#55290B' },
  },
  load: () => import('./web/math-loaded.ts').then((module) => module.mathLoaded),
};
