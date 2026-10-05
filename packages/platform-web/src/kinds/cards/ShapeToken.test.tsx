import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  SHAPE_COLOURS,
  SHAPE_KINDS,
  SHAPE_SIZES,
  type CardShape,
} from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import { clusterColumns, SHAPE_PATHS, SHAPE_SIZE_SCALE, shapeBoxSide } from './shape-geometry.ts';
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
    const big = (container.querySelector('[data-gap]') as HTMLElement).style.getPropertyValue(
      '--box-side',
    );
    const compact = (
      render(<ShapeRow shapes={row} compact />).container.querySelector('[data-gap]') as HTMLElement
    ).style.getPropertyValue('--box-side');
    // A row of 5 or fewer tokens has room for 7 rem boxes; the compact Story row keeps its 2.25 rem.
    expect(big).toContain('min(7rem');
    expect(compact).toContain('min(2.25rem');
    expect(compact).not.toContain('7rem');
  });

  it('keeps the 4 rem cap from 6 tokens up and takes 7 rem up to 5, whatever the tokens are', () => {
    const tokens = (count: number): CardShape[] =>
      Array.from({ length: count }, (_unused, index) => ({
        kind: SHAPE_KINDS[index % SHAPE_KINDS.length] ?? 'circle',
        colour: SHAPE_COLOURS[index % SHAPE_COLOURS.length] ?? 'red',
      }));
    const capOf = (count: number): string | undefined => {
      const { container } = render(<ShapeRow shapes={tokens(count)} />);
      const box = container.querySelector('[class*="w-(--box-side)"]') as HTMLElement;
      return /^min\(([\d.]+rem)/.exec(box.style.getPropertyValue('--box-side'))?.[1];
    };
    expect([1, 2, 3, 4, 5].map(capOf)).toEqual(Array(5).fill('7rem'));
    expect([6, 7, 8].map(capOf)).toEqual(Array(3).fill('4rem'));
  });

  describe('clusters', () => {
    const group = { kind: 'diamond', colour: 'blue', count: 2 } as const;
    const single = { kind: 'circle', colour: 'red' } as const;

    it('puts every cluster (a token with a count above 1) on its own tile: card-tinted, a 1 px border, padding of 8 % of the box', () => {
      const { container } = render(<ShapeRow shapes={[group, group, group]} />);
      const tiles = container.querySelectorAll('[data-tile]');
      expect(tiles).toHaveLength(3);
      for (const tile of tiles) {
        expect(tile.className).toContain('rounded-2xl');
        expect(tile.className).toContain('border border-line');
        expect(tile.className).toContain('bg-cream');
        expect(tile.className).toContain('p-[calc(var(--box-side)*0.08)]');
        expect(tile.querySelectorAll('svg')).toHaveLength(2);
      }
    });

    it('spaces the tiles 0.75 rem apart, in the gap class and in the box side that counts the gaps', () => {
      const { container } = render(<ShapeRow shapes={[group, group, group]} />);
      expect(container.firstElementChild?.className).toContain('gap-3');
      expect(container.firstElementChild?.className).not.toContain('gap-2');
      expect(
        (container.querySelector('[data-tile]') as HTMLElement).style.getPropertyValue(
          '--box-side',
        ),
      ).toBe('min(7rem, calc((100% - 0.75rem * 2) / 3))');
      expect(shapeBoxSide(3, false, true)).toBe('min(7rem, calc((100% - 0.75rem * 2) / 3))');
      expect(shapeBoxSide(7, false, true)).toBe('min(4rem, calc((100% - 0.75rem * 6) / 7))');
    });

    it('tiles every token of a row that has a cluster, a single shape too (a growing pattern 1, 3, 5), the gap staying a dashed box', () => {
      const { container } = render(<ShapeRow shapes={[single, group, 'gap']} />);
      expect(container.querySelectorAll('[data-tile]')).toHaveLength(2);
      expect(container.querySelectorAll('[data-gap]')).toHaveLength(1);
      expect(container.firstElementChild?.className).toContain('gap-3');
      expect(container.querySelector('[data-tile] [data-shape="circle"]')).not.toBeNull();
    });

    it('draws a row of single shapes as before: no tiles, 0.5 rem gaps', () => {
      const { container } = render(<ShapeRow shapes={[single, single, 'gap']} />);
      expect(container.querySelectorAll('[data-tile]')).toHaveLength(0);
      expect(container.firstElementChild?.className).toContain('gap-2');
      expect(container.firstElementChild?.className).not.toContain('gap-3');
      expect(shapeBoxSide(3, false)).toBe('min(7rem, calc((100% - 0.5rem * 2) / 3))');
    });

    it('keeps the compact Story row plain: no tiles, 0.25 rem gaps, 2.25 rem boxes', () => {
      const { container } = render(<ShapeRow shapes={[group, group, group]} compact />);
      expect(container.querySelectorAll('[data-tile]')).toHaveLength(0);
      expect(container.firstElementChild?.className).toContain('gap-1');
      expect(shapeBoxSide(3, true, true)).toBe('min(2.25rem, calc((100% - 0.25rem * 2) / 3))');
    });
  });
});

