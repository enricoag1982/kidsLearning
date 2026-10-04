import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createProfile, selectProfile, setupParentPassword } from '@learn/platform-core';
import type { AppConfig } from '@learn/platform-core';
import { makeProgress } from '@learn/platform-core/testing';
import App from './App.tsx';
import { createAppServices } from './app/services.ts';
import type { LoadedSubject, SubjectEntry } from './app/subject.ts';
import { initI18n } from './i18n.ts';
import { createFakePasswordFileWriter } from './testing/fake-password-file-writer.ts';
import { createMemoryStorage } from './testing/memory-storage.ts';
import {
  createTestContent,
  createTestEntry,
  createTestLocales,
  createTestPack,
} from './testing/test-pack.ts';

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

/** The whole app over two subjects (own content and texts each) and a parent code, no profile yet, on a fresh storage. */
async function twoSubjectAppWithoutProfile(storage = createMemoryStorage()) {
  const packs = {
    a: createTestPack('a', undefined, createTestContent('a')),
    b: createTestPack('b', undefined, createTestContent('b')),
  };
  const loads = {
    a: vi.fn((): Promise<LoadedSubject> =>
      Promise.resolve({ pack: packs.a, locales: createTestLocales('Title A') }),
    ),
    b: vi.fn((): Promise<LoadedSubject> =>
      Promise.resolve({ pack: packs.b, locales: createTestLocales('Title B') }),
    ),
  };
  const entries: SubjectEntry[] = [
    createTestEntry(packs.a, { names: { en: 'Alpha' }, load: loads.a }),
    createTestEntry(packs.b, { names: { en: 'Beta' }, load: loads.b }),
  ];
  const app = createAppServices(entries, APP, storage);
  const services = await app.activate(await app.initialSubjectId());
  // The parent-code file is a browser download, none in jsdom.
  const testServices = {
    ...services,
    deps: { ...services.deps, passwordFile: createFakePasswordFileWriter() },
  };
  await setupParentPassword(testServices.deps, '1234');
  return { app, services: testServices, loads, storage };
}

/** {@link twoSubjectAppWithoutProfile} plus one profile `Mia`. */
async function twoSubjectApp(storage = createMemoryStorage()) {
  const built = await twoSubjectAppWithoutProfile(storage);
  const profile = await createProfile(built.services.deps, 'Mia', 'fox');
  await selectProfile(built.services.deps, profile.id);
  return { ...built, profileId: profile.id };
}

async function pickMia(): Promise<void> {
  fireEvent.click(await screen.findByRole('button', { name: /Mia/ }));
}

const OFFER_NO = 'No, start at World 1';

/** Placement offer's "No": on to the Home of the subject just opened. */
async function declineOffer(): Promise<void> {
  fireEvent.click(await screen.findByRole('button', { name: OFFER_NO }));
}

describe('two subjects in one app', () => {
  it('profile select → hub → a → Home (a) → Subjects → b → Home (b), packs loaded once each', async () => {
    const { services, loads, app, profileId } = await twoSubjectApp();
    // `Mia`'s progress in `a`: three stars, shown on `a`'s Home and nowhere in `b`.
    await app.subjectData.a?.progress.saveLesson(
      makeProgress({ id: 'lp', profileId, lessonId: 'a-lesson', bestStars: { 'a-lesson-01': 3 } }),
    );
    render(<App services={services} />);

    await pickMia();
    await screen.findByRole('heading', { level: 1, name: 'What shall we learn?' });
    expect(screen.getAllByTestId(/^subject-tile-/)).toHaveLength(2);
    // Mia has opened no subject yet: none is current, though `a` is the active one.
    expect(screen.getByTestId('subject-tile-a').getAttribute('aria-current')).toBeNull();
    expect(screen.getByTestId('subject-tile-b').getAttribute('aria-current')).toBeNull();

    fireEvent.click(screen.getByTestId('subject-tile-a'));
    await screen.findByRole('heading', { level: 1, name: 'Title A' });
    expect(screen.getByTestId('stars-pill').textContent).toBe('3');

    fireEvent.click(screen.getByRole('button', { name: 'Subjects' }));
    await screen.findByRole('heading', { level: 1, name: 'What shall we learn?' });
    // After the first selection, the chosen subject is the current one.
    expect(screen.getByTestId('subject-tile-a').getAttribute('aria-current')).toBe('true');
    expect(screen.getByTestId('subject-tile-b').getAttribute('aria-current')).toBeNull();
    fireEvent.click(screen.getByTestId('subject-tile-b'));
    await declineOffer();
    await screen.findByRole('heading', { level: 1, name: 'Title B' });
    expect(screen.getByTestId('stars-pill').textContent).toBe('0');

    expect(loads.a).toHaveBeenCalledTimes(1);
    expect(loads.b).toHaveBeenCalledTimes(1);
  });

  it("remembers the profile's last subject: the hub highlights it after the next profile select", async () => {
    const { services, app } = await twoSubjectApp();
    render(<App services={services} />);
    await pickMia();
    fireEvent.click(await screen.findByTestId('subject-tile-b'));
    await declineOffer();
    await screen.findByRole('heading', { level: 1, name: 'Title B' });

    expect(await app.initialSubjectId()).toBe('b');
    const settings = await services.deps.settings.get();
    expect(Object.values(settings.lastSubjectByProfile ?? {})).toEqual(['b']);

    fireEvent.click(screen.getByRole('button', { name: 'Switch player' }));
    await pickMia();
    await screen.findByRole('heading', { level: 1, name: 'What shall we learn?' });
    await waitFor(() => {
      expect(screen.getByTestId('subject-tile-b').getAttribute('aria-current')).toBe('true');
    });
    expect(screen.getByTestId('subject-tile-a').getAttribute('aria-current')).toBeNull();
  });

  it('a later start opens in the last subject', async () => {
    const first = await twoSubjectApp();
    render(<App services={first.services} />);
    await pickMia();
    fireEvent.click(await screen.findByTestId('subject-tile-b'));
    await declineOffer();
    await screen.findByRole('heading', { level: 1, name: 'Title B' });

    const again = await twoSubjectApp(first.storage);

    expect(again.services.subjectId).toBe('b');
  });
});

