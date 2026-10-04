// Logic's content behaviour: the card kit's YAML schemas (a `prompt` card, `choice` cards, an `order`, a `number-entry` pad, the
// `series` boss) under logic's own registries, so logic's own kinds (`group`, `grid-fill`: schema, compile, verify) and the
// generated-exercise templates (`templates/`) join them here.
import { CARD_KIND_CONTENT, createCardContent } from '@learn/platform-content/kinds/cards/content';
import { cardVoiceTemplates } from '@learn/platform-content/kinds/cards/voice';
import { cardStimulus } from '@learn/platform-content/kinds/cards/stimulus';
import type { ExerciseKindContent } from '@learn/platform-content/kinds/kind-content';
import { createExerciseSchema } from '@learn/platform-content/lesson-schema';
import { createSeriesContent } from '@learn/platform-content/modes/series';
import type { SubjectContent } from '@learn/platform-content/subject';
import type { z } from 'zod';
import { LOGIC_CHARACTERS, logicCore } from '../core/logic-core.ts';
import type { DefOf, ExerciseType } from '../kinds/index.ts';
import { LOGIC_TEMPLATES } from './templates/index.ts';

export { LOGIC_TEMPLATES };

/** The kinds, by `type`: the card kit's four. */
export const LOGIC_KIND_CONTENT = {
  ...CARD_KIND_CONTENT,
} as const satisfies {
  readonly [T in ExerciseType]: ExerciseKindContent<DefOf<T>, z.ZodType>;
};

export const logicExerciseSchema = createExerciseSchema(LOGIC_KIND_CONTENT, cardStimulus);

/** The narrated logic texts that are not an exercise or lesson text: the card kit's feedback notes the content uses (over logic's
 * note table); logic's own kinds' notes join here when they exist. */
const logicVoiceTemplates: SubjectContent['voiceTemplates'] = (add, r, all) => {
  cardVoiceTemplates(logicCore.notes)(add, r, all);
};

/** Logic's whole `SubjectContent`; `series` is its one mini-game mode, so no mode is a default. */
export const logicContent: SubjectContent = {
  ...createCardContent({ characters: LOGIC_CHARACTERS, templates: LOGIC_TEMPLATES }),
  kinds: LOGIC_KIND_CONTENT,
  modes: { series: createSeriesContent(logicExerciseSchema, Object.keys(LOGIC_TEMPLATES)) },
  voiceTemplates: logicVoiceTemplates,
};
