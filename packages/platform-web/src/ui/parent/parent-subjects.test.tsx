import type { JSX } from 'react';
import i18next from 'i18next';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createProfile, getProfileSettings } from '@learn/platform-core';
import type { AppConfig } from '@learn/platform-core';
import { makeProgress } from '@learn/platform-core/testing';
import { createAppServices } from '../../app/services.ts';
import type { AppServices } from '../../app/services.ts';
import { createAppStore, StoreProvider } from '../../app/store.ts';
import type { AppStore } from '../../app/store.ts';
import { PackProvider, usePack } from '../../app/subject.ts';
import type { LoadedSubject, ParentPanels, SubjectEntry } from '../../app/subject.ts';
import { initI18n } from '../../i18n.ts';
import { createMemoryStorage } from '../../testing/memory-storage.ts';
import {
  createTestContent,
  createTestEntry,
  createTestLocales,
  createTestPack,
} from '../../testing/test-pack.ts';
import { AppErrorBoundary } from '../AppErrorBoundary.tsx';
import { ParentAreaScreen } from '../ParentAreaScreen.tsx';
import { SubjectScopeProvider, useSubjectScope } from './subject-scope.tsx';

const APP: Omit<AppConfig, 'version'> = {
  title: 'Test app',
  storagePrefix: 'app:',
  backupAppId: 'app',
  backupFilePrefix: 'app',
  parentCodeFilePrefix: 'app-code',
};

type Id = 'a' | 'b';

const NAMES: Readonly<Record<Id, string>> = { a: 'Alpha', b: 'Beta' };

/** A subject's merged texts: the platform's parent-area keys the tests read, plus this subject's own world and rank names. */
function localesFor(id: Id): LoadedSubject['locales'] {
  const base = createTestLocales(`Title ${id.toUpperCase()}`).en?.common as Record<string, unknown>;
  return {
    en: {
      common: {
        ...base,
        [`${id}-world`]: `${NAMES[id]} meadow`,
        parent: {
          title: 'Parent area',
          children: 'Children',
          back: 'Back',
          settings: 'Settings',
          'settings-title': "{{name}}'s settings",
          'stars-total_one': '{{count}} star',
          'stars-total_other': '{{count}} stars',
          'unlock-lessons-worlds': 'Unlock lessons & worlds',
          'unlock-lesson': 'Unlock',
          'unlock-world': 'Unlock world',
          'unlock-empty': 'Everything is already unlocked for this child.',
          overview: {
            'minutes-today_one': '{{count}} min today',
            'minutes-today_other': '{{count}} min today',
            'minutes-7-days_one': '{{count}} min this week',
            'minutes-7-days_other': '{{count}} min this week',
          },
          report: {
            loading: 'Loading report…',
            'progress-heading': 'Progress by world',
            stars: '{{earned}}/{{max}} stars',
          },
        },
      },
      journey: {
        ranks: { pawn: `${NAMES[id]} pawn` },
        ui: { 'rank-pill': 'Rank: {{rank}}', 'world-heading': 'World {{order}}: {{name}}' },
      },
    },
  };
}

/** The subject's own parent-area panels: a settings button editing its `<id>-level` and a games section naming the scope. */
function panelsFor(id: Id): ParentPanels {
  return {
    SettingsPanel: function SettingsPanel({ settings, patchSettings }) {
      const scope = useSubjectScope();
      const level = (settings as unknown as Record<string, unknown>)[`${id}-level`];
      return (
        <button
          type="button"
          onClick={() => {
            void patchSettings({ [`${id}-level`]: 2 });
          }}
        >
          {`${scope.subjectId} level ${String(level)}`}
        </button>
      );
    },
    ReportSection: function ReportSection() {
      return <p>{`games of ${useSubjectScope().subjectId}`}</p>;
    },
  };
}

interface Setup {
  readonly app: AppServices;
  readonly store: AppStore;
  readonly profileId: string;
  readonly loads: Readonly<Record<Id, ReturnType<typeof vi.fn>>>;
}

beforeAll(() => {
  initI18n(localesFor('a') as Parameters<typeof initI18n>[0]);
});

