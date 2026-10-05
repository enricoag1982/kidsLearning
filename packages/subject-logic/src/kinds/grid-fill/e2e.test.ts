import { describe, expect, it } from 'vitest';
import type { GridFillAction, GridFillDef } from './def.ts';
import { gridFillE2E } from './e2e.ts';
import { GRID_FILL_SAMPLES } from './samples.ts';
import { gridFillSolution, gridFillWrongAction } from './solution.ts';

const { lastCell, six, castle, cat } = GRID_FILL_SAMPLES;

/** The calls a driver makes on a Playwright `Page`, in order. */
type Call = string;

/** The compiled English of the keys the driver asks for, `{{vars}}` untouched. */
const TEXTS: Readonly<Record<string, string>> = {
  'grid.put': 'Put {{digit}}',
  'grid.note': 'Note {{digit}}',
  'grid.notes': 'Notes',
  'grid.fill': 'Fill',
  'grid.cross': 'Cross',
};

function fakePage(calls: Call[]) {
  return {
    getByRole(role: string, options?: { readonly name?: string; readonly exact?: boolean }) {
      const name =
        options?.name === undefined
          ? ''
          : `[${options.name}${options.exact === true ? ', exact' : ''}]`;
      return {
        click(): Promise<void> {
          calls.push(`${role}${name}.click()`);
          return Promise.resolve();
        },
      };
    },
  };
}

async function drive(def: GridFillDef, action: GridFillAction): Promise<readonly Call[]> {
  const calls: Call[] = [];
  const page = fakePage(calls) as unknown as Parameters<typeof gridFillE2E.perform>[0];
  await gridFillE2E.perform(page, action, {
    def,
    before: {
      def,
      moves: 0,
      solved: false,
      errors: 0,
      hintLevel: 0,
      cells: [],
      marks: {},
      stepHint: 0,
    },
    outcome: { kind: 'placed' },
    text: (key) => TEXTS[key] ?? key,
  });
  return calls;
}

describe('grid-fill e2e driver: a sudoku', () => {
  it('taps the cell by its "row R, column C" name (1 from the top-left), then the "Put d" button by its exact name', async () => {
    expect(await drive(lastCell, { type: 'set-cell', cell: 6, value: 4 })).toEqual([
      'button[row 2, column 3].click()',
      'button[Put 4, exact].click()',
    ]);
  });

  it('counts rows and columns on a 6 x 6 too', async () => {
    expect(await drive(six, { type: 'set-cell', cell: 9, value: 2 })).toEqual([
      'button[row 2, column 4].click()',
      'button[Put 2, exact].click()',
    ]);
    expect((await drive(six, { type: 'set-cell', cell: 35, value: 2 }))[0]).toBe(
      'button[row 6, column 6].click()',
    );
  });

  it('puts a note as: the cell, Notes on, "Note d", Notes off', async () => {
    expect(await drive(lastCell, { type: 'toggle-mark', cell: 8, value: 3 })).toEqual([
      'button[row 3, column 1].click()',
      'button[Notes, exact].click()',
      'button[Note 3, exact].click()',
      'button[Notes, exact].click()',
    ]);
  });

  it('plays a wrong digit the same way as a right one', async () => {
    const [wrong] = gridFillWrongAction(lastCell);
    expect(wrong).toEqual({ type: 'set-cell', cell: 6, value: 1 });
    expect(await drive(lastCell, wrong ?? { type: 'set-cell', cell: 0, value: 1 })).toEqual([
      'button[row 2, column 3].click()',
      'button[Put 1, exact].click()',
    ]);
  });
});

describe('grid-fill e2e driver: a picture cross', () => {
  it('picks the tool by its radio name, then taps the cell', async () => {
    expect(await drive(castle, { type: 'set-cell', cell: 7, value: 'fill' })).toEqual([
      'radio[Fill, exact].click()',
      'button[row 2, column 3].click()',
    ]);
    expect(await drive(castle, { type: 'set-cell', cell: 1, value: 'cross' })).toEqual([
      'radio[Cross, exact].click()',
      'button[row 1, column 2].click()',
    ]);
  });

  it('takes a cross back with the Cross tool on that cell again', async () => {
    expect(await drive(castle, { type: 'clear-cell', cell: 1 })).toEqual([
      'radio[Cross, exact].click()',
      'button[row 1, column 2].click()',
    ]);
  });

  it('plays a wrong entry the same way', async () => {
    const [wrong] = gridFillWrongAction(castle);
    expect(wrong).toEqual({ type: 'set-cell', cell: 0, value: 'cross' });
    expect(await drive(castle, wrong ?? { type: 'clear-cell', cell: 0 })).toEqual([
      'radio[Cross, exact].click()',
      'button[row 1, column 1].click()',
    ]);
  });
});

describe('grid-fill e2e driver: the kind’s solution', () => {
  it('plays every sample’s solution: each entry is one cell tap and one more click (the pad button, or the tool first)', async () => {
    for (const def of Object.values(GRID_FILL_SAMPLES)) {
      const actions = gridFillSolution(def);
      expect(actions.length, def.id).toBeGreaterThan(0);
      for (const action of actions) {
        const calls = await drive(def, action);
        expect(calls, def.id).toHaveLength(2);
        const { size } = def.puzzle;
        const name = `row ${String(Math.floor(action.cell / size) + 1)}, column ${String((action.cell % size) + 1)}`;
        expect(
          calls.some((call) => call === `button[${name}].click()`),
          def.id,
        ).toBe(true);
      }
    }
  });

  it('names each tool and number exactly, so a cell named "notes 1" or a tool never matches the wrong button', async () => {
    const solution = gridFillSolution(cat);
    const tools = new Set<string>();
    for (const action of solution) {
      tools.add((await drive(cat, action))[0] ?? '');
    }
    expect([...tools].sort()).toEqual([
      'radio[Cross, exact].click()',
      'radio[Fill, exact].click()',
    ]);
  });
});