describe('ShapeRow at 390 px', () => {
  const token = (index: number): CardShape => ({
    kind: SHAPE_KINDS[index % SHAPE_KINDS.length] ?? 'circle',
    colour: SHAPE_COLOURS[index % SHAPE_COLOURS.length] ?? 'red',
  });
  const eight = [...Array.from({ length: 7 }, (_unused, index) => token(index)), 'gap' as const];

  /** Evaluates a box side `min(Mrem, calc((100% - Grem * K) / N))` for a row `width` px wide (1 rem = 16 px), or NaN. */
  function sidePx(style: string, width: number): number {
    const match =
      /^min\(([\d.]+)rem, calc\(\(100% - ([\d.]+)rem \* (\d+)\) \/ (\d+)\)\)$/.exec(style) ?? [];
    const [max, gap, gaps, count] = match.slice(1).map(Number);
    if (max === undefined || gap === undefined || gaps === undefined || count === undefined) {
      return Number.NaN;
    }
    return Math.min(max * 16, (width - gap * 16 * gaps) / count);
  }

  it('never wraps: one nowrap line as wide as its host, however many tokens (1, 5, 8)', () => {
    for (const count of [1, 5, 8]) {
      const shapes = Array.from({ length: count }, (_unused, index) => token(index));
      const { container } = render(<ShapeRow shapes={shapes} />);
      const classes = container.firstElementChild?.className ?? '';
      expect(classes, String(count)).toContain('flex-nowrap');
      expect(classes, String(count)).not.toContain('flex-wrap');
      expect(classes, String(count)).toContain('w-full');
    }
  });

  it('gives every box of an 8-token row the side min(4rem, (row width − 7 gaps) / 8), gap box included', () => {
    const { container } = render(<ShapeRow shapes={eight} />);
    const boxes = [...(container.firstElementChild?.children ?? [])] as HTMLElement[];
    expect(boxes).toHaveLength(8);
    for (const box of boxes) {
      expect(box.style.getPropertyValue('--box-side')).toBe(
        'min(4rem, calc((100% - 0.5rem * 7) / 8))',
      );
      expect(box.className).toContain('w-(--box-side)');
      expect(box.className).toContain('aspect-square');
    }
    expect(shapeBoxSide(8, false)).toBe('min(4rem, calc((100% - 0.5rem * 7) / 8))');
    expect(shapeBoxSide(8, true)).toBe('min(2.25rem, calc((100% - 0.25rem * 7) / 8))');
  });

  it('fits the row on a 390 px phone (358 px between the 16 px gutters): 8 boxes and 7 gaps add up to at most the row, and boxes reach 4 rem when there is room', () => {
    const width = 390 - 2 * 16;
    const eightSide = sidePx(shapeBoxSide(8, false), width);
    expect(eightSide).toBeCloseTo(37.75, 2);
    expect(8 * eightSide + 7 * 8).toBeLessThanOrEqual(width);
    // 5 tokens: (358 - 32) / 5 = 65.2, below the 7 rem cap (112), so a row of 5 uses the whole line; 6 tokens keep the 4 rem cap.
    expect(sidePx(shapeBoxSide(5, false), width)).toBeCloseTo(65.2, 2);
    expect(sidePx(shapeBoxSide(6, false), width)).toBe(Math.min(64, (width - 40) / 6));
    for (let count = 1; count <= 8; count += 1) {
      const side = sidePx(shapeBoxSide(count, false), width);
      expect(side, String(count)).toBeLessThanOrEqual(count <= 5 ? 112 : 64);
      expect(count * side + (count - 1) * 8, String(count)).toBeLessThanOrEqual(width + 0.001);
      const compact = sidePx(shapeBoxSide(count, true), width);
      expect(compact, String(count)).toBeLessThanOrEqual(36);
      expect(count * compact + (count - 1) * 4, String(count)).toBeLessThanOrEqual(width + 0.001);
    }
  });

  it('sizes the boxes of a row to the card: at 1024 x 768 (a 568 px row) 3 groups are 112 px tiles and 5 single shapes about 107 px (were 64); at 390 x 844 (a 316 px row) 5 groups are tiles of at least 48 px', () => {
    const tablet = 568;
    const phone = 316;
    expect(sidePx(shapeBoxSide(3, false, true), tablet)).toBe(112);
    expect(sidePx(shapeBoxSide(5, false), tablet)).toBeCloseTo(107.2, 1);
    expect(sidePx(shapeBoxSide(8, false), tablet)).toBe(64);
    expect(sidePx(shapeBoxSide(5, false, true), phone)).toBeCloseTo(53.6, 1);
    expect(sidePx(shapeBoxSide(5, false, true), phone)).toBeGreaterThanOrEqual(48);
    // Every row of up to 8 tokens, with or without clusters, fits one line on the phone.
    for (let count = 1; count <= 8; count += 1) {
      for (const clusters of [false, true]) {
        const side = sidePx(shapeBoxSide(count, false, clusters), phone);
        const gap = clusters ? 12 : 8;
        expect(
          count * side + (count - 1) * gap,
          `${String(count)} ${String(clusters)}`,
        ).toBeLessThanOrEqual(phone + 0.001);
      }
    }
  });

  it('shrinks the "?" of the gap with a crowded row, and keeps the gap box square whatever the text', () => {
    const textOf = (count: number, compact = false): string => {
      const shapes = [
        ...Array.from({ length: count - 1 }, (_unused, index) => token(index)),
        'gap' as const,
      ];
      const { container } = render(<ShapeRow shapes={shapes} compact={compact} />);
      return container.querySelector('[data-gap]')?.className ?? '';
    };
    expect(textOf(3)).toContain('text-5xl');
    expect(textOf(5)).toContain('text-4xl');
    expect(textOf(6)).toContain('text-2xl');
    expect(textOf(8)).toContain('text-lg');
    expect(textOf(3, true)).toContain('text-xl');
    expect(textOf(6, true)).toContain('text-base');
    expect(textOf(8, true)).toContain('text-xs');
    for (const count of [1, 4, 8]) {
      const classes = textOf(count);
      expect(classes).toContain('aspect-square');
      expect(classes).toContain('min-h-0');
      expect(classes).toContain('overflow-hidden');
      expect(classes).toContain('leading-none');
    }
  });
});
