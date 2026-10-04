// The coding subject end to end: the real pack and the fixture content, opened in the real App and played through the real UI. Each
// exercise is solved by its kind's own e2e driver from the kind's own `solution()` (the way a Playwright spec would), in jsdom with
// reduced motion so every run jumps to its end.
import { fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createProfile,
  loadProgress,
  selectProfile,
  setupParentPassword,
} from '@learn/platform-core';
import type { AppConfig } from '@learn/platform-core';
import App from '@learn/platform-web/App.tsx';
import { createAppServices } from '@learn/platform-web/app/services.ts';
import { tContent } from '@learn/platform-web/content-text.ts';
import { createFakePasswordFileWriter } from '@learn/platform-web/testing/fake-password-file-writer.ts';
import { jsdomPage } from '@learn/platform-web/testing/jsdom-page.ts';
import { createMemoryStorage } from '@learn/platform-web/testing/memory-storage.ts';
import { stubMatchMedia } from '@learn/platform-web/testing/mock-media-query.ts';
import type { CodingExerciseDef } from '../core/types.ts';
import { codingEntry } from '../entry.ts';
import { kindOf } from '../kinds/index.ts';
import type { CodingAction, CodingState } from '../kinds/index.ts';
import { solutionOf } from '../kinds/solutions.ts';
import { codingKindE2EOf } from './kinds/e2e-registry.ts';
import type { CodingKindE2E } from './kinds/e2e-registry.ts';
import { fixtureLesson } from './testing/fixtures.ts';

const APP: Omit<AppConfig, 'version'> = {
  title: 'Coding app',
  storagePrefix: 'coding:',
  backupAppId: 'coding',
  backupFilePrefix: 'coding',
  parentCodeFilePrefix: 'coding-code',
};

const lesson = fixtureLesson;
const GUIDED = lesson?.guided ?? [];
const EXERCISES = lesson?.exercises ?? [];
function exerciseOf(id: string): CodingExerciseDef {
  const def = EXERCISES.find((entry) => entry.id === id);
  if (def === undefined) throw new Error(`the coding fixture has no exercise "${id}"`);
  return def;
}

/** A text key as the app resolves it, `{{vars}}` untouched (what the e2e kit's `contentText` gives a driver). */
const text = (key: string): string =>
  tContent(i18next.t, key, { interpolation: { skipOnVariables: true } });
const page = jsdomPage() as unknown as Parameters<CodingKindE2E['perform']>[0];

let restoreMotion: () => void;
beforeEach(() => {
  restoreMotion = stubMatchMedia('(prefers-reduced-motion: reduce)');
});
afterEach(() => {
  restoreMotion();
});

/** The one-subject app on a fresh storage with a parent code and the profile `Mia`. */
async function codingApp() {
  const app = createAppServices([codingEntry], APP, createMemoryStorage());
  const services = await app.activate('coding');
  const testServices = {
    ...services,
    deps: { ...services.deps, passwordFile: createFakePasswordFileWriter() },
  };
  await setupParentPassword(testServices.deps, '1234');
  const profile = await createProfile(testServices.deps, 'Mia', 'fox');
  await selectProfile(testServices.deps, profile.id);
  return { app, services: testServices, profileId: profile.id };
}

/** Profile picker → Home → Start → Story → Demo: the lesson's first guided try is showing. */
async function openLesson(): Promise<void> {
  fireEvent.click(await screen.findByRole('button', { name: /Mia/ }));
  const decline = screen.queryByRole('button', { name: 'No, start at World 1' });
  if (decline !== null) fireEvent.click(decline);
  fireEvent.click(await screen.findByRole('button', { name: /Start/ }));
  fireEvent.click(await screen.findByRole('button', { name: /Let me try/ })); // Story -> Demo
  fireEvent.click(await screen.findByRole('button', { name: /^Next/ })); // Demo -> first guided try
}

