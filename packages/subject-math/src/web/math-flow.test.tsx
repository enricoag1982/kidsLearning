// The math demo world end to end on the card kit: the real pack and content (`mathEntry`), opened in the real App and played through
// the real card UIs. Each exercise is solved by the card kit's own e2e driver from its kind's `solution()` (the way a Playwright spec
// would), in jsdom.
import { configure, fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { describe, expect, it } from 'vitest';
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
import bundled from '../../dist/content.json';
import { mathEntry } from '../entry.ts';
import { kindOf } from '../kinds/index.ts';
import type { MathAction, MathState } from '../kinds/index.ts';
import { solutionOf } from '../kinds/solutions.ts';
import type { MathContent, MathExerciseDef } from '../core/types.ts';
import { mathKindE2EOf } from './kinds/e2e-registry.ts';

// The whole lesson runs through the real session and its autosave: a busy machine (the full suite runs many jsdom workers at once)
// needs longer than the default 1 s to show a success panel.
configure({ asyncUtilTimeout: 5000 });

const APP: Omit<AppConfig, 'version'> = {
  title: 'Math app',
  storagePrefix: 'math:',
  backupAppId: 'math',
  backupFilePrefix: 'math',
  parentCodeFilePrefix: 'math-code',
};

const lesson = (bundled as unknown as MathContent).lessons.find(
  (entry) => entry.id === 'add-within-5',
);
if (lesson === undefined) throw new Error('the math content has no lesson "add-within-5"');
const GUIDED = lesson.guided;
const EXERCISES = lesson.exercises;
function exerciseOf(id: string): MathExerciseDef {
  const def = EXERCISES.find((entry) => entry.id === id);
  if (def === undefined) throw new Error(`the math content has no exercise "${id}"`);
  return def;
}

/** A text key as the app resolves it, `{{vars}}` untouched (what the e2e kit's `contentText` gives a driver). */
const text = (key: string): string =>
  tContent(i18next.t, key, { interpolation: { skipOnVariables: true } });
const page = jsdomPage() as unknown as Parameters<ReturnType<typeof mathKindE2EOf>['perform']>[0];

/** The one-subject app on a fresh storage with a parent code and the profile `Mia`. */
async function mathApp() {
  const app = createAppServices([mathEntry], APP, createMemoryStorage());
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

/** Profile picker → Home → Start → Story → Demo: the lesson's first guided try is showing. */
async function openLesson(): Promise<void> {
  fireEvent.click(await screen.findByRole('button', { name: /Mia/ }));
  const decline = screen.queryByRole('button', { name: 'No, start at World 1' });
  if (decline !== null) fireEvent.click(decline);
  fireEvent.click(await screen.findByRole('button', { name: /Start/ }));
  await screen.findByText('2 + 1'); // the Story card shows the demo sum
  fireEvent.click(await screen.findByRole('button', { name: /Let me try/ })); // Story -> Demo
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

const instruction = (def: MathExerciseDef): string => text(def.textKey);

/** The note inside the Owl bubble under the instruction. */
async function expectNote(note: string): Promise<void> {
  expect(await screen.findByText(note)).toBeTruthy();
}

describe('the math demo world end to end, on the card kit', () => {
  it('has the first lesson: 1 guided try and 4 scored exercises of the two card kinds it uses', () => {
    expect(lesson.id).toBe('add-within-5');
    expect(GUIDED.map((def) => def.type)).toEqual(['number-entry']);
    expect(EXERCISES.map((def) => def.type)).toEqual([
      'choice',
      'number-entry',
      'number-entry',
      'choice',
    ]);
    expect(EXERCISES.map((def) => def.prompt?.big)).toEqual(['2 + 2', '3 + 1', '2 + 3', '1 + 4']);
  });

  it('plays both kinds through the real card UIs: 3 stars each on a clean run, the lesson completes', async () => {
    const { app, services, profileId } = await mathApp();
    render(<App services={services} />);
    await openLesson();

    for (const def of GUIDED) {
      await screen.findByText(instruction(def));
      await screen.findByText(def.prompt?.big ?? '');
      await solve(def);
      await next();
    }
    for (const def of EXERCISES) {
      await screen.findByText(instruction(def));
      // The problem is a card; a number-entry shows its pad, a choice its option cards.
      await screen.findByText(def.prompt?.big ?? '');
      await solve(def);
      await expectNote('Amazing!');
      await next();
    }

    await screen.findByText('Lesson complete!');
    expect(screen.getByText('+12 stars')).toBeTruthy();
    expect(screen.getByTestId('stars-row').querySelectorAll('.reward-star-pop')).toHaveLength(3);
    const saved = await loadProgress(services.deps, profileId);
    const progress = saved.find((entry) => entry.lessonId === lesson.id);
    // The same exercise ids as before the card kit: stored progress keeps matching.
    expect(progress?.bestStars).toEqual({
      'add5-01': 3,
      'add5-02': 3,
      'add5-03': 3,
      'add5-04': 3,
    });
    // The subject's data lives in the subject's own store.
    expect(await app.subjectData['math']?.progress.listLessons(profileId)).toHaveLength(1);
  });

  it("a wrong first try speaks the card kit's note and costs a star; the next try still solves", async () => {
    const { services, profileId } = await mathApp();
    render(<App services={services} />);
    await openLesson();
    for (const def of GUIDED) {
      await solve(def);
      await next();
    }

    const notes = [
      ['add5-01', 'Not quite! Try again.'],
      ['add5-02', 'Not that number. Try again!'],
      ['add5-03', 'Not that number. Try again!'],
      ['add5-04', 'Not quite! Try again.'],
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
    expect(screen.getByText('+8 stars')).toBeTruthy();
    const progress = (await loadProgress(services.deps, profileId)).find(
      (entry) => entry.lessonId === lesson.id,
    );
    expect(progress?.bestStars).toEqual({
      'add5-01': 2,
      'add5-02': 2,
      'add5-03': 2,
      'add5-04': 2,
    });
  });

  it('asks for hints through the real session: the card kit’s nudge, then the first digit', async () => {
    const { services } = await mathApp();
    render(<App services={services} />);
    await openLesson();
    for (const def of GUIDED) {
      await solve(def);
      await next();
    }

    // Scored choice: Hint rules one wrong option out, and the choice still solves for 2 stars at most.
    const choice = exerciseOf('add5-01');
    await screen.findByText(instruction(choice));
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    await expectNote('One choice is ruled out.');
    await solve(choice);
    await expectNote('Well done!');
    await next();

    // Scored number-entry: Hint 1 nudges, Hint 2 gives the first digit.
    const entry = exerciseOf('add5-02');
    await screen.findByText(instruction(entry));
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    await expectNote('Look closely.');
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    await expectNote('It starts with 4.');
  });
});
