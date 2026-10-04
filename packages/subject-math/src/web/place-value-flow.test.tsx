// The place-value kind end to end: a fixture lesson of hand-built exercises (`testing/place-value-fixtures.ts`: 3 and 4 columns, a
// zero, a `start`, a reason, a 9) opened in the real App and played through the real UI, the real session and its autosave. Each
// exercise is solved by the kind's own e2e driver from its `solution()`, in jsdom. The lesson is not in the shipped content.
import { configure, fireEvent, render, screen, within } from '@testing-library/react';
import i18next from 'i18next';
import { beforeAll, describe, expect, it } from 'vitest';
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
import type { MathExerciseDef } from '../core/types.ts';
import { kindOf } from '../kinds/index.ts';
import type { MathAction, MathState } from '../kinds/index.ts';
import { solutionOf } from '../kinds/solutions.ts';
import { mathKindE2EOf } from './kinds/e2e-registry.ts';
import { PLACE_VALUE_TEXTS, fixtureEntry, fixtureLesson } from './testing/place-value-fixtures.ts';

// The whole lesson runs through the real session and its autosave: a busy machine (the full suite runs many jsdom workers at once)
// needs longer than the default 1 s to show a success panel. A build is dozens of taps, each found by role in a DOM full of SVG:
// the tests that play one get a longer timeout than the default 15 s too.
configure({ asyncUtilTimeout: 10_000 });
const SLOW = 60_000;

// The fixtures' texts are not in the shipped locale (the tests' i18next stands in for the app's `initI18n`).
beforeAll(() => {
  i18next.addResourceBundle('en', 'lessons', PLACE_VALUE_TEXTS, true, true);
});

const APP: Omit<AppConfig, 'version'> = {
  title: 'Math app',
  storagePrefix: 'math:',
  backupAppId: 'math',
  backupFilePrefix: 'math',
  parentCodeFilePrefix: 'math-code',
};

/** The fixture lesson's exercise at `index` of `list` (a missing one fails the file at once). */
function at(list: readonly MathExerciseDef[], index: number): MathExerciseDef {
  const def = list[index];
  if (def === undefined)
    throw new Error(`the place-value fixture lesson has no exercise ${String(index)}`);
  return def;
}
const hto = at(fixtureLesson.guided, 0);
const zero = at(fixtureLesson.exercises, 0);
const thousands = at(fixtureLesson.exercises, 1);
const start = at(fixtureLesson.exercises, 2);
const nine = at(fixtureLesson.exercises, 3);

/** A text key as the app resolves it, `{{vars}}` untouched (what the e2e kit's `contentText` gives a driver). */
const text = (key: string): string =>
  tContent(i18next.t, key, { interpolation: { skipOnVariables: true } });
const page = jsdomPage() as unknown as Parameters<ReturnType<typeof mathKindE2EOf>['perform']>[0];

/** The one-subject app (the fixture pack) on a fresh storage with a parent code and the profile `Mia`. */
async function fixtureApp() {
  const app = createAppServices([fixtureEntry], APP, createMemoryStorage());
  const services = await app.activate('math');
  const testServices = {
    ...services,
    deps: { ...services.deps, passwordFile: createFakePasswordFileWriter() },
  };
  await setupParentPassword(testServices.deps, '1234');
  const profile = await createProfile(testServices.deps, 'Mia', 'fox');
  await selectProfile(testServices.deps, profile.id);
  return { services: testServices, profileId: profile.id };
}

