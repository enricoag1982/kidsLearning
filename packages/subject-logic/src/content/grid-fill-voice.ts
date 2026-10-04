// The narrated `grid-fill` texts that are not an exercise or lesson text: the instruction under each puzzle and the feedback notes (the
// Owl bubble speaks each as its own utterance, `docs/voice.md` §5), through the same `exerciseNote` the lesson screen calls. Derived from
// the compiled content only: a build whose content has no `grid-fill` exercise adds nothing, so the audio inventory grows with the first
// World 3 lessons (m14.11), not before. The kit's own notes (`cardVoiceTemplates`) cover the card kinds.
import type {
  CompiledContent,
  ExerciseFeedbackBase,
  MiniGame,
  Resolve,
  Stars,
} from '@learn/platform-core';
import { exerciseNote } from '@learn/platform-core';
import type { NotesRegistry } from '@learn/platform-content/kinds/cards/voice';
import type { GridFillDef, GridFillHint } from '../kinds/grid-fill/def.ts';

const STARS: readonly Stars[] = [1, 2, 3];

/** Every rejected-entry note: a sudoku's three units and none, a picture's row, column and none. */
const WRONG: readonly ExerciseFeedbackBase[] = [
  { kind: 'grid-wrong', puzzle: 'sudoku', conflict: 'row' },
  { kind: 'grid-wrong', puzzle: 'sudoku', conflict: 'column' },
  { kind: 'grid-wrong', puzzle: 'sudoku', conflict: 'box' },
  { kind: 'grid-wrong', puzzle: 'sudoku' },
  { kind: 'grid-wrong', puzzle: 'picture-cross', conflict: 'row' },
  { kind: 'grid-wrong', puzzle: 'picture-cross', conflict: 'column' },
  { kind: 'grid-wrong', puzzle: 'picture-cross' },
];

/** Every hint wording: level 1 per unit kind (and a naked single's three units, a picture's two lines), level 2 per technique, level 3,
 * and the no-step fallback. */
const HINTS: readonly GridFillHint[] = [
  { kind: 'grid-fill', level: 1, technique: 'last-cell', units: [{ kind: 'row', index: 0 }] },
  { kind: 'grid-fill', level: 1, technique: 'last-cell', units: [{ kind: 'column', index: 0 }] },
  { kind: 'grid-fill', level: 1, technique: 'last-cell', units: [{ kind: 'box', index: 0 }] },
  {
    kind: 'grid-fill',
    level: 1,
    technique: 'naked-single',
    units: [
      { kind: 'row', index: 0 },
      { kind: 'column', index: 0 },
      { kind: 'box', index: 0 },
    ],
  },
  { kind: 'grid-fill', level: 1, technique: 'full-line', units: [{ kind: 'row', index: 0 }] },
  { kind: 'grid-fill', level: 1, technique: 'full-line', units: [{ kind: 'column', index: 0 }] },
  ...(
    [
      'last-cell',
      'hidden-single',
      'naked-single',
      'full-line',
      'overlap',
      'cross-out',
      'combine',
    ] as const
  ).map((technique): GridFillHint => ({ kind: 'grid-fill', level: 2, technique, units: [] })),
  { kind: 'grid-fill', level: 3, technique: 'last-cell', units: [] },
  // A hint with no step left falls back to the card kit's "look" nudge.
  { kind: 'grid-fill', level: 1, technique: 'last-cell', units: [] },
];

function isGridFill(def: { readonly type: string }): def is GridFillDef {
  return def.type === 'grid-fill';
}

/** The rounds of a `series` boss (the only mode logic has); other games have none. */
function roundsOf(game: MiniGame): readonly { readonly type: string }[] {
  return 'rounds' in game && Array.isArray(game.rounds)
    ? (game.rounds as readonly { readonly type: string }[])
    : [];
}

/** Every `grid-fill` exercise of the content: guided tries, scored exercises and easier variants, then the rounds of every boss. */
function gridFillsOf(all: CompiledContent): readonly GridFillDef[] {
  return [
    ...all.lessons.flatMap((lesson) => [
      ...lesson.guided,
      ...lesson.exercises,
      ...(lesson.variants ?? []),
    ]),
    ...all.minigames.flatMap(roundsOf),
  ].filter(isGridFill);
}

/** For content with a `grid-fill` exercise: the two instructions, the "tap a cell first" note, every rejected-entry note (plain, and
 * joined with the easier offer as the fixed string the lesson screen can always reach), every hint by level and the 1-3 star praise.
 * Plugs into `SubjectContent.voiceTemplates`; the inventory dedupes the texts. */
export function gridFillVoiceTemplates(
  notes: NotesRegistry,
): (add: (text: string, source: string) => void, r: Resolve, all: CompiledContent) => void {
  return (add, r, all) => {
    if (gridFillsOf(all).length === 0) {
      return;
    }
    const speak = (feedback: ExerciseFeedbackBase, stars: Stars = 3, offer = false): void => {
      const note = exerciseNote(r, feedback, { name: '', vars: {}, stars }, notes, offer);
      if (note !== undefined) {
        add(note.text, offer ? 'exercise-note-easier-offer' : 'exercise-note');
      }
    };

    add(r('grid.instruction.sudoku'), 'exercise-instruction');
    add(r('grid.instruction.cross'), 'exercise-instruction');
    // A number pressed with no cell selected: not an error note, so no easier-offer string.
    speak({ kind: 'tap-first' });
    for (const feedback of WRONG) {
      speak(feedback);
      speak(feedback, 3, true);
    }
    for (const hint of HINTS) {
      speak({ kind: 'hint', hint });
    }
    for (const stars of STARS) {
      speak({ kind: 'solved' }, stars);
    }
  };
}
