// The coding subject's content behaviour: the card kit's YAML schemas (`order` / `choice` serve the sequencing and pattern
// lessons), the three coding kinds (`program`, `predict`, `find-bug`: schema, compile, verify), the `series` boss and the card
// prompt.
import { CARD_KIND_CONTENT } from '@learn/platform-content/kinds/cards/content';
import { cardDemo, cardStimulus } from '@learn/platform-content/kinds/cards/stimulus';
import type { ExerciseKindContent } from '@learn/platform-content/kinds/kind-content';
import { createExerciseSchema } from '@learn/platform-content/lesson-schema';
import { createSeriesContent } from '@learn/platform-content/modes/series';
import type { BadgesContent, SubjectContent } from '@learn/platform-content/subject';
import type { z } from 'zod';
import { CODING_CHARACTERS } from '../core/coding-core.ts';
import type { DefOf, ExerciseType } from '../kinds/index.ts';
import { findBug } from './find-bug.ts';
import { predict } from './predict.ts';
import { program } from './program.ts';

/** The seven kinds, by `type`. */
export const CODING_KIND_CONTENT = {
  ...CARD_KIND_CONTENT,
  program,
  predict,
  'find-bug': findBug,
} as const satisfies {
  readonly [T in ExerciseType]: ExerciseKindContent<DefOf<T>, z.ZodType>;
};

export const codingExerciseSchema = createExerciseSchema(CODING_KIND_CONTENT, cardStimulus);

/** No badge condition beyond the engine's generic ones. */
const codingBadges: BadgesContent = { fields: {}, validate: () => undefined };

/** Coding's whole `SubjectContent`; `series` is its only mini-game mode, so no mode is a default. */
export const codingContent: SubjectContent = {
  kinds: CODING_KIND_CONTENT,
  modes: { series: createSeriesContent(codingExerciseSchema) },
  stimulus: cardStimulus,
  demo: cardDemo,
  badges: codingBadges,
  characters: CODING_CHARACTERS,
  voiceTemplates: () => undefined,
};
