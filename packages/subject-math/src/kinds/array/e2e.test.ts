import { describe, expect, it } from 'vitest';
import type { ArrayAction, ArrayDef } from './def.ts';
import { arrayE2E } from './e2e.ts';
import { ARRAY_SAMPLES } from './samples.ts';
import { arraySolution, arrayWrongAction } from './solution.ts';

const { fixed, free, full, single } = ARRAY_SAMPLES;

/** The calls a driver makes on a Playwright `Page`, in order. */
type Call = string;

function fakePage(calls: Call[]) {
  const click = (where: string) => (): Promise<void> => {
    calls.push(`${where}.click()`);
    return Promise.resolve();
  };
  return {
    getByTestId(id: string) {
      return { click: click(`testid[${id}]`) };
    },
    getByRole(role: string, options?: { readonly name?: string; readonly exact?: boolean }) {
      const name =
        options?.name === undefined
          ? ''
          : `[${options.name}${options.exact === true ? ', exact' : ''}]`;
      return { click: click(`${role}${name}`) };
    },
  };
}

async function drive(def: ArrayDef, action: ArrayAction): Promise<readonly Call[]> {
  const calls: Call[] = [];
  const page = fakePage(calls) as unknown as Parameters<typeof arrayE2E.perform>[0];
  await arrayE2E.perform(page, action, {
    def,
    before: { def, moves: 0, solved: false, errors: 0, hintLevel: 0 },
    outcome: { kind: 'solved' },
    text: (key) => (key === 'exercise.check' ? 'Check' : key),
  });
  return calls;
}

describe('array e2e driver', () => {
  it('taps the corner cell (column cols, row rows, counted from 0), then Check by its text', async () => {
    expect(await drive(fixed, { type: 'make-array', rows: 3, cols: 4 })).toEqual([
      'testid[grid-cell-3-2].click()',
      'button[Check, exact].click()',
    ]);
  });

  it('taps the first cell for a 1 x 1 and the last for the whole grid', async () => {
    expect((await drive(single, { type: 'make-array', rows: 1, cols: 1 }))[0]).toBe(
      'testid[grid-cell-0-0].click()',
    );
    expect((await drive(full, { type: 'make-array', rows: 6, cols: 6 }))[0]).toBe(
      'testid[grid-cell-5-5].click()',
    );
  });

  it('plays the solution of every shape: the corner is column cols - 1, row rows - 1', async () => {
    for (const def of Object.values(ARRAY_SAMPLES)) {
      for (const action of arraySolution(def)) {
        expect((await drive(def, action))[0], def.id).toBe(
          `testid[grid-cell-${String(def.cols - 1)}-${String(def.rows - 1)}].click()`,
        );
      }
    }
  });

  it('plays a wrong shape the same way', async () => {
    const [wrong] = arrayWrongAction(free);
    expect(wrong).toEqual({ type: 'make-array', rows: 4, cols: 4 });
    expect(await drive(free, wrong ?? { type: 'make-array', rows: 1, cols: 1 })).toEqual([
      'testid[grid-cell-3-3].click()',
      'button[Check, exact].click()',
    ]);
  });
});
