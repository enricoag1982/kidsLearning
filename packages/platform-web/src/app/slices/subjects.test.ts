import i18next from 'i18next';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '@learn/platform-core';
import { createProfile, parentUnlock, submitAssessment } from '@learn/platform-core';
import { makeContentSource, makeProgress } from '@learn/platform-core/testing';
import { initI18n, setSubjectLocales } from '../../i18n.ts';
import { createMemoryStorage } from '../../testing/memory-storage.ts';
import { createTestContent, createTestEntry, createTestPack } from '../../testing/test-pack.ts';
import { createAppServices } from '../services.ts';
import type { AppServices } from '../services.ts';
import { createAppStore } from '../store.ts';
import type { AppStore } from '../store.ts';
import type { SubjectEntry, SubjectWeb } from '../subject.ts';

const APP: Omit<AppConfig, 'version'> = {
  title: 'Test app',
  storagePrefix: 'app:',
  backupAppId: 'app',
  backupFilePrefix: 'app',
  parentCodeFilePrefix: 'app-code',
};

const LOCALES = {
  a: { en: { common: { app: { title: 'Title A' }, 'only-a': 'A only' } } },
  b: { en: { common: { app: { title: 'Title B' }, 'only-b': 'B only' } } },
};

interface Setup {
  readonly storage: Storage;
  readonly app: AppServices;
  readonly store: AppStore;
  readonly loads: { readonly a: ReturnType<typeof vi.fn>; readonly b: ReturnType<typeof vi.fn> };
  readonly profileId: string;
}

function names(store: AppStore): readonly string[] {
  return store.getState().stack.map((route) => route.name);
}

/** Entries for subjects `a` and `b` (each with its own one-lesson content and locale) over `storage`; `overrides` swap a pack. */
function entriesFor(overrides: { readonly a?: SubjectWeb; readonly b?: SubjectWeb } = {}): {
  readonly entries: readonly SubjectEntry[];
  readonly loads: Setup['loads'];
} {
  const packs = {
    a: overrides.a ?? createTestPack('a', undefined, createTestContent('a')),
    b: overrides.b ?? createTestPack('b', undefined, createTestContent('b')),
  };
  const loads = {
    a: vi.fn(() => Promise.resolve({ pack: packs.a, locales: LOCALES.a })),
    b: vi.fn(() => Promise.resolve({ pack: packs.b, locales: LOCALES.b })),
  };
  return {
    entries: [
      createTestEntry(packs.a, { names: { en: 'Subject A' }, load: loads.a }),
      createTestEntry(packs.b, { names: { en: 'Subject B' }, load: loads.b }),
    ],
    loads,
  };
}

async function setup(
  options: {
    readonly storage?: Storage;
    readonly overrides?: { readonly a?: SubjectWeb; readonly b?: SubjectWeb };
    readonly profileId?: string;
  } = {},
): Promise<Setup> {
  const storage = options.storage ?? createMemoryStorage();
  const { entries, loads } = entriesFor(options.overrides);
  const app = createAppServices(entries, APP, storage);
  const store = createAppStore(await app.activate(await app.initialSubjectId()));
  // i18next stays initialised across tests: the start texts are the active subject's, as `mountApp` loads them.
  setSubjectLocales(store.getState().services.locales);
  const profileId =
    options.profileId ?? (await createProfile(store.getState().services.deps, 'Mia', 'fox')).id;
  return { storage, app, store, loads, profileId };
}

beforeAll(() => {
  initI18n({});
});

describe('profile select with several subjects', () => {
  it('lands on the subjects hub, not Home', async () => {
    const { store, profileId } = await setup();

    await store.getState().selectProfileAndHome(profileId);

    expect(names(store)).toEqual(['subjects']);
    expect(store.getState().subjectId).toBe('a');
    expect(store.getState().profile?.nickname).toBe('Mia');
  });

  it("first activates the profile's last subject, so the hub and a later Home match", async () => {
    const first = await setup();
    await first.store.getState().selectProfileAndHome(first.profileId);
    await first.store.getState().selectSubject('b');

    // A new app start over the same storage: `lastProfileId` → `b`.
    const again = await setup({ storage: first.storage, profileId: first.profileId });
    expect(again.store.getState().subjectId).toBe('b');

    // Another start that begins on `a` (profile unknown at mount): picking the profile switches to its last subject.
    const other = createAppStore(await again.app.activate('a'));
    expect(other.getState().subjectId).toBe('a');
    await other.getState().selectProfileAndHome(first.profileId);
    expect(other.getState().subjectId).toBe('b');
    expect(other.getState().pack.core.id).toBe('b');
    expect(names(other)).toEqual(['subjects']);
  });

  it('keeps the active subject for a profile without a last one', async () => {
    const { store, profileId } = await setup();
    await store.getState().selectProfileAndHome(profileId);
    await store.getState().selectSubject('b');
    const other = await createProfile(store.getState().services.deps, 'Leo', 'bear');

    await store.getState().selectProfileAndHome(other.id);

    expect(store.getState().subjectId).toBe('b');
    expect(names(store)).toEqual(['subjects']);
  });

  it('a new player goes to the hub, without a placement offer', async () => {
    const { store } = await setup();
    store.getState().reset({ name: 'picker' }, { name: 'new-player' });

    await store.getState().finishNewPlayer('Zoe', 'cat');

    expect(names(store)).toEqual(['subjects']);
    expect(store.getState().profile?.nickname).toBe('Zoe');
  });
});

