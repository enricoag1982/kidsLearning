// Math's `SubjectCore`: the card kit's core (a prompt card, `choice` and `number-entry` serve the demo world) with math's kind
// registry in place of the kit's, so math's own kinds (`number-line`, `place-value`, `array`) join `MATH_KINDS`, and
// their feedback notes added to the kit's table. Its one mini-game mode of its own is the opt-in `duel` over `MATH_GAMES` (m13.13:
// Race to 20); `series` comes from the runtime.
import { createDuelMode } from '@learn/platform-core';
import { createCardCore } from '@learn/platform-core/domain/exercise/kinds/cards/core';
import type { SubjectCore } from '@learn/platform-core/domain/subject';
import { MATH_KINDS } from '../kinds/index.ts';
import { MATH_GAMES } from './games/index.ts';
import { MATH_NOTES } from './notes.ts';

/** Lesson characters that double as an "animal friend" once their lesson is done (the Owl guides every world and is not one). Add a
 * character here (and its `characters.<id>.name` / `topic.<id>` texts) to introduce a new one. */
export const MATH_CHARACTERS: Readonly<Record<string, { readonly topicKey: string }>> = {
  hedgehog: { topicKey: 'topic.counter' },
};

export const mathCore: SubjectCore<null> = {
  ...createCardCore({ id: 'math', characters: MATH_CHARACTERS, notes: MATH_NOTES }),
  kinds: MATH_KINDS,
  modes: { duel: createDuelMode(MATH_GAMES) },
};
