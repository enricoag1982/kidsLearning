import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { tContent } from '@learn/platform-web/content-text.ts';
import { ARRAY_LESSON } from '../testing/array-fixture.ts';
import { LINE_LESSON } from '../testing/line-fixture.ts';
import { fixtureLesson } from '../testing/place-value-fixtures.ts';
import { mathWeb } from '../math-pack.ts';
import { MathPlayground } from './MathPlayground.tsx';

describe('the #math playground', () => {
  it("is the math pack's dev screen, and only in a dev build", () => {
    expect(Object.keys(mathWeb.dev ?? {})).toEqual(['#math']);
  });

  it('lists the number line samples, the place-value fixtures and the array fixtures in one screen, a group each', () => {
    render(<MathPlayground />);
    const names = (group: string) =>
      screen
        .getAllByRole('button')
        .filter((button) => screen.getByRole('group', { name: group }).contains(button))
        .map((button) => button.textContent);
    expect(names('Number line')).toHaveLength(7);
    expect(names('Number line').every((name) => name.startsWith('fx-nl-'))).toBe(true);
    expect(names('Place value')).toHaveLength(5);
    expect(names('Place value').every((name) => name.startsWith('pvfx-'))).toBe(true);
    expect(names('Arrays')).toHaveLength(6);
    expect(names('Arrays').every((name) => name.startsWith('fx-ar-'))).toBe(true);
  });

  it('has a button for every number line sample (the guided try and the six scored ones) and shows each in its lesson step', async () => {
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

  it('a number line guided try shows Skip and starts with hint 1 (the middle numbered); a scored exercise has no Skip and no hint yet', async () => {
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

  it('has a button for the place-value guided try and every fixture exercise and shows each in its lesson step', async () => {
    render(<MathPlayground />);
    const buttons = screen.getAllByRole('button', { name: /^pvfx-/ });
    expect(buttons.map((button) => button.textContent)).toEqual([
      'pvfx-hto (guided)',
      'pvfx-zero',
      'pvfx-thousands',
      'pvfx-start',
      'pvfx-nine',
    ]);
    const defs = [...fixtureLesson.guided, ...fixtureLesson.exercises];
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
      expect(screen.getByRole('button', { name: 'Check' })).toBeTruthy();
    }
  });

  it('a place-value guided try shows Skip and starts with hint 1 (the labels emphasised); a scored exercise has neither', async () => {
    render(<MathPlayground />);
    fireEvent.click(screen.getByRole('button', { name: 'pvfx-hto (guided)' }));
    await screen.findByText('Build 243 with the blocks.');
    expect(screen.getByRole('button', { name: /Skip/ })).toBeTruthy();
    await screen.findAllByRole('group', { name: 'Hundreds: 0' });
    expect(document.querySelectorAll('[data-emphasis="true"]')).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: 'pvfx-zero' }));
    await screen.findByText('Build 305 with the blocks.');
    expect(screen.queryByRole('button', { name: /Skip/ })).toBeNull();
    expect(document.querySelectorAll('[data-emphasis="true"]')).toHaveLength(0);
  });

  it('has a button for every array fixture (the guided try and the five scored ones: rows fixed, rows free, the whole grid, a single row, a reason) and shows each in its lesson step', async () => {
    render(<MathPlayground />);
    const buttons = screen.getAllByRole('button', { name: /^fx-ar-/ });
    expect(buttons.map((button) => button.textContent)).toEqual([
      'fx-ar-guided (guided)',
      'fx-ar-fixed',
      'fx-ar-free',
      'fx-ar-full',
      'fx-ar-single',
      'fx-ar-reason',
    ]);

    const defs = [...ARRAY_LESSON.guided, ...ARRAY_LESSON.exercises];
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
      expect(screen.getByRole('group', { name: 'Dots, 6 by 6' })).toBeTruthy();
      expect(screen.getAllByTestId(/^grid-cell-/)).toHaveLength(36);
    }
  });

  it('plays an array fixture in the real lesson step: tap the corner, Check, praise and stars; a guided try shows Skip', async () => {
    render(<MathPlayground />);
    fireEvent.click(screen.getByRole('button', { name: 'fx-ar-guided (guided)' }));
    await screen.findByText('Make 2 rows of 3 dots. Tap the bottom-right dot.');
    expect(screen.getByRole('button', { name: /Skip/ })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'fx-ar-fixed' }));
    await screen.findByText('Make 3 rows of 4 dots. Tap the bottom-right dot.');
    expect(screen.queryByRole('button', { name: /Skip/ })).toBeNull();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Check' }).disabled).toBe(true);
    fireEvent.click(await screen.findByTestId('grid-cell-3-2'));
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(await screen.findByText('Amazing!')).toBeTruthy();
    expect(screen.getByText('3 rows of 4')).toBeTruthy();
  });
});