describe('profile select with one subject', () => {
  async function single() {
    const pack = createTestPack('solo', undefined, createTestContent('solo'));
    const app = createAppServices([createTestEntry(pack)], APP, createMemoryStorage());
    const store = createAppStore(await app.activate('solo'));
    const profile = await createProfile(store.getState().services.deps, 'Mia', 'fox');
    return { store, profile };
  }

  it('goes straight to Home', async () => {
    const { store, profile } = await single();

    await store.getState().selectProfileAndHome(profile.id);

    expect(names(store)).toEqual(['home']);
  });

  it('a new player gets Home with the placement offer on top', async () => {
    const { store } = await single();
    store.getState().reset({ name: 'picker' }, { name: 'new-player' });

    await store.getState().finishNewPlayer('Zoe', 'cat');

    expect(names(store)).toEqual(['home', 'placement-offer']);
  });
});

describe('selectSubject', () => {
  let s: Setup;
  beforeEach(async () => {
    s = await setup();
    await s.store.getState().selectProfileAndHome(s.profileId);
  });

  it('swaps services, pack and texts, and lands on Home above the hub (the placement offer on top: fresh subject)', async () => {
    await s.store.getState().selectSubject('b');

    const state = s.store.getState();
    expect(state.subjectId).toBe('b');
    expect(state.pack.core.id).toBe('b');
    expect(state.services.subjectId).toBe('b');
    expect(state.services.deps.subjectId).toBe('b');
    expect(names(s.store)).toEqual(['subjects', 'home', 'placement-offer']);
    expect(state.journey?.lessons.map((lesson) => lesson.id)).toEqual(['b-lesson']);
    expect(i18next.t('app.title')).toBe('Title B');
  });

  it('removes the previous subject texts, and brings them back on the way back', async () => {
    await s.store.getState().selectSubject('a');
    expect(i18next.t('only-a')).toBe('A only');

    await s.store.getState().selectSubject('b');
    expect(i18next.t('only-a')).toBe('only-a');
    expect(i18next.t('only-b')).toBe('B only');

    await s.store.getState().selectSubject('a');
    expect(i18next.t('app.title')).toBe('Title A');
    expect(i18next.t('only-b')).toBe('only-b');
  });

  it('keeps progress apart per subject and reloads it from the subject on every switch', async () => {
    const { deps } = s.store.getState().services;
    await deps.progress.saveLesson(
      makeProgress({ id: 'lp', profileId: s.profileId, lessonId: 'a-lesson' }),
    );
    await s.store.getState().refreshProgress();
    expect(s.store.getState().progress.map((entry) => entry.lessonId)).toEqual(['a-lesson']);

    await s.store.getState().selectSubject('b');
    expect(s.store.getState().progress).toEqual([]);
    expect(await s.app.subjectData.b?.progress.listLessons(s.profileId)).toEqual([]);

    await s.store.getState().selectSubject('a');
    expect(s.store.getState().progress.map((entry) => entry.lessonId)).toEqual(['a-lesson']);
  });

  it('persists the last subject per profile', async () => {
    await s.store.getState().selectSubject('b');

    const settings = await s.store.getState().services.deps.settings.get();
    expect(settings.lastSubjectByProfile).toEqual({ [s.profileId]: 'b' });
    expect(await s.app.initialSubjectId()).toBe('b');
  });

  it('loads each pack once however often the user switches', async () => {
    await s.store.getState().selectSubject('b');
    await s.store.getState().selectSubject('a');
    await s.store.getState().selectSubject('b');

    expect(s.loads.a).toHaveBeenCalledTimes(1);
    expect(s.loads.b).toHaveBeenCalledTimes(1);
  });

  it("clears the previous subject's session state", async () => {
    s.store.setState({ todayActivityIndex: 3, stepIndex: 2 });

    await s.store.getState().selectSubject('b');

    expect(s.store.getState().todayActivityIndex).toBe(0);
    expect(s.store.getState().stepIndex).toBe(0);
    expect(s.store.getState().todayPlan).toBeNull();
  });

  it('goToSubjects resets to the hub alone', async () => {
    await s.store.getState().selectSubject('b');

    s.store.getState().goToSubjects();

    expect(names(s.store)).toEqual(['subjects']);
    expect(s.store.getState().subjectId).toBe('b');
  });

  it('stays put when the subject cannot load', async () => {
    const broken: SubjectEntry = {
      ...createTestEntry(createTestPack('c')),
      load: () => Promise.reject(new Error('chunk missing')),
    };
    const app = createAppServices(
      [createTestEntry(createTestPack('a', undefined, createTestContent('a'))), broken],
      APP,
      createMemoryStorage(),
    );
    const store = createAppStore(await app.activate('a'));
    const profile = await createProfile(store.getState().services.deps, 'Mia', 'fox');
    await store.getState().selectProfileAndHome(profile.id);

    await expect(store.getState().selectSubject('c')).rejects.toThrow('chunk missing');

    expect(store.getState().subjectId).toBe('a');
    expect(names(store)).toEqual(['subjects']);
  });
});

