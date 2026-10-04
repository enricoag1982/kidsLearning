// The narrated texts of the array kind that are not an exercise or lesson text: every feedback note under the instruction (the Owl
// bubble speaks each as its own utterance, `docs/voice.md` §5), computed through core's own `exerciseNote` over the content's array
// exercises, so `pnpm voice:check` covers exactly what can be spoken. Nothing when the content has no array exercise. The card kit's
// notes are `cardVoiceTemplates`', the other math kinds' are `number-line-voice.ts` and `place-value-voice.ts`.
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
import type { ArrayDef } from '../kinds/array/def.ts';
import { arrayKind } from '../kinds/array/kind.ts';
import { isSwapped, reasonKeyOf } from '../kinds/array/shape.ts';

type Add = (text: string, source: string) => void;

const STARS: readonly Stars[] = [1, 2, 3];

function isArray(def: ExerciseDefBase): def is ArrayDef {
  return def.type === 'array';
}

/** The rounds of a `series` boss (the only mode math has); other games have none. */
function roundsOf(game: MiniGame): readonly ExerciseDefBase[] {
  return 'rounds' in game && Array.isArray(game.rounds)
    ? (game.rounds as readonly ExerciseDefBase[])
    : [];
}

/** Every array exercise of the content: per lesson its guided tries, scored exercises and easier variants, then the rounds of every
 * boss. */
export function arrayExercisesOf(all: CompiledContent): readonly ArrayDef[] {
  return [
    ...all.lessons.flatMap((lesson) => [
      ...lesson.guided,
      ...lesson.exercises,
      ...(lesson.variants ?? []),
    ]),
    ...all.minigames.flatMap(roundsOf),
  ].filter(isArray);
}

/** Can a child check this exercise's right array turned round (rows and columns exchanged) and hear the "turned round" note? Only
 * where the text fixes the rows, the array is not square, and the shape has no reason of its own (which is spoken instead). */
function canTurnRound(def: ArrayDef): boolean {
  const turned = { rows: def.cols, cols: def.rows };
  return isSwapped(def, turned) && def.rows !== def.cols && reasonKeyOf(def, turned) === undefined;
}

/** Per array exercise: the wrong note (plain, and joined with the easier offer: the fixed strings the lesson screen can always
 * reach), hints 1 and 2 (hint 2 names the dots in a row, so one text per `cols` the content has) and hint 3, the "turned round" note
 * where the exercise can produce it, every reason (plain, and joined with the offer when the exercise has an `easier` variant) and
 * the 1-3 star praise. */
export function arrayVoiceTemplates(
  notes: Readonly<Record<string, AnyNoteEntry>>,
): (add: Add, r: Resolve, all: CompiledContent) => void {
  return (add, r, all) => {
    const defs = arrayExercisesOf(all);
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
    const wrong = { kind: 'array-wrong' };
    speak(wrong, false);
    speak(wrong, true);
    for (const def of defs) {
      // The hints come from the kind itself: level 2 carries the dots in a row.
      let state = arrayKind.init(def);
      for (const level of [1, 2, 3] as const) {
        const step = arrayKind.hint(state, level, null);
        state = step.state;
        speak({ kind: 'hint', hint: step.hint }, false);
      }
      if (canTurnRound(def)) {
        speak({ kind: 'array-wrong', swapped: true }, false);
        if (def.easier !== undefined) {
          speak({ kind: 'array-wrong', swapped: true }, true);
        }
      }
      for (const { reasonKey } of def.reasons ?? []) {
        speak({ kind: 'array-wrong', reasonKey }, false);
        if (def.easier !== undefined) {
          speak({ kind: 'array-wrong', reasonKey }, true);
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
