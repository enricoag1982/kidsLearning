// Math's `SubjectCore` + `AppConfig`: the concrete values every platform seam
// (`createSubjectRuntime`, `AppDeps.subject` / `app`) plugs in for this app.
import type { SubjectCore } from '@learn/platform-core/domain/subject';
import { MATH_KINDS } from '../kinds/index.ts';
import { MATH_APP_CONFIG } from './app-config.ts';
import { MATH_NOTES } from './notes.ts';
import { MATH_SETTINGS_SLOT } from './settings-slot.ts';

/** Lesson characters that double as an "animal friend" once their lesson is done. */
export const MATH_CHARACTERS: Readonly<Record<string, { readonly topicKey: string }>> = {
  hedgehog: { topicKey: 'topic.counter' },
};

/** Math's `SubjectCore`: 2 exercise kinds and no mode of its own (`series` comes from `createSubjectRuntime`); no badge
 * facts, game log or settings slot. */
export const mathCore: SubjectCore<null> = {
  id: 'math',
  context: null,
  kinds: MATH_KINDS,
  modes: {},
  characters: MATH_CHARACTERS,
  notes: MATH_NOTES,
  noteVars: () => ({}),
  settings: MATH_SETTINGS_SLOT,
};

// Defined in `app-config.ts` (a light module the app shell imports without the pack); re-exported for the core's users.
export { MATH_APP_CONFIG };
