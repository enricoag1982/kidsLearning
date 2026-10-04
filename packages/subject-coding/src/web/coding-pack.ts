// The `SubjectWeb` pack: the card kit's web (card prompt, surfaces) over this subject's compiled content, with the three coding
// kinds' UIs (`program`, `predict`, `find-bug`) added to its `kinds`. Add images to `art` (by id, used as `image:` in the YAML;
// `actor` replaces the fox on the board) and a glyph per rank for My Den.
import type { BadgeDef, CompiledContent, TracksCatalog } from '@learn/platform-core';
import { createBundledContentSource } from '@learn/platform-web/adapters/content/bundled-content-source.ts';
import type { SubjectWeb } from '@learn/platform-web/app/subject.ts';
import { createCardWeb } from '@learn/platform-web/kinds/cards/web.ts';
import { codingCore } from '../core/coding-core.ts';
import { CODING_KIND_UI } from './kinds/ui-registry.ts';
import bundled from '../../dist/content.json';
import bundledTracks from '../../dist/tracks.json';
import bundledBadges from '../../dist/badges.json';

/** The content build validates these shapes (invalid content fails `pnpm build`), so these are type conversions, not runtime
 * checks. */
const content = bundled as unknown as CompiledContent;
const tracks = bundledTracks as unknown as TracksCatalog;
const badges = bundledBadges as unknown as BadgeDef[];

export const codingWeb: SubjectWeb = {
  ...createCardWeb({
    core: codingCore,
    content: createBundledContentSource({ content, tracks, badges }),
    art: {},
    rankGlyphs: { starter: '1', stepper: '2' },
  }),
  kinds: CODING_KIND_UI,
  // Gated on the compile-time DEV flag so Rollup drops the dev-playground subtree: an ungated `dev` field keeps its `import()` as a
  // live split point.
  dev: import.meta.env.DEV
    ? { '#coding': () => import('./dev/CodingPlayground.tsx').then((m) => m.CodingPlayground) }
    : undefined,
};
