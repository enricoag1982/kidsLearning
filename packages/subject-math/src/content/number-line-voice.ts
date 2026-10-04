// The narrated `number-line` texts that are not an exercise or lesson text: its feedback notes (the Owl bubble speaks each as its own
// utterance, `docs/voice.md` §5), through the same `exerciseNote` the lesson screen calls. Derived from the compiled content only: a
// build whose content has no `number-line` exercise adds nothing, so the audio inventory grows with the first World 1 lessons (m13.10),
// not before. The kit's own notes (`cardVoiceTemplates`) cover the card kinds.
import type {
  CompiledContent,
  ExerciseFeedbackBase,
  MiniGame,
  Resolve,
  Stars,
} from '@learn/platform-core';
import { exerciseNote } from '@learn/platform-core';
import type { NotesRegistry } from '@learn/platform-content/kinds/cards/voice';
import type { NumberLineDef } from '../kinds/number-line/def.ts';
import { benchmarkOf } from '../kinds/number-line/ticks.ts';

const STARS: readonly Stars[] = [1, 2, 3];

function isNumberLine(def: { readonly type: string }): def is NumberLineDef {
  return def.type === 'number-line';
}

/** The rounds of a `series` boss (the only mode math has); other games have none. */
function roundsOf(game: MiniGame): readonly { readonly type: string }[] {
  return 'rounds' in game && Array.isArray(game.rounds)
    ? (game.rounds as readonly { readonly type: string }[])
    : [];
}

/** Every `number-line` exercise of the content: guided tries, scored exercises and easier variants, then the rounds of every boss. */
function numberLinesOf(all: CompiledContent): readonly NumberLineDef[] {
  return [
    ...all.lessons.flatMap((lesson) => [
      ...lesson.guided,
      ...lesson.exercises,
      ...(lesson.variants ?? []),
    ]),
    ...all.minigames.flatMap(roundsOf),
  ].filter(isNumberLine);
}

/** For the `number-line` exercises of the content: the wrong note (plain, and joined with the easier offer as the fixed string the
 * lesson screen can always reach), each hint (level 1 once per distinct middle tick the content produces), each def's reasons (plain,
 * and joined with the offer when the def has an `easier` variant), and the 1-3 star praise. Plugs into `SubjectContent.voiceTemplates`;
 * the inventory dedupes the texts. */
export function numberLineVoiceTemplates(
  notes: NotesRegistry,
): (add: (text: string, source: string) => void, r: Resolve, all: CompiledContent) => void {
  return (add, r, all) => {
    const defs = numberLinesOf(all);
    if (defs.length === 0) {
      return;
    }
    const speak = (feedback: ExerciseFeedbackBase, stars: Stars = 3, offer = false): void => {
      const note = exerciseNote(r, feedback, { name: '', vars: {}, stars }, notes, offer);
      if (note !== undefined) {
        add(note.text, offer ? 'exercise-note-easier-offer' : 'exercise-note');
      }
    };

    speak({ kind: 'line-wrong' });
    speak({ kind: 'line-wrong' }, 3, true);
    for (const benchmark of new Set(defs.map(benchmarkOf))) {
      speak({ kind: 'hint', hint: { kind: 'number-line', level: 1, benchmark } });
    }
    speak({ kind: 'hint', hint: { kind: 'number-line', level: 2 } });
    speak({ kind: 'hint', hint: { kind: 'number-line', level: 3, reveal: 0 } });
    for (const def of defs) {
      for (const { reasonKey } of def.reasons ?? []) {
        speak({ kind: 'line-wrong', reasonKey });
        if (def.easier !== undefined) {
          speak({ kind: 'line-wrong', reasonKey }, 3, true);
        }
      }
    }
    for (const stars of STARS) {
      speak({ kind: 'solved' }, stars);
    }
  };
}
