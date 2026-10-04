// The fixture lesson `fx-first` end to end: the real pack and content (`logicEntry`), opened in the real App and played through the real
// card UIs (option cards, the order row). Each exercise is solved by its kind's e2e driver from its kind's `solution()` (the way a
// Playwright spec would), in jsdom.
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
import type { LogicContent, LogicExerciseDef } from '../core/types.ts';
import { logicEntry } from '../entry.ts';
import { kindOf } from '../kinds/index.ts';
import type { LogicAction, LogicState } from '../kinds/index.ts';
import { solutionOf } from '../kinds/solutions.ts';
import { logicKindE2EOf } from './kinds/e2e-registry.ts';

// The whole lesson runs through the real session and its autosave: a busy machine (the full suite runs many jsdom workers at once)
// needs longer than the default 1 s to show a success panel.
configure({ asyncUtilTimeout: 10_000 });
const SLOW = 60_000;

const APP: Omit<AppConfig, 'version'> = {
  title: 'Logic app',
  storagePrefix: 'logic:',
  backupAppId: 'logic',
  backupFilePrefix: 'logic',
  parentCodeFilePrefix: 'logic-code',
};

const lesson = (bundled as unknown as LogicContent).lessons.find(
  (entry) => entry.id === 'fx-first',
);
if (lesson === undefined) throw new Error('the logic content has no lesson "fx-first"');
const GUIDED = lesson.guided;
const EXERCISES = lesson.exercises;

/** A text key as the app resolves it, `{{vars}}` untouched (what the e2e kit's `contentText` gives a driver). */
const text = (key: string): string =>
  tContent(i18next.t, key, { interpolation: { skipOnVariables: true } });
const page = jsdomPage() as unknown as Parameters<ReturnType<typeof logicKindE2EOf>['perform']>[0];

/** The one-subject app on a fresh storage with a parent code and the profile `Mia`. */
async function logicApp() {
  const app = createAppServices([logicEntry], APP, createMemoryStorage());
  const services = await app.activate('logic');
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
  def: LogicExerciseDef,
  actions: readonly LogicAction[],
  from: LogicState = kindOf(def).init(def),
): Promise<LogicState> {
  const kind = kindOf(def);
  const driver = logicKindE2EOf(def.type);
  let state = from;
  for (const action of actions) {
    const before = state;
    const { state: next, outcome } = kind.act(before, action, null);
    await driver.perform(page, action, { def, before, outcome, text });
    state = next;
  }
  return state;
}

const actionsOf = (def: LogicExerciseDef, which: 'solution' | 'wrong'): readonly LogicAction[] => {
  const solution = solutionOf(def);
  return which === 'solution'
    ? solution.solution(def, null)
    : (solution.wrongAction?.(def, null) ?? []);
};

const solve = (def: LogicExerciseDef): Promise<LogicState> => play(def, actionsOf(def, 'solution'));

/** Solved: the success panel (and its autosave) is there; Next goes on. */
async function next(): Promise<void> {
  fireEvent.click(await screen.findByRole('button', { name: /^Next/ }));
}

const instruction = (def: LogicExerciseDef): string => text(def.textKey);

/** The note inside the Owl bubble under the instruction. */
async function expectNote(note: string): Promise<void> {
  expect(await screen.findByText(note)).toBeTruthy();
}

describe('the logic fixture lesson, end to end', () => {
  it('is fx-first: 2 guided tries and 3 scored exercises of the choice and order cards, from the pond demo', () => {
    expect(lesson.id).toBe('fx-first');
    expect(lesson.character).toBe('panda');
    expect(lesson.demo.prompt?.emoji).toBe('🐸🐟🐸🐟🐸🐟');
    expect(GUIDED.map((def) => def.type)).toEqual(['choice', 'order']);
    expect(EXERCISES.map((def) => def.type)).toEqual(['choice', 'order', 'choice']);
  });

  it(
    'plays the option cards and the order row through the real UIs: 3 stars each on a clean run, 3 stars for the lesson',
    async () => {
      const { app, services, profileId } = await logicApp();
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
      expect(screen.getByText('+9 stars')).toBeTruthy();
      expect(screen.getByTestId('stars-row').querySelectorAll('.reward-star-pop')).toHaveLength(3);
      const saved = await loadProgress(services.deps, profileId);
      const progress = saved.find((entry) => entry.lessonId === lesson.id);
      expect(progress?.bestStars).toEqual({ 'fx-01': 3, 'fx-02': 3, 'fx-03': 3 });
      // The subject's data lives in the subject's own store.
      expect(await app.subjectData['logic']?.progress.listLessons(profileId)).toHaveLength(1);
    },
    SLOW,
  );

  it(
    'a wrong first try speaks the kit’s note for its kind (a wrong card, a wrong place in the order); the next try still solves, for 2 stars',
    async () => {
      const { services, profileId } = await logicApp();
      render(<App services={services} />);
      await openLesson();
      for (const def of GUIDED) {
        await solve(def);
        await next();
      }

      const notes = [
        'Not quite! Try again.',
        'Not that one. Try another!',
        'Not quite! Try again.',
      ];
      for (const [index, def] of EXERCISES.entries()) {
        await screen.findByText(instruction(def));
        const afterWrong = await play(def, actionsOf(def, 'wrong'));
        expect(afterWrong, def.id).toMatchObject({ errors: 1, solved: false });
        await expectNote(notes[index] ?? '');
        await play(def, actionsOf(def, 'solution'), afterWrong);
        await expectNote('Well done!');
        await next();
      }

      await screen.findByText('Lesson complete!');
      expect(screen.getByText('+6 stars')).toBeTruthy();
      const progress = (await loadProgress(services.deps, profileId)).find(
        (entry) => entry.lessonId === lesson.id,
      );
      expect(Object.values(progress?.bestStars ?? {})).toEqual([2, 2, 2]);
    },
    SLOW,
  );

  it(
    'asks for hints through the real session: a choice rules a wrong card out, the order row asks which comes next',
    async () => {
      const { services } = await logicApp();
      render(<App services={services} />);
      await openLesson();
      for (const def of GUIDED) {
        await solve(def);
        await next();
      }

      const choice = EXERCISES[0];
      if (choice === undefined) throw new Error('no first scored exercise');
      await screen.findByText(instruction(choice));
      fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
      await expectNote('One choice is ruled out.');
      await solve(choice);
      await expectNote('Well done!');
      await next();

      const order = EXERCISES[1];
      if (order === undefined) throw new Error('no second scored exercise');
      await screen.findByText(instruction(order));
      fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
      await expectNote('Which one comes next?');
      await solve(order);
      await expectNote('Well done!');
    },
    SLOW,
  );
});
