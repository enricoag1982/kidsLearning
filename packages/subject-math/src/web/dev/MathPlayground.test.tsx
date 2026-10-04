import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { tContent } from '@learn/platform-web/content-text.ts';
import { LINE_LESSON } from '../testing/line-fixture.ts';
import { mathWeb } from '../math-pack.ts';
import { MathPlayground } from './MathPlayground.tsx';

describe('the #math playground', () => {
  it("is the math pack's dev screen, and only in a dev build", () => {
    expect(Object.keys(mathWeb.dev ?? {})).toEqual(['#math']);
  });

  it('has a button for every fixture exercise (the guided try and the six scored ones) and shows each in its lesson step', async () => {
    render(<MathPlayground />);
    const buttons = screen.getAllByRole('button', { name: /^fx-nl-/ });
    expect(buttons.map((button) => button.textContent)).toEqual([
      'fx-nl-guided (guided)',
      'fx-nl-100',
      'fx-nl-10',
      'fx-nl-50',
      'fx-nl-estimate',
      'fx-nl-list',
      'fx-nl-reason',
    ]);

    const defs = [...LINE_LESSON.guided, ...LINE_LESSON.exercises];
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
      expect(screen.getByRole('slider')).toBeTruthy();
    }
  });

  it('a guided try shows Skip and starts with hint 1 (the middle numbered); a scored exercise has no Skip and no hint yet', async () => {
    render(<MathPlayground />);
    fireEvent.click(screen.getByRole('button', { name: 'fx-nl-guided (guided)' }));
    await screen.findByText('Put the marker on 20.');
    expect(screen.getByRole('button', { name: /Skip/ })).toBeTruthy();
    expect((await screen.findByTestId('number-line-label-50')).textContent).toBe('50');

    fireEvent.click(screen.getByRole('button', { name: 'fx-nl-100' }));
    await screen.findByText('Put the marker on 300.');
    expect(screen.queryByRole('button', { name: /Skip/ })).toBeNull();
    expect(screen.queryByTestId('number-line-label-500')).toBeNull();
  });
});