/** Folds `actions` the way the e2e kit does: `kind.act` purely, then the kind's driver on the page; returns the core state. */
async function play(
  def: CodingExerciseDef,
  actions: readonly CodingAction[],
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

const actionsOf = (
  def: CodingExerciseDef,
  which: 'solution' | 'wrong',
): readonly CodingAction[] => {
  const solution = solutionOf(def);
  return which === 'solution'
    ? solution.solution(def, null)
    : (solution.wrongAction?.(def, null) ?? []);
};

const solve = (def: CodingExerciseDef): Promise<CodingState> =>
  play(def, actionsOf(def, 'solution'));

/** Solved: the success panel (and its autosave) is there; Next goes on. */
async function next(): Promise<void> {
  fireEvent.click(await screen.findByRole('button', { name: /^Next/ }));
}

const instruction = (def: CodingExerciseDef): string => text(def.textKey);

/** The note inside the Owl bubble under the instruction. */
async function expectNote(note: string): Promise<void> {
  expect(await screen.findByText(note)).toBeTruthy();
}

describe('the coding subject end to end', () => {
  it('has the fixture lesson: 2 guided tries and 5 scored exercises of the three coding kinds', () => {
    expect(lesson?.id).toBe('seq-arrows');
    expect(GUIDED.map((def) => def.type)).toEqual(['program', 'predict']);
    expect(EXERCISES.map((def) => def.type)).toEqual([
      'program',
      'program',
      'program',
      'predict',
      'find-bug',
    ]);
  });

  it('plays every kind through the real UI: 3 stars each on a run with no error, the lesson completes', async () => {
    const { app, services, profileId } = await codingApp();
    render(<App services={services} />);
    await openLesson();

    for (const def of GUIDED) {
      await screen.findByText(instruction(def));
      await solve(def);
      await next();
    }
    for (const def of EXERCISES) {
      await screen.findByText(instruction(def));
      await solve(def);
      await expectNote('Amazing!');
      await next();
    }

    await screen.findByText('Lesson complete!');
    expect(screen.getByText('+15 stars')).toBeTruthy();
    expect(screen.getByTestId('stars-row').querySelectorAll('.reward-star-pop')).toHaveLength(3);
    const saved = await loadProgress(services.deps, profileId);
    const progress = saved.find((entry) => entry.lessonId === lesson?.id);
    expect(progress?.bestStars).toEqual(Object.fromEntries(EXERCISES.map((def) => [def.id, 3])));
    // The subject's data lives in the subject's own store.
    expect(await app.subjectData['coding']?.progress.listLessons(profileId)).toHaveLength(1);
  });

  it("a wrong first try speaks the kind's own note and costs a star; the next try still solves", async () => {
    const { services, profileId } = await codingApp();
    render(<App services={services} />);
    await openLesson();
    for (const def of GUIDED) {
      await solve(def);
      await next();
    }

    const notes = [
      ['arrows-01', 'Not there yet — try again!'],
      ['arrows-02', 'Not there yet — try again!'],
      ['arrows-03', 'Oops, Fox hit the edge at step 2!'],
      ['arrows-04', 'Not that square. Follow the arrows again!'],
      ['arrows-05', 'That step is fine. Look again!'],
    ] as const;
    for (const [id, note] of notes) {
      const def = exerciseOf(id);
      await screen.findByText(instruction(def));
      const afterWrong = await play(def, actionsOf(def, 'wrong'));
      expect(afterWrong, id).toMatchObject({ errors: 1, solved: false });
      await expectNote(note);
      await play(def, actionsOf(def, 'solution'), afterWrong);
      await expectNote('Well done!');
      await next();
    }

    await screen.findByText('Lesson complete!');
    expect(screen.getByText('+10 stars')).toBeTruthy();
    const progress = (await loadProgress(services.deps, profileId)).find(
      (entry) => entry.lessonId === lesson?.id,
    );
    expect(progress?.bestStars).toEqual(Object.fromEntries(EXERCISES.map((def) => [def.id, 2])));
  });

  it('asks for hints through the real session: the guided try lights its first cell by itself, the note comes with the button', async () => {
    const { services } = await codingApp();
    render(<App services={services} />);
    await openLesson();

    // Guided try 1 (program): hint 1 is on from the start.
    await screen.findByText(instruction(GUIDED[0] as CodingExerciseDef));
    expect((await screen.findByTestId('grid-highlight-1-0')).getAttribute('data-kind')).toBe(
      'hint',
    );
    await solve(GUIDED[0] as CodingExerciseDef);
    await next();

    // Guided try 2 (predict): the first steps replay by themselves; solved by the tap.
    await screen.findByText(instruction(GUIDED[1] as CodingExerciseDef));
    await solve(GUIDED[1] as CodingExerciseDef);
    await next();

    // Scored program: Hint gives words and a lit cell; the run then solves for 2 stars at most.
    const def = exerciseOf('arrows-01');
    await screen.findByText(instruction(def));
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    await expectNote('Look at the glowing square. Fox goes there first.');
    expect(screen.getByTestId('grid-highlight-1-0')).toBeTruthy();
    await solve(def);
    await expectNote('Well done!');
  });
});
