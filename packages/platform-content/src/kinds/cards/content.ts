// The card kit's `SubjectContent`: a subject made only of YAML + art gets its whole content behaviour from this one call.
import type { CardDefOf, CardType } from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { CARD_NOTES } from '@learn/platform-core/domain/exercise/kinds/cards/notes';
import type { z } from 'zod';
import type { AnyExerciseTemplate } from '../../generate/template.ts';
import { createExerciseSchema } from '../../lesson-schema.ts';
import { createSeriesContent } from '../../modes/series.ts';
import type { BadgesContent, SubjectContent } from '../../subject.ts';
import type { ExerciseKindContent } from '../kind-content.ts';
import { cardChoice } from './choice.ts';
import { numberEntry } from './number-entry.ts';
import { order } from './order.ts';
import { cardDemo, cardStimulus } from './stimulus.ts';
import { trueFalse } from './true-false.ts';
import { cardVoiceTemplates } from './voice.ts';

/** The four kinds, by `type`. */
export const CARD_KIND_CONTENT = {
  choice: cardChoice,
  'true-false': trueFalse,
  'number-entry': numberEntry,
  order,
} as const satisfies {
  readonly [T in CardType]: ExerciseKindContent<CardDefOf<T>, z.ZodType>;
};

export const cardExerciseSchema = createExerciseSchema(CARD_KIND_CONTENT, cardStimulus);

/** No badge condition beyond the engine's generic ones. */
const cardBadges: BadgesContent = { fields: {}, validate: () => undefined };

export interface CardContentOptions {
  /** Lesson characters that double as an "animal friend" once their lesson is done (one source with `createCardCore`). */
  readonly characters: Readonly<Record<string, { readonly topicKey: string }>>;
  /** Generated-exercise templates by id (`generate: { template: <id>, … }` in a lesson or series entry); default none. */
  readonly templates?: Readonly<Record<string, AnyExerciseTemplate>>;
}

/** The four card kinds, the `series` boss over them, the `prompt` stimulus and demo; no default mini-game mode, no extra
 * badge fields. Voice: the kit's feedback notes the content uses (`cardVoiceTemplates`), reasons and easier offers included. */
export function createCardContent({ characters, templates }: CardContentOptions): SubjectContent {
  return {
    kinds: CARD_KIND_CONTENT,
    modes: { series: createSeriesContent(cardExerciseSchema, Object.keys(templates ?? {})) },
    ...(templates === undefined ? {} : { templates }),
    stimulus: cardStimulus,
    demo: cardDemo,
    badges: cardBadges,
    characters,
    voiceTemplates: cardVoiceTemplates(CARD_NOTES),
  };
}
