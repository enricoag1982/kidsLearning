import { describe, expect, it } from 'vitest';
import type { Page } from '@playwright/test';
import en from '../../../dist/locales/en.json';
import { PLACE_VALUE_SAMPLES } from '../../testing/place-value-samples.ts';
import type { BuildAction, PlaceValueDef } from './def.ts';
import { placeValueE2E as driver } from './e2e.ts';
import { placeValueKind as kind } from './kind.ts';
import { placeValueSolution, placeValueWrongAction } from './solution.ts';

/** The compiled English text of a key with its `{{vars}}` untouched, as the e2e kit's `contentText` gives it. */
function text(key: string): string {
  let node: unknown = en.common;
  for (const segment of key.split('.')) {
    node = (node as Record<string, unknown> | undefined)?.[segment];
  }
  if (typeof node !== 'string') throw new Error(`no text "${key}"`);
  return node;
}

/** A `Page` that records the accessible name of every button clicked. */
function recordingPage(): { page: Page; clicks: string[] } {
  const clicks: string[] = [];
  const page = {
    getByRole(role: string, options: { name: string; exact?: boolean }) {
      expect(role).toBe('button');
      expect(options.exact).toBe(true);
      return {
        click: () => {
          clicks.push(options.name);
          return Promise.resolve();
        },
      };
    },
  } as unknown as Page;
  return { page, clicks };
}

/** Folds `actions` the way the e2e kit does (`kind.act` purely, then the driver), on one page; returns its clicks. */
async function perform(def: PlaceValueDef, actions: readonly BuildAction[]): Promise<string[]> {
  const { page, clicks } = recordingPage();
  let state = kind.init(def);
  for (const action of actions) {
    const before = state;
    const { state: next, outcome } = kind.act(before, action, null);
    await driver.perform(page, action, { def, before, outcome, text });
    state = next;
  }
  return clicks;
}

const repeat = (name: string, times: number): string[] => Array.from({ length: times }, () => name);

describe('place-value e2e driver', () => {
  it('taps Add per column up to the target digits, then Check', async () => {
    expect(
      await perform(PLACE_VALUE_SAMPLES.zero, placeValueSolution(PLACE_VALUE_SAMPLES.zero)),
    ).toEqual([...repeat('Add a hundred', 3), ...repeat('Add a one', 5), 'Check']);
    expect(
      await perform(
        PLACE_VALUE_SAMPLES.thousands,
        placeValueSolution(PLACE_VALUE_SAMPLES.thousands),
      ),
    ).toEqual([
      ...repeat('Add a thousand', 4),
      ...repeat('Add a ten', 7),
      ...repeat('Add a one', 2),
      'Check',
    ]);
  });

  it('starts from the exercise’s start: Take away where the start holds more, Add where it holds less', async () => {
    // start 2 5 9 → 1 2 8.
    expect(
      await perform(PLACE_VALUE_SAMPLES.start, placeValueSolution(PLACE_VALUE_SAMPLES.start)),
    ).toEqual(['Take away a hundred', ...repeat('Take away a ten', 3), 'Take away a one', 'Check']);
    const lower: PlaceValueDef = { ...PLACE_VALUE_SAMPLES.zero, start: [1, 0, 7] };
    expect(await perform(lower, placeValueSolution(lower))).toEqual([
      ...repeat('Add a hundred', 2),
      ...repeat('Take away a one', 2),
      'Check',
    ]);
  });

  it('a wrong build first leaves its blocks: the next build changes them, not the start', async () => {
    const def = PLACE_VALUE_SAMPLES.zero;
    // 3 5 0 (wrong, 350), then 3 0 5: take the 5 tens away, add 5 ones.
    expect(await perform(def, [...placeValueWrongAction(def), ...placeValueSolution(def)])).toEqual(
      [
        ...repeat('Add a hundred', 3),
        ...repeat('Add a ten', 5),
        'Check',
        ...repeat('Take away a ten', 5),
        ...repeat('Add a one', 5),
        'Check',
      ],
    );
  });

  it('a fresh exercise starts from its start again, though the same def was played before on another page', async () => {
    const def = PLACE_VALUE_SAMPLES.zero;
    await perform(def, [...placeValueWrongAction(def)]);
    expect(await perform(def, placeValueSolution(def))).toEqual([
      ...repeat('Add a hundred', 3),
      ...repeat('Add a one', 5),
      'Check',
    ]);
  });

  it('refuses a build the columns cannot show', async () => {
    const { page } = recordingPage();
    const def = PLACE_VALUE_SAMPLES.zero;
    await expect(
      driver.perform(
        page,
        { type: 'build', counts: [3, 0, 10] },
        {
          def,
          before: kind.init(def),
          outcome: { kind: 'invalid' },
          text,
        },
      ),
    ).rejects.toThrow(/cannot build 3, 0, 10/);
  });
});
