// The group e2e driver: the clicks it asks of a page (a recording page), and the driver run against the real UI in jsdom, solving each
// layout of the card fixture's `sort-up` lesson from `GROUP_SOLUTION` the way a Playwright spec would.
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import i18next from 'i18next';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AppConfig, GroupDef, GroupState, Lesson, PutItemAction } from '@learn/platform-core';
import { GROUP_KIND, GROUP_SOLUTION } from '@learn/platform-core';
import type {
  CardDemo,
  CardExerciseDef,
} from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { GROUP_SAMPLES } from '@learn/platform-core/testing';
import { createAppServices } from '../../app/services.ts';
import { tContent } from '../../content-text.ts';
import type { ContentText } from '../../content-text.ts';
import { initI18n } from '../../i18n.ts';
import { cardFixture, cardLocales, createCardTestPack } from '../../testing/card-test-entry.tsx';
import { createMemoryStorage } from '../../testing/memory-storage.ts';
import { renderWithStore } from '../../testing/render-with-store.tsx';
import { createTestEntry } from '../../testing/test-pack.ts';
import { ExerciseStep } from '../../ui/lesson/ExerciseStep.tsx';
import { GROUP_KIND_E2E } from './e2e.ts';

type Page = Parameters<typeof GROUP_KIND_E2E.perform>[0];

const APP: Omit<AppConfig, 'version'> = {
  title: 'Cards app',
  storagePrefix: 'cards:',
  backupAppId: 'cards',
  backupFilePrefix: 'cards',
  parentCodeFilePrefix: 'cards-code',
};

interface RoleOptions {
  readonly name: string;
  readonly exact: boolean;
}

/** A page that records the chain of locators it is asked for and the click at its end. */
function recordingPage(): { readonly page: Page; readonly clicks: string[] } {
  const clicks: string[] = [];
  const chain = (path: string) => ({
    getByRole: (role: string, options: RoleOptions) =>
      chain(
        `${path}${path === '' ? '' : ' > '}${role} "${options.name}"${options.exact ? ' exact' : ''}`,
      ),
    click: () => {
      clicks.push(path);
      return Promise.resolve();
    },
  });
  const page = {
    getByRole: (role: string, options: RoleOptions) => chain('').getByRole(role, options),
    locator: (selector: string) => chain(selector),
  };
  return { page: page as unknown as Page, clicks };
}

const lesson = cardFixture.content.lessons.find((entry) => entry.id === 'sort-up') as Lesson<
  CardExerciseDef,
  CardDemo
>;
const defs = lesson.exercises as unknown as readonly GroupDef[];
/** A text key as the app resolves it (the fixture's real English). */
const text: ContentText = (key, options) => tContent(i18next.t, key, options);

beforeAll(() => {
  initI18n(cardLocales as Parameters<typeof initI18n>[0]);
});

const ctxOf = (def: GroupDef) => ({
  def,
  before: GROUP_KIND.init(def),
  outcome: { kind: 'solved' } as const,
  text,
});
const POOL = 'group "Cards to sort" exact > button';

async function clicksOf(def: GroupDef, actions: readonly PutItemAction[]): Promise<string[]> {
  const { page, clicks } = recordingPage();
  for (const action of actions) await GROUP_KIND_E2E.perform(page, action, ctxOf(def));
  return clicks;
}

