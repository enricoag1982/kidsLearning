// A lesson of `array` exercises end to end: the real math pack (its kind UIs, its notes) over a one-lesson content, opened in the
// real App and played through the real dot grid UI. Each exercise is solved by the kind's own e2e driver from its `solution()` (the
// way a Playwright spec would: tap the corner cell, then Check), in jsdom. No shipped lesson uses the kind yet (World 3 does,
// m13.14), so the lesson is `ARRAY_LESSON` (`testing/array-fixture.ts`).
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
import { ARRAY_CATALOG, ARRAY_LESSON, ARRAY_TEXTS } from './testing/array-fixture.ts';

configure({ asyncUtilTimeout: 5000 });

const APP: Omit<AppConfig, 'version'> = {
  title: 'Math app',
  storagePrefix: 'math:',
  backupAppId: 'math',
  backupFilePrefix: 'math',
  parentCodeFilePrefix: 'math-code',
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

/** The real English bundle with the fixture's texts added namespace by namespace (the fixture has `lessons` and `journey`). */
const locales: LoadedSubject['locales'] = {
  en: Object.fromEntries(
    [...new Set([...Object.keys(en), ...Object.keys(ARRAY_TEXTS)])].map((namespace) => [
      namespace,
      mergeTree(
        (en as Record<string, Tree | undefined>)[namespace] ?? {},
        (ARRAY_TEXTS as Record<string, Tree | undefined>)[namespace] ?? {},
      ),
    ]),
  ),
};

/** The math pack over the fixture lesson (its own content, the real kinds, notes and UI). */
const arrayWeb: SubjectWeb = {
  ...mathWeb,
  createServices: () => ({
    content: makeContentSource({
      lessons: [ARRAY_LESSON],
      minigames: [],
      catalog: ARRAY_CATALOG,
      badges: [],
    }),
    // A card subject has no runtime services: the pack's own (typed per program, `{}` here and chess's fields in the app).
    subject: mathWeb.createServices().subject,
  }),
};

const GUIDED = ARRAY_LESSON.guided;
const EXERCISES = ARRAY_LESSON.exercises;
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
async function arrayApp() {
  const app = createAppServices(
    [createTestEntry(arrayWeb, { names: { en: 'Math' }, locales })],
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
  await screen.findByText('Dots in rows make an array. Rows go across. Make each one.');
  fireEvent.click(await screen.findByRole('button', { name: /Let me try/ })); // Story -> Demo
  await screen.findByText('This array has 3 rows of 4 dots.');
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
const check = (): HTMLButtonElement =>
  screen.getByRole<HTMLButtonElement>('button', { name: 'Check' });
const cell = (x: number, y: number): HTMLElement =>
  screen.getByTestId(`grid-cell-${String(x)}-${String(y)}`);
const dots = (): number =>
  screen.getAllByTestId(/^grid-cell-/).filter((element) => element.textContent === '🔵').length;
const outlines = (kind: string): number =>
  screen.queryAllByTestId(/^grid-highlight-/).filter((element) => element.dataset['kind'] === kind)
    .length;

async function finishGuided(): Promise<void> {
  for (const def of GUIDED) {
    await screen.findByText(instruction(def));
    await solve(def);
    await next();
  }
}

describe('an array lesson end to end', () => {
  it('has a guided try and five scored exercises of the kind: rows fixed, rows free, the whole grid, a single row and a reason', () => {
    expect(GUIDED.map((def) => def.type)).toEqual(['array']);
    expect(EXERCISES.map((def) => def.id)).toEqual([
      'fx-ar-fixed',
      'fx-ar-free',
      'fx-ar-full',
      'fx-ar-single',
      'fx-ar-reason',
    ]);
    expect(new Set(EXERCISES.map((def) => def.type))).toEqual(new Set(['array']));
  });

  it('plays every exercise through the real UI with the driver (tap the corner cell, then Check): 3 stars each, the lesson completes', async () => {
    const { app, services, profileId } = await arrayApp();
    render(<App services={services} />);
    await openLesson();

    await finishGuided();
    for (const def of EXERCISES) {
      await screen.findByText(instruction(def));
      // The grid is there with no dot made, and Check waits.
      expect(screen.getAllByTestId(/^grid-cell-/)).toHaveLength(36);
      expect(dots()).toBe(0);
      expect(check().disabled).toBe(true);
      await solve(def);
      await expectNote('Amazing!');
      await next();
    }

    await screen.findByText('Lesson complete!');
    expect(screen.getByText('+15 stars')).toBeTruthy();
    expect(screen.getByTestId('stars-row').querySelectorAll('.reward-star-pop')).toHaveLength(3);
    const saved = await loadProgress(services.deps, profileId);
    const progress = saved.find((entry) => entry.lessonId === ARRAY_LESSON.id);
    expect(progress?.bestStars).toEqual({
      'fx-ar-fixed': 3,
      'fx-ar-free': 3,
      'fx-ar-full': 3,
      'fx-ar-single': 3,
      'fx-ar-reason': 3,
    });
    expect(await app.subjectData['math']?.progress.listLessons(profileId)).toHaveLength(1);
  });

  it('shows the array made by the tap: dots from the top-left cell to the corner, and the count only once it is right', async () => {
    const { services } = await arrayApp();
    render(<App services={services} />);
    await openLesson();
    await finishGuided();

    const def = exerciseOf('fx-ar-fixed');
    await screen.findByText(instruction(def));
    fireEvent.click(cell(3, 2));
    expect(dots()).toBe(12);
    expect(cell(3, 2).getAttribute('aria-label')).toBe('Row 3, column 4, in your array');
    expect(cell(4, 2).getAttribute('aria-label')).toBe('Row 3, column 5');
    expect(screen.getByTestId('array-live').textContent).toBe('3 rows, 4 in each row');
    expect(screen.getByTestId('array-caption').textContent).toBe('');
    fireEvent.click(check());
    await expectNote('Amazing!');
    expect(screen.getByTestId('array-caption').textContent).toBe('3 rows of 4');
  });

  it('a wrong first try says so, costs a star, and the next try still solves', async () => {
    const { services, profileId } = await arrayApp();
    render(<App services={services} />);
    await openLesson();
    await finishGuided();

    for (const def of EXERCISES) {
      await screen.findByText(instruction(def));
      const afterWrong = await play(def, actionsOf(def, 'wrong'));
      expect(afterWrong, def.id).toMatchObject({ errors: 1, solved: false });
      // The wrong corner is marked and Check waits for another one.
      await expectNote('Count the rows and the dots in each row.');
      expect(check().disabled).toBe(true);
      await play(def, actionsOf(def, 'solution'), afterWrong);
      await expectNote('Well done!');
      await next();
    }

    await screen.findByText('Lesson complete!');
    expect(screen.getByText('+10 stars')).toBeTruthy();
    const progress = (await loadProgress(services.deps, profileId)).find(
      (entry) => entry.lessonId === ARRAY_LESSON.id,
    );
    expect(Object.values(progress?.bestStars ?? {})).toEqual([2, 2, 2, 2, 2]);
  });

  it('speaks the reason of a shape that has one, and the swap note for the right array turned round (rows fixed)', async () => {
    const { services } = await arrayApp();
    render(<App services={services} />);
    await openLesson();
    await finishGuided();

    const fixed = exerciseOf('fx-ar-fixed');
    await screen.findByText(instruction(fixed));
    await play(fixed, [{ type: 'make-array', rows: 4, cols: 3 }]);
    await expectNote('Same number, but count the rows again.');
    await solve(fixed);
    await next();

    // Rows free: the turned array is simply right.
    const free = exerciseOf('fx-ar-free');
    await screen.findByText(instruction(free));
    await play(free, [{ type: 'make-array', rows: 3, cols: 4 }]);
    await expectNote('Amazing!');
    await next();
    await screen.findByText(instruction(exerciseOf('fx-ar-full')));
    await solve(exerciseOf('fx-ar-full'));
    await next();
    await screen.findByText(instruction(exerciseOf('fx-ar-single')));
    await solve(exerciseOf('fx-ar-single'));
    await next();

    const reason = exerciseOf('fx-ar-reason');
    await screen.findByText(instruction(reason));
    await play(reason, [{ type: 'make-array', rows: 2, cols: 4 }]);
    await expectNote('Each row needs 5 dots. Count along one row.');
  });

  it('asks for hints through the real session: rows go across, the first row outlined, then all the rows outlined', async () => {
    const { services } = await arrayApp();
    render(<App services={services} />);
    await openLesson();
    await finishGuided();

    const def = exerciseOf('fx-ar-fixed');
    await screen.findByText(instruction(def));
    expect(outlines('hint')).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    await expectNote('Rows go across, like lines in a book.');
    expect(outlines('hint')).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    await expectNote('Each row has 4.');
    expect(outlines('hint')).toBe(4);
    fireEvent.click(cell(1, 1));
    expect(screen.getByTestId('array-caption').textContent).toBe('2 rows of 2');

    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    await expectNote('Here is the answer.');
    expect(outlines('hint')).toBe(12);
    // The rows are outlined, but the child still makes the array and checks it.
    expect(screen.queryByText('Lesson complete!')).toBeNull();
    fireEvent.click(cell(3, 2));
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    await expectNote('Good try!');
    await next();
    await screen.findByText(instruction(exerciseOf('fx-ar-free')));
  });

  it('the guided try starts with hint 1: nothing is drawn and the bubble stays quiet', async () => {
    const { services } = await arrayApp();
    render(<App services={services} />);
    await openLesson();
    const [first] = GUIDED;
    await screen.findByText(instruction(first ?? exerciseOf('fx-ar-fixed')));
    expect(outlines('hint')).toBe(0);
    expect(screen.queryByText('Rows go across, like lines in a book.')).toBeNull();
  });
});
