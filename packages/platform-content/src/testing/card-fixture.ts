// A tiny subject made only of YAML (`card-subject/`) that uses all four card kinds: what the card kit's own tests and the
// platform-web App-flow test compile through `createCardContent`.
import { fileURLToPath } from 'node:url';

/** The fixture's content root: `lessons/`, `minigames/`, `locales/`, `tracks.yaml`, `badges.yaml`. */
export const CARD_FIXTURE_ROOT = fileURLToPath(new URL('./card-subject', import.meta.url));

/** The fixture's lesson characters (one source for `createCardCore` and `createCardContent`). */
export const CARD_FIXTURE_CHARACTERS = { fox: { topicKey: 'topic.fox' } } as const;
