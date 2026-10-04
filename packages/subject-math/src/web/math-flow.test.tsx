// World 1's first lesson, Hundreds, tens, ones, end to end: the real pack and content (`mathEntry`), opened in the real App and played
// through the real UIs (place-value blocks, the number pad, option cards). Each exercise is solved by its kind's e2e driver from its
// kind's `solution()` (the way a Playwright spec would), in jsdom.
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
// needs longer than the default 1 s to show a success panel. A build is dozens of taps, each found by role in a DOM full of SVG:
// the tests that play one get a longer timeout than the default 15 s too.
configure({ asyncUtilTimeout: 10_000 });
const SLOW = 120_000;

const APP: Omit<AppConfig, 'version'> = {
  title: 'Math app',
  storagePrefix: 'math:',
  backupAppId: 'math',
  backupFilePrefix: 'math',
  parentCodeFilePrefix: 'math-code',
};

const lesson = (bundled as unknown as MathContent).lessons.find((entry) => entry.id === 'pv-hto');
if (lesson === undefined) throw new Error('the math content has no lesson "pv-hto"');
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
  await screen.findByText('205'); // the Story card shows the demo number
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

/** The number a number-entry exercise's card says is wrong, typed on the pad (a known bug, or any other wrong number). */
function typed(value: number): readonly MathAction[] {
  return [
    ...Array.from(String(value), (char) => ({
      type: 'enter-digit' as const,
      digit: Number(char) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
    })),
    { type: 'submit-number' as const },
  ];
}

describe('World 1, Hundreds, tens, ones, end to end', () => {
  it('has the first lesson: 2 guided builds and 6 scored exercises of the three kinds it uses, from the 205 demo', () => {
    expect(lesson.id).toBe('pv-hto');
    expect(lesson.demo.prompt?.big).toBe('205');
    expect(GUIDED.map((def) => [def.type, def.prompt?.big])).toEqual([
      ['place-value', '243'],
      ['place-value', '305'],
    ]);
    expect(EXERCISES.map((def) => def.type)).toEqual([
      'place-value',
      'place-value',
      'number-entry',
      'number-entry',
      'choice',
      'choice',
    ]);
  });

  it(
    'plays the blocks, the number pad and the option cards through the real UIs: 3 stars each on a clean run, the lesson completes',
    async () => {
      const { app, services, profileId } = await mathApp();
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
      expect(screen.getByText('+18 stars')).toBeTruthy();
      expect(screen.getByTestId('stars-row').querySelectorAll('.reward-star-pop')).toHaveLength(3);
      const saved = await loadProgress(services.deps, profileId);
      const progress = saved.find((entry) => entry.lessonId === lesson.id);
      // The generated ids <stem>-<n>: stored progress keeps matching.
      expect(progress?.bestStars).toEqual({
        'hto-build-1': 3,
        'hto-zero-1': 3,
        'hto-read-1': 3,
        'hto-read-zero-1': 3,
        'hto-which-1': 3,
        'hto-which-zero-1': 3,
      });
      // The subject's data lives in the subject's own store.
      expect(await app.subjectData['math']?.progress.listLessons(profileId)).toHaveLength(1);
    },
    SLOW,
  );

  it(
    'a wrong first try speaks the reason of the bug it matches (swapped places, 8005 for 805, the option a bug makes), else the kind’s note; the next try still solves',
    async () => {
      const { services, profileId } = await mathApp();
      render(<App services={services} />);
      await openLesson();
      for (const def of GUIDED) {
        await solve(def);
        await next();
      }

      const swapReason = 'Look at the order: hundreds, then tens, then ones.';
      const appendReason = 'Each place holds one digit: 2 hundreds is 200, not 2000.';
      const wrongTries: readonly (readonly [string, readonly MathAction[], string])[] = [
        // The kind's own wrong try builds the tens and ones swapped: 570 for 507.
        ['hto-build-1', actionsOf(exerciseOf('hto-build-1'), 'wrong'), swapReason],
        ['hto-zero-1', actionsOf(exerciseOf('hto-zero-1'), 'wrong'), swapReason],
        // 739 is no known bug of 738: the pad's default note.
        ['hto-read-1', typed(739), 'Not that number. Try again!'],
        ['hto-read-zero-1', typed(8005), appendReason],
        // The choice cards: the first wrong card of `choiceWrongAction` is a bug card (every wrong numeral of these is one).
        ['hto-which-1', actionsOf(exerciseOf('hto-which-1'), 'wrong'), swapReason],
        ['hto-which-zero-1', actionsOf(exerciseOf('hto-which-zero-1'), 'wrong'), swapReason],
      ];
      for (const [id, wrong, note] of wrongTries) {
        const def = exerciseOf(id);
        await screen.findByText(instruction(def));
        const afterWrong = await play(def, wrong);
        expect(afterWrong, id).toMatchObject({ errors: 1, solved: false });
        await expectNote(note);
        await play(def, actionsOf(def, 'solution'), afterWrong);
        await expectNote('Well done!');
        await next();
      }

      await screen.findByText('Lesson complete!');
      expect(screen.getByText('+12 stars')).toBeTruthy();
      const progress = (await loadProgress(services.deps, profileId)).find(
        (entry) => entry.lessonId === lesson.id,
      );
      expect(Object.values(progress?.bestStars ?? {})).toEqual([2, 2, 2, 2, 2, 2]);
    },
    SLOW,
  );

  it(
    'asks for hints through the real session: the card kit’s nudge, then the first digit; a choice rules one card out',
    async () => {
      const { services } = await mathApp();
      render(<App services={services} />);
      await openLesson();
      for (const def of GUIDED) {
        await solve(def);
        await next();
      }
      for (const id of ['hto-build-1', 'hto-zero-1']) {
        await solve(exerciseOf(id));
        await next();
      }

      // Scored number-entry: Hint 1 nudges, Hint 2 gives the first digit (738 starts with 7).
      const entry = exerciseOf('hto-read-1');
      await screen.findByText(instruction(entry));
      fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
      await expectNote('Look closely.');
      fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
      await expectNote('It starts with 7.');
      // Hint 2 typed the 7 in: the rest of the answer follows.
      await play(entry, typed(38), { ...kindOf(entry).init(entry), entry: '7' });
      await expectNote('Good try!');
      await next();
      await solve(exerciseOf('hto-read-zero-1'));
      await next();

      // Scored choice: Hint rules one wrong option out, and the choice still solves.
      const choice = exerciseOf('hto-which-1');
      await screen.findByText(instruction(choice));
      fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
      await expectNote('One choice is ruled out.');
      await solve(choice);
      await expectNote('Well done!');
    },
    SLOW,
  );
});