/** Profile picker → Home → Start → Story → Demo: the lesson's first guided try is showing. */
async function openLesson(): Promise<void> {
  fireEvent.click(await screen.findByRole('button', { name: /Mia/ }));
  const decline = screen.queryByRole('button', { name: 'No, start at World 1' });
  if (decline !== null) fireEvent.click(decline);
  fireEvent.click(await screen.findByRole('button', { name: /Start/ }));
  await screen.findByText('305'); // the Story card shows the demo number
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

const group = (name: string): HTMLElement => screen.getByRole('group', { name });
const click = (name: string, times = 1): void => {
  for (let tap = 0; tap < times; tap += 1) {
    fireEvent.click(screen.getByRole('button', { name }));
  }
};

/** Opens the lesson and gets past the guided try (solved by the driver). */
async function openAtScored() {
  const world = await fixtureApp();
  render(<App services={world.services} />);
  await openLesson();
  await screen.findByText(instruction(hto));
  await solve(hto);
  await next();
  return world;
}

describe('place-value end to end, in the real App', () => {
  it('has a guided try and 4 scored exercises of the kind: 3 and 4 columns, a zero, a start, a reason', () => {
    expect(fixtureLesson.guided.map((def) => def.type)).toEqual(['place-value']);
    expect(fixtureLesson.exercises.map((def) => def.type)).toEqual([
      'place-value',
      'place-value',
      'place-value',
      'place-value',
    ]);
    expect([hto, ...fixtureLesson.exercises].map((def) => 'columns' in def && def.columns)).toEqual(
      [3, 3, 4, 3, 4],
    );
  });

  it(
    'plays the guided try and the scored exercises: 3 stars each on a clean run, the lesson completes',
    async () => {
      const { services, profileId } = await fixtureApp();
      render(<App services={services} />);
      await openLesson();

      // The guided try opens with hint 1: every column is headed by its place, the labels emphasised, the columns empty.
      await screen.findByText(instruction(hto));
      expect(
        screen.getAllByRole('group').map((column) => column.getAttribute('aria-label')),
      ).toEqual(['Hundreds: 0', 'Tens: 0', 'Ones: 0']);
      expect(document.querySelectorAll('[data-emphasis="true"]')).toHaveLength(3);
      await solve(hto);
      await next();

      for (const def of fixtureLesson.exercises) {
        await screen.findByText(instruction(def));
        // A new exercise starts from its own columns: nothing the last one built is left.
        const expected =
          'start' in def && def.start !== undefined
            ? def.start
            : Array.from({ length: 'columns' in def ? def.columns : 0 }, () => 0);
        expect(
          screen
            .getAllByRole('group')
            .map((column) => Number(column.getAttribute('aria-label')?.split(': ')[1])),
        ).toEqual(expected);
        await solve(def);
        await expectNote('Amazing!');
        // The solved columns and their numeral stay on the screen, the build can no longer change.
        expect(screen.getByTestId('numeral').dataset['state']).toBe('good');
        await next();
      }

      await screen.findByText('Lesson complete!');
      expect(screen.getByText('+12 stars')).toBeTruthy();
      expect(screen.getByTestId('stars-row').querySelectorAll('.reward-star-pop')).toHaveLength(3);
      const progress = (await loadProgress(services.deps, profileId)).find(
        (entry) => entry.lessonId === fixtureLesson.id,
      );
      expect(progress?.bestStars).toEqual({
        'pvfx-zero': 3,
        'pvfx-thousands': 3,
        'pvfx-start': 3,
        'pvfx-nine': 3,
      });
    },
    SLOW,
  );

  it(
    'a wrong Check speaks the reason of its value or the default note, costs a star; the blocks stay and the next Check solves',
    async () => {
      const { services, profileId } = await fixtureApp();
      render(<App services={services} />);
      await openLesson();
      await solve(hto);
      await next();

      // 305 built as 350: the tens and ones the wrong way round has its reason.
      await screen.findByText(instruction(zero));
      const afterWrong = await play(zero, actionsOf(zero, 'wrong'));
      expect(afterWrong).toMatchObject({ errors: 1, solved: false });
      await expectNote('Look at the order: hundreds, then tens, then ones.');
      expect(group('Tens: 5')).toBeTruthy();
      await play(zero, actionsOf(zero, 'solution'), afterWrong);
      await expectNote('Well done!');
      await next();

      // 4072 built as 4073 (no reason): the default note.
      await screen.findByText(instruction(thousands));
      click('Add a thousand', 4);
      click('Add a ten', 7);
      click('Add a one', 3);
      fireEvent.click(screen.getByRole('button', { name: 'Check' }));
      await expectNote('Count the blocks in each column again.');
      // 4073 is one one too many: the blocks stay, the child takes one away.
      click('Take away a one');
      fireEvent.click(screen.getByRole('button', { name: 'Check' }));
      await expectNote('Well done!');
      await next();

      for (const def of [start, nine]) {
        await screen.findByText(instruction(def));
        await solve(def);
        await next();
      }
      await screen.findByText('Lesson complete!');
      const progress = (await loadProgress(services.deps, profileId)).find(
        (entry) => entry.lessonId === fixtureLesson.id,
      );
      expect(progress?.bestStars).toEqual({
        'pvfx-zero': 2,
        'pvfx-thousands': 2,
        'pvfx-start': 3,
        'pvfx-nine': 3,
      });
    },
    SLOW,
  );

  it(
    'asks for hints through the real session: the labels, the numeral beside the blocks, then the highest digit',
    async () => {
      await openAtScored();
      await screen.findByText(instruction(zero));
      const labels = (): string[] =>
        Array.from(document.querySelectorAll('[data-emphasis]')).map(
          (label) => (label as HTMLElement).dataset['emphasis'] ?? '',
        );
      expect(labels()).toEqual(['false', 'false', 'false']);
      expect(screen.queryByLabelText(/^Your number/)).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
      await expectNote('Hundreds, tens and ones: count each column.');
      expect(labels()).toEqual(['true', 'true', 'true']);

      fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
      await expectNote('The number beside the blocks shows what you built.');
      click('Add a one', 2);
      expect(screen.getByLabelText('Your number: 2').textContent).toBe('2');

      fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
      await expectNote('Here are the hundreds. Now finish!');
      expect(group('Hundreds: 3')).toBeTruthy();
      expect(group('Ones: 2')).toBeTruthy();
      click('Add a one', 3);
      expect(screen.getByLabelText('Your number: 305').textContent).toBe('305');
      fireEvent.click(screen.getByRole('button', { name: 'Check' }));
      await expectNote('Good try!');
      expect(within(screen.getByTestId('numeral')).getByLabelText('Your number: 305')).toBeTruthy();
    },
    SLOW,
  );
});
