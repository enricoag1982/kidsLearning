// The card kit end to end: a subject made only of YAML (platform-content's card fixture) plus the three factory calls
// (`createCardCore`, `createCardContent`, `createCardWeb`), opened in the real App and played through the real UI. Each exercise is
// solved by the kit's own e2e driver from the kind's own `solution()`, the way a Playwright spec would.
import { fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  createProfile,
  loadProgress,
  selectProfile,
  setupParentPassword,
} from '@learn/platform-core';
import type { AppConfig } from '@learn/platform-core';
import type {
  CardExerciseDef,
  CardState,
} from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { cardKindOf } from '@learn/platform-core/domain/exercise/kinds/cards/kinds';
import { cardSolutionOf } from '@learn/platform-core/domain/exercise/kinds/cards/solutions';
import App from './App.tsx';
import { createAppServices } from './app/services.ts';
import { tContent } from './content-text.ts';
import type { ContentText } from './content-text.ts';
import { initI18n } from './i18n.ts';
import { cardKindE2EOf } from './kinds/cards/e2e-registry.ts';
import type { CardKindE2E } from './kinds/cards/e2e-registry.ts';
import { cardFixture, cardLocales, createCardTestEntry } from './testing/card-test-entry.tsx';
import { createFakePasswordFileWriter } from './testing/fake-password-file-writer.ts';
import { jsdomPage } from './testing/jsdom-page.ts';
import { createMemoryStorage } from './testing/memory-storage.ts';

const APP: Omit<AppConfig, 'version'> = {
  title: 'Cards app',
  storagePrefix: 'cards:',
  backupAppId: 'cards',
  backupFilePrefix: 'cards',
  parentCodeFilePrefix: 'cards-code',
};

const [lesson] = cardFixture.content.lessons;
if (lesson === undefined) throw new Error('the card fixture has no lesson');
const GUIDED = lesson.guided as readonly CardExerciseDef[];
const EXERCISES = lesson.exercises as readonly CardExerciseDef[];
function exerciseOf(id: string): CardExerciseDef {
  const def = EXERCISES.find((entry) => entry.id === id);
  if (def === undefined) throw new Error(`the card fixture has no exercise "${id}"`);
  return def;
}
const CHOICE = exerciseOf('count-01');
const TRUE_FALSE = exerciseOf('count-02');
const NUMBER_ENTRY = exerciseOf('count-03');
const ORDER = exerciseOf('count-04');
/** The `generate:` entry's items (`fixture-add`, number-entry) that follow the four authored exercises. */
const GENERATED = EXERCISES.filter((def) => def.id.startsWith('fx-add-'));

beforeAll(() => {
  initI18n(cardLocales as Parameters<typeof initI18n>[0]);
});

/** A text key as the app resolves it (`lessons:count-01-opt-c`, `cards.true`). */
const text: ContentText = (key, options) => tContent(i18next.t, key, options);
const page = jsdomPage() as unknown as Parameters<CardKindE2E['perform']>[0];

/** The one-subject app on a fresh storage with a parent code and the profile `Mia`, her subject data in `app.subjectData`. */
async function cardApp() {
  const app = createAppServices([createCardTestEntry()], APP, createMemoryStorage());
  const services = await app.activate('cards');
  const testServices = {
    ...services,
    deps: { ...services.deps, passwordFile: createFakePasswordFileWriter() },
  };
  await setupParentPassword(testServices.deps, '1234');
  const profile = await createProfile(testServices.deps, 'Mia', 'fox');
  await selectProfile(testServices.deps, profile.id);
  return { app, services: testServices, profileId: profile.id };
}

const click = (name: string | RegExp): void => {
  fireEvent.click(screen.getByRole('button', { name }));
};

/** Profile picker → Home → Start → Story → Demo: the lesson's first guided try is showing. */
async function openLesson(): Promise<void> {
  fireEvent.click(await screen.findByRole('button', { name: /Mia/ }));
  const decline = screen.queryByRole('button', { name: 'No, start at World 1' });
  if (decline !== null) fireEvent.click(decline);
  fireEvent.click(await screen.findByRole('button', { name: /Start/ }));
  fireEvent.click(await screen.findByRole('button', { name: /Let me try/ })); // Story -> Demo
  fireEvent.click(await screen.findByRole('button', { name: /^Next/ })); // Demo -> first guided try
}

type Action = ReturnType<typeof actionsOf>[number];

/** Folds `actions` the way the e2e kit does: `kind.act` purely, then the kind's driver on the page; returns the core state. */
async function play(
  def: CardExerciseDef,
  actions: readonly Action[],
  from: CardState = cardKindOf(def).init(def),
): Promise<CardState> {
  const kind = cardKindOf(def);
  const driver = cardKindE2EOf(def.type);
  let state = from;
  for (const action of actions) {
    const before = state;
    const { state: next, outcome } = kind.act(before, action, null);
    await driver.perform(page, action, { def, before, outcome, text });
    state = next;
  }
  return state;
}

