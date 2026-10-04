import type { BadgeDef, CompiledContent, ContentSource, TracksCatalog } from '@learn/platform-core';

/** A subject's build output (`dist/content.json`, `tracks.json`, `badges.json`) as typed values. */
export interface BundledContent {
  readonly content: CompiledContent;
  readonly tracks: TracksCatalog;
  readonly badges: readonly BadgeDef[];
}

/** A `ContentSource` whose `catalog` and `badges` are always there. */
export type BundledContentSource = ContentSource &
  Required<Pick<ContentSource, 'catalog' | 'badges'>>;

/** `ContentSource` over a subject's build-time compiled bundle: the one adapter a subject made only of YAML needs. The content
 * build validates the shapes, so the JSON imports are type conversions at the caller, not runtime checks. */
export function createBundledContentSource({
  content,
  tracks,
  badges,
}: BundledContent): BundledContentSource {
  const lessonsById = new Map(content.lessons.map((lesson) => [lesson.id, lesson]));
  const minigamesById = new Map(content.minigames.map((minigame) => [minigame.id, minigame]));

  return {
    lessons: () => content.lessons,
    lesson: (id) => lessonsById.get(id),
    minigames: () => content.minigames,
    minigame: (id) => minigamesById.get(id),
    catalog: () => tracks,
    badges: () => badges,
  };
}
