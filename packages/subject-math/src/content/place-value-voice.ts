// The narrated texts of the place-value kind that are not an exercise or lesson text: every feedback note under the instruction (the
// Owl bubble speaks each as its own utterance, `docs/voice.md` §5), computed through core's own `exerciseNote` over the content's
// place-value exercises, so `pnpm voice:check` covers exactly what can be spoken. Nothing when the content has no place-value
// exercise. The card kit's notes are `cardVoiceTemplates`'.
import type {
  AnyNoteEntry,
  CompiledContent,
  ExerciseDefBase,
  ExerciseFeedbackBase,
  MiniGame,
  Resolve,
  Stars,
} from '@learn/platform-core';
import { exerciseNote } from '@learn/platform-core';
import type { PlaceValueDef } from '../kinds/place-value/def.ts';
import { placeValueKind } from '../kinds/place-value/kind.ts';

type Add = (text: string, source: string) => void;

const STARS: readonly Stars[] = [1, 2, 3];

function isPlaceValue(def: ExerciseDefBase): def is PlaceValueDef {
  return def.type === 'place-value';
}

/** The rounds of a `series` boss (the only mode math has); other games have none. */
function roundsOf(game: MiniGame): readonly ExerciseDefBase[] {
  return 'rounds' in game && Array.isArray(game.rounds)
    ? (game.rounds as readonly ExerciseDefBase[])
    : [];
}

/** Every place-value exercise of the content: per lesson its guided tries, scored exercises and easier variants, then the rounds of
 * every boss. */
export function placeValueExercisesOf(all: CompiledContent): readonly PlaceValueDef[] {
  return [
    ...all.lessons.flatMap((lesson) => [
      ...lesson.guided,
      ...lesson.exercises,
      ...(lesson.variants ?? []),
    ]),
    ...all.minigames.flatMap(roundsOf),
  ].filter(isPlaceValue);
}

/** Per place-value exercise: the wrong note (plain, and joined with the easier offer: the fixed strings the lesson screen can always
 * reach), hints 1 and 2, hint 3 (it names the place it fills: one text per place the content's targets start in), every reason (plain,
 * and joined with the offer when the exercise has an `easier` variant) and the 1-3 star praise. */
export function placeValueVoiceTemplates(
  notes: Readonly<Record<string, AnyNoteEntry>>,
): (add: Add, r: Resolve, all: CompiledContent) => void {
  return (add, r, all) => {
    const defs = placeValueExercisesOf(all);
    const note = (
      feedback: ExerciseFeedbackBase,
      stars: Stars,
      offer: boolean,
    ): string | undefined =>
      exerciseNote(r, feedback, { name: '', vars: {}, stars }, notes, offer)?.text;
    // `offer` only joins on an error note; any other note has no such form.
    const speak = (feedback: ExerciseFeedbackBase, offer: boolean): void => {
      if (offer && notes[feedback.kind]?.error !== true) {
        return;
      }
      const text = note(feedback, 3, offer);
      if (text !== undefined) {
        add(text, offer ? 'exercise-note-easier-offer' : 'exercise-note');
      }
    };

    if (defs.length === 0) {
      return;
    }
    const wrong = { kind: 'pv-wrong' };
    speak(wrong, false);
    speak(wrong, true);
    for (const def of defs) {
      // The hints come from the kind itself: level 3 carries the fill that names its place.
      let state = placeValueKind.init(def);
      for (const level of [1, 2, 3] as const) {
        const step = placeValueKind.hint(state, level, null);
        state = step.state;
        speak({ kind: 'hint', hint: step.hint }, false);
      }
      for (const { reasonKey } of def.reasons ?? []) {
        speak({ kind: 'pv-wrong', reasonKey }, false);
        if (def.easier !== undefined) {
          speak({ kind: 'pv-wrong', reasonKey }, true);
        }
      }
    }
    for (const stars of STARS) {
      const praise = note({ kind: 'solved' }, stars, false);
      if (praise !== undefined) {
        add(praise, 'exercise-note');
      }
    }
  };
}
