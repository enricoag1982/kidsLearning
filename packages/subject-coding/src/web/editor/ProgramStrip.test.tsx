import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { Tile } from '../../core/tiles.ts';
import { ProgramStrip } from './ProgramStrip.tsx';
import type { ProgramStripProps } from './ProgramStrip.tsx';

const right: Tile = { kind: 'right' };
const down: Tile = { kind: 'down' };
const up: Tile = { kind: 'up' };
const repeat = (times: number, ...body: Tile[]): Tile => ({ kind: 'repeat', times, body });

const names = (): (string | null)[] =>
  within(screen.getByRole('list', { name: 'Your program' }))
    .getAllByLabelText(/^Slot|^Tile/)
    .map((node) => node.getAttribute('aria-label'));

function edit(props: Partial<ProgramStripProps> & Pick<ProgramStripProps, 'slots'>) {
  return render(<ProgramStrip mode="edit" {...props} />);
}

describe('ProgramStrip, edit mode', () => {
  it('shows every slot in a list: tiles named "Slot n: …", empty ones dashed and named "empty"', () => {
    edit({ slots: [right, null, down, null] });
    expect(names()).toEqual([
      'Slot 1: Step right',
      'Slot 2, empty',
      'Slot 3: Step down',
      'Slot 4, empty',
    ]);
    const empty = screen.getByRole('img', { name: 'Slot 2, empty' });
    expect(empty.className).toContain('border-dashed');
    expect(empty.querySelector('button')).toBeNull();
  });

  it('makes every slot and tile at least 56 px (h-14 w-14)', () => {
    edit({ slots: [right, null], onRemove: vi.fn() });
    for (const name of ['Slot 1: Step right', 'Slot 2, empty']) {
      const node = screen.getByLabelText(name);
      expect(node.className).toContain('h-14');
      expect(node.className).toContain('w-14');
    }
  });

  it('a tapped tile is taken out (its path); a tile is a raised button with a 40 px icon', () => {
    const onRemove = vi.fn();
    edit({ slots: [right, down], onRemove });
    const tile = screen.getByRole('button', { name: 'Slot 2: Step down' });
    expect(tile.className).toContain('tap-raised');
    expect(tile.querySelector('svg')?.getAttribute('width')).toBe('40');
    fireEvent.click(tile);
    expect(onRemove).toHaveBeenCalledWith([1]);
  });

  it('a locked slot shows a lock, is no button and cannot be removed', () => {
    const onRemove = vi.fn();
    edit({ slots: [right, down], locked: [0], onRemove });
    const fixed = screen.getByRole('img', { name: 'Slot 1: Step right, locked' });
    expect(fixed.querySelector('[data-testid="lock-mark"]')).not.toBeNull();
    expect(fixed.className).not.toContain('tap-raised');
    expect(screen.queryByRole('button', { name: /Slot 1/ })).toBeNull();
    fireEvent.click(fixed);
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Slot 2: Step down' })).toBeTruthy();
  });

  it('while a run plays every tile is a picture: no button to tap, the glow on the running one', () => {
    const onRemove = vi.fn();
    edit({
      slots: [right, repeat(2, down)],
      busy: true,
      onRemove,
      onToggleRepeat: vi.fn(),
      onCycleTimes: vi.fn(),
      active: { path: [1, 0], iteration: 2 },
    });
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    fireEvent.click(screen.getByRole('img', { name: 'Slot 1: Step right' }));
    expect(onRemove).not.toHaveBeenCalled();
    expect(
      screen.getByRole('img', { name: 'Slot 2, inside the repeat: Step down' }).dataset['active'],
    ).toBe('true');
    const block = screen.getByRole('img', { name: 'Slot 2: Repeat 2 times' });
    expect(block.textContent).toBe('2 of 2');
    expect(block.dataset['iterating']).toBe('true');
  });

  it('the running tile glows', () => {
    edit({ slots: [right, down], active: { path: [1] }, onRemove: vi.fn() });
    expect(screen.getByRole('button', { name: 'Slot 2: Step down' }).dataset['active']).toBe(
      'true',
    );
    expect(screen.getByRole('button', { name: 'Slot 1: Step right' }).dataset['active']).toBe(
      'false',
    );
    expect(screen.getByRole('button', { name: 'Slot 2: Step down' }).className).toContain('ring-4');
  });

  it('shows a faded ghost tile in an empty slot, hidden from a screen reader', () => {
    edit({ slots: [right, null, null], ghosts: { 1: down } });
    const slot = screen.getByRole('img', { name: 'Slot 2, empty' });
    const ghost = within(slot).getByTestId('ghost-tile');
    expect(ghost.getAttribute('aria-hidden')).toBe('true');
    expect(ghost.className).toContain('opacity-40');
    expect(slot.dataset['ghost']).toBe('down');
    expect(screen.getByRole('img', { name: 'Slot 3, empty' }).querySelector('svg')).toBeNull();
  });

  it('shakes the strip again each time shakeKey changes', () => {
    const { rerender, container } = edit({ slots: [right], shakeKey: 0 });
    expect(container.querySelector('.card-shake')).toBeNull();
    rerender(<ProgramStrip mode="edit" slots={[right]} shakeKey={1} />);
    expect(container.querySelector('.card-shake')).not.toBeNull();
  });

  it('takes a name for the list', () => {
    edit({ slots: [right], label: 'My steps' });
    expect(screen.getByRole('list', { name: 'My steps' })).toBeTruthy();
  });
});

