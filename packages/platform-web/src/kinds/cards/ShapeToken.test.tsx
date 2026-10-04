import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  SHAPE_COLOURS,
  SHAPE_KINDS,
  SHAPE_SIZES,
} from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import { clusterColumns, SHAPE_PATHS, SHAPE_SIZE_SCALE } from './shape-geometry.ts';
import { ShapeCluster, ShapeRow, ShapeToken } from './ShapeToken.tsx';

describe('ShapeToken', () => {
  it('draws one path per kind in a 100 x 100 box, and the six paths differ', () => {
    for (const kind of SHAPE_KINDS) {
      const { container } = render(<ShapeToken kind={kind} colour="red" />);
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('viewBox'), kind).toBe('0 0 100 100');
      const paths = container.querySelectorAll('path');
      expect(paths, kind).toHaveLength(1);
      expect(paths[0]?.getAttribute('d'), kind).toBe(SHAPE_PATHS[kind]);
    }
    expect(new Set(Object.values(SHAPE_PATHS)).size).toBe(SHAPE_KINDS.length);
    expect(Object.keys(SHAPE_PATHS)).toEqual([...SHAPE_KINDS]);
  });

  it('fills with the colour token under the dark outline, for every colour', () => {
    for (const colour of SHAPE_COLOURS) {
      const { container } = render(<ShapeToken kind="heart" colour={colour} />);
      const style = container.querySelector('path')?.getAttribute('style') ?? '';
      expect(style, colour).toContain(`fill: var(--color-shape-${colour})`);
      expect(style, colour).toContain('stroke: var(--color-ink)');
    }
  });

  it('is hidden from assistive technology', () => {
    const { container } = render(<ShapeToken kind="star" colour="yellow" />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('svg')?.getAttribute('focusable')).toBe('false');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('scales the drawing to 0.5 / 0.62 / 0.75 / 0.88 / 1 of the box by size, big by default', () => {
    expect(SHAPE_SIZE_SCALE).toEqual({ tiny: 0.5, small: 0.62, medium: 0.75, big: 0.88, huge: 1 });
    expect(Object.keys(SHAPE_SIZE_SCALE)).toEqual([...SHAPE_SIZES]);
    for (const size of SHAPE_SIZES) {
      const { container } = render(<ShapeToken kind="square" colour="blue" size={size} />);
      const transform = container.querySelector('g')?.getAttribute('transform');
      expect(transform, size).toBe(
        `translate(50 50) scale(${String(SHAPE_SIZE_SCALE[size])}) translate(-50 -50)`,
      );
      expect(container.querySelector('svg')?.getAttribute('data-size')).toBe(size);
    }
    const { container } = render(<ShapeToken kind="square" colour="blue" />);
    expect(container.querySelector('g')?.getAttribute('transform')).toContain('scale(0.88)');
  });

  it('fills its parent unless given sizing classes', () => {
    const { container } = render(<ShapeToken kind="circle" colour="red" className="h-8 w-8" />);
    expect(container.querySelector('svg')?.getAttribute('class')).toBe('h-8 w-8');
    const plain = render(<ShapeToken kind="circle" colour="red" />);
    expect(plain.container.querySelector('svg')?.getAttribute('class')).toBe('h-full w-full');
  });
});

describe('ShapeCluster', () => {
  it('draws count copies, 1 to 9, one svg each', () => {
    for (let count = 1; count <= 9; count += 1) {
      const { container } = render(<ShapeCluster shape={{ kind: 'star', colour: 'red', count }} />);
      expect(container.querySelectorAll('svg'), String(count)).toHaveLength(count);
      expect(container.querySelector('[data-count]')?.getAttribute('data-count')).toBe(
        String(count),
      );
    }
  });

  it('draws one when there is no count, and passes kind, colour and size to every copy', () => {
    const { container } = render(<ShapeCluster shape={{ kind: 'heart', colour: 'green' }} />);
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    const many = render(
      <ShapeCluster shape={{ kind: 'heart', colour: 'green', size: 'small', count: 3 }} />,
    );
    for (const svg of many.container.querySelectorAll('svg')) {
      expect(svg.getAttribute('data-shape')).toBe('heart');
      expect(svg.getAttribute('data-colour')).toBe('green');
      expect(svg.getAttribute('data-size')).toBe('small');
    }
  });

  it('lays out at most 3 x 3: 1 column for one, 2 for 2-4, 3 for 5-9', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map(clusterColumns)).toEqual([1, 2, 2, 2, 3, 3, 3, 3, 3]);
    for (const [count, width] of [
      [1, '100%'],
      [3, '50%'],
      [4, '50%'],
      [9, `${String(100 / 3)}%`],
    ] as const) {
      const { container } = render(
        <ShapeCluster shape={{ kind: 'circle', colour: 'blue', count }} />,
      );
      const cell = container.querySelector('svg')?.parentElement as HTMLElement;
      expect(cell.style.width, String(count)).toBe(width);
    }
  });

  it('is hidden from assistive technology, and sized by the class given', () => {
    const { container } = render(
      <ShapeCluster shape={{ kind: 'circle', colour: 'blue', count: 2 }} className="h-20 w-20" />,
    );
    const box = container.firstElementChild;
    expect(box?.getAttribute('aria-hidden')).toBe('true');
    expect(box?.className).toContain('h-20 w-20');
    expect(screen.queryByRole('img')).toBeNull();
  });
});

describe('ShapeRow', () => {
  const row = [
    { kind: 'circle', colour: 'red' },
    { kind: 'square', colour: 'blue' },
    'gap',
  ] as const;

  it('draws a token per shape and a dashed "?" box for the gap, in order', () => {
    const { container } = render(<ShapeRow shapes={row} />);
    expect(container.querySelectorAll('svg')).toHaveLength(2);
    const gaps = container.querySelectorAll('[data-gap]');
    expect(gaps).toHaveLength(1);
    expect(gaps[0]?.textContent).toBe('?');
    expect(gaps[0]?.className).toContain('border-dashed');
    expect(gaps[0]?.className).toContain('rounded-2xl');
    const order = [...container.querySelectorAll('svg, [data-gap]')].map((node) =>
      node.tagName === 'svg' ? node.getAttribute('data-shape') : 'gap',
    );
    expect(order).toEqual(['circle', 'square', 'gap']);
  });

  it('draws a gap on its own, and a token with a count as a cluster', () => {
    const only = render(<ShapeRow shapes={['gap']} />);
    expect(only.container.querySelectorAll('svg')).toHaveLength(0);
    expect(only.container.querySelectorAll('[data-gap]')).toHaveLength(1);
    const counted = render(<ShapeRow shapes={[{ kind: 'star', colour: 'red', count: 4 }]} />);
    expect(counted.container.querySelectorAll('svg')).toHaveLength(4);
  });

  it('is hidden from assistive technology (the prompt names the row) and smaller when compact', () => {
    const { container } = render(<ShapeRow shapes={row} />);
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByRole('img')).toBeNull();
    const big = container.querySelector('[data-gap]')?.className ?? '';
    const compact = render(<ShapeRow shapes={row} compact />).container.querySelector(
      '[data-gap]',
    )?.className;
    expect(big).toContain('h-12');
    expect(compact).toContain('h-9');
    expect(compact).not.toContain('h-12');
  });
});
