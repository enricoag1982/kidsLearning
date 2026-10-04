// A lesson of `number-line` exercises end to end: the real math pack (its kind UIs, its notes) over a one-lesson content, opened in the
// real App and played through the real number line UI. Each exercise is solved by the kind's own e2e driver from its `solution()` (the
// way a Playwright spec would: Home, arrow presses on the slider, Check), in jsdom. No shipped lesson uses the kind yet (World 1 does,
// m13.10), so the lesson is `LINE_LESSON` (`testing/line-fixture.ts`).
import { configure, fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  createProfile,
  loadProgress,
  selectProfile,
  setupParentPassword,
} from '@learn/platform-core';
import type { AppConfig } from '@learn/platform-core';
import { makeContentSource } from '@learn/platform-core/testing';
import App from '@learn/platform-web/App.tsx';
import { createAppServices } from '@learn/platform-web/app/services.ts';
import type { LoadedSubject, SubjectWeb } from '@learn/platform-web/app/subject.ts';
import { tContent } from '@learn/platform-web/content-text.ts';
import { createFakePasswordFileWriter } from '@learn/platform-web/testing/fake-password-file-writer.ts';
import { jsdomPage } from '@learn/platform-web/testing/jsdom-page.ts';
import { createMemoryStorage } from '@learn/platform-web/testing/memory-storage.ts';
import { createTestEntry } from '@learn/platform-web/testing/test-pack.ts';
import en from '../../dist/locales/en.json';
import type { MathExerciseDef } from '../core/types.ts';
import { kindOf } from '../kinds/index.ts';
import type { MathAction, MathState } from '../kinds/index.ts';
import { solutionOf } from '../kinds/solutions.ts';
import { mathKindE2EOf } from './kinds/e2e-registry.ts';
import { mathWeb } from './math-pack.ts';
import { LINE_CATALOG, LINE_LESSON, LINE_TEXTS } from './testing/line-fixture.ts';

configure({ asyncUtilTimeout: 5000 });

const APP: Omit<AppConfig, 'version'> = {
  title: 'Math app',
  storagePrefix: 'math:',
  backupAppId: 'math',
  backupFilePrefix: 'math',
  parentCodeFilePrefix: 'math-code',
};

/** The real English bundle with the fixture's texts added namespace by namespace (the fixture has `lessons` and `journey`). */
const locales: LoadedSubject['locales'] = {
  en: Object.fromEntries(
    [...new Set([...Object.keys(en), ...Object.keys(LINE_TEXTS)])].map((namespace) => [
      namespace,
      mergeTree(
        (en as Record<string, Tree | undefined>)[namespace] ?? {},
        (LINE_TEXTS as Record<string, Tree | undefined>)[namespace] ?? {},
      ),
    ]),
  ),
};

interface Tree {
  readonly [key: string]: string | Tree;
}

function mergeTree(base: Tree, extra: Tree): Tree {
  const merged: Record<string, string | Tree> = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    const existing = merged[key];
    merged[key] =
      typeof value === 'string' || existing === undefined || typeof existing === 'string'
        ? value
        : mergeTree(existing, value);
  }
  return merged;
}

/** The math pack over the fixture lesson (its own content, the real kinds, notes and UI). */
const lineWeb: SubjectWeb = {
  ...mathWeb,
  createServices: () => ({
    content: makeContentSource({
      lessons: [LINE_LESSON],
      minigames: [],
      catalog: LINE_CATALOG,
      badges: [],
    }),
    // A card subject has no runtime services: the pack's own (typed per program, `{}` here and chess's fields in the app).
    subject: mathWeb.createServices().subject,
  }),
};

const GUIDED = LINE_LESSON.guided;
const EXERCISES = LINE_LESSON.exercises;
function exerciseOf(id: string): MathExerciseDef {
  const def = EXERCISES.find((entry) => entry.id === id);
  if (def === undefined) throw new Error(`the fixture lesson has no exercise "${id}"`);
  return def;
}

beforeAll(() => {
  // The App's own texts, plus the fixture's: `activate` swaps the same bundle in.
  for (const [namespace, tree] of Object.entries(locales.en ?? {})) {
    i18next.addResourceBundle('en', namespace, tree, true, true);
  }
});

