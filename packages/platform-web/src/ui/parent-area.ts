// The parent area's lazy chunk entry (`App.tsx`): the screen plus the backup import pipeline it is built on, which the first run's
// "bring Chess for Kids progress here" offer (`LegacyImportStep`) runs too. One dynamic-import target for both keeps the zod-based
// backup / merge code in a single lazy chunk (a second target would split the shared core modules out of the eager chunks:
// +0.8 KB on the first load, measured at `m15.4`).
export { ParentAreaScreen } from './ParentAreaScreen.tsx';
export { parseBackupFile } from '@learn/platform-core/backup';
export { importMerged, planImport } from '@learn/platform-core/merge';
