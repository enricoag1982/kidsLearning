import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { PRIMITIVE_KINDS } from '../../core/tiles.ts';
import type { TileKind } from '../../core/tiles.ts';
import { TileIcon } from './TileIcon.tsx';

const KINDS: readonly TileKind[] = [...PRIMITIVE_KINDS, 'repeat'];

describe('TileIcon', () => {
  it.each(KINDS)('draws %s as a decorative 40 px svg with no text', (kind) => {
    const { container } = render(<TileIcon kind={kind} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('data-tile-icon')).toBe(kind);
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('width')).toBe('40');
    expect(svg?.getAttribute('height')).toBe('40');
    expect(container.textContent).toBe('');
    expect(container.querySelectorAll('path, circle').length).toBeGreaterThan(0);
  });

  it('draws the four step arrows as one arrow turned 0 / 90 / 180 / 270 degrees', () => {
    const turns = (['up', 'right', 'down', 'left'] as const).map((kind) => {
      const { container } = render(<TileIcon kind={kind} />);
      return container.querySelector('path')?.getAttribute('transform');
    });
    expect(turns).toEqual([
      'rotate(0 20 20)',
      'rotate(90 20 20)',
      'rotate(180 20 20)',
      'rotate(270 20 20)',
    ]);
  });

  it('mirrors the right turn for the left turn', () => {
    const left = render(<TileIcon kind="turn-left" />).container.querySelector('g');
    const right = render(<TileIcon kind="turn-right" />).container.querySelector('g');
    expect(left?.getAttribute('transform')).toBe('translate(40 0) scale(-1 1)');
    expect(right?.getAttribute('transform')).toBeNull();
  });

  it.each(KINDS)('never shrinks inside a flex row: %s carries flex-none', (kind) => {
    const { container } = render(<TileIcon kind={kind} />);
    expect(container.querySelector('svg')?.classList.contains('flex-none')).toBe(true);
  });

  it('takes a size', () => {
    const { container } = render(<TileIcon kind="up" size={24} />);
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('24');
  });
});
