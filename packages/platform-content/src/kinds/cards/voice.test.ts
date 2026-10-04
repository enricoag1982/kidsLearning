import { describe, expect, it } from 'vitest';
import type {
  CompiledContent,
  ExerciseDefBase,
  Lesson,
  MiniGame,
  Resolve,
} from '@learn/platform-core';
import { exerciseNote } from '@learn/platform-core';
import type { CardExerciseDef } from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { CARD_NOTES } from '@learn/platform-core/domain/exercise/kinds/cards/notes';
import { CARD_SAMPLES } from '@learn/platform-core/testing';
import type { NotesRegistry } from './voice.ts';
import { cardVoiceTemplates } from './voice.ts';

/** Every key resolves to itself (with its vars), so a test reads which note a text came from. */
const r: Resolve = (key, vars) => (vars === undefined ? key : `${key} ${JSON.stringify(vars)}`);
const OFFER = 'exercise.easier-offer';

const { choice, 'true-false': trueFalse, 'number-entry': numberEntry, order } = CARD_SAMPLES;

function lessonOf(
  exercises: readonly ExerciseDefBase[],
  variants: readonly ExerciseDefBase[] = [],
): Lesson {
  return {
    id: 'l',
    world: 'w',
    order: 1,
    concept: 'c',
    character: 'fox',
    titleKey: 'lessons:l.title',
    storyKey: 'lessons:l.story',
    demo: { textKey: 'lessons:l.demo' },
    guided: [],
    exercises,
    variants,
  };
}

function contentOf(lesson: Lesson, games: readonly MiniGame[] = []): CompiledContent {
  return { version: 1, lessons: [lesson], minigames: games };
}

/** The texts one run adds, with their sources, in call order. */
function inventory(
  content: CompiledContent,
  notes: NotesRegistry = CARD_NOTES,
): readonly { readonly text: string; readonly source: string }[] {
  const added: { text: string; source: string }[] = [];
  cardVoiceTemplates(notes)(
    (text, source) => {
      added.push({ text, source });
    },
    r,
    content,
  );
  return added;
}

const textsOf = (content: CompiledContent, notes?: NotesRegistry): ReadonlySet<string> =>
  new Set(inventory(content, notes).map((entry) => entry.text));