describe('subject store slices', () => {
  const bSlice = { bField: 1 };

  function packB(createSlice: () => object, homeReset?: object): SubjectWeb {
    return {
      ...createTestPack('b', undefined, createTestContent('b')),
      createSlice,
      ...(homeReset === undefined ? {} : { homeReset }),
    };
  }

  function field(store: AppStore, name: string): unknown {
    return (store.getState() as unknown as Record<string, unknown>)[name];
  }

  it("installs another subject's slice once, on its first activation", async () => {
    const createSlice = vi.fn(() => bSlice);
    const { store, profileId } = await setup({ overrides: { b: packB(createSlice) } });
    await store.getState().selectProfileAndHome(profileId);
    expect(field(store, 'bField')).toBeUndefined();
    expect(createSlice).not.toHaveBeenCalled();

    await store.getState().selectSubject('b');
    await store.getState().selectSubject('a');
    await store.getState().selectSubject('b');

    expect(field(store, 'bField')).toBe(1);
    expect(createSlice).toHaveBeenCalledTimes(1);
  });

  it('throws when a slice field is already in the state, and changes nothing', async () => {
    const { store, profileId } = await setup({
      overrides: { b: packB(() => ({ stepIndex: 5 })) },
    });
    await store.getState().selectProfileAndHome(profileId);

    await expect(store.getState().selectSubject('b')).rejects.toThrow(
      'subject slice field clash: stepIndex',
    );

    expect(store.getState().subjectId).toBe('a');
    expect(store.getState().stepIndex).toBe(0);
  });

  it("applies the previous subject's homeReset on a switch", async () => {
    const a: SubjectWeb = {
      ...createTestPack('a', undefined, createTestContent('a')),
      createSlice: () => ({ aField: 'open' }),
      homeReset: { aField: null },
    };
    const { store, profileId } = await setup({ overrides: { a } });
    await store.getState().selectProfileAndHome(profileId);
    expect(field(store, 'aField')).toBe('open');

    await store.getState().selectSubject('b');

    expect(field(store, 'aField')).toBeNull();
  });
});

