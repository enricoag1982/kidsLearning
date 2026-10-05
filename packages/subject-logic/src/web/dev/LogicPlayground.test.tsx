import { describe, expect, it } from 'vitest';
import { configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import { tContent } from '@learn/platform-web/content-text.ts';
import { jsdomPage } from '@learn/platform-web/testing/jsdom-page.ts';
import type { LogicExerciseDef } from '../../core/types.ts';
import { gridFillKind } from '../../kinds/grid-fill/kind.ts';
import { gridFillSolution } from '../../kinds/grid-fill/solution.ts';
import { logicKindE2EOf } from '../kinds/e2e-registry.ts';
import { logicWeb } from '../logic-pack.ts';
import { GRID_LESSON } from '../testing/grid-fixture.ts';
import { LogicPlayground } from './LogicPlayground.tsx';

// A real lesson step (store, session, autosave) in jsdom: a busy machine needs longer than the default 1 s.
configure({ asyncUtilTimeout: 10_000 });
const SLOW = 60_000;

const text = (key: string): string =>
  tContent(i18next.t, key, { interpolation: { skipOnVariables: true } });
const page = jsdomPage() as unknown as Parameters<ReturnType<typeof logicKindE2EOf>['perform']>[0];

function groupNames(group: string): string[] {
  const element = screen.getByRole('group', { name: group });
  return screen
    .getAllByRole('button')
    .filter((button) => element.contains(button))
    .map((button) => button.textContent);
}

/** Plays `def`'s solution through the driver on the real lesson step. */
async function solve(def: LogicExerciseDef): Promise<void> {
  if (def.type !== 'grid-fill') throw new Error('the playground samples are grid puzzles');
  const driver = logicKindE2EOf('grid-fill');
  let state = gridFillKind.init(def);
  for (const action of gridFillSolution(def)) {
    const before = state;
    const { state: next, outcome } = gridFillKind.act(before, action, null);
    await driver.perform(page, action, { def, before, outcome, text });
    state = next;
  }
}

const exercise = (id: string): LogicExerciseDef => {
  const found = [...GRID_LESSON.guided, ...GRID_LESSON.exercises].find((def) => def.id === id);
  if (found === undefined) throw new Error(`no fixture exercise "${id}"`);
  return found;
};

describe('the #logic playground', () => {
  it("is the logic pack's dev screen, and only in a dev build", () => {
    expect(Object.keys(logicWeb.dev ?? {})).toEqual(['#logic']);
  });

  it('lists the grid-fill samples in three groups: the 4 x 4 sudokus with the guided try first, the 6 x 6, the pictures', () => {
    render(<LogicPlayground />);
    expect(groupNames('Sudoku 4 × 4')).toEqual([
      'fx-grid-guided (guided)',
      'fx-grid-last',
      'fx-grid-place',
      'fx-grid-number',
      'fx-grid-all',
    ]);
    expect(groupNames('Sudoku 6 × 6')).toEqual(['fx-grid-six']);
    expect(groupNames('Picture cross')).toEqual(['fx-grid-castle', 'fx-grid-cat']);
  });

  it('shows the same exercises as the fixture lesson, the guided try and all seven scored ones', () => {
    render(<LogicPlayground />);
    const listed = ['Sudoku 4 × 4', 'Sudoku 6 × 6', 'Picture cross'].flatMap(groupNames);
    expect(listed.map((name) => name.split(' ')[0])).toEqual(
      [...GRID_LESSON.guided, ...GRID_LESSON.exercises].map((def) => def.id),
    );
  });

  it('shows every sample in its lesson step: its instruction, the hint button and its board and controls', async () => {
    render(<LogicPlayground />);
    for (const id of [
      'fx-grid-guided',
      'fx-grid-last',
      'fx-grid-place',
      'fx-grid-number',
      'fx-grid-all',
      'fx-grid-six',
      'fx-grid-castle',
      'fx-grid-cat',
    ]) {
      const def = exercise(id);
      const button = screen
        .getAllByRole('button')
        .find((candidate) => candidate.textContent.split(' ')[0] === id);
      if (button === undefined) throw new Error(`no button for ${id}`);
      fireEvent.click(button);
      expect(
        (await screen.findAllByText(tContent(i18next.t, def.textKey), undefined, { timeout: 3000 }))
          .length,
      ).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: 'Hint' })).toBeTruthy();
      const picture = id.includes('castle') || id.includes('cat');
      expect(
        screen.getByRole(picture ? 'radiogroup' : 'group', { name: picture ? 'Tool' : 'Numbers' }),
      ).toBeTruthy();
    }
    expect(screen.getByRole('group', { name: 'Picture cross, 5 by 5' })).toBeTruthy();
  });

  it('a guided try shows Skip and starts with hint 1 (the unit ringed); a scored exercise has neither', async () => {
    render(<LogicPlayground />);
    fireEvent.click(screen.getByRole('button', { name: 'fx-grid-guided (guided)' }));
    await screen.findByText(text('grid.instruction.sudoku'));
    expect(screen.getByRole('button', { name: /Skip/ })).toBeTruthy();
    // The ringed unit (hint 1): its 3 other cells dashed, the one target cell ringed solid (the target is ringed from the start).
    const kinds = (): (string | undefined)[] =>
      screen.queryAllByTestId(/^grid-highlight-/).map((ring) => ring.dataset['kind']);
    await waitFor(() => {
      expect(kinds().filter((kind) => kind === 'hint')).toHaveLength(3);
    });
    expect(kinds().filter((kind) => kind === 'target')).toHaveLength(1);
    expect(kinds()).toHaveLength(4);

    fireEvent.click(screen.getByRole('button', { name: 'fx-grid-last' }));
    await screen.findByText(text('grid.instruction.sudoku'));
    expect(screen.queryByRole('button', { name: /Skip/ })).toBeNull();
    expect(screen.queryAllByTestId(/^grid-highlight-/)).toHaveLength(0);
  });

  it(
    'plays a sudoku in the real lesson step: tap a cell, Put a number, praise and stars; a wrong number names the unit',
    async () => {
      render(<LogicPlayground />);
      fireEvent.click(screen.getByRole('button', { name: 'fx-grid-last' }));
      await screen.findByText(text('grid.instruction.sudoku'));
      fireEvent.click(await screen.findByRole('button', { name: /^row 2, column 3/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Put 1' }));
      expect(await screen.findByText('That number is already in this row.')).toBeTruthy();
      await solve(exercise('fx-grid-last'));
      // One error: 2 stars.
      expect(await screen.findByText('Well done!', undefined, { timeout: 10_000 })).toBeTruthy();
    },
    SLOW,
  );

  it(
    'plays a picture in the real lesson step: the tool, the cells, praise, the revealed picture',
    async () => {
      render(<LogicPlayground />);
      fireEvent.click(screen.getByRole('button', { name: 'fx-grid-castle' }));
      await screen.findByText(text('grid.instruction.cross'));
      await solve(exercise('fx-grid-castle'));
      expect(await screen.findByText('Amazing!', undefined, { timeout: 10_000 })).toBeTruthy();
      expect((await screen.findByTestId('grid-reveal')).textContent).toBe('🏰');
    },
    SLOW,
  );

  it(
    'plays the 6 x 6 in the real lesson step to the end',
    async () => {
      render(<LogicPlayground />);
      fireEvent.click(screen.getByRole('button', { name: 'fx-grid-six' }));
      await screen.findByRole('group', { name: 'Sudoku, 6 by 6' });
      await solve(exercise('fx-grid-six'));
      expect(await screen.findByText('Amazing!', undefined, { timeout: 10_000 })).toBeTruthy();
    },
    SLOW,
  );
});
