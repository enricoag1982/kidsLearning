import { describe, expect, it } from 'vitest';
import { CARD_NOTES } from '@learn/platform-core/domain/exercise/kinds/cards/notes';
import { exerciseNote } from '@learn/platform-core/domain/notes';
import type { ExerciseFeedbackBase, Resolve } from '@learn/platform-core/domain/notes';
import { logicCore } from './logic-core.ts';
import { LOGIC_NOTES } from './notes.ts';

/** A resolver that shows the key and its vars, so the test sees which text is asked for. */
const r: Resolve = (key, vars) => (vars === undefined ? key : `${key} ${JSON.stringify(vars)}`);
const note = (feedback: ExerciseFeedbackBase, offer = false) =>
  exerciseNote(r, feedback, { name: 'Pip', stars: 3, vars: {} }, logicCore.notes, offer);

describe('logic notes', () => {
  it('are the card kit notes in the core, entry for entry: logic has no feedback note of its own yet', () => {
    expect(LOGIC_NOTES).toBe(CARD_NOTES);
    expect(Object.keys(logicCore.notes).sort()).toEqual(Object.keys(CARD_NOTES).sort());
    for (const [kind, entry] of Object.entries(CARD_NOTES)) {
      expect(logicCore.notes[kind], kind).toBe(entry);
    }
  });

  it('say the kit’s words: a wrong card, a wrong place, a hint, the solved praise, and the easier offer after an error', () => {
    expect(note({ kind: 'wrong-answer' })).toEqual({
      tone: 'attention',
      text: 'exercise.answer-wrong',
    });
    expect(note({ kind: 'wrong-answer' }, true)?.text).toBe(
      'exercise.answer-wrong exercise.easier-offer',
    );
    expect(note({ kind: 'order-wrong' })?.text).toBe('cards.order-wrong');
    expect(note({ kind: 'hint', hint: { kind: 'choice', level: 3, reveal: true } })?.text).toBe(
      'exercise.hint-answer',
    );
    expect(note({ kind: 'solved' })?.tone).toBe('praise');
  });
});