describe('ProgramStrip, a repeat block in edit mode', () => {
  const slots = [right, repeat(3, down, up), null];

  it('is a group named for its slot and count, with the count and loop buttons and its own body slots', () => {
    edit({ slots, onRemove: vi.fn(), onToggleRepeat: vi.fn(), onCycleTimes: vi.fn() });
    const block = within(screen.getByRole('group', { name: 'Slot 2: Repeat 3 times' }));
    expect(block.getByRole('button', { name: 'Put tiles inside slot 2' })).toBeTruthy();
    expect(
      block.getByRole('button', { name: 'Slot 2: Repeat 3 times, tap to change' }).textContent,
    ).toBe('×3');
    expect(block.getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual(
      [
        'Put tiles inside slot 2',
        'Slot 2: Repeat 3 times, tap to change',
        'Slot 2, inside the repeat: Step down',
        'Slot 2, inside the repeat: Step up',
      ],
    );
  });

  it('the count button cycles, the loop button toggles, a body tile is taken out by its path', () => {
    const onRemove = vi.fn();
    const onToggleRepeat = vi.fn();
    const onCycleTimes = vi.fn();
    edit({ slots, onRemove, onToggleRepeat, onCycleTimes });
    fireEvent.click(screen.getByRole('button', { name: 'Slot 2: Repeat 3 times, tap to change' }));
    fireEvent.click(screen.getByRole('button', { name: 'Put tiles inside slot 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Slot 2, inside the repeat: Step up' }));
    expect(onCycleTimes).toHaveBeenCalledWith(1);
    expect(onToggleRepeat).toHaveBeenCalledWith(1);
    expect(onRemove).toHaveBeenCalledWith([1, 1]);
  });

  it('the open block shows an empty dashed slot while its body has room, and is marked pressed', () => {
    const { rerender } = edit({ slots, openRepeat: 1 });
    const loop = screen.getByRole('button', { name: 'Put tiles inside slot 2' });
    expect(loop.getAttribute('aria-pressed')).toBe('true');
    expect(
      screen.getByRole('img', { name: 'Slot 2, inside the repeat, empty' }).className,
    ).toContain('border-dashed');
    expect(screen.getByRole('group', { name: 'Slot 2: Repeat 3 times' }).dataset['open']).toBe(
      'true',
    );

    rerender(<ProgramStrip mode="edit" slots={slots} openRepeat={null} />);
    expect(screen.queryByRole('img', { name: /inside the repeat, empty/ })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Put tiles inside slot 2' }).getAttribute('aria-pressed'),
    ).toBe('false');

    rerender(
      <ProgramStrip mode="edit" slots={[repeat(2, right, right, right, right)]} openRepeat={0} />,
    );
    expect(screen.queryByRole('img', { name: /inside the repeat, empty/ })).toBeNull();
  });

  it('shows "2 of 3" on the loop and glows the body tile while its iteration runs', () => {
    edit({ slots, active: { path: [1, 0], iteration: 2 }, onRemove: vi.fn() });
    expect(
      screen.getByRole('button', { name: 'Slot 2, inside the repeat: Step down' }).dataset[
        'active'
      ],
    ).toBe('true');
    const badge = screen.getByRole('button', { name: 'Slot 2: Repeat 3 times, tap to change' });
    expect(badge.textContent).toBe('2 of 3');
    expect(badge.dataset['iterating']).toBe('true');
  });

  it('a locked repeat is a flat locked block: no buttons, nothing can change', () => {
    edit({
      slots: [repeat(2, right)],
      locked: [0],
      onRemove: vi.fn(),
      onToggleRepeat: vi.fn(),
      onCycleTimes: vi.fn(),
    });
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(
      screen
        .getByRole('img', { name: 'Slot 1: Repeat 2 times, locked' })
        .querySelector('[data-testid="lock-mark"]'),
    ).not.toBeNull();
    expect(screen.getByRole('img', { name: 'Slot 1, inside the repeat: Step right' })).toBeTruthy();
  });
});

describe('ProgramStrip, read mode', () => {
  const tiles = [right, repeat(2, right, down), up];

  it('names tiles "Tile n" in display order, a repeat and each tile inside it counting', () => {
    render(<ProgramStrip mode="read" slots={tiles} />);
    expect(names()).toEqual([
      'Tile 1: Step right',
      'Tile 2: Repeat 2 times',
      'Tile 3: Step right',
      'Tile 4: Step down',
      'Tile 5: Step up',
    ]);
    // Pictures, not buttons: flat, nothing raised.
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    for (const node of screen.getAllByRole('img')) {
      expect(node.className).not.toContain('tap-raised');
    }
  });

  it("with onPick every tile, a repeat's own tile included, is a raised button giving its path", () => {
    const onPick = vi.fn<(path: readonly number[]) => void>();
    render(<ProgramStrip mode="read" slots={tiles} onPick={onPick} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);
    for (const button of buttons) expect(button.className).toContain('tap-raised');
    for (const button of buttons) fireEvent.click(button);
    expect(onPick.mock.calls.map(([path]) => path)).toEqual([[0], [1], [1, 0], [1, 1], [2]]);
  });

  it('marks a tile: grey and not tappable, pulsing, shaking, the bug', () => {
    const onPick = vi.fn();
    render(
      <ProgramStrip
        mode="read"
        slots={[right, down, up, right]}
        onPick={onPick}
        status={(path) => {
          switch (path[0]) {
            case 0:
              return { dim: true };
            case 1:
              return { flash: true };
            case 2:
              return { wrong: 2 };
            default:
              return { bug: true };
          }
        }}
      />,
    );
    const dim = screen.getByRole('button', { name: 'Tile 1: Step right' });
    expect(dim.hasAttribute('disabled')).toBe(true);
    expect(dim.className).toContain('opacity-40');
    fireEvent.click(dim);
    expect(onPick).not.toHaveBeenCalled();

    expect(screen.getByRole('button', { name: 'Tile 2: Step down' }).className).toContain(
      'animate-pulse',
    );
    const wrong = screen.getByRole('button', { name: 'Tile 3: Step up' });
    expect(wrong.className).toContain('card-shake');
    expect(wrong.className).toContain('border-today');
    expect(wrong.dataset['wrong']).toBe('true');

    const bug = screen.getByRole('button', { name: 'Tile 4: Step right, the bug' });
    expect(bug.className).toContain('border-today');
    expect(bug.querySelector('[data-testid="bug-mark"]')).not.toBeNull();
  });

  it('restarts the shake of the same tile when it is tapped wrong again (the count keys the tile)', () => {
    const { rerender } = render(
      <ProgramStrip mode="read" slots={[right]} onPick={vi.fn()} status={() => ({ wrong: 1 })} />,
    );
    const before = screen.getByRole('button', { name: 'Tile 1: Step right' });
    rerender(
      <ProgramStrip mode="read" slots={[right]} onPick={vi.fn()} status={() => ({ wrong: 2 })} />,
    );
    expect(screen.getByRole('button', { name: 'Tile 1: Step right' })).not.toBe(before);
  });

  it("marks a repeat's own tile as the bug", () => {
    render(
      <ProgramStrip
        mode="read"
        slots={[repeat(4, right)]}
        onPick={vi.fn()}
        status={(path) => (path.length === 1 ? { bug: true } : {})}
      />,
    );
    const header = screen.getByRole('button', { name: 'Tile 1: Repeat 4 times, the bug' });
    expect(header.querySelector('[data-testid="bug-mark"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Tile 2: Step right' })).toBeTruthy();
  });

  it('glows the running tile and shows the loop badge in read mode too', () => {
    render(<ProgramStrip mode="read" slots={tiles} active={{ path: [1, 1], iteration: 2 }} />);
    expect(screen.getByRole('img', { name: 'Tile 4: Step down' }).dataset['active']).toBe('true');
    expect(screen.getByRole('img', { name: 'Tile 2: Repeat 2 times' }).textContent).toBe('2 of 2');
  });
});
