import { describe, expect, it } from 'vitest';
import { exerciseNote } from '../../../notes.ts';
import type { ExerciseFeedbackBase, Resolve } from '../../../notes.ts';
import type { CardHint } from '../cards/def.ts';
import { CARD_NOTES, cardHintText } from '../cards/notes.ts';
import type { GroupMiss } from './def.ts';
import { GROUP_NOTES, groupHintText } from './notes.ts';

/** Every key resolves to itself (with its vars), so a test reads which text a note came from. */
const r: Resolve = (key, vars) => (vars === undefined ? key : `${key} ${JSON.stringify(vars)}`);
const ctx = { name: 'Fox', stars: 3, vars: {} } as const;
const notes = { ...CARD_NOTES, ...GROUP_NOTES };
const say = (feedback: ExerciseFeedbackBase, offer = false) =>
  exerciseNote(r, feedback, ctx, notes, offer);

describe('group notes', () => {
  it('a wrong put speaks the text of what it got half right, a plain miss the default', () => {
    const keys: readonly [GroupMiss | undefined, string][] = [
      ['row', 'cards.group.wrong-row'],
      ['column', 'cards.group.wrong-column'],
      ['overlap', 'cards.group.wrong-overlap'],
      ['outside', 'cards.group.wrong-outside'],
      [undefined, 'cards.group.wrong'],
    ];
    for (const [miss, key] of keys) {
      expect(say({ kind: 'group-wrong', ...(miss === undefined ? {} : { miss }) }), key).toEqual({
        text: key,
        tone: 'attention',
      });
    }
  });

  it('a wrong note joins the easier offer, like every error note', () => {
    expect(say({ kind: 'group-wrong' }, true)?.text).toBe(
      'cards.group.wrong exercise.easier-offer',
    );
    expect(GROUP_NOTES['group-wrong'].error).toBe(true);
  });

  it('a hint speaks its level: look at the boxes, not here, watch', () => {
    const levels = [
      [{ kind: 'group', level: 1 }, 'cards.group.hint-1'],
      [{ kind: 'group', level: 2, itemId: 'a', boxId: 'b' }, 'cards.group.hint-2'],
      [{ kind: 'group', level: 3, itemId: 'a', boxId: 'b' }, 'cards.group.hint-3'],
    ] as const;
    for (const [hint, key] of levels) {
      expect(say({ kind: 'hint', hint })?.text).toBe(key);
      expect(groupHintText(r, hint)).toBe(key);
    }
    expect(say({ kind: 'hint', hint: { kind: 'group', level: 1 } }, true)?.text).toBe(
      'cards.group.hint-1',
    );
  });

  it("the hint entry keeps the card kit's wording for a card kit hint", () => {
    const hints: readonly CardHint[] = [
      { kind: 'choice', level: 1, reveal: false },
      { kind: 'number-entry', level: 2, reveal: false, digit: '4' },
      { kind: 'order', level: 3, reveal: true, nextSlot: 0 },
    ];
    for (const hint of hints) {
      expect(say({ kind: 'hint', hint })?.text).toBe(cardHintText(r, hint));
    }
  });

  it('solved and instruction come from the kit: praise by stars, nothing under the instruction', () => {
    expect(say({ kind: 'solved' })?.text).toBe('exercise.praise-3');
    expect(say({ kind: 'instruction' })).toBeUndefined();
  });
});
