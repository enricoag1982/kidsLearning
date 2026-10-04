import type { BadgeDef, CompiledContent, TracksCatalog } from '@learn/platform-core';
import { createBundledContentSource } from '@learn/platform-web/adapters/content/bundled-content-source.ts';
import bundled from '../../../../dist/content.json';
import bundledTracks from '../../../../dist/tracks.json';
import bundledBadges from '../../../../dist/badges.json';

/** The content build validates these shapes (invalid content fails `pnpm build`), so these are type conversions, not runtime
 * checks. */
const content = bundled as unknown as CompiledContent;
const tracks = bundledTracks as unknown as TracksCatalog;
const badges = bundledBadges as unknown as BadgeDef[];

/** `ContentSource` over math's build-time compiled bundle. */
export function createMathContentSource() {
  return createBundledContentSource({ content, tracks, badges });
}
