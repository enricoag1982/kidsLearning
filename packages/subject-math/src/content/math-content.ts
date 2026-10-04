// Math's content behaviour: the card kit's YAML schemas (a `prompt` card, `choice` cards, a `number-entry` pad, the `series` boss)
// under math's own registries, so the kinds of m13.6-m13.8 (`number-line`, `place-value`, `array`: schema, compile, verify) and the
// generated-exercise templates of m13.9+ join them here.
import { CARD_KIND_CONTENT, createCardContent } from '@learn/platform-content/kinds/cards/content';
import { cardVoiceTemplates } from '@learn/platform-content/kinds/cards/voice';
import { cardStimulus } from '@learn/platform-content/kinds/cards/stimulus';
import type { ExerciseKindContent } from '@learn/platform-content/kinds/kind-content';
import { createExerciseSchema } from '@learn/platform-content/lesson-schema';
import { createSeriesContent } from '@learn/platform-content/modes/series';
import type { AnyExerciseTemplate } from '@learn/platform-content/generate/template';
import type { SubjectContent } from '@learn/platform-content/subject';
import type { z } from 'zod';
import { MATH_CHARACTERS, mathCore } from '../core/math-core.ts';
import type { DefOf, ExerciseType } from '../kinds/index.ts';

/** The kinds, by `type`: the card kit's four. */
export const MATH_KIND_CONTENT = {
  ...CARD_KIND_CONTENT,
} as const satisfies {
  readonly [T in ExerciseType]: ExerciseKindContent<DefOf<T>, z.ZodType>;
};

export const mathExerciseSchema = createExerciseSchema(MATH_KIND_CONTENT, cardStimulus);

/** Generated-exercise templates by id (`generate: { template: <id>, … }`): none until m13.9. */
export const MATH_TEMPLATES: Readonly<Record<string, AnyExerciseTemplate>> = {};

/** The narrated math texts that are not an exercise or lesson text: the card kit's feedback notes the content uses (over math's note
 * table). Math has no notes of its own yet. */
const mathVoiceTemplates: SubjectContent['voiceTemplates'] = (add, r, all) => {
  cardVoiceTemplates(mathCore.notes)(add, r, all);
};

/** Math's whole `SubjectContent`; `series` is its only mini-game mode, so no mode is a default. */
export const mathContent: SubjectContent = {
  ...createCardContent({ characters: MATH_CHARACTERS, templates: MATH_TEMPLATES }),
  kinds: MATH_KIND_CONTENT,
  modes: { series: createSeriesContent(mathExerciseSchema, Object.keys(MATH_TEMPLATES)) },
  voiceTemplates: mathVoiceTemplates,
};
