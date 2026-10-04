import { describe, expect, it } from 'vitest';
import { CARD_NOTES } from '@learn/platform-core/domain/exercise/kinds/cards/notes';
import { exerciseNote } from '@learn/platform-core/domain/notes';
import type { ExerciseFeedbackBase, Resolve } from '@learn/platform-core/domain/notes';
import { mathCore } from './math-core.ts';
import { MATH_NOTES, mathHintText } from './notes.ts';

/** A resolver that shows the key and its vars, so the test sees which text is asked for. */
const r: Resolve = (key, vars) => (vars === undefined ? key : `${key} ${JSON.stringify(vars)}`);
const note = (feedback: ExerciseFeedbackBase, offer = false) =>
  exerciseNote(r, feedback, { name: 'Owl', stars: 3, vars: {} }, mathCore.notes, offer);

describe('math notes', () => {
  it('are the card kit notes plus math’s own, in the core', () => {
    expect(Object.keys(MATH_NOTES).sort()).toEqual(['hint', 'line-wrong', 'pv-wrong']);
    expect(Object.keys(mathCore.notes).sort()).toEqual(
      [...new Set([...Object.keys(CARD_NOTES), ...Object.keys(MATH_NOTES)])].sort(),
    );
    // Every card kit note but the hint stays the kit's own object.
    for (const [kind, entry] of Object.entries(CARD_NOTES)) {
      if (kind !== 'hint') expect(mathCore.notes[kind], kind).toBe(entry);
    }
  });

  it('a wrong build says the reason of its value, else asks to count the columns again', () => {
    expect(note({ kind: 'pv-wrong' })).toEqual({
      tone: 'attention',
      text: 'math.notes.pv-wrong',
    });
    expect(note({ kind: 'pv-wrong', reasonKey: 'lessons:bugs.swap' })?.text).toBe(
      'lessons:bugs.swap',
    );
  });

  it('a wrong build is an error note: the easier offer follows it', () => {
    expect(mathCore.notes['pv-wrong']?.error).toBe(true);
    expect(note({ kind: 'pv-wrong' }, true)?.text).toBe(
      'math.notes.pv-wrong exercise.easier-offer',
    );
    expect(note({ kind: 'pv-wrong', reasonKey: 'lessons:bugs.swap' }, true)?.text).toBe(
      'lessons:bugs.swap exercise.easier-offer',
    );
  });

  it('hint 1 names the columns, hint 2 the numeral, hint 3 the place it fills', () => {
    expect(mathHintText(r, { kind: 'place-value', level: 1 })).toBe('math.hints.pv-columns');
    expect(mathHintText(r, { kind: 'place-value', level: 2 })).toBe('math.hints.pv-numeral');
    expect(mathHintText(r, { kind: 'place-value', level: 3, fill: [3, 0, 0] })).toBe(
      'math.hints.pv-fill {"place":"math.pv.plural.hundreds"}',
    );
    expect(mathHintText(r, { kind: 'place-value', level: 3, fill: [0, 4, 0] })).toContain(
      'math.pv.plural.tens',
    );
    expect(mathHintText(r, { kind: 'place-value', level: 3, fill: [0, 0, 7] })).toContain(
      'math.pv.plural.ones',
    );
    expect(mathHintText(r, { kind: 'place-value', level: 3, fill: [4, 0, 0, 0] })).toContain(
      'math.pv.plural.thousands',
    );
    expect(mathHintText(r, { kind: 'place-value', level: 3, fill: [0, 3, 0, 0] })).toContain(
      'math.pv.plural.hundreds',
    );
  });

  it('hint 3 without a fill falls back to the kit’s “here is the answer”', () => {
    expect(mathHintText(r, { kind: 'place-value', level: 3 })).toBe('exercise.hint-answer');
  });

  it('a number-line hint says the middle, then to read every mark, then the answer', () => {
    expect(mathHintText(r, { kind: 'number-line', level: 1, benchmark: 500 })).toBe(
      'math.hints.line-benchmark {"benchmark":500}',
    );
    expect(mathHintText(r, { kind: 'number-line', level: 1 })).toBe('cards.hint-look');
    expect(mathHintText(r, { kind: 'number-line', level: 2 })).toBe('math.hints.line-labels');
    expect(mathHintText(r, { kind: 'number-line', level: 3 })).toBe('exercise.hint-answer');
  });

  it('a card kit hint keeps the kit’s wording, through the same note', () => {
    expect(
      note({ kind: 'hint', hint: { kind: 'number-entry', level: 1, reveal: false } })?.text,
    ).toBe('cards.hint-look');
    expect(note({ kind: 'hint', hint: { kind: 'choice', level: 3, reveal: true } })?.text).toBe(
      'exercise.hint-answer',
    );
    expect(note({ kind: 'hint', hint: { kind: 'place-value', level: 1 } })).toEqual({
      tone: 'attention',
      text: 'math.hints.pv-columns',
    });
  });

  it('the solved praise and the card wrong notes are the kit’s', () => {
    expect(note({ kind: 'solved' })?.tone).toBe('praise');
    expect(note({ kind: 'number-wrong' })?.text).toBe('cards.number-wrong');
  });
});