describe('cardVoiceTemplates', () => {
  it('adds nothing for content without a card exercise', () => {
    expect(inventory(contentOf(lessonOf([])))).toEqual([]);
    const program: ExerciseDefBase = {
      id: 'p',
      concept: 'c',
      textKey: 'lessons:p',
      type: 'program',
    };
    expect(inventory(contentOf(lessonOf([program])))).toEqual([]);
  });

  it('inventories only the kinds the content uses: no number-entry text without a number-entry exercise', () => {
    const spoken = textsOf(contentOf(lessonOf([choice])));
    expect(spoken).toContain('exercise.answer-wrong');
    expect(spoken).toContain('exercise.hint-remove-option');
    expect(spoken).toContain('exercise.hint-answer');
    expect(spoken).toContain('exercise.praise-1');
    for (const text of spoken) {
      expect(text, text).not.toMatch(/cards\.(number-wrong|hint-first-digit|order)/);
    }
    expect(spoken).not.toContain('cards.hint-look');
  });

  it('wrong notes: each used kind has its own, plain and joined with the easier offer', () => {
    const spoken = textsOf(contentOf(lessonOf([choice, trueFalse, numberEntry, order])));
    for (const wrong of ['exercise.answer-wrong', 'cards.number-wrong', 'cards.order-wrong']) {
      expect(spoken, wrong).toContain(wrong);
      expect(spoken, `${wrong} + offer`).toContain(`${wrong} ${OFFER}`);
    }
  });

  it('hints: every wording by level, the first digit 0-9 for number-entry', () => {
    const spoken = textsOf(contentOf(lessonOf([choice, trueFalse, numberEntry, order])));
    for (const text of [
      'exercise.hint-remove-option',
      'exercise.hint-answer',
      'cards.hint-look',
      'cards.order-hint',
    ]) {
      expect(spoken, text).toContain(text);
    }
    for (const digit of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']) {
      expect(spoken, digit).toContain(`cards.hint-first-digit {"digit":"${digit}"}`);
    }
    // A hint is no mistake: it never joins the easier offer.
    expect(
      [...spoken].filter((text) => text.startsWith('cards.hint') && text.includes(OFFER)),
    ).toEqual([]);
  });

  it('praise for 1 to 3 stars, once any card exercise is there', () => {
    const spoken = textsOf(contentOf(lessonOf([order])));
    for (const stars of [1, 2, 3]) {
      expect(spoken).toContain(`exercise.praise-${String(stars)}`);
    }
  });

  it('says exactly what the lesson screen says: every text is the core `exerciseNote`, with the offer joined as the screen joins it', () => {
    const note = (feedback: { kind: string }, offer: boolean): string | undefined =>
      exerciseNote(r, feedback, { name: '', vars: {}, stars: 3 }, CARD_NOTES, offer)?.text;
    const added = inventory(contentOf(lessonOf([trueFalse, numberEntry])));
    const offers = added.filter((entry) => entry.source === 'exercise-note-easier-offer');
    expect(offers.map((entry) => entry.text).sort()).toEqual(
      [note({ kind: 'wrong-answer' }, true), note({ kind: 'number-wrong' }, true)].sort(),
    );
    expect(note({ kind: 'wrong-answer' }, true)).toBe(`exercise.answer-wrong ${OFFER}`);
    for (const entry of added.filter((candidate) => candidate.source === 'exercise-note')) {
      expect(entry.text.includes(OFFER), entry.text).toBe(false);
    }
  });

  describe('reasons', () => {
    const reasoned: readonly CardExerciseDef[] = [
      {
        ...choice,
        id: 'c-r',
        options: choice.options.map((option) =>
          option.id === 'a' ? { ...option, reasonKey: 'lessons:why-two' } : option,
        ),
      },
      { ...trueFalse, id: 't-r', reasonKey: 'lessons:why-statement' },
      {
        ...numberEntry,
        id: 'n-r',
        reasons: [
          { value: 35, reasonKey: 'lessons:why-times' },
          { value: 13, reasonKey: 'lessons:why-off-by-one' },
        ],
      },
    ];

    it('every reason key of a choice option, a true-false and a number-entry value is spoken plain', () => {
      const spoken = textsOf(contentOf(lessonOf(reasoned)));
      for (const key of [
        'lessons:why-two',
        'lessons:why-statement',
        'lessons:why-times',
        'lessons:why-off-by-one',
      ]) {
        expect(spoken, key).toContain(key);
      }
    });

    it('a reason is joined with the easier offer only on an exercise that has an easier variant', () => {
      const without = textsOf(contentOf(lessonOf(reasoned)));
      expect(
        [...without].filter((text) => text.startsWith('lessons:why') && text.includes(OFFER)),
      ).toEqual([]);

      const withEasier = reasoned.map((def) => ({ ...def, easier: 'e' }));
      const spoken = textsOf(contentOf(lessonOf(withEasier)));
      for (const key of [
        'lessons:why-two',
        'lessons:why-statement',
        'lessons:why-times',
        'lessons:why-off-by-one',
      ]) {
        expect(spoken, key).toContain(`${key} ${OFFER}`);
      }
      // Only the reasons of the exercises with an easier variant.
      const mixed = textsOf(
        contentOf(
          lessonOf([
            { ...reasoned[1], easier: 'e' } as CardExerciseDef,
            reasoned[2] as CardExerciseDef,
          ]),
        ),
      );
      expect(mixed).toContain(`lessons:why-statement ${OFFER}`);
      expect(mixed).not.toContain(`lessons:why-times ${OFFER}`);
    });

    it('finds reasons on guided tries, easier variants and the rounds of a series boss too', () => {
      const guided = { ...lessonOf([]), guided: [reasoned[1] as CardExerciseDef] };
      expect(textsOf(contentOf(guided))).toContain('lessons:why-statement');

      const variant = lessonOf([], [reasoned[0] as CardExerciseDef]);
      expect(textsOf(contentOf(variant))).toContain('lessons:why-two');

      const boss = {
        id: 'b',
        mode: 'series',
        concept: 'c',
        titleKey: 'lessons:b.title',
        goalKey: 'lessons:b.goal',
        unlockAfter: 'l',
        rounds: [reasoned[2]],
      } as MiniGame;
      expect(textsOf(contentOf(lessonOf([]), [boss]))).toContain('lessons:why-times');
    });

    it('a def without reasons adds none, and the default note is unchanged', () => {
      const spoken = textsOf(contentOf(lessonOf([numberEntry])));
      expect([...spoken].filter((text) => text.startsWith('lessons:'))).toEqual([]);
      expect(spoken).toContain('cards.number-wrong');
    });
  });

  it('speaks through the note table it is given: a subject that words a note differently voices its own wording', () => {
    const notes: NotesRegistry = {
      ...CARD_NOTES,
      'number-wrong': { tone: 'attention', error: true, text: () => 'Almost!' },
    };
    const spoken = textsOf(contentOf(lessonOf([numberEntry])), notes);
    expect(spoken).toContain('Almost!');
    expect(spoken).toContain(`Almost! ${OFFER}`);
    expect(spoken).not.toContain('cards.number-wrong');
  });

  it('skips a note the table does not have', () => {
    const rest = Object.fromEntries(
      Object.entries(CARD_NOTES).filter(([kind]) => kind !== 'order-wrong'),
    );
    const spoken = textsOf(contentOf(lessonOf([order])), rest);
    expect(spoken).not.toContain('cards.order-wrong');
    expect(spoken).toContain('cards.order-hint');
  });
});
