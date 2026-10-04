import type { Page } from '@playwright/test';
import type { MathKindE2E } from '../../web/kinds/e2e-registry.ts';
import type { BuildAction, PlaceValueDef, PlaceValueOutcome } from './def.ts';
import { placesOf, startCounts, validCounts } from './model.ts';

/** The counts the last build performed on a def left in the columns (the blocks stay after a wrong Check), and the number of
 * moves the exercise had then: the next `perform` of the same exercise starts from them. */
const left = new WeakMap<
  PlaceValueDef,
  { readonly moves: number; readonly counts: readonly number[] }
>();

/** Fills every `{{name}}` of `template` (`text(key)` gives a template with its `{{vars}}` untouched). */
function fill(template: string, vars: Readonly<Record<string, string>>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (whole, name: string) => vars[name] ?? whole);
}

const click = async (page: Page, name: string): Promise<void> => {
  await page.getByRole('button', { name, exact: true }).click();
};

/** Reproduces a build as taps: per column the "Add" (or "Take away") button as many times as it takes to go from what the columns
 * hold to the build's count, then Check. A fresh exercise holds `start` (all 0 by default); after an earlier build it holds that
 * build (the blocks stay after a wrong Check). Assumes no hint 3 (it puts blocks in a column) and no tap of the test's own between
 * two builds. */
export const placeValueE2E: MathKindE2E<PlaceValueDef, BuildAction, PlaceValueOutcome> = {
  async perform(page, action, { def, before, text }) {
    if (!validCounts(def.columns, action.counts)) {
      throw new Error(`place-value "${def.id}": cannot build ${action.counts.join(', ')}`);
    }
    const earlier = left.get(def);
    const from =
      earlier !== undefined && before.moves > 0 && earlier.moves === before.moves
        ? earlier.counts
        : startCounts(def);
    for (const [column, place] of placesOf(def.columns).entries()) {
      const change = (action.counts[column] ?? 0) - (from[column] ?? 0);
      const name = fill(text(change >= 0 ? 'math.pv.add' : 'math.pv.remove'), {
        place: text(`math.pv.one.${place}`),
      });
      for (let tap = 0; tap < Math.abs(change); tap += 1) {
        await click(page, name);
      }
    }
    await click(page, text('exercise.check'));
    left.set(def, { moves: before.moves + 1, counts: action.counts });
  },
};
