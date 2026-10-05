import { describe, expect, it } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import type { ContentText } from '../../content-text.ts';
import { tContent } from '../../content-text.ts';
import { createCardI18n, renderCardUi } from '../../testing/card-test-entry.tsx';
import { CardPromptView } from './CardPromptView.tsx';
import { CardTile } from './CardTile.tsx';
import { cardItemLabel, humanize, shapeLabel, shapeRowLabel } from './item-label.ts';

const ART = { fox: '/art/fox-card.webp' };
const text = (key: string): string => `<${key}>`;

describe('CardPromptView', () => {
  it('draws the emoji at 96 px, the big text at 3 rem and up, and the image from the pack art', async () => {
    const { container } = await renderCardUi(
      <CardPromptView prompt={{ emoji: '🍎🍎🍎', big: '7 + 5', image: 'fox' }} />,
      ART,
    );
    expect(screen.getByText('🍎🍎🍎').className).toContain('text-[96px]');
    const big = screen.getByText('7 + 5');
    expect(big.className).toContain('text-5xl');
    expect(big.className).toContain('font-bold');
    const image = screen.getByRole('img', { name: 'fox' });
    expect(image.getAttribute('src')).toBe('/art/fox-card.webp');
    expect(container.firstElementChild?.className).toContain('h-full');
  });

  it('shows only what the prompt has', async () => {
    const { container } = await renderCardUi(<CardPromptView prompt={{ big: '3' }} />);
    expect(screen.getByText('3')).toBeTruthy();
    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect(container.querySelectorAll('p')).toHaveLength(1);
  });

  it('falls back to the platform art for an image the pack lacks', async () => {
    await renderCardUi(<CardPromptView prompt={{ image: 'owl' }} />);
    expect(screen.getByRole('img', { name: 'owl' }).getAttribute('src')).toContain('owl');
  });

  it('draws a smaller card for the Story step', async () => {
    await renderCardUi(<CardPromptView prompt={{ emoji: '🍎', big: '1' }} compact />);
    expect(screen.getByText('🍎').className).toContain('text-5xl');
    expect(screen.getByText('🍎').className).not.toContain('text-[96px]');
    expect(screen.getByText('1').className).toContain('text-2xl');
  });
});

