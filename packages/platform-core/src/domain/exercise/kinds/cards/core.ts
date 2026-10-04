// The card kit's `SubjectCore`: a subject made only of YAML + art gets its whole core from this one call.
import type { AnyNoteEntry } from '../../../notes.ts';
import type { SubjectCore, SubjectSettingsSlot } from '../../../subject.ts';
import { CARD_KINDS } from './kinds.ts';
import { CARD_NOTES } from './notes.ts';

/** No settings fields of its own. */
export const CARD_SETTINGS_SLOT: SubjectSettingsSlot = {
  defaults: {},
  isValid: () => true,
  loadBackupShape: () => Promise.resolve({}),
};

export interface CardCoreOptions {
  readonly id: string;
  /** Lesson characters that double as an "animal friend" once their lesson is done. */
  readonly characters: Readonly<Record<string, { readonly topicKey: string }>>;
  /** Notes added to (or replacing) the kit's own, by feedback kind. */
  readonly notes?: Readonly<Record<string, AnyNoteEntry>>;
}

/** 4 exercise kinds (`choice`, `true-false`, `number-entry`, `order`) over one shared state; no mode of its own (the runtime
 * adds `series`), no badge facts, game log or settings fields. */
export function createCardCore({ id, characters, notes = {} }: CardCoreOptions): SubjectCore<null> {
  return {
    id,
    context: null,
    kinds: CARD_KINDS,
    modes: {},
    characters,
    notes: { ...CARD_NOTES, ...notes },
    noteVars: () => ({}),
    settings: CARD_SETTINGS_SLOT,
  };
}
