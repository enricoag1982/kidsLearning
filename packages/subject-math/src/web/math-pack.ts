// The math `SubjectWeb` pack: the card kit's web (card prompt, surfaces) over the compiled math content, with math's kind UI
// registry in place of the kit's, so math's own kinds (`number-line`, `place-value`, `array`) join `MATH_KIND_UI`.
// The dev playground (`/#math`) shows them on fixture exercises. Its one mini-game mode UI of its own is the opt-in `duel` (Race to 20).
import type { BadgeDef, CompiledContent, TracksCatalog } from '@learn/platform-core';
import { createBundledContentSource } from '@learn/platform-web/adapters/content/bundled-content-source.ts';
import type { SubjectWeb } from '@learn/platform-web/app/subject.ts';
import { createCardWeb } from '@learn/platform-web/kinds/cards/web.ts';
import { createDuelModeUi } from '@learn/platform-web/modes/duel/mode-ui.ts';
import { mathCore } from '../core/math-core.ts';
import hedgehog from './art/hedgehog.webp';
import { RaceBoard } from './games/RaceBoard.tsx';
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
  // The opt-in `duel` mini-game mode: Race to 20 on its number track (m13.13).
  modes: { duel: createDuelModeUi({ race: RaceBoard }) },
  // Gated on the compile-time DEV flag so Rollup drops the dev-playground subtree: an ungated `dev` field keeps its `import()` as a
  // live split point.
  dev: import.meta.env.DEV
    ? { '#math': () => import('./dev/MathPlayground.tsx').then((m) => m.MathPlayground) }
    : undefined,
};
