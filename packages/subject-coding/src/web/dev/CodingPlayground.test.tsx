import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { tContent } from '@learn/platform-web/content-text.ts';
import { allCodingExercises } from '../../content/all-exercises.ts';
import { codingWeb } from '../coding-pack.ts';
import { CodingPlayground } from './CodingPlayground.tsx';

describe('the #coding playground', () => {
  it("is the coding pack's dev screen, and only in a dev build", () => {
    expect(Object.keys(codingWeb.dev ?? {})).toEqual(['#coding']);
  });

  it('has a button for every shipped exercise (guided tries, exercises, easier variants, boss rounds) and shows each in its lesson step', async () => {
    render(<CodingPlayground />);
    const buttons = screen.getAllByRole('button', {
      name: /^(order|arrows|collect|debug|bug-squash)-/,
    });
    expect(buttons).toHaveLength(40);
    expect(buttons.slice(0, 4).map((button) => button.textContent)).toEqual([
      'order-g1 (guided)',
      'order-g2 (guided)',
      'order-01',
      'order-02',
    ]);
    expect(buttons.at(-1)?.textContent).toBe('bug-squash-r5 (boss)');

    const shipped = codingWeb.createServices().content;
    const defs = allCodingExercises(shipped.lessons(), shipped.minigames());
    expect(defs).toHaveLength(buttons.length);

    for (const button of buttons) {
      fireEvent.click(button);
      const def = defs.find((candidate) => candidate.id === button.textContent.split(' ')[0]);
      expect(
        (
          await screen.findAllByText(tContent(i18next.t, def?.textKey ?? ''), undefined, {
            timeout: 3000,
          })
        ).length,
      ).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: 'Hint' })).toBeTruthy();
    }
  });

  it('a guided try shows Skip and starts with its first hint; a scored exercise has no Skip', async () => {
    render(<CodingPlayground />);
    fireEvent.click(screen.getByRole('button', { name: 'arrows-g1 (guided)' }));
    await screen.findByText('Help Fox reach the flag. Tap the arrows, then press Run.');
    expect(screen.getByRole('button', { name: /Skip/ })).toBeTruthy();
    expect((await screen.findByTestId('grid-highlight-1-0')).getAttribute('data-kind')).toBe(
      'hint',
    );

    fireEvent.click(screen.getByRole('button', { name: 'arrows-01' }));
    await screen.findByText('Help Fox reach the flag.');
    expect(screen.queryByRole('button', { name: /Skip/ })).toBeNull();
    expect(screen.queryAllByTestId(/^grid-highlight-/)).toHaveLength(0);
  });
});