/** A text key as the app resolves it, `{{vars}}` untouched (what the e2e kit's `contentText` gives a driver). */
const text = (key: string): string =>
  tContent(i18next.t, key, { interpolation: { skipOnVariables: true } });
const page = jsdomPage() as unknown as Parameters<ReturnType<typeof mathKindE2EOf>['perform']>[0];

/** The one-subject app on a fresh storage with a parent code and the profile `Mia`. */
async function lineApp() {
  const app = createAppServices(
    [createTestEntry(lineWeb, { names: { en: 'Math' }, locales })],
    APP,
    createMemoryStorage(),
  );
  const services = await app.activate('math');
  const testServices = {
    ...services,
    deps: { ...services.deps, passwordFile: createFakePasswordFileWriter() },
  };
  await setupParentPassword(testServices.deps, '1234');
  const profile = await createProfile(testServices.deps, 'Mia', 'fox');
  await selectProfile(testServices.deps, profile.id);
  return { app, services: testServices, profileId: profile.id };
}

/** Profile picker → Home → Start → Story → Demo: the lesson's guided try is showing. */
async function openLesson(): Promise<void> {
  fireEvent.click(await screen.findByRole('button', { name: /Mia/ }));
  const decline = screen.queryByRole('button', { name: 'No, start at World 1' });
  if (decline !== null) fireEvent.click(decline);
  fireEvent.click(await screen.findByRole('button', { name: /Start/ }));
  await screen.findByText('Marks on a line are numbers in order. Find where each one goes.');
  fireEvent.click(await screen.findByRole('button', { name: /Let me try/ })); // Story -> Demo
  await screen.findByText('The marker sits on 300, the third mark after 0.');
  fireEvent.click(await screen.findByRole('button', { name: /^Next/ })); // Demo -> first guided try
}

/** Folds `actions` the way the e2e kit does: `kind.act` purely, then the kind's driver on the page; returns the core state. */
async function play(
  def: MathExerciseDef,
  actions: readonly MathAction[],
  from: MathState = kindOf(def).init(def),
): Promise<MathState> {
  const kind = kindOf(def);
  const driver = mathKindE2EOf(def.type);
  let state = from;
  for (const action of actions) {
    const before = state;
    const { state: next, outcome } = kind.act(before, action, null);
    await driver.perform(page, action, { def, before, outcome, text });
    state = next;
  }
  return state;
}

const actionsOf = (def: MathExerciseDef, which: 'solution' | 'wrong'): readonly MathAction[] => {
  const solution = solutionOf(def);
  return which === 'solution'
    ? solution.solution(def, null)
    : (solution.wrongAction?.(def, null) ?? []);
};

const solve = (def: MathExerciseDef): Promise<MathState> => play(def, actionsOf(def, 'solution'));

/** Solved: the success panel (and its autosave) is there; Next goes on. */
async function next(): Promise<void> {
  fireEvent.click(await screen.findByRole('button', { name: /^Next/ }));
}

/** The note inside the Owl bubble under the instruction. */
async function expectNote(note: string): Promise<void> {
  expect(await screen.findByText(note)).toBeTruthy();
}

const instruction = (def: MathExerciseDef): string => text(def.textKey);

async function finishGuided(): Promise<void> {
  for (const def of GUIDED) {
    await screen.findByText(instruction(def));
    await solve(def);
    await next();
  }
}

