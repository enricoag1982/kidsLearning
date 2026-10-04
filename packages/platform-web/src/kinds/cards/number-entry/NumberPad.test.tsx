import { describe, expect, it, vi } from 'vitest';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { NumberPad } from './NumberPad.tsx';
import type { NumberPadProps } from './NumberPad.tsx';

const i18n = createInstance();
await i18n.init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        'cards.pad-label': 'Number pad',
        'cards.erase': 'Delete',
        'exercise.check': 'Check',
      },
    },
  },
});

function withI18n(ui: ReactElement): ReactElement {
  return <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>;
}

function renderPad(
  canCheck: boolean,
  labels: Pick<NumberPadProps, 'padLabel' | 'eraseLabel'> = {},
) {
  const handlers = { onDigit: vi.fn(), onErase: vi.fn(), onCheck: vi.fn() };
  render(withI18n(<NumberPad {...handlers} canCheck={canCheck} {...labels} />));
  return handlers;
}

describe('NumberPad', () => {
  it('has 12 keys in a labelled group: 1-9, then Delete, 0 and Check', () => {
    renderPad(true);
    const pad = screen.getByRole('group', { name: 'Number pad' });
    const names = within(pad)
      .getAllByRole('button')
      .map((button) => button.textContent);
    expect(names).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Delete', '0', 'Check']);
  });

  it('makes every key at least 64px square (h-16 min-w-16)', () => {
    renderPad(true);
    for (const button of screen.getAllByRole('button')) {
      expect(button.className).toContain('h-16');
      expect(button.className).toContain('min-w-16');
    }
  });

  it('disables Check while nothing is typed and enables it otherwise', () => {
    renderPad(false);
    expect(screen.getByRole('button', { name: 'Check' }).hasAttribute('disabled')).toBe(true);
    for (const digit of ['0', '5']) {
      expect(screen.getByRole('button', { name: digit }).hasAttribute('disabled')).toBe(false);
    }
    expect(screen.getByRole('button', { name: 'Delete' }).hasAttribute('disabled')).toBe(false);
  });

  it('reports digits, Delete and Check', () => {
    const { onDigit, onErase, onCheck } = renderPad(true);
    fireEvent.click(screen.getByRole('button', { name: '7' }));
    fireEvent.click(screen.getByRole('button', { name: '0' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(onDigit.mock.calls).toEqual([[7], [0]]);
    expect(onErase).toHaveBeenCalledOnce();
    expect(onCheck).toHaveBeenCalledOnce();
  });

  it("takes the subject's own group name and erase text over the platform's", () => {
    renderPad(true, { padLabel: 'Zahlen', eraseLabel: 'Weg' });
    const pad = screen.getByRole('group', { name: 'Zahlen' });
    expect(within(pad).getByRole('button', { name: 'Weg' })).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'Number pad' })).toBeNull();
  });
});
