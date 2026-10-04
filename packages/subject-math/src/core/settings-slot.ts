// Math's settings slot (`SubjectCore.settings`): no fields of its own. A module of its own so the light `entry.ts`
// manifest and `mathCore` share one object.
import type { SubjectSettingsSlot } from '@learn/platform-core/domain/subject';

export const MATH_SETTINGS_SLOT: SubjectSettingsSlot = {
  defaults: {},
  isValid: () => true,
  loadBackupShape: () => Promise.resolve({}),
};
