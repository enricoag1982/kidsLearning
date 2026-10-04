// The card kit's empty settings slot, in a module of its own: a subject's light entry (the app shell's manifest) reads it
// without importing the kinds behind `createCardCore`.
import type { SubjectSettingsSlot } from '../../../subject.ts';

/** No settings fields of its own. */
export const CARD_SETTINGS_SLOT: SubjectSettingsSlot = {
  defaults: {},
  isValid: () => true,
  loadBackupShape: () => Promise.resolve({}),
};
