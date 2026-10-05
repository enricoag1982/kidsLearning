import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import type { CardState } from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { initCardState } from '@learn/platform-core/domain/exercise/kinds/cards/def';
import type { TrueFalseDef } from '@learn/platform-core/domain/exercise/kinds/true-false/def';
import { CARD_SAMPLES } from '@learn/platform-core/testing';
import { renderCardUi } from '../../../testing/card-test-entry.tsx';
import { trueFalseUi } from './ui.ts';

const def: TrueFalseDef = CARD_SAMPLES['true-false'];
const fresh = initCardState(def);

async function renderPlayArea(
  core: Partial<CardState<TrueFalseDef>> = {},
  card: TrueFalseDef = def,
) {
  const dispatch = vi.fn();
  const view = await renderCardUi(
    trueFalseUi.PlayArea({
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

const hintRow = (): HTMLElement =>
  screen.getByRole('button', { name: 'Hint' }).parentElement ?? document.body;

describe('true-false UI', () => {
  it('shows the prompt card, the instruction, Hint and two big buttons, True and False', async () => {
    await renderPlayArea();
    expect(screen.getByText('2 + 2 = 4')).toBeTruthy();
    expect(screen.getByText('Instruction')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hint' })).toBeTruthy();
    expect(hintRow().dataset.controlsSize).toBe('large');
    expect(screen.getByRole('button', { name: 'True' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'False' })).toBeTruthy();
  });

  it('puts a check on True and a cross on False, both hidden from assistive technology', async () => {
    await renderPlayArea();
    for (const [name, icon] of [
      ['True', 'text-go'],
      ['False', 'text-today'],
    ] as const) {
      const svg = screen.getByRole('button', { name }).querySelector('svg');
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
      expect(svg?.getAttribute('class')).toContain(icon);
    }
  });

  it('makes both buttons at least 64 px tall (h-20)', async () => {
    await renderPlayArea();
    for (const name of ['True', 'False']) {
      const button = screen.getByRole('button', { name });
      expect(button.className).toContain('h-20');
      expect(button.className).toContain('min-w-16');
      expect(button.className).toContain('tap-raised');
    }
  });

  it('dispatches the answer, and Hint', async () => {
    const { dispatch } = await renderPlayArea();
    fireEvent.click(screen.getByRole('button', { name: 'True' }));
    fireEvent.click(screen.getByRole('button', { name: 'False' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    expect(dispatch.mock.calls).toEqual([
      [{ type: 'answer-true-false', value: true }],
      [{ type: 'answer-true-false', value: false }],
      [{ type: 'hint' }],
    ]);
  });

  it('disables a button a wrong answer ruled out, in orange', async () => {
    await renderPlayArea({ wrongOptions: ['false'] });
    const wrong = screen.getByRole('button', { name: 'False' });
    expect(wrong.hasAttribute('disabled')).toBe(true);
    expect(wrong.className).toContain('border-today');
    expect(screen.getByRole('button', { name: 'True' }).hasAttribute('disabled')).toBe(false);
  });

  it('outlines the right button in green after a level-3 hint, never before', async () => {
    await renderPlayArea({ hintLevel: 2 });
    expect(screen.getByRole('button', { name: 'True' }).className).not.toContain('tap-border-go');
    document.body.innerHTML = '';
    await renderPlayArea({ hintLevel: 3 });
    expect(screen.getByRole('button', { name: 'True' }).className).toContain('tap-border-go');
    expect(screen.getByRole('button', { name: 'False' }).className).not.toContain('tap-border-go');
  });

  it('outlines False when that is the answer', async () => {
    await renderPlayArea({ hintLevel: 3 }, { ...def, answer: false });
    expect(screen.getByRole('button', { name: 'False' }).className).toContain('tap-border-go');
  });

  it('gives the buttons the full width without a prompt, and the done block once solved', async () => {
    const { container } = await renderPlayArea({}, { ...def, prompt: undefined });
    expect(container.firstElementChild?.className).toBe('flex min-h-0 flex-1 flex-col gap-4');
    document.body.innerHTML = '';
    await renderPlayArea({ solved: true });
    expect(screen.getByText('Done')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'True' })).toBeNull();
  });

  it('a wrong answer gives the wrong-answer note, anything else the solved one', () => {
    const action = { type: 'answer-true-false', value: false } as const;
    expect(trueFalseUi.toUi({ kind: 'wrong' }, action, fresh)).toEqual({
      feedback: { kind: 'wrong-answer' },
      hint: null,
    });
    expect(trueFalseUi.toUi({ kind: 'solved' }, action, fresh)).toEqual({
      feedback: { kind: 'solved' },
      hint: null,
    });
  });

  it('a wrong answer on a statement with a reason carries it; the right answer never does', () => {
    const next = initCardState({ ...def, reasonKey: 'lessons:why-true' });
    expect(
      trueFalseUi.toUi({ kind: 'wrong' }, { type: 'answer-true-false', value: false }, next),
    ).toEqual({ feedback: { kind: 'wrong-answer', reasonKey: 'lessons:why-true' }, hint: null });
    expect(
      trueFalseUi.toUi({ kind: 'solved' }, { type: 'answer-true-false', value: true }, next),
    ).toEqual({ feedback: { kind: 'solved' }, hint: null });
  });
});