/** The parent area over subjects `a` (active) and `b` (`b` has a second, locked lesson), one profile `Mia` with 3 stars in `a` and 2 in `b`. */
async function renderParent(
  options: { readonly only?: Id; readonly failing?: Id } = {},
): Promise<Setup> {
  const packs: Readonly<Record<Id, ReturnType<typeof createTestPack>>> = {
    a: {
      ...createTestPack('a', undefined, createTestContent('a')),
      loadParent: () => Promise.resolve(panelsFor('a')),
    },
    b: {
      ...createTestPack('b', undefined, createTestContent('b', { secondLesson: true })),
      loadParent: () => Promise.resolve(panelsFor('b')),
    },
  };
  const loads = {
    a: vi.fn((): Promise<LoadedSubject> =>
      Promise.resolve({ pack: packs.a, locales: localesFor('a') }),
    ),
    b: vi.fn((): Promise<LoadedSubject> =>
      options.failing === 'b'
        ? Promise.reject(new Error('chunk missing'))
        : Promise.resolve({ pack: packs.b, locales: localesFor('b') }),
    ),
  };
  const entries: SubjectEntry[] = (['a', 'b'] as const)
    .filter((id) => options.only === undefined || options.only === id)
    .map((id) => createTestEntry(packs[id], { names: { en: NAMES[id] }, load: loads[id] }));
  const app = createAppServices(entries, APP, createMemoryStorage());
  const services = await app.activate('a');
  const store = createAppStore(services);
  const profile = await createProfile(services.deps, 'Mia', 'fox');
  await app.subjectData.a?.progress.saveLesson(
    makeProgress({
      id: 'lp-a',
      profileId: profile.id,
      lessonId: 'a-lesson',
      bestStars: { 'a-lesson-01': 3 },
    }),
  );
  if (options.only === undefined) {
    await app.subjectData.b?.progress.saveLesson(
      makeProgress({
        id: 'lp-b',
        profileId: profile.id,
        lessonId: 'b-lesson',
        bestStars: { 'b-lesson-01': 2 },
      }),
    );
  }
  await store.getState().refreshProfiles();
  render(
    <StoreProvider value={store}>
      <PackProvider value={services.pack}>
        <AppErrorBoundary>
          <ParentAreaScreen />
        </AppErrorBoundary>
      </PackProvider>
    </StoreProvider>,
  );
  return { app, store, profileId: profile.id, loads };
}

async function openReport(): Promise<void> {
  const card = (await screen.findByText('Mia')).closest('button');
  if (!card) throw new Error('child card not found');
  fireEvent.click(card);
  await screen.findByRole('button', { name: 'Settings' });
}

async function openSettings(): Promise<void> {
  await openReport();
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  await screen.findByRole('heading', { name: "Mia's settings" });
}

function chip(name: string): HTMLElement {
  return within(screen.getByRole('radiogroup')).getByRole('radio', { name });
}

describe('Overview with several subjects', () => {
  it('shows minutes once and one line per subject: name, rank, stars', async () => {
    await renderParent();

    const lineA = await screen.findByTestId('overview-subject-a');
    const lineB = await screen.findByTestId('overview-subject-b');
    expect(lineA.textContent).toBe('AlphaRank: Alpha pawn3 stars');
    expect(lineB.textContent).toBe('BetaRank: Beta pawn2 stars');
    expect(screen.getAllByText(/min today/)).toHaveLength(1);
    // The card's own total (one subject only) is gone: stars show only in the lines.
    expect(screen.getAllByText(/ stars?$/)).toHaveLength(2);
    expect(screen.getAllByTestId('rank-pill')).toHaveLength(2);
  });

  it('builds each subject from its own deps and loads every pack once, keeping the active subject', async () => {
    const { store, loads } = await renderParent();
    await screen.findByTestId('overview-subject-b');

    expect(loads.a).toHaveBeenCalledTimes(1);
    expect(loads.b).toHaveBeenCalledTimes(1);
    expect(store.getState().subjectId).toBe('a');
    expect(i18next.t('app.title')).toBe('Title A');
  });

  it('with one subject the card is as before: rank by the name, stars with the minutes, no subject lines', async () => {
    await renderParent({ only: 'a' });

    await screen.findByText('Mia');
    expect(screen.queryByTestId('overview-subject-a')).toBeNull();
    const card = screen.getByText('Mia').closest('button');
    expect(card?.textContent).toBe('MiaRank: Alpha pawn3 stars0 min today · 0 min this week');
  });
});

