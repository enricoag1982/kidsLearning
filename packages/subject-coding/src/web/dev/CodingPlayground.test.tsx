import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { tContent } from '@learn/platform-web/content-text.ts';
import { codingWeb } from '../coding-pack.ts';
import { fixtureExercises } from '../testing/fixtures.ts';
import { CodingPlayground } from './CodingPlayground.tsx';

describe('the #coding playground', () => {
  it("is the coding pack's dev screen, and only in a dev build", () => {
    expect(Object.keys(codingWeb.dev ?? {})).toEqual(['#coding']);
  });

  it('has a button for every fixture exercise (guided tries, exercises, boss rounds) and shows each in its lesson step', async () => {
    render(<CodingPlayground />);
    const buttons = screen.getAllByRole('button', { name: /^arrows-|^fixture-/ });
    expect(buttons.map((button) => button.textContent)).toEqual([
      'arrows-g1 (guided)',
      'arrows-g2 (guided)',
      'arrows-01',
      'arrows-02',
      'arrows-03',
      'arrows-04',
      'arrows-05',
      'fixture-r1 (boss)',
      'fixture-r2 (boss)',
    ]);
    expect(fixtureExercises).toHaveLength(buttons.length);

    for (const [index, button] of buttons.entries()) {
      fireEvent.click(button);
      const def = fixtureExercises[index];
      expect(
        await screen.findByText(tContent(i18next.t, def?.textKey ?? ''), undefined, {
          timeout: 3000,
        }),
      ).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Hint' })).toBeTruthy();
    }
  });

  it('a guided try shows Skip and starts with its first hint; a scored exercise has no Skip', async () => {
    render(<CodingPlayground />);
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
