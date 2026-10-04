import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import type { CardState } from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { initCardState } from '@learn/platform-core/domain/exercise/kinds/cards/def';
import type { NumberEntryDef } from '@learn/platform-core/domain/exercise/kinds/number-entry/def';
import { CARD_SAMPLES } from '@learn/platform-core/testing';
import { renderCardUi } from '../../../testing/card-test-entry.tsx';
import type { NumberEntryPlayAreaProps } from './ui.ts';
import { numberEntryUi } from './ui.ts';

const def: NumberEntryDef = CARD_SAMPLES['number-entry'];
const fresh = initCardState(def);

async function renderPlayArea(
  core: Partial<CardState<NumberEntryDef>> = {},
  wrongValue?: number,
  card: NumberEntryDef = def,
) {
  const dispatch = vi.fn<NumberEntryPlayAreaProps['dispatch']>();
  const view = await renderCardUi(
    numberEntryUi.PlayArea({
      def: card,
      state: {
        core: { ...fresh, ...core },
        hint: null,
        feedback: { kind: 'instruction' },
        wrongValue,
      },
      dispatch,
      showHint: true,
      showCheck: true,
      top: <p>Instruction</p>,
      done: <p>Done</p>,
    }),
  );
  return { dispatch, ...view };
}

const output = (name: string) => screen.getByRole('status', { name });

describe('number-entry UI', () => {
  it('shows the prompt card, what has been typed, Hint and the number pad', async () => {
    await renderPlayArea({ entry: '4' });
    expect(screen.getByText('7 + 5').className).toContain('text-5xl');
    expect(output('Your answer: 4').textContent).toBe('4');
    expect(output('Your answer: 4').getAttribute('aria-live')).toBe('polite');
    expect(screen.getByRole('group', { name: 'Number pad' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hint' })).toBeTruthy();
  });

  it('shows ? in place of an empty entry', async () => {
    await renderPlayArea({ entry: '' });
    expect(output('Your answer: ?').textContent).toBe('?');
  });

  it('dispatches the pad keys and Hint', async () => {
    const { dispatch } = await renderPlayArea({ entry: '4' });
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    expect(dispatch.mock.calls).toEqual([
      [{ type: 'enter-digit', digit: 9 }],
      [{ type: 'erase-digit' }],
      [{ type: 'submit-number' }],
      [{ type: 'hint' }],
    ]);
  });

  it('keeps Check disabled while the entry is empty', async () => {
    await renderPlayArea({ entry: '' });
    expect(screen.getByRole('button', { name: 'Check' }).hasAttribute('disabled')).toBe(true);
    cleanup();
    await renderPlayArea({ entry: '1' });
    expect(screen.getByRole('button', { name: 'Check' }).hasAttribute('disabled')).toBe(false);
  });

  it('strikes a wrong value in orange while the entry is empty, until the next digit', async () => {
    await renderPlayArea({ entry: '' }, 13);
    const wrong = output('Your answer: 13');
    expect(wrong.className).toContain('line-through');
    expect(wrong.className).toContain('text-today');
    cleanup();
    await renderPlayArea({ entry: '1' }, 13);
    expect(output('Your answer: 1').className).not.toContain('line-through');
  });

  it('shows the answer in green and the done block once solved', async () => {
    await renderPlayArea({ entry: '12', solved: true });
    expect(output('Your answer: 12').className).toContain('text-go');
    expect(screen.getByText('Done')).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'Number pad' })).toBeNull();
  });

  it('lets the entry take the whole board without a prompt', async () => {
    await renderPlayArea({ entry: '7' }, undefined, { ...def, prompt: undefined });
    expect(screen.queryByText('7 + 5')).toBeNull();
    expect(output('Your answer: 7').parentElement?.className).toContain('h-full');
  });

  it('maps outcomes to notes: wrong remembers the value, typed and ignored clear it, solved praises', () => {
    const submit = { type: 'submit-number' } as const;
    expect(numberEntryUi.toUi({ kind: 'wrong', value: 6 }, submit, fresh)).toEqual({
      feedback: { kind: 'number-wrong' },
      hint: null,
      wrongValue: 6,
    });
    expect(numberEntryUi.toUi({ kind: 'solved' }, submit, fresh)).toEqual({
      feedback: { kind: 'solved' },
      hint: null,
      wrongValue: undefined,
    });
    for (const kind of ['typed', 'ignored'] as const) {
      expect(numberEntryUi.toUi({ kind }, { type: 'erase-digit' }, fresh)).toEqual({
        feedback: { kind: 'instruction' },
        wrongValue: undefined,
      });
    }
    expect(numberEntryUi.clearWrongUi()).toEqual({ wrongValue: undefined });
    expect(numberEntryUi.initUi(def)).toEqual({});
  });

  it('a wrong value with a reason carries that reason; any other wrong value, none', () => {
    const submit = { type: 'submit-number' } as const;
    const next = initCardState({
      ...def,
      reasons: [
        { value: 35, reasonKey: 'lessons:why-times' },
        { value: 2, reasonKey: 'lessons:why-two' },
      ],
    });
    expect(numberEntryUi.toUi({ kind: 'wrong', value: 35 }, submit, next)).toEqual({
      feedback: { kind: 'number-wrong', reasonKey: 'lessons:why-times' },
      hint: null,
      wrongValue: 35,
    });
    expect(numberEntryUi.toUi({ kind: 'wrong', value: 2 }, submit, next)).toEqual({
      feedback: { kind: 'number-wrong', reasonKey: 'lessons:why-two' },
      hint: null,
      wrongValue: 2,
    });
    expect(numberEntryUi.toUi({ kind: 'wrong', value: 13 }, submit, next)).toEqual({
      feedback: { kind: 'number-wrong' },
      hint: null,
      wrongValue: 13,
    });
    expect(numberEntryUi.toUi({ kind: 'solved' }, submit, next)).toEqual({
      feedback: { kind: 'solved' },
      hint: null,
      wrongValue: undefined,
    });
  });
});
