import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import type {
  CardChoiceDef,
  CardState,
} from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { initCardState } from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { CARD_SAMPLES } from '@learn/platform-core/testing';
import { renderCardUi } from '../../../testing/card-test-entry.tsx';
import { cardChoiceUi } from './ui.ts';

const def: CardChoiceDef = CARD_SAMPLES.choice;
const fresh = initCardState(def);

async function renderPlayArea(
  core: Partial<CardState<CardChoiceDef>> = {},
  card: CardChoiceDef = def,
) {
  const dispatch = vi.fn();
  const view = await renderCardUi(
    cardChoiceUi.PlayArea({
      def: card,
      state: { core: { ...fresh, ...core }, hint: null, feedback: { kind: 'instruction' } },
      dispatch,
      showHint: true,
      showCheck: true,
      top: <p>Instruction</p>,
      done: <p>Done</p>,
    }),
  );
  return { dispatch, ...view };
}

describe('card choice UI', () => {
  it('shows the prompt card, the instruction, Hint and one tile per option', async () => {
    await renderPlayArea();
    expect(screen.getByText('🍎🍎🍎').className).toContain('text-[96px]');
    expect(screen.getByText('Instruction')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hint' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^(2|3|Five)$/ })).toHaveLength(3);
  });

  it('names an option by its text, or by its big text when it has none', async () => {
    await renderPlayArea();
    // `c` has text and an emoji: named by the text; `a` / `b` have only a big text.
    expect(screen.getByRole('button', { name: 'Five' }).hasAttribute('aria-label')).toBe(false);
    expect(screen.getByRole('button', { name: '2' }).getAttribute('aria-label')).toBe('2');
    expect(screen.getByRole('button', { name: '3' }).getAttribute('aria-label')).toBe('3');
  });

  it('names an emoji-only option by its emoji and an image-only one by its id', async () => {
    const odd: CardChoiceDef = {
      ...def,
      options: [
        { id: 'a', emoji: '🍎' },
        { id: 'ice-cream', image: 'fox' },
      ],
      answer: 'a',
    };
    await renderPlayArea({}, odd);
    expect(screen.getByRole('button', { name: '🍎' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ice cream' })).toBeTruthy();
  });

  it('makes every tile at least 80 px tall (64 px is the floor)', async () => {
    await renderPlayArea();
    for (const name of ['2', '3', 'Five']) {
      expect(screen.getByRole('button', { name }).className).toContain('min-h-20');
    }
  });

  it('dispatches the picked option, and Hint', async () => {
    const { dispatch } = await renderPlayArea();
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    expect(dispatch.mock.calls).toEqual([
      [{ type: 'answer-choice', optionId: 'b' }],
      [{ type: 'hint' }],
    ]);
  });

  it('disables a wrong option and keeps the others pickable', async () => {
    const { dispatch } = await renderPlayArea({ wrongOptions: ['a'] });
    const wrong = screen.getByRole('button', { name: '2' });
    expect(wrong.hasAttribute('disabled')).toBe(true);
    expect(wrong.className).toContain('border-today');
    fireEvent.click(screen.getByRole('button', { name: 'Five' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'answer-choice', optionId: 'c' });
  });

  it('gives the options the full width without a prompt, and the done block once solved', async () => {
    const { container } = await renderPlayArea({}, { ...def, prompt: undefined });
    expect(screen.queryByText('🍎🍎🍎')).toBeNull();
    expect(container.firstElementChild?.className).toBe('flex min-h-0 flex-1 flex-col gap-4');
  });

  it('replaces the tiles by the done block once solved', async () => {
    await renderPlayArea({ solved: true });
    expect(screen.getByText('Done')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '3' })).toBeNull();
  });

  it('a wrong pick gives the wrong-answer note, anything else the solved one', () => {
    const pick = { type: 'answer-choice', optionId: 'a' } as const;
    expect(cardChoiceUi.toUi({ kind: 'wrong' }, pick, fresh)).toEqual({
      feedback: { kind: 'wrong-answer' },
      hint: null,
    });
    expect(cardChoiceUi.toUi({ kind: 'solved' }, pick, fresh)).toEqual({
      feedback: { kind: 'solved' },
      hint: null,
    });
  });
});
