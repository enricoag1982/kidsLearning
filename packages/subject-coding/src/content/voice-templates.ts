// The narrated coding texts that are not an exercise or lesson text: every feedback note under the instruction (the Owl bubble speaks
// each as its own utterance, `docs/voice.md` §5), expanded over its bounded, content-derived domain. `pnpm voice:check` then covers
// them. Board names, tile names and button labels are read by a screen reader only, never narrated.
import type { CompiledContent, ExerciseFeedbackBase, Resolve, Stars } from '@learn/platform-core';
import { exerciseNote } from '@learn/platform-core';
import type { CardType } from '@learn/platform-core/domain/exercise/kinds/cards/def';
import type { InvalidReason } from '../core/notes.ts';
import { codingCore } from '../core/coding-core.ts';
import { MAX_REPEAT, MAX_REPEAT_BODY } from '../core/tiles.ts';
import type { ProgramDef } from '../core/types.ts';
import { allCodingExercises } from './all-exercises.ts';

const INVALID_REASONS: readonly InvalidReason[] = ['empty', 'too-many', 'tray', 'incomplete'];
const STARS: readonly Stars[] = [1, 2, 3];
function hintOf(hint: Record<string, unknown>): ExerciseFeedbackBase {
  return { kind: 'hint', hint };
}

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

/** The most primitives a program of `cap` tiles can run before it stops: `cap` without a repeat; with one, every repeat runs its
 * body `MAX_REPEAT` times, so the most is over how many repeats (r) share the strip: `r` repeat tiles, their bodies (at most
 * `MAX_REPEAT_BODY` each) and single tiles. The bump note counts steps up to this. */
export function maxSteps(def: Pick<ProgramDef, 'cap' | 'tray'>): number {
  if (!def.tray.includes('repeat')) {
    return def.cap;
  }
  let most = def.cap;
  for (let repeats = 1; repeats < def.cap; repeats += 1) {
    const body = Math.min(MAX_REPEAT_BODY * repeats, def.cap - repeats);
    most = Math.max(most, MAX_REPEAT * body + (def.cap - repeats - body));
  }
  return most;
}

/** The card kit's feedback per card kind: its wrong-answer note and every hint wording. A table, not a dispatch: the kinds'
 * registries own what a type does (`dispatch-registries.test.ts`). */
const CARD_FEEDBACK: Readonly<Record<CardType, readonly ExerciseFeedbackBase[]>> = {
  choice: [
    { kind: 'wrong-answer' },
    hintOf({ kind: 'choice', level: 1, reveal: false }),
    hintOf({ kind: 'choice', level: 3, reveal: true }),
  ],
  'true-false': [
    { kind: 'wrong-answer' },
    hintOf({ kind: 'true-false', level: 1, highlight: true, reveal: false }),
    hintOf({ kind: 'true-false', level: 3, highlight: true, reveal: true }),
  ],
  'number-entry': [
    { kind: 'number-wrong' },
    hintOf({ kind: 'number-entry', level: 1, reveal: false }),
    ...DIGITS.map((digit) => hintOf({ kind: 'number-entry', level: 2, reveal: false, digit })),
    hintOf({ kind: 'number-entry', level: 3, reveal: true }),
  ],
  order: [
    { kind: 'order-wrong' },
    hintOf({ kind: 'order', level: 1, reveal: false, nextSlot: 0 }),
    hintOf({ kind: 'order', level: 2, reveal: false, nextSlot: 0, ruledOutId: 'x' }),
    hintOf({ kind: 'order', level: 3, reveal: true, nextSlot: 0 }),
  ],
};

/** The feedback of the three coding kinds: the notes that depend on nothing, the hint ladders, a bump on every step count. */
function codingFeedback(steps: number): readonly ExerciseFeedbackBase[] {
  const hints = [
    { kind: 'program', level: 1 },
    { kind: 'program', level: 2 },
    { kind: 'program', level: 3 },
    { kind: 'predict', level: 1 },
    { kind: 'predict', level: 3 },
    { kind: 'find-bug', level: 1 },
    { kind: 'find-bug', level: 2 },
    { kind: 'find-bug', level: 3 },
  ].map((hint): ExerciseFeedbackBase => ({ kind: 'hint', hint }));
  const bumps = Array.from({ length: steps }, (_unused, index) => index + 1).flatMap(
    (step): ExerciseFeedbackBase[] => [
      { kind: 'run-bumped', step, edge: false },
      { kind: 'run-bumped', step, edge: true },
    ],
  );
  return [
    { kind: 'run-unfinished' },
    ...INVALID_REASONS.map((reason): ExerciseFeedbackBase => ({ kind: 'program-invalid', reason })),
    { kind: 'predict-wrong' },
    { kind: 'bug-wrong' },
    ...hints,
    ...bumps,
  ];
}

/** Every note text (plain, and with the easier-offer sentence on the error kinds) as its own utterance, through the same
 * `exerciseNote` the lesson screen calls. */
export function codingVoiceTemplates(
  add: (text: string, source: string) => void,
  r: Resolve,
  all: CompiledContent,
): void {
  const exercises = allCodingExercises(all.lessons, all.minigames);
  const programs = exercises.filter(
    (exercise): exercise is ProgramDef => 'cap' in exercise && 'tray' in exercise,
  );
  // The card kit's kinds the content uses, and the coding kinds' notes when it has a coding kind (any grid exercise).
  const used = new Set<string>(exercises.map((exercise) => exercise.type));
  const cardKinds = Object.keys(CARD_FEEDBACK).filter((type) => used.has(type)) as CardType[];
  const usesGrid = exercises.some((exercise) => 'level' in exercise);
  const feedback = [
    ...(usesGrid ? codingFeedback(Math.max(0, ...programs.map(maxSteps))) : []),
    ...cardKinds.flatMap((type) => CARD_FEEDBACK[type]),
  ];

  const note = (item: ExerciseFeedbackBase, stars: Stars, offer: boolean): string | undefined =>
    exerciseNote(r, item, { name: '', vars: {}, stars }, codingCore.notes, offer)?.text;
  for (const item of feedback) {
    const plain = note(item, 3, false);
    if (plain !== undefined) {
      add(plain, 'exercise-note');
    }
    if (codingCore.notes[item.kind]?.error === true) {
      const withOffer = note(item, 3, true);
      if (withOffer !== undefined) {
        add(withOffer, 'exercise-note-easier-offer');
      }
    }
  }
  for (const stars of STARS) {
    const praise = note({ kind: 'solved' }, stars, false);
    if (praise !== undefined) {
      add(praise, 'exercise-note');
    }
  }
}
