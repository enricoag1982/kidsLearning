// The starter subject's core: the card kit's four exercise kinds over one shared state, no kind code of its own.
import { createCardCore } from '@learn/platform-core/domain/exercise/kinds/cards/core';

/** Lesson characters that become an "animal friend" in My Den once their lesson is done. The Owl is the platform's own guide;
 * add a character here (and its `characters.<id>.name` / `topic.<id>` texts) to introduce a new one. */
export const TEMPLATE_CHARACTERS = { owl: { topicKey: 'topic.owl' } } as const;

export const templateCore = createCardCore({
  id: 'template',
  characters: TEMPLATE_CHARACTERS,
});
