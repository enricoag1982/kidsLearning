import { describe, expect, it } from 'vitest';
import {
  CARD_SAMPLES,
  CARD_TYPES,
  cardStars,
  playCard,
  playCardSolution,
  playCardWrongThenSolve,
} from '../../../../testing/cards.ts';
import { createSubjectRuntime } from '../../../runtime.ts';
import { completeRound, seriesStars, startSeries } from '../../modes/series/engine.ts';
import { exerciseNote } from '../../../notes.ts';
import type { Resolve } from '../../../notes.ts';
import { createCardCore } from './core.ts';
import type { CardExerciseDef, CardHint } from './def.ts';
import { CARD_KINDS, cardKindOf } from './kinds.ts';
import { CARD_NOTES, cardHintText } from './notes.ts';
import { CARD_SOLUTIONS, cardSolutionOf } from './solutions.ts';

const core = createCardCore({ id: 'cards', characters: { fox: { topicKey: 'topic.fox' } } });
const r: Resolve = (key, vars) => (vars === undefined ? key : `${key} ${JSON.stringify(vars)}`);
const defs = Object.values(CARD_SAMPLES) as readonly CardExerciseDef[];

describe('createCardCore', () => {
  it('registers the four kinds over one shared state, with no mode and no context', () => {
    expect(Object.keys(core.kinds).sort()).toEqual(
      ['choice', 'number-entry', 'order', 'true-false'].sort(),
    );
    expect(core.kinds).toBe(CARD_KINDS);
    expect(core).toMatchObject({ id: 'cards', context: null, modes: {} });
    expect(core.characters).toEqual({ fox: { topicKey: 'topic.fox' } });
    expect(core.noteVars('fox')).toEqual({});
    for (const def of defs) {
      expect(core.kinds[def.type]?.type).toBe(def.type);
      expect(core.kinds[def.type]?.init(def)).toEqual({
        def,
        moves: 0,
        solved: false,
        errors: 0,
        hintLevel: 0,
        entry: '',
        placed: [],
        ruledOut: [],
      });
    }
  });

  it('has a settings slot with no fields', async () => {
    expect(core.settings.defaults).toEqual({});
    expect(core.settings.isValid({})).toBe(true);
    await expect(core.settings.loadBackupShape()).resolves.toEqual({});
  });

  it('the runtime adds the platform series mode over the card kinds', () => {
    expect(Object.keys(createSubjectRuntime(core).modes)).toEqual(['series']);
  });

  it('merges extra notes over the kit notes', () => {
    const extra = {
      solved: { tone: 'praise', text: () => 'custom' },
      special: { tone: 'attention', text: () => 'special' },
    } as const;
    const merged = createCardCore({ id: 'cards', characters: {}, notes: extra });
    expect(Object.keys(merged.notes).sort()).toEqual(
      ['hint', 'number-wrong', 'order-wrong', 'solved', 'special', 'wrong-answer'].sort(),
    );
    expect(merged.notes.solved).toBe(extra.solved);
    expect(core.notes.solved).toBe(CARD_NOTES.solved);
  });

  it('every registered type has a sample, a kind and a solution entry', () => {
    expect([...CARD_TYPES].sort()).toEqual(Object.keys(CARD_SAMPLES).sort());
    expect(Object.keys(CARD_SOLUTIONS).sort()).toEqual([...CARD_TYPES].sort());
  });
});

describe('a series over the card kinds', () => {
  const series = { id: 'parade', concept: 'counting', rounds: defs, errors3: 0, errors2: 2 };

  it('plays one round of each kind, 3 stars with no mistake', () => {
    let state = startSeries(series, core.kinds);
    for (const def of defs) {
      expect(state.round.def).toBe(def);
      state = completeRound(state, playCardSolution(def), core.kinds);
    }
    expect(state).toMatchObject({ done: true, mistakes: 0 });
    expect(seriesStars(state)).toBe(3);
  });

  it('counts errors and hint levels of every round as mistakes', () => {
    let state = startSeries(series, core.kinds);
    for (const def of defs) {
      state = completeRound(state, playCardWrongThenSolve(def), core.kinds);
    }
    expect(state.mistakes).toBe(4);
    expect(seriesStars(state)).toBe(1);
  });
});