function actionsOf(def: CardExerciseDef, which: 'solution' | 'wrong') {
  const solution = cardSolutionOf(def);
  return which === 'solution'
    ? solution.solution(def, null)
    : (solution.wrongAction?.(def, null) ?? []);
}

const solve = (def: CardExerciseDef): Promise<CardState> => play(def, actionsOf(def, 'solution'));

/** Solved: the success panel (and its autosave) is there; Next goes on. */
async function next(): Promise<void> {
  fireEvent.click(await screen.findByRole('button', { name: /^Next/ }));
}

const instruction = (def: CardExerciseDef): string => text(def.textKey);

/** The generated exercises, each solved on its first try. */
async function solveGenerated(): Promise<void> {
  for (const def of GENERATED) {
    await screen.findByText(instruction(def));
    await solve(def);
    await next();
  }
}

/** The note inside the Owl bubble under the instruction. */
async function expectNote(note: string): Promise<void> {
  expect(await screen.findByText(note)).toBeTruthy();
}

describe('a card subject end to end', () => {
  it('plays every kind through the real UI: 3 stars each on a run with no error, the lesson completes', async () => {
    const { app, services, profileId } = await cardApp();
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
    expect(screen.getByText(`+${String(EXERCISES.length * 3)} stars`)).toBeTruthy();
    expect(screen.getByTestId('stars-row').querySelectorAll('.reward-star-pop')).toHaveLength(3);
    const saved = await loadProgress(services.deps, profileId);
    const progress = saved.find((entry) => entry.lessonId === lesson.id);
    expect(progress?.bestStars).toEqual(Object.fromEntries(EXERCISES.map((def) => [def.id, 3])));
    // The subject's data lives in the subject's own store.
    expect(await app.subjectData.cards?.progress.listLessons(profileId)).toHaveLength(1);
  });

  it('draws shape cards and a prompt row, each named for a screen reader and the e2e driver', async () => {
    const { services } = await cardApp();
    render(<App services={services} />);
    await openLesson();
    const [first, oddOneOut, pattern] = GUIDED;
    if (first === undefined || oddOneOut === undefined || pattern === undefined) {
      throw new Error('the card fixture has fewer than three guided tries');
    }
    await solve(first);
    await next();

    // odd one out: three shape options, no prompt; two share a name.
    await screen.findByText(instruction(oddOneOut));
    expect(screen.getAllByRole('button', { name: 'blue circle' })).toHaveLength(2);
    expect(
      screen.getByRole('button', { name: 'blue square' }).querySelectorAll('svg'),
    ).toHaveLength(1);
    await solve(oddOneOut);
    await next();

    // pattern: the row is one image with a gap in it; the options show their counts.
    await screen.findByText(instruction(pattern));
    const row = screen.getByRole('img', {
      name: 'Row of shapes: red circle, blue square, red circle, a gap',
    });
    expect(row.querySelectorAll('svg')).toHaveLength(3);
    expect(row.querySelector('[data-gap]')?.textContent).toBe('?');
    expect(
      screen.getByRole('button', { name: '3 small yellow triangles' }).querySelectorAll('svg'),
    ).toHaveLength(3);
    await play(pattern, [{ type: 'answer-choice', optionId: 'c' }]);
    await expectNote('Not quite! Try again.');
    await solve(pattern);
    await next();
  });

  it("a wrong first try speaks the kind's own note and costs a star; the next try still solves", async () => {
    const { services, profileId } = await cardApp();
    render(<App services={services} />);
    await openLesson();
    for (const def of GUIDED) {
      await solve(def);
      await next();
    }

    const notes = [
      [CHOICE, 'Not quite! Try again.'],
      [TRUE_FALSE, 'Two and two make four, not five.'], // the statement's reason, not the default note
      [NUMBER_ENTRY, 'Not that number. Try again!'],
      [ORDER, 'Not that one. Try another!'],
    ] as const;
    for (const [def, note] of notes) {
      await screen.findByText(instruction(def));
      const afterWrong = await play(def, actionsOf(def, 'wrong'));
      expect(afterWrong).toMatchObject({ errors: 1, solved: false });
      await expectNote(note);
      await play(def, actionsOf(def, 'solution'), afterWrong);
      await expectNote('Well done!');
      await next();
    }
    await solveGenerated();

    await screen.findByText('Lesson complete!');
    expect(
      screen.getByText(`+${String(notes.length * 2 + GENERATED.length * 3)} stars`),
    ).toBeTruthy();
    const progress = (await loadProgress(services.deps, profileId)).find(
      (entry) => entry.lessonId === lesson.id,
    );
    expect(progress?.bestStars).toEqual(
      Object.fromEntries(EXERCISES.map((def) => [def.id, GENERATED.includes(def) ? 3 : 2])),
    );
  });

  it('a wrong answer that matches a known misconception speaks its reason; any other wrong answer keeps the default note', async () => {
    const { services } = await cardApp();
    render(<App services={services} />);
    await openLesson();
    for (const def of GUIDED) {
      await solve(def);
      await next();
    }

    // choice: option "2" has no reason, option "Five" has one; the right answer only praises.
    await screen.findByText(instruction(CHOICE));
    click('2');
    await expectNote('Not quite! Try again.');
    click('Five');
    await expectNote('A hand is five fingers. Count the apples!');
    expect(screen.queryByText('Not quite! Try again.')).toBeNull();
    click('3');
    await expectNote('Good try!');
    expect(screen.queryByText('A hand is five fingers. Count the apples!')).toBeNull();
    await next();

    // true-false: the statement's reason on its one wrong pick.
    await screen.findByText(instruction(TRUE_FALSE));
    click('True');
    await expectNote('Two and two make four, not five.');
    click('False');
    await expectNote('Well done!');
    await next();

    // number-entry: 13 has no reason, 35 (seven times five) has one.
    await screen.findByText(instruction(NUMBER_ENTRY));
    click('1');
    click('3');
    click('Check');
    await expectNote('Not that number. Try again!');
    click('3');
    click('5');
    click('Check');
    await expectNote('That is seven times five. This one is plus!');
    expect(screen.queryByText('Not that number. Try again!')).toBeNull();
    click('1');
    click('2');
    click('Check');
    await expectNote('Good try!');
    await next();

    await screen.findByText(instruction(ORDER));
    await solve(ORDER);
    await next();

    // generated: every item of the template carries its off-by-one reason (answer + 1).
    const [first, ...rest] = GENERATED;
    if (first === undefined) throw new Error('the card fixture has no generated exercise');
    await screen.findByText(instruction(first));
    const afterWrong = await play(first, actionsOf(first, 'wrong'));
    await expectNote('So close! Count the last jump again.');
    await play(first, actionsOf(first, 'solution'), afterWrong);
    await next();
    for (const def of rest) {
      await screen.findByText(instruction(def));
      await solve(def);
      await next();
    }
    await screen.findByText('Lesson complete!');
  });

  it("speaks each kind's hints and shows what they do on the cards", async () => {
    const { services } = await cardApp();
    render(<App services={services} />);
    await openLesson();
    for (const def of GUIDED) {
      await solve(def);
      await next();
    }
    const hint = (): void => {
      click('Hint');
    };

    // choice: the first hint rules one wrong option out.
    await screen.findByText(instruction(CHOICE));
    hint();
    await expectNote('One choice is ruled out.');
    expect(screen.getByRole('button', { name: '2' }).hasAttribute('disabled')).toBe(true);
    await solve(CHOICE);
    await next();

    // true-false: nudges twice, then the third hint outlines the right button.
    await screen.findByText(instruction(TRUE_FALSE));
    hint();
    await expectNote('Look closely.');
    hint();
    hint();
    await expectNote('Here is the answer.');
    expect(screen.getByRole('button', { name: 'False' }).className).toContain('tap-border-go');
    await solve(TRUE_FALSE);
    await next();

    // number-entry: nudge, then the first digit is typed in, then the whole answer.
    await screen.findByText(instruction(NUMBER_ENTRY));
    hint();
    await expectNote('Look closely.');
    hint();
    await expectNote('It starts with 1.');
    expect(screen.getByRole('status', { name: 'Your answer: 1' })).toBeTruthy();
    hint();
    await expectNote('Here is the answer.');
    expect(screen.getByRole('status', { name: 'Your answer: 12' })).toBeTruthy();
    click('Check');
    await next();

    // order: the next slot, one wrong card dimmed, then the next right card placed.
    await screen.findByText(instruction(ORDER));
    hint();
    await expectNote('Which one comes next?');
    hint();
    await expectNote('One choice is ruled out.');
    expect(screen.getByRole('button', { name: '3' }).hasAttribute('disabled')).toBe(true);
    hint();
    await expectNote('Here is the answer.');
    expect(screen.getByRole('listitem', { name: 'Place 1 of 3: 1' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '1' })).toBeNull();
    // The dimmed card is free again once its slot is filled.
    expect(screen.getByRole('button', { name: '3' }).hasAttribute('disabled')).toBe(false);
    await play(ORDER, [
      { type: 'place-item', itemId: 'two' },
      { type: 'place-item', itemId: 'three' },
    ]);
    await next();
    await solveGenerated();

    await screen.findByText('Lesson complete!');
  });
});
