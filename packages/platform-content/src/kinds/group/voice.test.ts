import { describe, expect, it } from 'vitest';
import type {
  CompiledContent,
  ExerciseDefBase,
  Lesson,
  MiniGame,
  Resolve,
} from '@learn/platform-core';
import { CARD_NOTES } from '@learn/platform-core/domain/exercise/kinds/cards/notes';
import { GROUP_NOTES } from '@learn/platform-core/domain/exercise/kinds/group/notes';
import { GROUP_SAMPLES } from '@learn/platform-core/testing';
import type { NotesRegistry } from '../cards/voice.ts';
import { groupVoiceTemplates } from './voice.ts';

/** Every key resolves to itself (with its vars), so a test reads which note a text came from. */
const r: Resolve = (key, vars) => (vars === undefined ? key : `${key} ${JSON.stringify(vars)}`);
const OFFER = 'exercise.easier-offer';
const NOTES = { ...CARD_NOTES, ...GROUP_NOTES };
const { row, carroll, venn } = GROUP_SAMPLES;

function lessonOf(exercises: readonly ExerciseDefBase[]): Lesson {
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
  };
}

function contentOf(
  exercises: readonly ExerciseDefBase[],
  games: readonly MiniGame[] = [],
): CompiledContent {
  return { version: 1, lessons: [lessonOf(exercises)], minigames: games };
}

function inventory(
  content: CompiledContent,
  notes: NotesRegistry = NOTES,
): readonly { readonly text: string; readonly source: string }[] {
  const added: { text: string; source: string }[] = [];
  groupVoiceTemplates(notes)(
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

describe('groupVoiceTemplates', () => {
  it('adds nothing for content without a group exercise (so no other subject changes)', () => {
    expect(inventory(contentOf([]))).toEqual([]);
    const other: ExerciseDefBase = { id: 'o', concept: 'c', textKey: 'lessons:o', type: 'order' };
    expect(inventory(contentOf([other]))).toEqual([]);
  });

  it('a row: the plain wrong note (plain and with the easier offer), the three hints and the praise, nothing of Carroll / Venn', () => {
    const spoken = textsOf(contentOf([row]));
    for (const text of [
      'cards.group.wrong',
      `cards.group.wrong ${OFFER}`,
      'cards.group.hint-1',
      'cards.group.hint-2',
      'cards.group.hint-3',
      'exercise.praise-1',
      'exercise.praise-2',
      'exercise.praise-3',
    ]) {
      expect(spoken, text).toContain(text);
    }
    expect(spoken.size).toBe(8);
  });

  it('a Carroll table adds its row / column notes, a Venn its overlap / outside notes', () => {
    const carrollSpoken = textsOf(contentOf([carroll]));
    for (const key of ['wrong-row', 'wrong-column']) {
      expect(carrollSpoken).toContain(`cards.group.${key}`);
      expect(carrollSpoken).toContain(`cards.group.${key} ${OFFER}`);
    }
    for (const key of ['wrong-overlap', 'wrong-outside']) {
      expect(carrollSpoken).not.toContain(`cards.group.${key}`);
    }
    const vennSpoken = textsOf(contentOf([venn]));
    for (const key of ['wrong-overlap', 'wrong-outside']) {
      expect(vennSpoken).toContain(`cards.group.${key}`);
      expect(vennSpoken).toContain(`cards.group.${key} ${OFFER}`);
    }
    for (const key of ['wrong-row', 'wrong-column']) {
      expect(vennSpoken).not.toContain(`cards.group.${key}`);
    }
    expect(textsOf(contentOf([row, carroll, venn])).size).toBe(8 + 4 + 4);
  });

  it('a hint is no mistake: it never joins the easier offer', () => {
    const spoken = [...textsOf(contentOf([row, carroll, venn]))];
    expect(
      spoken.filter((text) => text.startsWith('cards.group.hint') && text.includes(OFFER)),
    ).toEqual([]);
  });

  it('finds group exercises in variants and in the rounds of a series boss', () => {
    const lesson: Lesson = { ...lessonOf([]), variants: [venn] };
    const series: MiniGame = {
      id: 'g',
      mode: 'series',
      concept: 'c',
      titleKey: 'lessons:g.title',
      goalKey: 'lessons:g.goal',
      unlockAfter: 'l',
      rounds: [carroll],
    } as unknown as MiniGame;
    const fromVariant = textsOf({ version: 1, lessons: [lesson], minigames: [] });
    expect(fromVariant).toContain('cards.group.wrong-overlap');
    const fromRound = textsOf(contentOf([], [series]));
    expect(fromRound).toContain('cards.group.wrong-row');
    const duel = { id: 'd', mode: 'duel' } as unknown as MiniGame;
    expect(inventory(contentOf([], [duel]))).toEqual([]);
  });

  it('speaks what the subject table says: without the group entries there is no group text', () => {
    const spoken = [...textsOf(contentOf([row]), CARD_NOTES)];
    expect(spoken.filter((text) => text.startsWith('cards.group'))).toEqual([]);
    expect(spoken).toContain('exercise.praise-3');
  });

  it('sources: notes are `exercise-note`, the joined ones `exercise-note-easier-offer`', () => {
    const sources = new Map(inventory(contentOf([row])).map((entry) => [entry.text, entry.source]));
    expect(sources.get('cards.group.wrong')).toBe('exercise-note');
    expect(sources.get(`cards.group.wrong ${OFFER}`)).toBe('exercise-note-easier-offer');
  });
});