describe('every card kind', () => {
  it.each(defs.map((def) => [def.type, def] as const))(
    '%s: the solution solves with 0 errors and 3 stars, the wrong action gives exactly 1 error',
    (_type, def) => {
      const solved = playCardSolution(def);
      expect(solved).toMatchObject({ solved: true, errors: 0 });
      expect(cardStars(solved)).toBe(3);
      const wrong = cardSolutionOf(def).wrongAction?.(def, null) ?? [];
      expect(playCard(def, wrong)).toMatchObject({ solved: false, errors: 1 });
      const recovered = playCardWrongThenSolve(def);
      expect(recovered).toMatchObject({ solved: true, errors: 1 });
      expect(cardStars(recovered)).toBe(2);
    },
  );

  it.each(defs.map((def) => [def.type, def] as const))(
    '%s: hint levels bump the hint level, level 3 gives 1 star',
    (_type, def) => {
      const kind = cardKindOf(def);
      let state = kind.init(def);
      for (const level of [1, 2, 3] as const) {
        const step = kind.hint(state, level, null);
        expect(step.hint.level).toBe(level);
        expect(step.state.hintLevel).toBe(level);
        state = step.state;
      }
      expect(kind.stars({ ...state, solved: true })).toBe(1);
    },
  );
});

describe('card notes', () => {
  const note = (feedback: Parameters<typeof exerciseNote>[1], stars: 1 | 2 | 3 = 3) =>
    exerciseNote(r, feedback, { name: 'Fox', stars, vars: {} }, core.notes, false);

  it('words each feedback kind, and says nothing while the instruction is showing', () => {
    expect(note({ kind: 'instruction' })).toBeUndefined();
    expect(note({ kind: 'wrong-answer' })).toEqual({
      text: 'exercise.answer-wrong',
      tone: 'attention',
    });
    expect(note({ kind: 'number-wrong' })?.text).toBe('cards.number-wrong');
    expect(note({ kind: 'order-wrong' })?.text).toBe('cards.order-wrong');
    expect(note({ kind: 'solved' }, 2)).toEqual({ text: 'exercise.praise-2', tone: 'praise' });
  });

  it('the three error notes offer the easier variant, the hint and solved ones do not', () => {
    const withOffer = (kind: 'wrong-answer' | 'number-wrong' | 'order-wrong'): string | undefined =>
      exerciseNote(r, { kind }, { name: 'Fox', stars: 1, vars: {} }, core.notes, true)?.text;
    for (const kind of ['wrong-answer', 'number-wrong', 'order-wrong'] as const) {
      expect(withOffer(kind)).toContain('exercise.easier-offer');
    }
    const hint: CardHint = { kind: 'true-false', level: 1, highlight: false, reveal: false };
    expect(
      exerciseNote(r, { kind: 'hint', hint }, { name: 'Fox', stars: 1, vars: {} }, core.notes, true)
        ?.text,
    ).toBe('cards.hint-look');
  });

  it('words every hint kind and level', () => {
    const hints: readonly (readonly [CardHint, string])[] = [
      [
        { kind: 'choice', level: 1, reveal: false, removedOptionId: 'a' },
        'exercise.hint-remove-option',
      ],
      [{ kind: 'choice', level: 3, reveal: true }, 'exercise.hint-answer'],
      [{ kind: 'true-false', level: 1, highlight: false, reveal: false }, 'cards.hint-look'],
      [{ kind: 'true-false', level: 2, highlight: true, reveal: false }, 'cards.hint-look'],
      [{ kind: 'true-false', level: 3, highlight: false, reveal: true }, 'exercise.hint-answer'],
      [{ kind: 'number-entry', level: 1, reveal: false }, 'cards.hint-look'],
      [
        { kind: 'number-entry', level: 2, reveal: false, digit: '4' },
        'cards.hint-first-digit {"digit":"4"}',
      ],
      [{ kind: 'number-entry', level: 3, reveal: true }, 'exercise.hint-answer'],
      [{ kind: 'order', level: 1, reveal: false, nextSlot: 0 }, 'cards.order-hint'],
      [
        { kind: 'order', level: 2, reveal: false, nextSlot: 0, ruledOutId: 'x' },
        'exercise.hint-remove-option',
      ],
      [{ kind: 'order', level: 2, reveal: false, nextSlot: 0 }, 'cards.order-hint'],
      [
        { kind: 'order', level: 3, reveal: true, nextSlot: 0, placedId: 'x' },
        'exercise.hint-answer',
      ],
    ];
    for (const [hint, text] of hints) {
      expect(cardHintText(r, hint)).toBe(text);
    }
  });
});
