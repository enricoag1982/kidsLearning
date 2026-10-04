// The card kit's `SubjectWeb`: a subject made only of YAML + art gets its whole web pack from this one call.
import type { ContentSource, SubjectCore } from '@learn/platform-core';
import type { SubjectServices, SubjectWeb } from '../../app/subject.ts';
import { CARD_KIND_UI } from './ui-registry.ts';
import { SurfaceDemo, SurfaceStory, SurfaceView } from './surface.tsx';

/** A card subject has no runtime services. `SubjectServices` is merged by module declaration across every subject a program
 * compiles (chess adds required fields), so in the app, which compiles both, `{}` needs this cast; nothing reads it. */
const NO_SERVICES = {} as SubjectServices;

export interface CardWebOptions {
  /** `createCardCore`'s result. */
  readonly core: SubjectCore;
  /** The subject's compiled content (the use cases read lessons, mini-games, tracks and badges from it). */
  readonly content: ContentSource;
  /** The subject's images by id: card images and character portraits. */
  readonly art: Readonly<Record<string, string>>;
  /** A glyph per rank id for My Den's ladder (`?` for one it lacks). */
  readonly rankGlyphs: Readonly<Record<string, string>>;
  /** The colour behind a character's portrait; absent = the platform's neutral. */
  readonly characterColor?: (character: string) => string | undefined;
}

/** The four card kinds' UI, the card prompt as the lesson surface, no mode UI of its own (the platform draws `series`), and no
 * home tile, route, store slice, parent panel or dev playground. */
export function createCardWeb({
  core,
  content,
  art,
  rankGlyphs,
  characterColor,
}: CardWebOptions): SubjectWeb {
  return {
    core,
    createServices: () => ({ content, subject: NO_SERVICES }),
    kinds: CARD_KIND_UI,
    modes: {},
    surface: { Story: SurfaceStory, Demo: SurfaceDemo, View: SurfaceView },
    art,
    ...(characterColor === undefined ? {} : { characterColor }),
    den: { rankGlyph: (rankId) => rankGlyphs[rankId] ?? '?' },
    routes: {},
  };
}
