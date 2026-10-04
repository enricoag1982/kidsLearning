// The math `SubjectWeb` pack: the card kit's web (card prompt, surfaces) over the compiled math content, with math's kind UI
// registry in place of the kit's, so the kinds of m13.6-m13.8 (`number-line`, `place-value`, `array`) join `MATH_KIND_UI`.
import type { BadgeDef, CompiledContent, TracksCatalog } from '@learn/platform-core';
import { createBundledContentSource } from '@learn/platform-web/adapters/content/bundled-content-source.ts';
import type { SubjectWeb } from '@learn/platform-web/app/subject.ts';
import { createCardWeb } from '@learn/platform-web/kinds/cards/web.ts';
import { mathCore } from '../core/math-core.ts';
import hedgehog from './art/hedgehog.webp';
import { MATH_KIND_UI } from './kinds/ui-registry.ts';
import bundled from '../../dist/content.json';
import bundledTracks from '../../dist/tracks.json';
import bundledBadges from '../../dist/badges.json';

/** The content build validates these shapes (invalid content fails `pnpm build`), so these are type conversions, not runtime
 * checks. */
const content = bundled as unknown as CompiledContent;
const tracks = bundledTracks as unknown as TracksCatalog;
const badges = bundledBadges as unknown as BadgeDef[];

export const mathWeb: SubjectWeb = {
  ...createCardWeb({
    core: mathCore,
    content: createBundledContentSource({ content, tracks, badges }),
    art: { hedgehog },
    rankGlyphs: { counter: '1', adder: '+' },
  }),
  kinds: MATH_KIND_UI,
};