describe('Child report with several subjects', () => {
  it('shows chips with the subject names, the active one chosen', async () => {
    await renderParent();
    await openReport();

    expect(screen.getByRole('radiogroup', { name: 'Subjects' })).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(chip('Alpha').getAttribute('aria-checked')).toBe('true');
    expect(chip('Beta').getAttribute('aria-checked')).toBe('false');
  });

  it("shows each subject's own worlds, stars, rank and panels when the chip changes, without switching the app", async () => {
    const { store, loads } = await renderParent();
    await openReport();

    await screen.findByText('World 1: Alpha meadow');
    expect(screen.getByText(/^3\/\d+ stars$/)).toBeTruthy();
    expect(screen.getByText('Rank: Alpha pawn')).toBeTruthy();
    expect(await screen.findByText('games of a')).toBeTruthy();

    fireEvent.click(chip('Beta'));

    await screen.findByText('World 1: Beta meadow');
    expect(screen.queryByText('World 1: Alpha meadow')).toBeNull();
    expect(screen.getByText(/^2\/\d+ stars$/)).toBeTruthy();
    expect(screen.getByText('Rank: Beta pawn')).toBeTruthy();
    expect(await screen.findByText('games of b')).toBeTruthy();
    expect(chip('Beta').getAttribute('aria-checked')).toBe('true');
    expect(store.getState().subjectId).toBe('a');
    expect(i18next.t('app.title')).toBe('Title A');

    fireEvent.click(chip('Alpha'));
    await screen.findByText('World 1: Alpha meadow');
    expect(await screen.findByText('games of a')).toBeTruthy();
    expect(loads.b).toHaveBeenCalledTimes(1);
  });

  it('moves between the chips with the arrow keys', async () => {
    await renderParent();
    await openReport();

    fireEvent.keyDown(chip('Alpha'), { key: 'ArrowRight' });

    await screen.findByText('World 1: Beta meadow');
    expect(chip('Beta').getAttribute('aria-checked')).toBe('true');
    expect(chip('Alpha').getAttribute('tabindex')).toBe('-1');
    expect(chip('Beta').getAttribute('tabindex')).toBe('0');
  });

  it('has no chips with one subject', async () => {
    await renderParent({ only: 'a' });
    await openReport();

    await screen.findByText('World 1: Alpha meadow');
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.getByText('Rank: Alpha pawn')).toBeTruthy();
  });
});

describe('Child settings with several subjects', () => {
  it("edits the scoped subject's own setting, leaving the other subject's alone", async () => {
    const { app, profileId } = await renderParent();
    await openSettings();

    fireEvent.click(await screen.findByRole('button', { name: 'a level 1' }));
    await screen.findByRole('button', { name: 'a level 2' });

    fireEvent.click(chip('Beta'));
    fireEvent.click(await screen.findByRole('button', { name: 'b level 1' }));
    await screen.findByRole('button', { name: 'b level 2' });

    const settings = (await getProfileSettings(
      (await app.activate('a')).deps,
      profileId,
    )) as unknown as Record<string, unknown>;
    expect(settings['a-level']).toBe(2);
    expect(settings['b-level']).toBe(2);
  });

  it('unlocks in the scoped subject only', async () => {
    const { app, profileId } = await renderParent();
    await openSettings();

    // `a` has nothing locked.
    await screen.findByText('Everything is already unlocked for this child.');

    fireEvent.click(chip('Beta'));
    fireEvent.click(await screen.findByRole('button', { name: 'Unlock' }));

    await screen.findByText('Everything is already unlocked for this child.');
    const unlocksB = await app.subjectData.b?.assessment?.listUnlocks(profileId);
    expect(unlocksB?.map((unlock) => unlock.targetId)).toEqual(['b-lesson-2']);
    expect(await app.subjectData.a?.assessment?.listUnlocks(profileId)).toEqual([]);
  });

  it('shows no chips with one subject, and the panel and unlock list as before', async () => {
    await renderParent({ only: 'a' });
    await openSettings();

    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(await screen.findByRole('button', { name: 'a level 1' })).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText('Everything is already unlocked for this child.')).toBeTruthy();
    });
  });
});

const BETA_FAILED = 'Beta could not be loaded. Close the app and try again.';

