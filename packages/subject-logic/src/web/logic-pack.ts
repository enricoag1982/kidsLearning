// The logic `SubjectWeb` pack: the card kit's web (card prompt, surfaces) over the compiled logic content, with logic's kind UI
// registry in place of the kit's, so logic's own kinds (`group`, `grid-fill`) join `LOGIC_KIND_UI`. Pip the Panda is the platform's
// own panda image, so `art` is empty; add images by id (used as `image:` in the YAML) as the lessons need them.
import type { BadgeDef, CompiledContent, TracksCatalog } from '@learn/platform-core';
import { createBundledContentSource } from '@learn/platform-web/adapters/content/bundled-content-source.ts';
import type { SubjectWeb } from '@learn/platform-web/app/subject.ts';
import { createCardWeb } from '@learn/platform-web/kinds/cards/web.ts';
import { logicCore } from '../core/logic-core.ts';
import { LOGIC_KIND_UI } from './kinds/ui-registry.ts';
import bundled from '../../dist/content.json';
import bundledTracks from '../../dist/tracks.json';
import bundledBadges from '../../dist/badges.json';

/** The content build validates these shapes (invalid content fails `pnpm build`), so these are type conversions, not runtime
 * checks. */
const content = bundled as unknown as CompiledContent;
const tracks = bundledTracks as unknown as TracksCatalog;
const badges = bundledBadges as unknown as BadgeDef[];

export const logicWeb: SubjectWeb = {
  ...createCardWeb({
    core: logicCore,
    content: createBundledContentSource({ content, tracks, badges }),
    art: {},
    rankGlyphs: { thinker: '1' },
  }),
  kinds: LOGIC_KIND_UI,
};
