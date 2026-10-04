// Math's content behaviour: the card kit's YAML schemas (a `prompt` card, `choice` cards, a `number-entry` pad, the `series` boss)
// under math's own registries, so math's own kinds (`number-line`, `place-value`, `array`: schema, compile, verify) and
// the generated-exercise templates (`templates/`: W1 since m13.9) join them here.
import { CARD_KIND_CONTENT, createCardContent } from '@learn/platform-content/kinds/cards/content';
import { cardVoiceTemplates } from '@learn/platform-content/kinds/cards/voice';
import { cardStimulus } from '@learn/platform-content/kinds/cards/stimulus';
import type { ExerciseKindContent } from '@learn/platform-content/kinds/kind-content';
import { createExerciseSchema } from '@learn/platform-content/lesson-schema';
import { duelVoiceTemplates } from '@learn/platform-content/modes/duel-voice';
import { createSeriesContent } from '@learn/platform-content/modes/series';
import type { SubjectContent } from '@learn/platform-content/subject';
import type { z } from 'zod';
import { MATH_CHARACTERS, mathCore } from '../core/math-core.ts';
import type { DefOf, ExerciseType } from '../kinds/index.ts';
import { array } from './array.ts';
import { numberLine } from './number-line.ts';
import { numberLineVoiceTemplates } from './number-line-voice.ts';
import { placeValue } from './place-value.ts';
import { placeValueVoiceTemplates } from './place-value-voice.ts';
import { mathDuelContent, raceVoiceTemplates } from './race.ts';
import { MATH_TEMPLATES } from './templates/index.ts';

export { MATH_TEMPLATES };

/** The kinds, by `type`: the card kit's four and math's own. */
export const MATH_KIND_CONTENT = {
  ...CARD_KIND_CONTENT,
  'number-line': numberLine,
  'place-value': placeValue,
  array,
} as const satisfies {
  readonly [T in ExerciseType]: ExerciseKindContent<DefOf<T>, z.ZodType>;
};

export const mathExerciseSchema = createExerciseSchema(MATH_KIND_CONTENT, cardStimulus);

/** The narrated math texts that are not an exercise or lesson text: the card kit's feedback notes the content uses (over math's note
 * table), math's own kinds' notes when the content has such an exercise, and the duel lines (the platform's turn / hint / result
 * lines, and the Race board's own after each move) when the content has a duel. */
const mathVoiceTemplates: SubjectContent['voiceTemplates'] = (add, r, all) => {
  cardVoiceTemplates(mathCore.notes)(add, r, all);
  numberLineVoiceTemplates(mathCore.notes)(add, r, all);
  placeValueVoiceTemplates(mathCore.notes)(add, r, all);
  duelVoiceTemplates(MATH_CHARACTERS)(add, r, all);
  raceVoiceTemplates(MATH_CHARACTERS)(add, r, all);
};

/** Math's whole `SubjectContent`; `series` and the opt-in `duel` are its mini-game modes, so no mode is a default. */
export const mathContent: SubjectContent = {
  ...createCardContent({ characters: MATH_CHARACTERS, templates: MATH_TEMPLATES }),
  kinds: MATH_KIND_CONTENT,
  modes: {
    series: createSeriesContent(mathExerciseSchema, Object.keys(MATH_TEMPLATES)),
    duel: mathDuelContent,
  },
  voiceTemplates: mathVoiceTemplates,
};