describe('A subject whose pack cannot load (F2)', () => {
  it('the Overview still shows the other subject and the minutes, with a calm line for the failed one', async () => {
    await renderParent({ failing: 'b' });

    const lineA = await screen.findByTestId('overview-subject-a');
    expect(lineA.textContent).toBe('AlphaRank: Alpha pawn3 stars');
    const lineB = screen.getByTestId('overview-subject-b');
    expect(lineB.textContent).toBe(BETA_FAILED);
    expect(lineB.getAttribute('role')).toBe('status');
    expect(screen.getAllByText(/min today/)).toHaveLength(1);
    expect(screen.queryByRole('heading', { name: 'Oops, something went wrong' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Parent area' })).toBeTruthy();
  });

  it('the report of the failed subject shows the line, the chips stay, and the other subject still opens', async () => {
    await renderParent({ failing: 'b' });
    await openReport();
    await screen.findByText('World 1: Alpha meadow');

    fireEvent.click(chip('Beta'));

    expect(await screen.findByText(BETA_FAILED)).toBeTruthy();
    expect(screen.queryByText('World 1: Alpha meadow')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Oops, something went wrong' })).toBeNull();
    expect(chip('Beta').getAttribute('aria-checked')).toBe('true');

    fireEvent.click(chip('Alpha'));
    await screen.findByText('World 1: Alpha meadow');
    expect(screen.queryByText(BETA_FAILED)).toBeNull();
  });

  it('the settings of the failed subject show the line once (its own panel stays empty), the common settings stay', async () => {
    await renderParent({ failing: 'b' });
    await openSettings();
    await screen.findByRole('button', { name: 'a level 1' });

    fireEvent.click(chip('Beta'));

    expect(await screen.findByText(BETA_FAILED)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'b level 1' })).toBeNull();
    expect(screen.getByRole('heading', { name: "Mia's settings" })).toBeTruthy();
  });
});

const B_FAILED = 'b could not be loaded. Close the app and try again.';

describe('SubjectScopeProvider', () => {
  async function scopeApp(load?: () => Promise<LoadedSubject>) {
    const a = createTestPack('a', undefined, createTestContent('a'));
    const b = createTestPack('b', undefined, createTestContent('b'));
    const app = createAppServices(
      [
        createTestEntry(a, { locales: localesFor('a') }),
        createTestEntry(b, { locales: localesFor('b'), ...(load ? { load } : {}) }),
      ],
      APP,
      createMemoryStorage(),
    );
    const services = await app.activate('a');
    return { app, store: createAppStore(services), services };
  }

  function Probe(): JSX.Element {
    const scope = useSubjectScope();
    return <p>{`scope ${scope.subjectId} / pack ${usePack().core.id}`}</p>;
  }

  it('gives the scoped subject its pack and deps, and the store active one outside it', async () => {
    const { store, services } = await scopeApp();
    render(
      <StoreProvider value={store}>
        <PackProvider value={services.pack}>
          <Probe />
          <SubjectScopeProvider subjectId="b">
            <Probe />
          </SubjectScopeProvider>
        </PackProvider>
      </StoreProvider>,
    );

    expect(screen.getAllByText('scope a / pack a')).toHaveLength(1);
    expect(await screen.findByText('scope b / pack b')).toBeTruthy();
    expect(store.getState().subjectId).toBe('a');
  });

  it('shows the fallback until the pack is loaded', async () => {
    let resolve: ((loaded: LoadedSubject) => void) | undefined;
    const { app, store, services } = await scopeApp(
      () =>
        new Promise<LoadedSubject>((done) => {
          resolve = done;
        }),
    );
    render(
      <StoreProvider value={store}>
        <PackProvider value={services.pack}>
          <SubjectScopeProvider subjectId="b" fallback={<p>waiting</p>}>
            <Probe />
          </SubjectScopeProvider>
        </PackProvider>
      </StoreProvider>,
    );

    expect(screen.getByText('waiting')).toBeTruthy();
    resolve?.({
      pack: createTestPack('b', undefined, createTestContent('b')),
      locales: localesFor('b'),
    });

    expect(await screen.findByText('scope b / pack b')).toBeTruthy();
    expect(app.subjects).toHaveLength(2);
  });

  it('shows the calm line for a failed load, not the error boundary', async () => {
    const { store, services } = await scopeApp(() => Promise.reject(new Error('chunk missing')));
    render(
      <StoreProvider value={store}>
        <PackProvider value={services.pack}>
          <AppErrorBoundary>
            <SubjectScopeProvider subjectId="b">
              <Probe />
            </SubjectScopeProvider>
          </AppErrorBoundary>
        </PackProvider>
      </StoreProvider>,
    );

    expect(await screen.findByText(B_FAILED)).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Oops, something went wrong' })).toBeNull();
    expect(screen.queryByText(/scope b/)).toBeNull();
  });

  it('a failed load shows nothing for fallback={null}, and the line instead of a loading fallback', async () => {
    const { store, services } = await scopeApp(() => Promise.reject(new Error('chunk missing')));
    render(
      <StoreProvider value={store}>
        <PackProvider value={services.pack}>
          <div data-testid="slot-null">
            <SubjectScopeProvider subjectId="b" fallback={null}>
              <Probe />
            </SubjectScopeProvider>
          </div>
          <div data-testid="slot-node">
            <SubjectScopeProvider subjectId="b" fallback={<p>waiting</p>}>
              <Probe />
            </SubjectScopeProvider>
          </div>
        </PackProvider>
      </StoreProvider>,
    );

    await waitFor(() => {
      expect(within(screen.getByTestId('slot-node')).getByText(B_FAILED)).toBeTruthy();
    });
    expect(screen.getByTestId('slot-null').textContent).toBe('');
    expect(screen.queryByText('waiting')).toBeNull();
  });
});
