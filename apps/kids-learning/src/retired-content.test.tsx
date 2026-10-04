// Retired content (docs/subjects/math/plan.md G8): a later version removed content that stored progress still refers to
// (math's demo world `adding` retires in m13.10). The recorded export of the app at tag `m12.5` holds that world's progress, its
// review stats, its boss win and its badge: loaded against a math catalog that has none of it, nothing breaks or starves, the
// retired lessons' stars stay in the total ("nothing is lost"), and the other subjects are untouched.
//
// The replacement math content is derived from whatever the current math content is (its first lesson renamed into a new world
// with a new concept), never from `adding` itself, so this test keeps passing unchanged once `adding` is really gone.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import type { InitOptions } from 'i18next';
import { describe, expect, it } from 'vitest';
import type { ConceptStats, ContentSource, Lesson, World } from '@learn/platform-core';
import { buildChildReport, loadTodaySession, loadWarmUp } from '@learn/platform-core';
import { parseBackupFile } from '@learn/platform-core/backup';
import { importMerged, planImport } from '@learn/platform-core/merge';
import { makeContentSource } from '@learn/platform-core/testing';
import { createAppStore, StoreProvider } from '@learn/platform-web/app/store.ts';
import { createAppServices } from '@learn/platform-web/app/services.ts';
import type { Services } from '@learn/platform-web/app/services.ts';
import { PackProvider } from '@learn/platform-web/app/subject.ts';
import type { SubjectEntry } from '@learn/platform-web/app/subject.ts';
import { initI18n } from '@learn/platform-web/i18n.ts';
import { createMemoryStorage } from '@learn/platform-web/testing/memory-storage.ts';
import { DenScreen } from '@learn/platform-web/ui/DenScreen.tsx';
import { HomeScreen } from '@learn/platform-web/ui/HomeScreen.tsx';
import { JourneyScreen } from '@learn/platform-web/ui/JourneyScreen.tsx';
import { PracticeScreen } from '@learn/platform-web/ui/PracticeScreen.tsx';
import { chessEntry } from '@learn/subject-chess/entry';
import { codingEntry } from '@learn/subject-coding/entry';
import { mathEntry } from '@learn/subject-math/entry';
import { KIDS_APP_CONFIG } from './app-config.ts';

const FIXTURE = join(
  import.meta.dirname,
  '..',
  'test-fixtures',
  'storage',
  'kids-m12.5',
  'backup-all.json',
);

/** Long after the recording: every review recorded in the fixture is due. */
const LATER = new Date('2099-01-01T00:00:00.000Z');

const LIVE_CONCEPT = 'replacement-concept';

/** The current math content with nothing the fixture refers to: one new world with one lesson of a new concept, the first rank,
 * and the current badges but the world-mastered one. Derived from the current content so it stays valid when that changes. */
function replacementContent(base: ContentSource): ContentSource {
  const catalog = base.catalog?.();
  const template = base.lessons()[0];
  const baseTrack = catalog?.tracks[0];
  const baseWorld = baseTrack?.worlds[0];
  const startRank = catalog?.ranks[0];
  const exercise = template?.exercises[0];
  if (!template || !baseTrack || !baseWorld || !startRank || !exercise) {
    throw new Error('the math content has no lesson to derive the replacement content from');
  }
  const world: World = {
    id: 'replacement-world',
    track: baseTrack.id,
    order: 1,
    habitat: baseWorld.habitat,
    titleKey: baseWorld.titleKey,
  };
  const lesson: Lesson = {
    id: 'replacement-lesson',
    world: world.id,
    order: 1,
    concept: LIVE_CONCEPT,
    character: template.character,
    titleKey: template.titleKey,
    storyKey: template.storyKey,
    demo: template.demo,
    guided: [],
    exercises: [{ ...exercise, id: 'replacement-01', concept: LIVE_CONCEPT }],
  };
  return makeContentSource({
    lessons: [lesson],
    minigames: [],
    catalog: {
      tracks: [{ ...baseTrack, worlds: [world] }],
      ranks: [startRank],
    },
    badges: (base.badges?.() ?? []).filter((badge) => badge.id !== 'first-sums'),
  });
}

interface MathApp {
  readonly services: Services;
  readonly profileId: string;
}

/** The real chess / math / coding entries over fresh storage with the recorded export imported (Mia), math active and the clock
 * at {@link LATER}. `retired`: math serves {@link replacementContent} instead of its own. */
async function mathApp(retired: boolean): Promise<MathApp> {
  const loaded = await mathEntry.load();
  const original = loaded.pack.createServices();
  const mathWithoutAdding: SubjectEntry = {
    ...mathEntry,
    load: () =>
      Promise.resolve({
        ...loaded,
        pack: {
          ...loaded.pack,
          createServices: () => ({ ...original, content: replacementContent(original.content) }),
        },
      }),
  };
  const app = createAppServices(
    [chessEntry, retired ? mathWithoutAdding : mathEntry, codingEntry],
    KIDS_APP_CONFIG,
    createMemoryStorage(),
  );
  const active = await app.activate('math');
  initI18n(active.locales as InitOptions['resources']);
  const services: Services = {
    ...active,
    deps: { ...active.deps, clock: { now: () => LATER } },
  };

  const incoming = await parseBackupFile(services.deps, readFileSync(FIXTURE, 'utf8'));
  const plan = await planImport(services.deps, incoming);
  await importMerged(
    services.deps,
    incoming,
    plan.children.map((child) => child.defaultChoice),
  );
  const [mia] = await services.deps.profiles.list();
  if (mia === undefined) throw new Error('the recorded export brought no child');
  return { services, profileId: mia.id };
}

