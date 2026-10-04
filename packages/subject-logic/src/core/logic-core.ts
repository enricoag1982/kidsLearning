// Logic's `SubjectCore`: the card kit's core (`choice` and `order` serve the pattern lessons) with logic's kind registry in place
// of the kit's, so logic's own kinds (`group`, `grid-fill`) join `LOGIC_KINDS`, and their feedback notes added to the kit's table.
// No mode of its own (`series` comes from the runtime).
import { createCardCore } from '@learn/platform-core/domain/exercise/kinds/cards/core';
import type { SubjectCore } from '@learn/platform-core/domain/subject';
import { LOGIC_KINDS } from '../kinds/index.ts';
import { LOGIC_NOTES } from './notes.ts';

/** Lesson characters that become an "animal friend" in My Den once their lesson is done: the Panda, Pip. The Owl is the platform's
 * own guide and narrates every world (not an animal friend); add a character here (and its `characters.<id>.name` / `topic.<id>`
 * texts) to introduce a new one. */
export const LOGIC_CHARACTERS: Readonly<Record<string, { readonly topicKey: string }>> = {
  panda: { topicKey: 'topic.puzzle' },
};

export const logicCore: SubjectCore<null> = {
  ...createCardCore({ id: 'logic', characters: LOGIC_CHARACTERS, notes: LOGIC_NOTES }),
  kinds: LOGIC_KINDS,
};
