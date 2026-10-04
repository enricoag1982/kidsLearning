// The e2e driver against the real UI (the jsdom stand-in for a Playwright page): the way a spec plays the kind, each action through the
// driver and the pure engine side by side, so what the page shows is what `act` computed.
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import i18next from 'i18next';
import { tContent } from '@learn/platform-web/content-text.ts';
import { jsdomPage } from '@learn/platform-web/testing/jsdom-page.ts';
import { GridFillHarness } from '../../web/testing/GridFillHarness.tsx';
import { logicKindE2EOf } from '../../web/kinds/e2e-registry.ts';
import { renderGridUi } from '../../web/testing/render-grid-ui.tsx';
import type { GridFillAction, GridFillDef, GridFillState } from './def.ts';
import { gridFillKind } from './kind.ts';
import { GRID_FILL_SAMPLES } from './samples.ts';
import { gridFillSolution, gridFillWrongAction } from './solution.ts';

const { lastCell, castle } = GRID_FILL_SAMPLES;

const text = (key: string): string =>
  tContent(i18next.t, key, { interpolation: { skipOnVariables: true } });
const page = jsdomPage() as unknown as Parameters<ReturnType<typeof logicKindE2EOf>['perform']>[0];

/** The driver on the page for each action, the engine on the state beside it; returns the engine's last state. */
async function play(
  def: GridFillDef,
  actions: readonly GridFillAction[],
  from: GridFillState = gridFillKind.init(def),
): Promise<GridFillState> {
  const driver = logicKindE2EOf('grid-fill');
  let state = from;
  for (const action of actions) {
    const before = state;
    const { state: next, outcome } = gridFillKind.act(before, action, null);
    await driver.perform(page, action, { def, before, outcome, text });
    state = next;
  }
  return state;
}

const session = (): HTMLElement => screen.getByTestId('session');

describe('grid-fill e2e driver on the real UI', () => {
  it('plays every sample’s solution to solved with 3 stars (the real names: row / column, Put d, Fill, Cross)', async () => {
    for (const def of Object.values(GRID_FILL_SAMPLES)) {
      const view = renderGridUi(<GridFillHarness def={def} />);
      const state = await play(def, gridFillSolution(def));
      expect(state.solved, def.id).toBe(true);
      expect(session().dataset['solved'], def.id).toBe('true');
      expect(screen.getByTestId('done').dataset['stars'], def.id).toBe('3');
      view.unmount();
    }
  });

  it('a wrong entry costs exactly 1 error on the page too, and the solution still solves it for 2 stars', async () => {
    for (const def of [lastCell, castle]) {
      const view = renderGridUi(<GridFillHarness def={def} />);
      const afterWrong = await play(def, gridFillWrongAction(def));
      expect(afterWrong, def.id).toMatchObject({ errors: 1, solved: false });
      expect(session().dataset['errors'], def.id).toBe('1');
      await play(def, gridFillSolution(def), afterWrong);
      expect(session().dataset['solved'], def.id).toBe('true');
      expect(screen.getByTestId('done').dataset['stars'], def.id).toBe('2');
      view.unmount();
    }
  });

  it('puts a note through Notes on, "Note d", Notes off: the mark is there, nothing else changed, notes are off again', async () => {
    renderGridUi(<GridFillHarness def={lastCell} />);
    await play(lastCell, [{ type: 'toggle-mark', cell: 6, value: 3 }]);
    expect(screen.getByTestId('grid-marks-2-1').textContent).toBe('3');
    expect(session().dataset['moves']).toBe('0');
    expect(screen.getByRole('button', { name: 'Notes' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
    // A second note in the same cell, then the entry itself.
    await play(lastCell, [{ type: 'toggle-mark', cell: 6, value: 1 }]);
    expect(screen.getByTestId('grid-marks-2-1').textContent).toBe('13');
    await play(lastCell, [{ type: 'set-cell', cell: 6, value: 4 }]);
    expect(screen.queryByTestId('grid-marks-2-1')).toBeNull();
    expect(session().dataset['moves']).toBe('1');
  });

  it('takes a cross back through the Cross tool on the crossed cell', async () => {
    renderGridUi(<GridFillHarness def={castle} />);
    const crossed = await play(castle, [{ type: 'set-cell', cell: 1, value: 'cross' }]);
    expect(screen.getByTestId('grid-cell-1-0').getAttribute('aria-label')).toContain('crossed out');
    await play(castle, [{ type: 'clear-cell', cell: 1 }], crossed);
    expect(screen.getByTestId('grid-cell-1-0').getAttribute('aria-label')).not.toContain('crossed');
    expect(session().dataset['errors']).toBe('0');
  });
});
