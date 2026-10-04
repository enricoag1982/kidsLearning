import { describe, expect, it } from 'vitest';
import type { ExerciseNoteCtx, Resolve } from '@learn/platform-core/domain/notes';
import { exerciseNote } from '@learn/platform-core/domain/notes';
import { codingCore } from './coding-core.ts';
import { CODING_NOTES, codingHintText } from './notes.ts';

/** A resolver that shows the key and its vars, so a test sees which text is asked for. */
const r: Resolve = (key, vars) =>
  vars === undefined
    ? key
    : `${key}(${Object.entries(vars)
        .map(([k, v]) => `${k}=${String(v)}`)
        .join(',')})`;
const ctx: ExerciseNoteCtx = { name: 'Fox', stars: 3, vars: {} };

function noteOf(feedback: { readonly kind: string; readonly [field: string]: unknown }) {
  return exerciseNote(r, feedback, ctx, codingCore.notes, false);
}

describe('coding notes', () => {
  it('a bump names its step, and the edge when the animal left the grid', () => {
    expect(noteOf({ kind: 'run-bumped', step: 4, edge: false })).toEqual({
      text: 'coding.notes.bumped(step=4)',
      tone: 'attention',
    });
    expect(noteOf({ kind: 'run-bumped', step: 1, edge: true })?.text).toBe(
      'coding.notes.bumped-edge(step=1)',
    );
  });

  it('an unfinished run, a wrong cell and a wrong tile each have their note', () => {
    expect(noteOf({ kind: 'run-unfinished' })?.text).toBe('coding.notes.unfinished');
    expect(noteOf({ kind: 'predict-wrong' })?.text).toBe('coding.notes.predict-wrong');
    expect(noteOf({ kind: 'bug-wrong' })?.text).toBe('coding.notes.bug-wrong');
  });

  it('a program that cannot run says why: too many tiles, not in the tray, unfinished', () => {
    expect(noteOf({ kind: 'program-invalid', reason: 'empty' })?.text).toBe('coding.notes.empty');
    expect(noteOf({ kind: 'program-invalid', reason: 'too-many' })?.text).toBe(
      'coding.notes.too-many',
    );
    expect(noteOf({ kind: 'program-invalid', reason: 'tray' })?.text).toBe(
      'coding.notes.not-in-tray',
    );
    expect(noteOf({ kind: 'program-invalid', reason: 'incomplete' })?.text).toBe(
      'coding.notes.incomplete',
    );
  });

  it('the failures count towards the easier offer; a Run that did not start does not', () => {
    for (const kind of ['run-bumped', 'run-unfinished', 'predict-wrong', 'bug-wrong'] as const) {
      expect(CODING_NOTES[kind].error, kind).toBe(true);
    }
    expect('error' in CODING_NOTES['program-invalid']).toBe(false);
    expect('error' in CODING_NOTES.hint).toBe(false);
    const withOffer = exerciseNote(
      (key) => (key === 'exercise.easier-offer' ? 'OFFER' : key),
      { kind: 'run-unfinished' },
      ctx,
      codingCore.notes,
      true,
    );
    expect(withOffer?.text).toBe('coding.notes.unfinished OFFER');
  });

  it("the core keeps the card kit's notes and replaces its hint note with the coding one", () => {
    expect(codingCore.notes['solved']).toBeDefined();
    expect(codingCore.notes['order-wrong']).toBeDefined();
    expect(codingCore.notes['hint']).toBe(CODING_NOTES.hint);
    expect(codingCore.notes['run-bumped']).toBe(CODING_NOTES['run-bumped']);
  });
});

describe('codingHintText', () => {
  it('program: the cell, the faded tiles, the filled strip', () => {
    expect(codingHintText(r, { kind: 'program', level: 1 })).toBe('coding.hint.first');
    expect(codingHintText(r, { kind: 'program', level: 2 })).toBe('coding.hint.ghost');
    expect(codingHintText(r, { kind: 'program', level: 3 })).toBe('coding.hint.fill');
  });

  it('predict: watch again for 1 and 2, the answer for 3', () => {
    expect(codingHintText(r, { kind: 'predict', level: 1 })).toBe('coding.hint.replay');
    expect(codingHintText(r, { kind: 'predict', level: 2 })).toBe('coding.hint.replay');
    expect(codingHintText(r, { kind: 'predict', level: 3 })).toBe('coding.hint.predict-answer');
  });

  it('find-bug: watch, the bright steps, the flashing step', () => {
    expect(codingHintText(r, { kind: 'find-bug', level: 1 })).toBe('coding.hint.bug-replay');
    expect(codingHintText(r, { kind: 'find-bug', level: 2 })).toBe('coding.hint.bug-candidates');
    expect(codingHintText(r, { kind: 'find-bug', level: 3 })).toBe('coding.hint.bug-flash');
  });

  it("a card kit hint keeps the kit's words", () => {
    expect(codingHintText(r, { kind: 'order', level: 3, reveal: true, nextSlot: 0 })).toBe(
      'exercise.hint-answer',
    );
    expect(codingHintText(r, { kind: 'order', level: 1, reveal: false, nextSlot: 0 })).toBe(
      'cards.order-hint',
    );
  });
});