/** `ui` under a store with Mia selected (what the app does after the picker and the hub). */
async function renderScreen(ui: ReactElement, { services, profileId }: MathApp): Promise<void> {
  const store = createAppStore(services);
  await store.getState().selectProfileAndHome(profileId);
  render(
    <StoreProvider value={store}>
      <PackProvider value={services.pack}>{ui}</PackProvider>
    </StoreProvider>,
  );
}

/** Every star the recorded export holds for math's lessons (exercise stars and boss stars), read from the file itself. */
function recordedMathStars(): number {
  const file = JSON.parse(readFileSync(FIXTURE, 'utf8')) as {
    readonly data: Readonly<
      Record<
        string,
        {
          readonly subjects: {
            readonly math: {
              readonly lessonProgress: readonly {
                readonly bestStars: Readonly<Record<string, number>>;
                readonly bossStars: number;
              }[];
            };
          };
        }
      >
    >;
  };
  let total = 0;
  for (const profile of Object.values(file.data)) {
    for (const lesson of profile.subjects.math.lessonProgress) {
      total += lesson.bossStars + Object.values(lesson.bestStars).reduce((a, b) => a + b, 0);
    }
  }
  return total;
}

function dueLiveStats(profileId: string): ConceptStats {
  return {
    id: 'cs-live',
    profileId,
    conceptId: LIVE_CONCEPT,
    recent: [true, false],
    box: 1,
    dueAt: '2098-12-01T00:00:00.000Z',
    createdAt: '2026-10-04T00:00:00.000Z',
    updatedAt: '2026-10-04T00:00:00.000Z',
  };
}

describe('math progress recorded at m12.5, math content without the retired world adding', () => {
  it('sanity: against the content it was recorded with, the same progress is in review and due', async () => {
    const { services, profileId } = await mathApp(false);
    const tasks = await loadWarmUp(services.deps, profileId);
    expect(tasks.length).toBeGreaterThan(0);
    expect(recordedMathStars()).toBeGreaterThan(0);
  });

  it('warm-up plans only live concepts: none while every concept in review is retired, the live one once it is due', async () => {
    const { services, profileId } = await mathApp(true);
    expect(await loadWarmUp(services.deps, profileId)).toEqual([]);

    await services.deps.progress.saveConceptStats(dueLiveStats(profileId));
    const tasks = await loadWarmUp(services.deps, profileId);
    expect(tasks.map((task) => task.conceptId)).toEqual([LIVE_CONCEPT]);
  });

  it("Today's session has no warm-up, only the live lesson", async () => {
    const { services, profileId } = await mathApp(true);
    const plan = await loadTodaySession(services.deps, profileId);
    expect(plan.activities.map((activity) => activity.kind)).toEqual(['lesson']);
  });

  it('Practice counts no due warm-up for retired concepts (it would have counted them against the recorded content)', async () => {
    const retired = await mathApp(true);
    await renderScreen(<PracticeScreen />, retired);
    await screen.findByText('All done for today!');
    expect(screen.queryByText(/due today/)).toBeNull();
    expect(screen.getByRole('button', { name: /Daily warm-up/ }).hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('Practice counts them against the content the progress was recorded with (sanity for the test above)', async () => {
    const original = await mathApp(false);
    await renderScreen(<PracticeScreen />, original);
    await screen.findByText(/\d+ due today/);
  });

  it('the parent report lists no retired concept; the total stars keep the retired lessons', async () => {
    const { services, profileId } = await mathApp(true);
    const report = await buildChildReport(services.deps, profileId);

    expect(report.conceptAccuracy).toEqual([]);
    expect(report.weakConcepts).toEqual([]);
    expect(report.totalStars).toBe(recordedMathStars());
    expect(report.worlds.map((entry) => entry.world.id)).toEqual(['replacement-world']);
    expect(report.worlds[0]?.starsEarned).toBe(0);
    // An earned badge stays recorded even though the content no longer has it.
    expect(report.badges.map((badge) => badge.badgeId)).toContain('first-sums');
  });

  it('Home renders with every recorded star counted', async () => {
    const app = await mathApp(true);
    await renderScreen(<HomeScreen />, app);
    const pill = await screen.findByTestId('stars-pill');
    expect(pill.getAttribute('aria-label')).toBe(`${String(recordedMathStars())} stars`);
    // The replacement lesson is what Today offers; the retired world's boss and lessons are not.
    expect(screen.getByRole('button', { name: /Start/ })).toBeTruthy();
  });

  it('the Journey renders the replacement world only', async () => {
    const app = await mathApp(true);
    await renderScreen(<JourneyScreen />, app);
    await screen.findAllByRole('button');
    expect(screen.queryByText(/Number Parade/)).toBeNull();
  });

  it('My Den renders with the retired badge recorded', async () => {
    const app = await mathApp(true);
    await renderScreen(<DenScreen />, app);
    await screen.findAllByRole('button');
    expect(screen.queryByText('First Sums')).toBeNull();
  });

  it('the other subjects keep their recorded progress', async () => {
    const { services, profileId } = await mathApp(true);
    const subjectData = services.deps.subjectData;
    expect((await subjectData?.chess?.progress.listLessons(profileId))?.length).toBe(1);
    expect(
      (await subjectData?.coding?.progress.listLessons(profileId))?.map((entry) => entry.lessonId),
    ).toEqual(expect.arrayContaining(['seq-order', 'seq-arrows']));
    // The retired lessons' own rows are kept, not dropped.
    expect(
      (await subjectData?.math?.progress.listLessons(profileId))?.map((entry) => entry.lessonId),
    ).toEqual(expect.arrayContaining(['add-within-5', 'add-within-10']));
  });
});