describe('CardPromptView shapes', () => {
  const ROW = [
    { kind: 'circle', colour: 'red' },
    { kind: 'square', colour: 'blue' },
    { kind: 'circle', colour: 'red' },
    'gap',
  ] as const;

  it('draws the row as one image named by its tokens, the tokens and the gap hidden inside it', async () => {
    const { container } = await renderCardUi(<CardPromptView prompt={{ shapes: ROW }} />);
    const row = screen.getByRole('img', {
      name: 'Row of shapes: red circle, blue square, red circle, a gap',
    });
    expect(row.querySelectorAll('svg')).toHaveLength(3);
    expect(row.querySelector('[data-gap]')?.textContent).toBe('?');
    expect(container.querySelector('p')).toBeNull();
    for (const svg of row.querySelectorAll('svg'))
      expect(svg.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('puts the row above the big text and below the emoji', async () => {
    const { container } = await renderCardUi(
      <CardPromptView prompt={{ emoji: '🍎', big: 'AB?', shapes: ROW }} />,
    );
    const order = [...container.querySelectorAll('p, [role="img"]')].map(
      (node) => node.getAttribute('role') ?? node.textContent,
    );
    expect(order).toEqual(['🍎', 'img', 'AB?']);
  });

  it('draws a smaller row for the Story step', async () => {
    const { container } = await renderCardUi(<CardPromptView prompt={{ shapes: ROW }} compact />);
    expect(
      (container.querySelector('[data-gap]') as HTMLElement).style.getPropertyValue('--box-side'),
    ).toContain('min(2.25rem');
  });

  it('draws no row without shapes', async () => {
    await renderCardUi(<CardPromptView prompt={{ big: '3' }} />);
    expect(screen.queryByRole('img')).toBeNull();
  });
});

describe('CardTile', () => {
  it('draws the emoji, big text and image hidden from assistive technology, then the text', async () => {
    const { container } = await renderCardUi(
      <CardTile item={{ id: 'a', emoji: '🍎', big: '3', image: 'fox' }} text="Three" />,
      ART,
    );
    expect(screen.getByText('🍎').getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText('3').getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('img')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/art/fox-card.webp');
    expect(screen.getByText('Three').getAttribute('aria-hidden')).toBeNull();
  });

  it('draws the shape cluster hidden from assistive technology, above the text', async () => {
    const { container } = await renderCardUi(
      <CardTile
        item={{ id: 'a', shape: { kind: 'star', colour: 'yellow', count: 3 } }}
        text="Stars"
      />,
    );
    expect(container.querySelectorAll('svg')).toHaveLength(3);
    const cluster = container.querySelector('[data-count]');
    expect(cluster?.getAttribute('aria-hidden')).toBe('true');
    const parts = [...(container.firstElementChild?.children ?? [])];
    expect(parts.map((part) => part.textContent)).toEqual(['', 'Stars']);
    expect(parts[0]).toBe(cluster);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('draws no text unless given one', async () => {
    const { container } = await renderCardUi(<CardTile item={{ id: 'a', big: '3' }} />);
    expect(container.textContent).toBe('3');
  });

  it('draws a smaller face when compact (a card placed in a box), the full one by default', async () => {
    const item = {
      id: 'a',
      emoji: '🍎',
      big: '3',
      image: 'fox',
      shape: { kind: 'star', colour: 'yellow' },
    } as const;
    const full = await renderCardUi(<CardTile item={item} text="Apples" />, ART);
    expect(full.container.firstElementChild?.getAttribute('data-compact')).toBeNull();
    expect(screen.getByText('🍎').className).toContain('text-5xl');
    expect(screen.getByText('3').className).toContain('text-4xl');
    expect(full.container.querySelector('img')?.className).toContain('h-12');
    expect(full.container.querySelector('[data-count]')?.className).toContain('h-14');
    expect(screen.getByText('Apples').className).toContain('text-sm');
    cleanup();
    const small = await renderCardUi(<CardTile item={item} text="Apples" compact />, ART);
    expect(small.container.firstElementChild?.getAttribute('data-compact')).toBe('true');
    expect(screen.getByText('🍎').className).toContain('text-3xl');
    expect(screen.getByText('3').className).toContain('text-2xl');
    expect(small.container.querySelector('img')?.className).toContain('h-8');
    expect(small.container.querySelector('[data-count]')?.className).toContain('h-8');
    expect(screen.getByText('Apples').className).toContain('text-xs');
  });

  it('draws a count cluster of a placed card in a 2.5 rem box (a 2 x 2 cluster keeps its tokens at 20 px), a single token in 2 rem', async () => {
    const cluster = (count: number) =>
      ({ id: 'a', shape: { kind: 'heart', colour: 'red', count } }) as const;
    const boxOf = async (count: number, compact: boolean): Promise<string> => {
      const view = await renderCardUi(<CardTile item={cluster(count)} compact={compact} />);
      const box = view.container.querySelector('[data-count]')?.className ?? '';
      cleanup();
      return box;
    };
    expect(await boxOf(1, true)).toContain('h-8 w-8');
    for (const count of [2, 4, 5, 9]) {
      expect(await boxOf(count, true), String(count)).toContain('h-10 w-10');
    }
    // The normal face keeps its box whatever the count.
    expect(await boxOf(5, false)).toContain('h-14 w-14');
  });

  it('draws the normal face with a 3.25 rem shape box on a phone when dense (the 56 px pool tile), 3.5 rem from `sm`', async () => {
    const item = { id: 'a', shape: { kind: 'star', colour: 'yellow' }, emoji: '🍎' } as const;
    const dense = await renderCardUi(<CardTile item={item} dense />);
    const box = dense.container.querySelector('[data-count]')?.className ?? '';
    expect(box).toContain('h-[3.25rem] w-[3.25rem]');
    expect(box).toContain('sm:h-14 sm:w-14');
    expect(screen.getByText('🍎').className).toContain('text-5xl');
    cleanup();
    // `compact` and `large` win over `dense`.
    const compact = await renderCardUi(<CardTile item={item} dense compact />);
    expect(compact.container.querySelector('[data-count]')?.className).toContain('h-8 w-8');
  });

  it('draws about twice the normal face when large (a choice option with no prompt); a long big text stays smaller', async () => {
    const item = {
      id: 'a',
      emoji: '🍎',
      big: '3',
      image: 'fox',
      shape: { kind: 'star', colour: 'yellow' },
    } as const;
    const large = await renderCardUi(<CardTile item={item} large />, ART);
    expect(large.container.firstElementChild?.getAttribute('data-large')).toBe('true');
    expect(screen.getByText('🍎').className).toContain('text-7xl');
    expect(screen.getByText('3').className).toContain('text-6xl');
    expect(large.container.querySelector('img')?.className).toContain('h-24');
    expect(large.container.querySelector('[data-count]')?.className).toContain('h-28');
    cleanup();
    const sum = await renderCardUi(<CardTile item={{ id: 'b', big: '28 + 82' }} large />, ART);
    expect(screen.getByText('28 + 82').className).toContain('text-4xl');
    expect(sum.container.querySelector('[data-large]')).not.toBeNull();
    cleanup();
    const normal = await renderCardUi(<CardTile item={item} />, ART);
    expect(normal.container.firstElementChild?.getAttribute('data-large')).toBeNull();
  });
});

describe('cardItemLabel', () => {
  it('names a card by its text, else its big text, else its emoji, else its id as words', () => {
    expect(cardItemLabel({ id: 'a', textKey: 'lessons:apple', big: '1', emoji: '🍎' }, text)).toBe(
      '<lessons:apple>',
    );
    expect(cardItemLabel({ id: 'a', big: '1', emoji: '🍎' }, text)).toBe('1');
    expect(cardItemLabel({ id: 'a', emoji: '🍎', image: 'fox' }, text)).toBe('🍎');
    expect(cardItemLabel({ id: 'ice-cream', image: 'fox' }, text)).toBe('ice cream');
  });

  it('humanizes an id', () => {
    expect(humanize('a-b-c')).toBe('a b c');
    expect(humanize('fox')).toBe('fox');
  });
});

describe('shape labels', () => {
  async function texts(): Promise<ContentText> {
    const i18n = await createCardI18n();
    return (key, options) => tContent(i18n.t, key, options);
  }

  it('names a shape by number, size, colour and kind: "3 small red circles"', async () => {
    const t = await texts();
    expect(shapeLabel(t, { kind: 'circle', colour: 'red', size: 'small', count: 3 })).toBe(
      '3 small red circles',
    );
  });

  it('omits the size word for the default size, and the number for one', async () => {
    const t = await texts();
    expect(shapeLabel(t, { kind: 'square', colour: 'blue', size: 'big' })).toBe('blue square');
    expect(shapeLabel(t, { kind: 'square', colour: 'blue' })).toBe('blue square');
    expect(shapeLabel(t, { kind: 'square', colour: 'blue', count: 1 })).toBe('blue square');
    expect(shapeLabel(t, { kind: 'square', colour: 'blue', size: 'big', count: 2 })).toBe(
      '2 blue squares',
    );
  });

  it('says the size of a one-shape token when it is not the default', async () => {
    const t = await texts();
    expect(shapeLabel(t, { kind: 'star', colour: 'yellow', size: 'tiny' })).toBe(
      'tiny yellow star',
    );
    expect(shapeLabel(t, { kind: 'heart', colour: 'green', size: 'medium' })).toBe(
      'medium green heart',
    );
    expect(shapeLabel(t, { kind: 'diamond', colour: 'purple', size: 'huge' })).toBe(
      'huge purple diamond',
    );
  });

  it('has a one / other form for every kind and a word for every colour and size', async () => {
    const t = await texts();
    const kinds = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond'] as const;
    for (const kind of kinds) {
      const one = shapeLabel(t, { kind, colour: 'red' });
      const two = shapeLabel(t, { kind, colour: 'red', count: 2 });
      expect(one, kind).toBe(`red ${kind}`);
      expect(two, kind).toBe(`2 red ${kind}s`);
    }
    for (const colour of ['red', 'blue', 'yellow', 'green', 'purple', 'orange'] as const) {
      expect(shapeLabel(t, { kind: 'circle', colour }), colour).toBe(`${colour} circle`);
    }
    for (const size of ['tiny', 'small', 'medium', 'huge'] as const) {
      expect(shapeLabel(t, { kind: 'circle', colour: 'red', size }), size).toBe(
        `${size} red circle`,
      );
    }
    expect(t('cards.shape.size.big')).toBe('big');
  });

  it('names a row by its tokens joined with ", ", a gap as "a gap"', async () => {
    const t = await texts();
    expect(
      shapeRowLabel(t, [
        { kind: 'circle', colour: 'red' },
        { kind: 'square', colour: 'blue', size: 'small', count: 2 },
        'gap',
      ]),
    ).toBe('Row of shapes: red circle, 2 small blue squares, a gap');
    expect(shapeRowLabel(t, ['gap'])).toBe('Row of shapes: a gap');
  });

  it('names a card by its text, else its big text, else its shape, else its emoji, else its id', async () => {
    const t = await texts();
    const shape = { kind: 'circle', colour: 'red', count: 3 } as const;
    expect(
      cardItemLabel({ id: 'a', textKey: 'cards.shape.gap', big: '1', shape, emoji: '🍎' }, t),
    ).toBe('a gap');
    expect(cardItemLabel({ id: 'a', big: '1', shape, emoji: '🍎' }, t)).toBe('1');
    expect(cardItemLabel({ id: 'a', shape, emoji: '🍎', image: 'fox' }, t)).toBe('3 red circles');
    expect(cardItemLabel({ id: 'a', emoji: '🍎' }, t)).toBe('🍎');
  });
});
