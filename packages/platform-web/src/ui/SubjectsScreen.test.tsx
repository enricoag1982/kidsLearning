import i18next from 'i18next';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createProfile } from '@learn/platform-core';
import type { AppConfig } from '@learn/platform-core';
import { initI18n } from '../i18n.ts';
import { createAppServices } from '../app/services.ts';
import type { Services } from '../app/services.ts';
import { createAppStore, StoreProvider } from '../app/store.ts';
import type { AppStore } from '../app/store.ts';
import { PackProvider } from '../app/subject.ts';
import type { LoadedSubject, SubjectEntry } from '../app/subject.ts';
import { createMemoryStorage } from '../testing/memory-storage.ts';
import {
  createTestContent,
  createTestEntry,
  createTestLocales,
  createTestPack,
} from '../testing/test-pack.ts';
import { AppErrorBoundary } from './AppErrorBoundary.tsx';
import { SubjectsScreen } from './SubjectsScreen.tsx';

const APP: Omit<AppConfig, 'version'> = {
  title: 'Test app',
  storagePrefix: 'app:',
  backupAppId: 'app',
  backupFilePrefix: 'app',
  parentCodeFilePrefix: 'app-code',
};

beforeAll(() => {
  initI18n(createTestLocales('Title A') as Parameters<typeof initI18n>[0]);
});

function entries(): readonly SubjectEntry[] {
  const a = createTestPack('a', undefined, createTestContent('a'));
  const b = createTestPack('b', undefined, createTestContent('b'));
  return [
    {
      ...createTestEntry(a, {
        names: { en: 'Alpha', de: 'Alfa' },
        locales: createTestLocales('Title A'),
      }),
      manifest: {
        ...createTestEntry(a).manifest,
        names: { en: 'Alpha', de: 'Alfa' },
        icon: 'alpha.png',
        colors: { bg: '#DCEFE3', fg: '#1F5A41', ledge: '#163F2E' },
      },
    },
    {
      ...createTestEntry(b, { locales: createTestLocales('Title B') }),
      manifest: {
        ...createTestEntry(b).manifest,
        names: { en: 'Beta' },
        icon: 'beta.png',
        colors: { bg: '#FBE3D2', fg: '#7A3A10', ledge: '#55290B' },
      },
    },
  ];
}

async function renderHub(
  list: readonly SubjectEntry[] = entries(),
): Promise<{ readonly store: AppStore; readonly services: Services }> {
  const app = createAppServices(list, APP, createMemoryStorage());
  const services = await app.activate('a');
  const store = createAppStore(services);
  const profile = await createProfile(services.deps, 'Mia', 'fox');
  await store.getState().selectProfileAndHome(profile.id);
  render(
    <StoreProvider value={store}>
      <PackProvider value={services.pack}>
        <AppErrorBoundary>
          <SubjectsScreen />
        </AppErrorBoundary>
      </PackProvider>
    </StoreProvider>,
  );
  return { store, services };
}

