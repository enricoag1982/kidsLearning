// The card kit's narrated feedback notes as a voice inventory: every string the Owl bubble can speak for a card kind, computed through
// core's own `exerciseNote` (the function the lesson screen calls), so the generated audio covers exactly what is spoken. Notes
// are narrated alone (`docs/voice.md` §5); an error note on an exercise with an `easier` variant is spoken joined with the
// easier-offer sentence, so that joined string is inventoried too.
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
import type {
  CardExerciseDef,
  CardHint,
  CardType,
} from '@learn/platform-core/domain/exercise/kinds/cards/def';

/** A subject's note table by feedback kind (`SubjectCore.notes`). */
export type NotesRegistry = Readonly<Record<string, AnyNoteEntry>>;

type Add = (text: string, source: string) => void;

const STARS: readonly Stars[] = [1, 2, 3];
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

/** The feedback kind of a wrong answer, per card type. A table, not a dispatch: the kinds' registries own what a type does. */
const WRONG_KIND = {
  choice: 'wrong-answer',
  'true-false': 'wrong-answer',
  'number-entry': 'number-wrong',
  order: 'order-wrong',
} as const satisfies Readonly<Record<CardType, string>>;

/** Every hint wording of a card type, by level: the nudges, the removed option / ruled-out card, the first digit (0-9), the reveal. */
const HINTS: Readonly<Record<CardType, readonly CardHint[]>> = {
  choice: [
    { kind: 'choice', level: 1, reveal: false },
    { kind: 'choice', level: 3, reveal: true },
  ],
  'true-false': [
    { kind: 'true-false', level: 1, highlight: false, reveal: false },
    { kind: 'true-false', level: 2, highlight: true, reveal: false },
    { kind: 'true-false', level: 3, highlight: false, reveal: true },
  ],
  'number-entry': [
    { kind: 'number-entry', level: 1, reveal: false },
    ...DIGITS.map((digit): CardHint => ({ kind: 'number-entry', level: 2, reveal: false, digit })),
    { kind: 'number-entry', level: 3, reveal: true },
  ],
  order: [
    { kind: 'order', level: 1, reveal: false, nextSlot: 0 },
    { kind: 'order', level: 2, reveal: false, nextSlot: 0, ruledOutId: 'x' },
    { kind: 'order', level: 3, reveal: true, nextSlot: 0 },
  ],
};

const CARD_TYPES = Object.keys(WRONG_KIND) as readonly CardType[];

function isCardDef(def: ExerciseDefBase): def is CardExerciseDef {
  return def.type in WRONG_KIND;
}

/** The rounds of a `series` boss (the only mode a card subject has); other games have none. */
function roundsOf(game: MiniGame): readonly ExerciseDefBase[] {
  return 'rounds' in game && Array.isArray(game.rounds)
    ? (game.rounds as readonly ExerciseDefBase[])
    : [];
}

/** Every card exercise of the content: per lesson its guided tries, scored exercises and easier variants, then the rounds of every boss. */
function cardExercisesOf(all: CompiledContent): readonly CardExerciseDef[] {
  return [
    ...all.lessons.flatMap((lesson) => [
      ...lesson.guided,
      ...lesson.exercises,
      ...(lesson.variants ?? []),
    ]),
    ...all.minigames.flatMap(roundsOf),
  ].filter(isCardDef);
}

/** The reason keys the def can speak: its choice options', its statement's, its number values'. */
function reasonKeysOf(def: CardExerciseDef): readonly string[] {
  if ('options' in def) {
    return def.options.flatMap((option) =>
      option.reasonKey === undefined ? [] : [option.reasonKey],
    );
  }
  if ('reasons' in def) {
    return (def.reasons ?? []).map((reason) => reason.reasonKey);
  }
  if ('reasonKey' in def && def.reasonKey !== undefined) {
    return [def.reasonKey];
  }
  return [];
}

/** The voice inventory of the card kit's notes over `notes` (the subject's table, the kit's own or extended), for the card kinds the
 * content uses (`all`): per kind its wrong-answer note (plain and joined with the easier offer, as the fixed strings the lesson screen
 * can always reach) and every hint by level; per def every reason key (plain, and joined with the easier offer when the def has an
 * `easier` variant: the only way the screen speaks it); the 1-3 star praise. Plugs into `SubjectContent.voiceTemplates`; the
 * inventory dedupes the texts. */
export function cardVoiceTemplates(
  notes: NotesRegistry,
): (add: Add, r: Resolve, all: CompiledContent) => void {
  return (add, r, all) => {
    const defs = cardExercisesOf(all);
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

    const used = new Set<string>(defs.map((def) => def.type));
    for (const type of CARD_TYPES.filter((candidate) => used.has(candidate))) {
      const wrong = { kind: WRONG_KIND[type] };
      speak(wrong, false);
      speak(wrong, true);
      for (const hint of HINTS[type]) {
        speak({ kind: 'hint', hint }, false);
      }
    }

    // A reason replaces the default wrong note; only an exercise with an easier variant joins the offer to it.
    for (const def of defs) {
      const kind = WRONG_KIND[def.type];
      for (const reasonKey of reasonKeysOf(def)) {
        speak({ kind, reasonKey }, false);
        if (def.easier !== undefined) {
          speak({ kind, reasonKey }, true);
        }
      }
    }

    if (defs.length > 0) {
      for (const stars of STARS) {
        const praise = note({ kind: 'solved' }, stars, false);
        if (praise !== undefined) {
          add(praise, 'exercise-note');
        }
      }
    }
  };
}
