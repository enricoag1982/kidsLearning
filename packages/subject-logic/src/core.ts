// Logic's core: the card kit's four exercise kinds over one shared state, no kind code of its own.
import { createCardCore } from '@learn/platform-core/domain/exercise/kinds/cards/core';

/** Lesson characters that become an "animal friend" in My Den once their lesson is done: the Panda, Pip. The Owl is the platform's
 * own guide and narrates every world (not an animal friend); add a character here (and its `characters.<id>.name` / `topic.<id>`
 * texts) to introduce a new one. */
export const LOGIC_CHARACTERS = { panda: { topicKey: 'topic.puzzle' } } as const;

export const logicCore = createCardCore({
  id: 'logic',
  characters: LOGIC_CHARACTERS,
});