describe('placement on the first entry into a subject', () => {
  /** Picker (no profile yet) → New player → "Zoe" → avatar → the hub. */
  async function createPlayerZoe(): Promise<void> {
    fireEvent.click(await screen.findByRole('button', { name: 'New player' }));
    fireEvent.change(await screen.findByPlaceholderText('Your name'), {
      target: { value: 'Zoe' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(await screen.findByRole('button', { name: "Let's play!" }));
    await screen.findByRole('heading', { level: 1, name: 'What shall we learn?' });
  }

  async function backToHub(): Promise<void> {
    fireEvent.click(screen.getByRole('button', { name: 'Subjects' }));
    await screen.findByRole('heading', { level: 1, name: 'What shall we learn?' });
  }

  it('new player → hub → a → offer; "No" → Home; hub → a again → Home; b (fresh) → offer', async () => {
    const { services } = await twoSubjectAppWithoutProfile();
    render(<App services={services} />);

    await createPlayerZoe();
    fireEvent.click(screen.getByTestId('subject-tile-a'));
    await screen.findByText('Do you already know some?');
    expect(screen.queryByRole('heading', { name: 'Title A' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: OFFER_NO }));
    await screen.findByRole('heading', { level: 1, name: 'Title A' });
    expect(screen.queryByText('Do you already know some?')).toBeNull();

    await backToHub();
    fireEvent.click(screen.getByTestId('subject-tile-a'));
    await screen.findByRole('heading', { level: 1, name: 'Title A' });
    expect(screen.queryByText('Do you already know some?')).toBeNull();

    await backToHub();
    fireEvent.click(screen.getByTestId('subject-tile-b'));
    await screen.findByText('Do you already know some?');
    expect(screen.queryByRole('heading', { name: 'Title B' })).toBeNull();
  });

  it('a subject the child already has progress in opens straight on Home', async () => {
    const { services, app, profileId } = await twoSubjectApp();
    await app.subjectData.b?.progress.saveLesson(
      makeProgress({
        id: 'lp-b',
        profileId,
        lessonId: 'b-lesson',
        bestStars: { 'b-lesson-01': 2 },
      }),
    );
    render(<App services={services} />);
    await pickMia();

    fireEvent.click(await screen.findByTestId('subject-tile-b'));

    await screen.findByRole('heading', { level: 1, name: 'Title B' });
    expect(screen.getByTestId('stars-pill').textContent).toBe('2');
    expect(screen.queryByText('Do you already know some?')).toBeNull();
  });
});

describe('app-level texts', () => {
  it('the first run names the app, not the active subject', async () => {
    const storage = createMemoryStorage();
    const packs = [
      createTestPack('a', undefined, createTestContent('a')),
      createTestPack('b', undefined, createTestContent('b')),
    ];
    const entries = packs.map((pack) =>
      createTestEntry(pack, { locales: createTestLocales(`Title ${pack.core.id.toUpperCase()}`) }),
    );
    const app = createAppServices(entries, APP, storage);
    const services = await app.activate('a');

    render(<App services={services} />);

    await screen.findByRole('heading', { level: 1, name: 'Test app' });
    expect(screen.queryByRole('heading', { name: 'Title A' })).toBeNull();
  });
});

describe('one subject in the app', () => {
  async function oneSubjectApp() {
    const pack = createTestPack('solo', undefined, createTestContent('solo'));
    const app = createAppServices(
      [createTestEntry(pack, { locales: createTestLocales('Title Solo') })],
      APP,
      createMemoryStorage(),
    );
    const services = await app.activate('solo');
    const testServices = {
      ...services,
      deps: { ...services.deps, passwordFile: createFakePasswordFileWriter() },
    };
    await setupParentPassword(testServices.deps, '1234');
    const profile = await createProfile(testServices.deps, 'Mia', 'fox');
    await selectProfile(testServices.deps, profile.id);
    return testServices;
  }

  it('profile select goes straight to Home: no hub, no Subjects button', async () => {
    const services = await oneSubjectApp();
    render(<App services={services} />);

    await pickMia();

    await screen.findByRole('button', { name: 'Switch player' });
    expect(screen.queryByRole('heading', { name: 'What shall we learn?' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Subjects' })).toBeNull();
    expect(screen.queryByTestId(/^subject-tile-/)).toBeNull();
  });
});
