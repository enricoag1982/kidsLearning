import type { LogicKindE2E } from '../../web/kinds/e2e-registry.ts';
import type { GridFillAction, GridFillDef, GridFillOutcome } from './def.ts';

/** The accessible-name prefix `GridBoard` gives every cell: "row R, column C" (1 from the top-left), then what it holds. Playwright's
 * name match is a substring, so the prefix finds exactly one cell. */
function cellName(def: GridFillDef, cell: number): string {
  const { size } = def.puzzle;
  return `row ${String(Math.floor(cell / size) + 1)}, column ${String((cell % size) + 1)}`;
}

/** Reproduces an action the way a child plays it: a sudoku entry is the cell, then "Put d" (a note: Notes on, "Note d", Notes off); a
 * picture entry is the tool ("Fill" / "Cross"), then the cell, and taking a cross back is the Cross tool on that cell again. */
export const gridFillE2E: LogicKindE2E<GridFillDef, GridFillAction, GridFillOutcome> = {
  async perform(page, action, { def, text }) {
    const cell = page.getByRole('button', { name: cellName(def, action.cell) });
    const named = (key: string, vars: Readonly<Record<string, string>> = {}): string =>
      Object.entries(vars).reduce(
        (name, [field, value]) => name.replace(`{{${field}}}`, value),
        text(key),
      );

    if (action.type === 'toggle-mark') {
      const notes = page.getByRole('button', { name: text('grid.notes'), exact: true });
      await cell.click();
      await notes.click();
      await page
        .getByRole('button', {
          name: named('grid.note', { digit: String(action.value) }),
          exact: true,
        })
        .click();
      await notes.click();
      return;
    }

    const tool = action.type === 'clear-cell' ? 'cross' : action.value;
    if (typeof tool === 'string') {
      await page.getByRole('radio', { name: text(`grid.${tool}`), exact: true }).click();
      await cell.click();
      return;
    }

    await cell.click();
    await page
      .getByRole('button', { name: named('grid.put', { digit: String(tool) }), exact: true })
      .click();
  },
};
