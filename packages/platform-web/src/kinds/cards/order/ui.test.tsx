import { useState } from 'react';
import type { JSX } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import type { CardState } from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { initCardState } from '@learn/platform-core/domain/exercise/kinds/cards/def';
import type { OrderDef } from '@learn/platform-core/domain/exercise/kinds/order/def';
import { CARD_SAMPLES } from '@learn/platform-core/testing';
import { renderCardUi } from '../../../testing/card-test-entry.tsx';
import { orderUi } from './ui.ts';

// Items in display order: three, one, two (text "Two"); the answer is one, two, three.
const def: OrderDef = CARD_SAMPLES.order;
const fresh = initCardState(def);

async function renderPlayArea(core: Partial<CardState<OrderDef>> = {}, card: OrderDef = def) {
  const dispatch = vi.fn();
  const view = await renderCardUi(
    orderUi.PlayArea({
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

const slots = () =>
  within(screen.getByRole('list', { name: 'Your order' })).getAllByRole('listitem');
const pool = () => within(screen.getByRole('group', { name: 'Cards to place' }));

describe('order UI', () => {
  it('shows the prompt card, the instruction, one empty slot per answer, Hint and every card as a tile', async () => {
    await renderPlayArea();
    expect(screen.getByText('🔢').className).toContain('text-[96px]');
    expect(screen.getByText('Instruction')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hint' })).toBeTruthy();
    expect(slots().map((slot) => slot.getAttribute('aria-label'))).toEqual([
      'Place 1 of 3, empty',
      'Place 2 of 3, empty',
      'Place 3 of 3, empty',
    ]);
    // Display order, named by big text / text.
    expect(
      pool()
        .getAllByRole('button')
        .map((tile) => tile.getAttribute('aria-label')),
    ).toEqual(['3', '1', 'Two']);
  });

  it('puts the slots above the cards, in the panel under the instruction', async () => {
    const { container } = await renderPlayArea();
    const list = screen.getByRole('list', { name: 'Your order' });
    const group = screen.getByRole('group', { name: 'Cards to place' });
    expect(list.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Instruction').compareDocumentPosition(list)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(container.querySelectorAll('[data-filled="false"]')).toHaveLength(3);
  });

  it('makes slots and tiles at least 64 px square (min-h-20, min-w-16)', async () => {
    await renderPlayArea();
    for (const node of [...slots(), ...pool().getAllByRole('button')]) {
      expect(node.className).toContain('min-h-20');
      expect(node.className).toContain('min-w-16');
    }
    for (const tile of pool().getAllByRole('button'))
      expect(tile.className).toContain('tap-raised');
    for (const slot of slots()) expect(slot.className).not.toContain('tap-raised');
  });

  it('a tap on a tile dispatches place-item with its id', async () => {
    const { dispatch } = await renderPlayArea();
    fireEvent.click(pool().getByRole('button', { name: '1' }));
    fireEvent.click(pool().getByRole('button', { name: 'Two' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    expect(dispatch.mock.calls).toEqual([
      [{ type: 'place-item', itemId: 'one' }],
      [{ type: 'place-item', itemId: 'two' }],
      [{ type: 'hint' }],
    ]);
  });

  it('fills the slots from the left and takes the placed cards out of the pool', async () => {
    await renderPlayArea({ placed: ['one', 'two'] });
    expect(slots().map((slot) => slot.getAttribute('aria-label'))).toEqual([
      'Place 1 of 3: 1',
      'Place 2 of 3: Two',
      'Place 3 of 3, empty',
    ]);
    expect(slots().map((slot) => slot.getAttribute('data-filled'))).toEqual([
      'true',
      'true',
      'false',
    ]);
    expect(
      pool()
        .getAllByRole('button')
        .map((tile) => tile.getAttribute('aria-label')),
    ).toEqual(['3']);
  });

  it('shakes the card of a wrong tap, in orange, and only that one', async () => {
    await renderPlayArea({ wrongItemId: 'three', errors: 1 });
    const wrong = pool().getByRole('button', { name: '3' });
    expect(wrong.className).toContain('card-shake');
    expect(wrong.className).toContain('border-today');
    expect(wrong.getAttribute('data-wrong')).toBe('true');
    expect(wrong.hasAttribute('disabled')).toBe(false);
    for (const name of ['1', 'Two']) {
      const other = pool().getByRole('button', { name });
      expect(other.className).not.toContain('card-shake');
      expect(other.getAttribute('data-wrong')).toBe('false');
    }
  });

  it('restarts the shake when the same card is tapped wrong again (the error count keys the tile)', async () => {
    function Harness(): JSX.Element {
      const [errors, setErrors] = useState(1);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setErrors(2);
            }}
          >
            tap wrong again
          </button>
          {orderUi.PlayArea({
            def,
            state: {
              core: { ...fresh, wrongItemId: 'three', errors },
              hint: null,
              feedback: { kind: 'order-wrong' },
            },
            dispatch: vi.fn(),
            showHint: true,
            showCheck: true,
            top: <p>Instruction</p>,
            done: <p>Done</p>,
          })}
        </>
      );
    }
    await renderCardUi(<Harness />);
    const before = pool().getByRole('button', { name: '3' });
    fireEvent.click(screen.getByRole('button', { name: 'tap wrong again' }));
    const after = pool().getByRole('button', { name: '3' });
    expect(after).not.toBe(before);
    expect(after.className).toContain('card-shake');
    // A card that did not shake keeps its element.
    expect(pool().getByRole('button', { name: '1' })).toBe(
      pool().getByRole('button', { name: '1' }),
    );
  });

  it('dims and disables a card a hint ruled out, leaving the others tappable', async () => {
    await renderPlayArea({ ruledOut: ['three'] });
    const dimmed = pool().getByRole('button', { name: '3' });
    expect(dimmed.hasAttribute('disabled')).toBe(true);
    expect(dimmed.getAttribute('aria-disabled')).toBe('true');
    expect(dimmed.className).toContain('opacity-50');
    expect(pool().getByRole('button', { name: '1' }).hasAttribute('disabled')).toBe(false);
  });

  it('keeps the finished order on screen and swaps the cards for the done block once solved', async () => {
    await renderPlayArea({ placed: ['one', 'two', 'three'], solved: true });
    expect(screen.getByText('Done')).toBeTruthy();
    expect(slots().map((slot) => slot.getAttribute('data-filled'))).toEqual([
      'true',
      'true',
      'true',
    ]);
    expect(screen.queryByRole('group', { name: 'Cards to place' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Hint' })).toBeNull();
  });

  it('gives the panel the full width without a prompt', async () => {
    const { container } = await renderPlayArea({}, { ...def, prompt: undefined });
    expect(screen.queryByText('🔢')).toBeNull();
    expect(container.firstElementChild?.className).toBe('flex min-h-0 flex-1 flex-col gap-4');
    cleanup();
  });

  it('maps outcomes to notes: wrong says so, solved praises, a placed card clears the note', () => {
    const place = { type: 'place-item', itemId: 'three' } as const;
    expect(orderUi.toUi({ kind: 'wrong', itemId: 'three' }, place, fresh)).toEqual({
      feedback: { kind: 'order-wrong' },
      hint: null,
    });
    expect(orderUi.toUi({ kind: 'solved' }, place, fresh)).toEqual({
      feedback: { kind: 'solved' },
      hint: null,
    });
    for (const kind of ['placed', 'ignored'] as const) {
      expect(orderUi.toUi({ kind }, place, fresh)).toEqual({
        feedback: { kind: 'instruction' },
        hint: null,
      });
    }
  });
});
