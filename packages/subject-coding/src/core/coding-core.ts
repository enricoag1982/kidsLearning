// The coding subject's core: the card kit's core (`order` / `choice` serve the sequencing and pattern lessons) with the three
// coding kinds added to its registry. No mode of its own (`series` comes from the runtime).
import { createCardCore } from '@learn/platform-core/domain/exercise/kinds/cards/core';
import type { SubjectCore } from '@learn/platform-core/domain/subject';
import { CODING_KINDS } from '../kinds/index.ts';

/** Lesson characters that become an "animal friend" in My Den once their lesson is done. The Owl is the platform's own guide;
 * add a character here (and its `characters.<id>.name` / `topic.<id>` texts) to introduce a new one. */
export const CODING_CHARACTERS = { owl: { topicKey: 'topic.owl' } } as const;

export const codingCore: SubjectCore<null> = {
  ...createCardCore({ id: 'coding', characters: CODING_CHARACTERS }),
  kinds: CODING_KINDS,
};