describe('a number-line lesson end to end', () => {
  it('has a guided try and six scored exercises of the kind: exact items on three lines, an estimate, a label list and a reason', () => {
    expect(GUIDED.map((def) => def.type)).toEqual(['number-line']);
    expect(EXERCISES.map((def) => def.id)).toEqual([
      'fx-nl-100',
      'fx-nl-10',
      'fx-nl-50',
      'fx-nl-estimate',
      'fx-nl-list',
      'fx-nl-reason',
    ]);
    expect(new Set(EXERCISES.map((def) => def.type))).toEqual(new Set(['number-line']));
  });

  it('plays every exercise through the real UI with the driver (keys on the slider, then Check): 3 stars each, the lesson completes', async () => {
    const { app, services, profileId } = await lineApp();
    render(<App services={services} />);
    await openLesson();

    await finishGuided();
    for (const def of EXERCISES) {
      await screen.findByText(instruction(def));
      // The line is there, nothing placed yet, and Check waits.
      expect(screen.getByRole('slider').getAttribute('aria-valuetext')).toBe('No marker yet');
      expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Check' }).disabled).toBe(true);
      await solve(def);
      await expectNote('Amazing!');
      await next();
    }

    await screen.findByText('Lesson complete!');
    expect(screen.getByText('+18 stars')).toBeTruthy();
    expect(screen.getByTestId('stars-row').querySelectorAll('.reward-star-pop')).toHaveLength(3);
    const saved = await loadProgress(services.deps, profileId);
    const progress = saved.find((entry) => entry.lessonId === LINE_LESSON.id);
    expect(progress?.bestStars).toEqual({
      'fx-nl-100': 3,
      'fx-nl-10': 3,
      'fx-nl-50': 3,
      'fx-nl-estimate': 3,
      'fx-nl-list': 3,
      'fx-nl-reason': 3,
    });
    expect(await app.subjectData['math']?.progress.listLessons(profileId)).toHaveLength(1);
  });

  it('a wrong first try says so (the reason when the value has one), costs a star, and the next try still solves', async () => {
    const { services, profileId } = await lineApp();
    render(<App services={services} />);
    await openLesson();
    await finishGuided();

    for (const def of EXERCISES) {
      await screen.findByText(instruction(def));
      const afterWrong = await play(def, actionsOf(def, 'wrong'));
      expect(afterWrong, def.id).toMatchObject({ errors: 1, solved: false });
      // The wrong place keeps the marker (shaking); only the reason-bearing item has its own note.
      await expectNote(
        def.id === 'fx-nl-reason'
          ? 'Count the jumps between the marks, not the marks.'
          : 'Not there yet. Look at the numbers on the line.',
      );
      expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Check' }).disabled).toBe(true);
      await play(def, actionsOf(def, 'solution'), afterWrong);
      await expectNote('Well done!');
      await next();
    }

    await screen.findByText('Lesson complete!');
    expect(screen.getByText('+12 stars')).toBeTruthy();
    const progress = (await loadProgress(services.deps, profileId)).find(
      (entry) => entry.lessonId === LINE_LESSON.id,
    );
    expect(Object.values(progress?.bestStars ?? {})).toEqual([2, 2, 2, 2, 2, 2]);
  });

  it('asks for hints through the real session: the middle numbered, every mark numbered, then the answer on the line', async () => {
    const { services } = await lineApp();
    render(<App services={services} />);
    await openLesson();
    await finishGuided();

    const def = exerciseOf('fx-nl-100');
    await screen.findByText(instruction(def));
    expect(screen.queryByTestId('number-line-label-500')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    await expectNote('Find the middle: 500.');
    expect(screen.getByTestId('number-line-label-500').textContent).toBe('500');
    expect(screen.queryByTestId('number-line-label-300')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    await expectNote('Read the numbers on every mark.');
    expect(screen.getByTestId('number-line-label-300').textContent).toBe('300');

    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    await expectNote('Here is the answer.');
    expect(screen.getByRole('slider').getAttribute('aria-valuetext')).toBe('Marker at 300');
    expect(screen.getByTestId('number-line-value').textContent).toBe('300');
    // The marker is on the target, but the child still checks it.
    expect(screen.queryByText('Lesson complete!')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    await expectNote('Good try!');
    await next();
    await screen.findByText(instruction(exerciseOf('fx-nl-10')));
  });

  it('the guided try starts with hint 1: the middle is numbered before anything is touched (the bubble stays quiet)', async () => {
    const { services } = await lineApp();
    render(<App services={services} />);
    await openLesson();
    const [first] = GUIDED;
    await screen.findByText(instruction(first ?? exerciseOf('fx-nl-100')));
    expect(screen.getByTestId('number-line-label-50').textContent).toBe('50');
    expect(screen.queryByText('Find the middle: 50.')).toBeNull();
  });
});
