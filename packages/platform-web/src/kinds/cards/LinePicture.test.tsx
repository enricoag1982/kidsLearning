import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { CardLine } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import { createCardI18n, renderCardUi } from '../../testing/card-test-entry.tsx';
import { tContent } from '../../content-text.ts';
import { CardPromptView } from './CardPromptView.tsx';
import { lineLabel } from './item-label.ts';
import { endLabels, LINE_BOX, lineTicks, lineX } from './line-geometry.ts';
import { LinePicture } from './LinePicture.tsx';

afterEach(cleanup);

const ROUND: CardLine = { from: 40, to: 50, step: 1, marks: [47] };
const BRIDGE: CardLine = { from: 38, to: 50, step: 1, marks: [38, 40] };

describe('line geometry', () => {
  it('puts the ends on the line box and the middle in the middle', () => {
    expect(lineX(ROUND, 40)).toBe(LINE_BOX.left);
    expect(lineX(ROUND, 50)).toBe(LINE_BOX.right);
    expect(lineX(ROUND, 45)).toBe((LINE_BOX.left + LINE_BOX.right) / 2);
  });

  it('lists a tick per step, ends included', () => {
    expect(lineTicks(ROUND)).toEqual([40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50]);
    expect(lineTicks({ from: 0, to: 100, step: 25, marks: [50] })).toEqual([0, 25, 50, 75, 100]);
    expect(lineTicks({ from: -4, to: 4, step: 4, marks: [0] })).toEqual([-4, 0, 4]);
  });

  it('labels an end unless a dot already carries its number', () => {
    expect(endLabels(ROUND)).toEqual([40, 50]);
    expect(endLabels(BRIDGE)).toEqual([50]);
  });
});

describe('LinePicture', () => {
  it('draws a tick per step, the ends labelled and a dot with its number per mark', () => {
    const { container } = render(<LinePicture line={ROUND} />);
    expect(container.querySelectorAll('[data-tick]')).toHaveLength(11);
    expect([...container.querySelectorAll('[data-end]')].map((node) => node.textContent)).toEqual([
      '40',
      '50',
    ]);
    const marks = container.querySelectorAll('[data-mark]');
    expect(marks).toHaveLength(1);
    expect(marks[0]?.getAttribute('data-mark')).toBe('47');
    expect(marks[0]?.querySelector('circle')).not.toBeNull();
    expect(marks[0]?.querySelector('text')?.textContent).toBe('47');
  });

  it('puts every dot where its number is on the line', () => {
    const { container } = render(<LinePicture line={BRIDGE} />);
    for (const mark of BRIDGE.marks) {
      const circle = container.querySelector(`[data-mark="${String(mark)}"] circle`);
      expect(Number(circle?.getAttribute('cx')), String(mark)).toBeCloseTo(lineX(BRIDGE, mark));
    }
    // The left end is a dot: no second 38 below the line.
    expect([...container.querySelectorAll('[data-end]')].map((node) => node.textContent)).toEqual([
      '50',
    ]);
  });

  it('is hidden from assistive technology', () => {
    const { container } = render(<LinePicture line={ROUND} />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('shows a line of 20 gaps with every tick', () => {
    const { container } = render(<LinePicture line={{ from: 0, to: 20, step: 1, marks: [7] }} />);
    expect(container.querySelectorAll('[data-tick]')).toHaveLength(21);
  });
});

describe('CardPromptView line', () => {
  it('draws the picture as one image named by its numbers, below the big text', async () => {
    const { container } = await renderCardUi(
      <CardPromptView prompt={{ big: '47', line: ROUND }} />,
    );
    const picture = screen.getByRole('img', { name: 'Number line from 40 to 50, a dot at 47' });
    expect(picture.querySelectorAll('svg')).toHaveLength(1);
    expect(picture.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    const order = [...container.querySelectorAll('p, [role="img"]')].map(
      (node) => node.getAttribute('role') ?? node.textContent,
    );
    expect(order).toEqual(['47', 'img']);
  });

  it('names several dots in the plural', async () => {
    await renderCardUi(<CardPromptView prompt={{ big: '38 + 7', line: BRIDGE }} />);
    expect(
      screen.getByRole('img', { name: 'Number line from 38 to 50, dots at 38, 40' }),
    ).toBeTruthy();
  });

  it('draws no line without one, and a narrower one for the Story step', async () => {
    await renderCardUi(<CardPromptView prompt={{ big: '3' }} />);
    expect(screen.queryByRole('img')).toBeNull();
    cleanup();
    await renderCardUi(<CardPromptView prompt={{ line: ROUND }} compact />);
    expect(screen.getByRole('img').className).toContain('max-w-48');
  });
});

describe('lineLabel', () => {
  it('reads the locale: one dot, many dots', async () => {
    const i18n = await createCardI18n();
    const text = (key: string, options?: Readonly<Record<string, unknown>>): string =>
      tContent(i18n.t, key, options);
    expect(lineLabel(text, ROUND)).toBe('Number line from 40 to 50, a dot at 47');
    expect(lineLabel(text, { ...ROUND, marks: [41, 47, 50] })).toBe(
      'Number line from 40 to 50, dots at 41, 47, 50',
    );
  });
});
