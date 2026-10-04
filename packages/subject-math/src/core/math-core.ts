// Math's `SubjectCore`: the card kit's core (a prompt card, `choice` and `number-entry` serve the demo world) with math's kind
// registry in place of the kit's, so the kinds of m13.6-m13.8 (`number-line`, `place-value`, `array`) join `MATH_KINDS`. No mode of
// its own (`series` comes from the runtime).
import { createCardCore } from '@learn/platform-core/domain/exercise/kinds/cards/core';
import { CARD_NOTES } from '@learn/platform-core/domain/exercise/kinds/cards/notes';
import type { SubjectCore } from '@learn/platform-core/domain/subject';
import { MATH_KINDS } from '../kinds/index.ts';

/** Lesson characters that double as an "animal friend" once their lesson is done (the Owl guides every world and is not one). Add a
 * character here (and its `characters.<id>.name` / `topic.<id>` texts) to introduce a new one. */
export const MATH_CHARACTERS: Readonly<Record<string, { readonly topicKey: string }>> = {
  hedgehog: { topicKey: 'topic.counter' },
};

export const mathCore: SubjectCore<null> = {
  ...createCardCore({ id: 'math', characters: MATH_CHARACTERS, notes: CARD_NOTES }),
  kinds: MATH_KINDS,
};