describe('placement offer on the first entry into a subject', () => {
  let s: Setup;
  beforeEach(async () => {
    s = await setup();
    await s.store.getState().selectProfileAndHome(s.profileId);
  });

  /** Waits for a fire-and-forget navigation (`declinePlacement`, `finishPlacement`, …) to land. */
  async function landsOn(expected: readonly string[]): Promise<void> {
    await vi.waitFor(() => {
      expect(names(s.store)).toEqual(expected);
    });
  }

  it('is offered above Home and the hub on a fresh subject', async () => {
    await s.store.getState().selectSubject('a');

    expect(names(s.store)).toEqual(['subjects', 'home', 'placement-offer']);
    expect(s.store.getState().subjectId).toBe('a');
  });

  it('declining lands on Home of that subject with the hub below, and the offer is not repeated this session', async () => {
    await s.store.getState().selectSubject('a');

    s.store.getState().declinePlacement();
    await landsOn(['subjects', 'home']);
    expect(s.store.getState().subjectId).toBe('a');

    s.store.getState().goToSubjects();
    await s.store.getState().selectSubject('a');
    expect(names(s.store)).toEqual(['subjects', 'home']);
  });

  it('accepting plays the subject worlds, finishing lands on Home with the hub below', async () => {
    await s.store.getState().selectSubject('b');

    s.store.getState().acceptPlacement();
    await landsOn(['subjects', 'home', 'placement']);
    const top = s.store.getState().stack[2];
    expect(top?.name === 'placement' && top.plan.map((entry) => entry.world.id)).toEqual([
      'b-world',
    ]);

    s.store.getState().finishPlacement();
    await landsOn(['subjects', 'home']);
    expect(s.store.getState().subjectId).toBe('b');
  });

  it('is offered again in the other, still fresh subject', async () => {
    await s.store.getState().selectSubject('a');
    s.store.getState().declinePlacement();
    await landsOn(['subjects', 'home']);

    s.store.getState().goToSubjects();
    await s.store.getState().selectSubject('b');

    expect(names(s.store)).toEqual(['subjects', 'home', 'placement-offer']);
  });

  it('is offered once per profile', async () => {
    await s.store.getState().selectSubject('a');
    const other = await createProfile(s.store.getState().services.deps, 'Leo', 'bear');

    await s.store.getState().selectProfileAndHome(other.id);
    await s.store.getState().selectSubject('a');

    expect(names(s.store)).toEqual(['subjects', 'home', 'placement-offer']);
    expect(s.store.getState().profile?.id).toBe(other.id);
  });

  it('is not persisted: a new app session over the same storage offers it again', async () => {
    await s.store.getState().selectSubject('a');
    s.store.getState().declinePlacement();
    await landsOn(['subjects', 'home']);

    const again = await setup({ storage: s.storage, profileId: s.profileId });
    await again.store.getState().selectProfileAndHome(s.profileId);
    await again.store.getState().selectSubject('a');

    expect(names(again.store)).toEqual(['subjects', 'home', 'placement-offer']);
  });

  it('is not offered in a subject the profile has progress in', async () => {
    await s.app.subjectData.b?.progress.saveLesson(
      makeProgress({ id: 'lp-b', profileId: s.profileId, lessonId: 'b-lesson' }),
    );

    await s.store.getState().selectSubject('b');

    expect(names(s.store)).toEqual(['subjects', 'home']);
  });

  it('is not offered in a subject with an assessment result or an unlock', async () => {
    const depsB = (await s.app.activate('b')).deps;
    await submitAssessment(depsB, {
      profileId: s.profileId,
      kind: 'placement',
      scope: { type: 'world', worldId: 'b-world' },
      results: [false, false],
      score: { correct: 0, total: 2, passed: false },
    });
    await s.store.getState().selectSubject('b');
    expect(names(s.store)).toEqual(['subjects', 'home']);

    const depsA = (await s.app.activate('a')).deps;
    await parentUnlock(depsA, s.profileId, { type: 'world', worldId: 'a-world' });
    await s.store.getState().selectSubject('a');
    expect(names(s.store)).toEqual(['subjects', 'home']);
  });

  it("another subject's progress does not count", async () => {
    await s.app.subjectData.a?.progress.saveLesson(
      makeProgress({ id: 'lp-a', profileId: s.profileId, lessonId: 'a-lesson' }),
    );

    await s.store.getState().selectSubject('b');

    expect(names(s.store)).toEqual(['subjects', 'home', 'placement-offer']);
  });

  it('is not offered when the subject has nothing to place (a world without lessons)', async () => {
    const noLessons = createTestPack(
      'd',
      undefined,
      makeContentSource({ catalog: createTestContent('d').catalog?.() }),
    );
    const app = createAppServices(
      [
        createTestEntry(createTestPack('a', undefined, createTestContent('a'))),
        createTestEntry(noLessons),
      ],
      APP,
      createMemoryStorage(),
    );
    const store = createAppStore(await app.activate('a'));
    const profile = await createProfile(store.getState().services.deps, 'Mia', 'fox');
    await store.getState().selectProfileAndHome(profile.id);

    await store.getState().selectSubject('d');
    expect(names(store)).toEqual(['subjects', 'home']);
  });

  it('a one-subject app never offers it from selectSubject', async () => {
    const pack = createTestPack('solo', undefined, createTestContent('solo'));
    const app = createAppServices([createTestEntry(pack)], APP, createMemoryStorage());
    const store = createAppStore(await app.activate('solo'));
    const profile = await createProfile(store.getState().services.deps, 'Mia', 'fox');
    await store.getState().selectProfileAndHome(profile.id);

    await store.getState().selectSubject('solo');

    expect(names(store)).toEqual(['subjects', 'home']);
  });
});
