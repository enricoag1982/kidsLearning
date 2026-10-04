import type { TFunction } from 'i18next';
import { characterName, tContent } from '../content-text.ts';

type Characters = Readonly<Record<string, { readonly topicKey: string }>>;

export function firstLessonsByCharacter(
  lessons: readonly {
    readonly id: string;
    readonly character: string;
    readonly world: string;
    readonly order: number;
  }[],
  worldOrder: ReadonlyMap<string, number>,
): Map<string, string> {
  const sorted = [...lessons].sort(
    (a, b) => (worldOrder.get(a.world) ?? 0) - (worldOrder.get(b.world) ?? 0) || a.order - b.order,
  );
  const first = new Map<string, string>();
  for (const lesson of sorted) {
    if (!first.has(lesson.character)) first.set(lesson.character, lesson.id);
  }
  return first;
}

/** The condition text for a locked mini-game: the character's `topicKey` for a piece character's
 * first lesson ("Pawn"), else the lesson's title. */
export function unlockLabel(
  t: TFunction,
  characters: Characters,
  lesson: { readonly id: string; readonly character: string; readonly titleKey: string },
  firstLessonOfCharacter: ReadonlyMap<string, string>,
): string {
  const entry = characters[lesson.character];
  return entry !== undefined && firstLessonOfCharacter.get(lesson.character) === lesson.id
    ? tContent(t, entry.topicKey)
    : tContent(t, lesson.titleKey);
}

/** A character's first-lesson label with its topic, "Rhino the Rook" (`journey:ui.character-piece`): for a character named apart
 * from its topic. The plain `characterLabel` when the character has no topic entry, its topic text is missing or empty, or the
 * topic is the name itself ("Rook" is not said twice), so no subject's texts need a topic to read well. */
export function characterWithTopic(
  t: TFunction,
  entry: { readonly topicKey: string } | undefined,
  characterLabel: string,
): string {
  if (entry === undefined) return characterLabel;
  const topic = tContent(t, entry.topicKey);
  // i18next answers a key it cannot find with the key itself.
  if (topic === '' || topic === entry.topicKey || topic === characterLabel) return characterLabel;
  return tContent(t, 'journey:ui.character-piece', { character: characterLabel, piece: topic });
}

/** Journey map node label: the character's name for its first lesson, else the lesson's own title
 * — so a repeated character's later lesson never shows an indistinguishable second node. */
export function journeyNodeLabel(
  t: TFunction,
  characters: Characters,
  lesson: { readonly id: string; readonly character: string; readonly titleKey: string },
  firstLessonOfCharacter: ReadonlyMap<string, string>,
): string {
  if (characters[lesson.character] === undefined) {
    return tContent(t, lesson.titleKey);
  }
  return firstLessonOfCharacter.get(lesson.character) === lesson.id
    ? characterName(t, lesson.character)
    : tContent(t, lesson.titleKey);
}
