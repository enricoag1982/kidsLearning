import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { TileTray } from './TileTray.tsx';

describe('TileTray', () => {
  it('has one button per kind, named for a screen reader (a repeat is just "Repeat")', () => {
    render(
      <TileTray
        kinds={[
          'up',
          'down',
          'left',
          'right',
          'forward',
          'turn-left',
          'turn-right',
          'jump',
          'repeat',
        ]}
        onAdd={vi.fn()}
      />,
    );
    const tray = within(screen.getByRole('group', { name: 'Tiles' }));
    expect(tray.getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual([
      'Step up',
      'Step down',
      'Step left',
      'Step right',
      'Step forward',
      'Turn left',
      'Turn right',
      'Jump',
      'Repeat',
    ]);
  });

  it('makes every button at least 64 px (h-16 w-16), raised, with a 40 px icon', () => {
    const { container } = render(<TileTray kinds={['up', 'repeat']} onAdd={vi.fn()} />);
    for (const button of screen.getAllByRole('button')) {
      expect(button.className).toContain('h-16');
      expect(button.className).toContain('w-16');
      expect(button.className).toContain('tap-raised');
    }
    expect(container.querySelectorAll('svg[width="40"]')).toHaveLength(2);
  });

  it('a tap adds that kind', () => {
    const onAdd = vi.fn();
    render(<TileTray kinds={['up', 'repeat']} onAdd={onAdd} />);
    fireEvent.click(screen.getByRole('button', { name: 'Step up' }));
    fireEvent.click(screen.getByRole('button', { name: 'Repeat' }));
    expect(onAdd.mock.calls).toEqual([['up'], ['repeat']]);
  });

  it('is disabled while a run plays', () => {
    const onAdd = vi.fn();
    render(<TileTray kinds={['up']} onAdd={onAdd} disabled />);
    const button = screen.getByRole('button', { name: 'Step up' });
    expect(button.hasAttribute('disabled')).toBe(true);
    fireEvent.click(button);
    expect(onAdd).not.toHaveBeenCalled();
  });
});