describe('SubjectsScreen', () => {
  it('shows a title, the Owl line and one tile per subject, named by the manifest', async () => {
    await renderHub();

    expect(screen.getByRole('heading', { level: 1, name: 'What shall we learn?' })).toBeTruthy();
    expect(screen.getByText('What would you like to learn today?')).toBeTruthy();
    expect(screen.getByTestId('subject-tile-a')).toBe(
      screen.getByRole('button', { name: 'Alpha' }),
    );
    expect(screen.getByTestId('subject-tile-b')).toBe(screen.getByRole('button', { name: 'Beta' }));
    expect(screen.getAllByTestId(/^subject-tile-/)).toHaveLength(2);
  });

  it("draws each tile's picture (decorative, at least 96 px) in the manifest colours", async () => {
    await renderHub();

    const tile = screen.getByTestId('subject-tile-a');
    const picture = within(tile).getByRole('presentation', { hidden: true });
    expect(picture.getAttribute('src')).toBe('alpha.png');
    expect(picture.getAttribute('alt')).toBe('');
    expect(picture.className).toContain('h-24');
    expect(picture.className).toContain('w-24');
    expect(tile.style.backgroundColor).toBe('rgb(220, 239, 227)');
    expect(tile.style.color).toBe('rgb(31, 90, 65)');
  });

  it('marks no subject as current for a profile that has not opened one', async () => {
    await renderHub();

    for (const id of ['a', 'b']) {
      const tile = screen.getByTestId(`subject-tile-${id}`);
      expect(tile.getAttribute('aria-current'), id).toBeNull();
      expect(tile.style.outline, id).toBe('');
      expect(tile.querySelector('svg'), id).toBeNull();
    }
  });

  it('marks the chosen subject as current after the first selection, with its ring and check', async () => {
    const { store } = await renderHub();

    fireEvent.click(screen.getByTestId('subject-tile-b'));

    await waitFor(() => {
      expect(screen.getByTestId('subject-tile-b').getAttribute('aria-current')).toBe('true');
    });
    expect(store.getState().lastSubjectId).toBe('b');
    expect(screen.getByTestId('subject-tile-b').style.outline).not.toBe('');
    expect(screen.getByTestId('subject-tile-b').querySelector('svg')).not.toBeNull();
    const other = screen.getByTestId('subject-tile-a');
    expect(other.getAttribute('aria-current')).toBeNull();
    expect(other.style.outline).toBe('');
    expect(other.querySelector('svg')).toBeNull();
  });

  it("marks the profile's last subject on a later visit, and none for another profile", async () => {
    const { store, services } = await renderHub();
    fireEvent.click(screen.getByTestId('subject-tile-b'));
    await waitFor(() => {
      expect(store.getState().lastSubjectId).toBe('b');
    });
    const other = await createProfile(services.deps, 'Zoe', 'bear');

    await store.getState().selectProfileAndHome(other.id);
    await waitFor(() => {
      expect(store.getState().lastSubjectId).toBeNull();
    });
    expect(screen.getByTestId('subject-tile-a').getAttribute('aria-current')).toBeNull();
    expect(screen.getByTestId('subject-tile-b').getAttribute('aria-current')).toBeNull();

    const mia = (await services.deps.profiles.list()).find((entry) => entry.nickname === 'Mia');
    await store.getState().selectProfileAndHome(mia?.id ?? '');
    await waitFor(() => {
      expect(screen.getByTestId('subject-tile-b').getAttribute('aria-current')).toBe('true');
    });
    expect(screen.getByTestId('subject-tile-a').getAttribute('aria-current')).toBeNull();
  });

  it('names a tile in the current language when the manifest has it, else in English', async () => {
    await renderHub();
    try {
      await i18next.changeLanguage('de');
      await waitFor(() => {
        expect(screen.getByTestId('subject-tile-a').textContent).toBe('Alfa');
      });
      expect(screen.getByTestId('subject-tile-b').textContent).toBe('Beta');
    } finally {
      await i18next.changeLanguage('en');
    }
  });

  it('a tap activates that subject and opens its Home above the hub (a fresh subject: placement offer on top)', async () => {
    const { store } = await renderHub();

    fireEvent.click(screen.getByTestId('subject-tile-b'));

    await waitFor(() => {
      expect(store.getState().stack.map((route) => route.name)).toEqual([
        'subjects',
        'home',
        'placement-offer',
      ]);
    });
    expect(store.getState().subjectId).toBe('b');
    expect(store.getState().pack.core.id).toBe('b');
  });

  it('tapping the active subject keeps it and opens its Home (a fresh subject: placement offer on top)', async () => {
    const { store } = await renderHub();

    fireEvent.click(screen.getByTestId('subject-tile-a'));

    await waitFor(() => {
      expect(store.getState().stack.map((route) => route.name)).toEqual([
        'subjects',
        'home',
        'placement-offer',
      ]);
    });
    expect(store.getState().subjectId).toBe('a');
  });

  it('shows the profile and a switch-player button back to the picker', async () => {
    const { store } = await renderHub();

    expect(screen.getByText('Mia')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Switch player' }));

    await waitFor(() => {
      expect(store.getState().stack.map((route) => route.name)).toEqual(['picker']);
    });
  });

  describe('a subject whose pack cannot load (F2)', () => {
    const LINE = 'Beta could not be loaded. Close the app and try again.';

    async function renderWithFailingB() {
      const load = vi.fn(() => Promise.reject<LoadedSubject>(new Error('chunk missing')));
      const list = entries().map((entry) =>
        entry.manifest.id === 'b' ? { ...entry, load } : entry,
      );
      return { ...(await renderHub(list)), load };
    }

    it('turns that tile disabled and the Owl says the calm line; no error screen, the active subject stays', async () => {
      const { store } = await renderWithFailingB();

      fireEvent.click(screen.getByTestId('subject-tile-b'));

      await screen.findByText(LINE);
      expect(screen.queryByText('What would you like to learn today?')).toBeNull();
      expect(screen.queryByRole('heading', { name: 'Oops, something went wrong' })).toBeNull();
      expect(screen.getByTestId('subject-tile-b')).toHaveProperty('disabled', true);
      expect(store.getState().subjectId).toBe('a');
      expect(screen.getByTestId('subject-tile-b').getAttribute('aria-current')).toBeNull();
    });

    it('the other subject still opens, and the failed tile is not tried again', async () => {
      const { store, load } = await renderWithFailingB();
      fireEvent.click(screen.getByTestId('subject-tile-b'));
      await screen.findByText(LINE);

      fireEvent.click(screen.getByTestId('subject-tile-b'));
      fireEvent.click(screen.getByTestId('subject-tile-a'));

      await waitFor(() => {
        expect(store.getState().stack.map((route) => route.name)).toContain('home');
      });
      expect(load).toHaveBeenCalledTimes(1);
      expect(store.getState().subjectId).toBe('a');
    });

    it('says the line aloud (the narrator speaks the same text the bubble shows)', async () => {
      const { services } = await renderWithFailingB();
      const speak = vi.spyOn(services.narrator, 'speak');

      fireEvent.click(screen.getByTestId('subject-tile-b'));
      await screen.findByText(LINE);

      expect(speak).toHaveBeenCalledWith(LINE);
    });
  });
});
