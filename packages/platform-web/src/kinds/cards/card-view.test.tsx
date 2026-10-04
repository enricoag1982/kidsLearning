import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderCardUi } from '../../testing/card-test-entry.tsx';
import { CardPromptView } from './CardPromptView.tsx';
import { CardTile } from './CardTile.tsx';
import { cardItemLabel, humanize } from './item-label.ts';

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

  it('draws no text unless given one', async () => {
    const { container } = await renderCardUi(<CardTile item={{ id: 'a', big: '3' }} />);
    expect(container.textContent).toBe('3');
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
