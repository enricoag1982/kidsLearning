// The e2e drivers played against the real kind UIs in jsdom: each fixture exercise solved by its kind's own `solution()` through the
// kind's driver (the way a Playwright spec would), and a wrong action first. Reduced motion, so the runs jump to their ends.
import i18next from 'i18next';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { tContent } from '@learn/platform-web/content-text.ts';
import { jsdomPage } from '@learn/platform-web/testing/jsdom-page.ts';
import { stubMatchMedia } from '@learn/platform-web/testing/mock-media-query.ts';
import type { CodingExerciseDef } from '../../core/types.ts';
import { kindOf } from '../../kinds/index.ts';
import type { CodingState } from '../../kinds/index.ts';
import { solutionOf } from '../../kinds/solutions.ts';
import { fixtureExercises } from '../testing/fixtures.ts';
import { KindHarness } from '../testing/KindHarness.tsx';
import { renderCodingUi } from '../testing/render-coding-ui.tsx';
import { codingKindE2EOf } from './e2e-registry.ts';
import type { CodingKindE2E } from './e2e-registry.ts';

const page = jsdomPage() as unknown as Parameters<CodingKindE2E['perform']>[0];

/** A text key with its `{{vars}}` untouched, as the e2e kit's `contentText` gives it. */
const text = (key: string): string =>
  tContent(i18next.t, key, { interpolation: { skipOnVariables: true } });

const CODING = fixtureExercises.filter(
  (def) => def.type === 'program' || def.type === 'predict' || def.type === 'find-bug',
);

let restore: () => void;
beforeEach(() => {
  restore = stubMatchMedia('(prefers-reduced-motion: reduce)');
});
afterEach(() => {
  restore();
});

type Action = Parameters<ReturnType<typeof kindOf>['act']>[1];

/** Folds `actions` the way the e2e kit does: `kind.act` purely, then the kind's driver on the page. */
async function perform(
  def: CodingExerciseDef,
  actions: readonly Action[],
  from: CodingState = kindOf(def).init(def),
): Promise<CodingState> {
  const kind = kindOf(def);
  const driver = codingKindE2EOf(def.type);
  let state = from;
  for (const action of actions) {
    const before = state;
    const { state: next, outcome } = kind.act(before, action, null);
    await driver.perform(page, action, { def, before, outcome, text });
    state = next;
  }
  return state;
}

describe('the coding e2e drivers', () => {
  it('cover every exercise of the fixture: 2 guided tries, 5 exercises and the boss rounds', () => {
    expect(CODING.map((def) => def.id)).toEqual([
      'arrows-g1',
      'arrows-g2',
      'arrows-01',
      'arrows-02',
      'arrows-03',
      'arrows-04',
      'arrows-05',
      'fixture-r1',
      'fixture-r2',
    ]);
  });

  describe.each(CODING.map((def) => [def.id, def] as const))('%s', (_id, def) => {
    it('is solved by its solution(): 3 stars, no error', async () => {
      renderCodingUi(<KindHarness def={def} />);
      const state = await perform(def, solutionOf(def).solution(def, null));
      expect(state).toMatchObject({ solved: true, errors: 0 });
      expect((await screen.findByTestId('done')).dataset['stars']).toBe('3');
      expect(screen.getByTestId('session').dataset['errors']).toBe('0');
    });

    it('takes a wrong action first: exactly one error, still solvable (2 stars)', async () => {
      renderCodingUi(<KindHarness def={def} />);
      const wrong = solutionOf(def).wrongAction?.(def, null) ?? [];
      const afterWrong = await perform(def, wrong);
      expect(afterWrong).toMatchObject({ solved: false, errors: 1 });
      await screen.findByTestId('note');
      expect(screen.getByTestId('session').dataset['errors']).toBe('1');

      await perform(def, solutionOf(def).solution(def, null), afterWrong);
      expect((await screen.findByTestId('done')).dataset['stars']).toBe('2');
    });
  });
});
