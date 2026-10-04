// The starter subject's `SubjectWeb` pack: the card kit's web (kind UIs, card prompt, surfaces) over this subject's compiled
// content. Add images to `art` (by id, used as `image:` in the YAML) and a glyph per rank for My Den.
import type { BadgeDef, CompiledContent, TracksCatalog } from '@learn/platform-core';
import { createBundledContentSource } from '@learn/platform-web/adapters/content/bundled-content-source.ts';
import { createCardWeb } from '@learn/platform-web/kinds/cards/web.ts';
import { codingCore } from '../core.ts';
import bundled from '../../dist/content.json';
import bundledTracks from '../../dist/tracks.json';
import bundledBadges from '../../dist/badges.json';

/** The content build validates these shapes (invalid content fails `pnpm build`), so these are type conversions, not runtime
 * checks. */
const content = bundled as unknown as CompiledContent;
const tracks = bundledTracks as unknown as TracksCatalog;
const badges = bundledBadges as unknown as BadgeDef[];

export const codingWeb = createCardWeb({
  core: codingCore,
  content: createBundledContentSource({ content, tracks, badges }),
  art: {},
  rankGlyphs: { starter: '1', explorer: '2' },
});