describe('group e2e driver: the clicks it asks of a page', () => {
  it('selects the card in the pool by its name, then presses the box by its name in the boxes', async () => {
    const put = (itemId: string, boxId: string): PutItemAction => ({
      type: 'put-item',
      itemId,
      boxId,
    });
    expect(
      await clicksOf(GROUP_SAMPLES.row, [put('r-circle', 'red'), put('b-square', 'blue')]),
    ).toEqual([
      `${POOL} "red circle" exact`,
      '[data-group-zones] > button "Red" exact',
      `${POOL} "blue square" exact`,
      '[data-group-zones] > button "Blue" exact',
    ]);
    expect(await clicksOf(GROUP_SAMPLES.carroll, [put('r-square', 'a-not-b')])).toEqual([
      `${POOL} "red square" exact`,
      '[data-group-zones] > button "Red, Not circle" exact',
    ]);
    expect(
      await clicksOf(GROUP_SAMPLES.venn, [
        put('b-square', 'both'),
        put('r-square', 'only-a'),
        put('b-triangle', 'only-b'),
        put('y-circle', 'neither'),
      ]),
    ).toEqual([
      `${POOL} "blue square" exact`,
      '[data-group-zones] > button "In both" exact',
      `${POOL} "red square" exact`,
      '[data-group-zones] > button "Only Square" exact',
      `${POOL} "blue triangle" exact`,
      '[data-group-zones] > button "Only Blue" exact',
      `${POOL} "yellow circle" exact`,
      '[data-group-zones] > button "Neither" exact',
    ]);
  });

  it('names a card by its text, big text, shape or emoji, as the pool does', async () => {
    const def: GroupDef = {
      ...GROUP_SAMPLES.row,
      items: [
        { id: 'a', textKey: 'lessons:sort-circle' },
        { id: 'b', big: '7' },
        { id: 'c', emoji: '🐝' },
        { id: 'd', shape: { kind: 'star', colour: 'red', count: 3 } },
      ],
      answer: { a: 'red', b: 'red', c: 'blue', d: 'blue' },
    };
    const clicks = await clicksOf(
      def,
      ['a', 'b', 'c', 'd'].map((itemId) => ({ type: 'put-item', itemId, boxId: 'red' })),
    );
    expect(clicks.filter((path) => path.startsWith('group'))).toEqual([
      `${POOL} "Circle" exact`,
      `${POOL} "7" exact`,
      `${POOL} "🐝" exact`,
      `${POOL} "3 red stars" exact`,
    ]);
  });

  it('an unknown card is an error', async () => {
    await expect(
      clicksOf(GROUP_SAMPLES.row, [{ type: 'put-item', itemId: 'zzz', boxId: 'red' }]),
    ).rejects.toThrow('group "gr1": no item "zzz"');
  });
});

// ---- the driver against the real UI --------------------------------------------------------------------------------------------

interface Loc {
  click(): Promise<void>;
  getByRole(role: string, options: RoleOptions): Loc;
}

/** A Playwright-`Page` look-alike over jsdom with the chained locators the group driver uses. */
function scopedPage(): Page {
  const locator = (resolve: () => Promise<HTMLElement>): Loc => ({
    async click() {
      fireEvent.click(await resolve());
    },
    getByRole: (role, options) =>
      locator(async () => within(await resolve()).findByRole(role, { name: options.name })),
  });
  const page = {
    getByRole: (role: string, options: RoleOptions) =>
      locator(() => screen.findByRole(role, { name: options.name })),
    locator: (selector: string) =>
      locator(() =>
        waitFor(() => {
          const found = document.querySelector<HTMLElement>(selector);
          if (found === null) throw new Error(`no element for ${selector}`);
          return found;
        }),
      ),
  };
  return page as unknown as Page;
}

async function renderExercise(def: GroupDef): Promise<void> {
  const entry = createTestEntry(createCardTestPack(), {
    names: { en: 'Cards' },
    locales: cardLocales,
  });
  const app = createAppServices([entry], APP, createMemoryStorage());
  await renderWithStore(
    <ExerciseStep lesson={lesson} exercise={def} guided={false} nextStepIndex={1} />,
    await app.activate('cards'),
  );
}

/** The kind's own `act` folded over `actions`, each also driven on the page (what the e2e kit does). */
async function play(
  def: GroupDef,
  actions: readonly PutItemAction[],
  from: GroupState = GROUP_KIND.init(def),
): Promise<GroupState> {
  const page = scopedPage();
  let state = from;
  for (const action of actions) {
    const before = state;
    const { state: next, outcome } = GROUP_KIND.act(before, action, null);
    await GROUP_KIND_E2E.perform(page, action, { def, before, outcome, text });
    state = next;
  }
  return state;
}

const starsEarned = (): number =>
  screen.getByTestId('stars-row').querySelectorAll('.reward-star-pop').length;

describe('group e2e driver: against the real UI', () => {
  for (const def of defs) {
    it(`solves the ${def.layout} exercise from GROUP_SOLUTION: 3 stars`, async () => {
      await renderExercise(def);
      await screen.findByText(text(def.textKey));
      const state = await play(def, GROUP_SOLUTION.solution(def, null));
      expect(state).toMatchObject({ solved: true, errors: 0 });
      await screen.findByRole('button', { name: /^Next/ });
      expect(starsEarned()).toBe(3);
    });

    it(`a wrong put first, then the solution on the same selection (${def.layout}): 2 stars`, async () => {
      await renderExercise(def);
      await screen.findByText(text(def.textKey));
      const afterWrong = await play(def, GROUP_SOLUTION.wrongAction?.(def, null) ?? []);
      expect(afterWrong).toMatchObject({ errors: 1, solved: false });
      await waitFor(() => {
        expect(document.querySelectorAll('[data-wrong="true"]')).toHaveLength(1);
      });
      await play(def, GROUP_SOLUTION.solution(def, null), afterWrong);
      await screen.findByRole('button', { name: /^Next/ });
      expect(starsEarned()).toBe(2);
    });
  }
});
