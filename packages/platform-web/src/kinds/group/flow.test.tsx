// The group kind through the real exercise step (the session reducer, the Owl bubble, the stars): each layout of the card fixture's
// `sort-up` lesson played to 3 stars, what a wrong put says (the miss notes), and the three hints.
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AppConfig, Lesson } from '@learn/platform-core';
import type { GroupDef } from '@learn/platform-core';
import type {
  CardDemo,
  CardExerciseDef,
} from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { createAppServices } from '../../app/services.ts';
import { initI18n } from '../../i18n.ts';
import {
  cardCore,
  cardFixture,
  cardLocales,
  createCardTestPack,
} from '../../testing/card-test-entry.tsx';
import { CARD_KIND_UI } from '../cards/ui-registry.ts';
import { GROUP_KIND_UI } from './ui.ts';
import { createFakeNarrator } from '../../testing/fake-narrator.ts';
import type { FakeNarrator } from '../../testing/fake-narrator.ts';
import { createMemoryStorage } from '../../testing/memory-storage.ts';
import { renderWithStore } from '../../testing/render-with-store.tsx';
import { createTestEntry } from '../../testing/test-pack.ts';
import { ExerciseStep } from '../../ui/lesson/ExerciseStep.tsx';

const APP: Omit<AppConfig, 'version'> = {
  title: 'Cards app',
  storagePrefix: 'cards:',
  backupAppId: 'cards',
  backupFilePrefix: 'cards',
  parentCodeFilePrefix: 'cards-code',
};

const lesson = cardFixture.content.lessons.find((entry) => entry.id === 'sort-up') as Lesson<
  CardExerciseDef,
  CardDemo
>;
const exercises = lesson.exercises as unknown as readonly GroupDef[];
function exerciseOf(id: string): GroupDef {
  const def = exercises.find((entry) => entry.id === id);
  if (def === undefined) throw new Error(`the card fixture has no exercise "${id}"`);
  return def;
}
const ROW = exerciseOf('sort-01');
const CARROLL = exerciseOf('sort-02');
const VENN = exerciseOf('sort-03');

beforeAll(() => {
  initI18n(cardLocales as Parameters<typeof initI18n>[0]);
});

async function renderExercise(def: GroupDef, guided = false): Promise<FakeNarrator> {
  const narrator = createFakeNarrator();
  const entry = createTestEntry(createCardTestPack(), {
    names: { en: 'Cards' },
    locales: cardLocales,
  });
  const app = createAppServices([entry], APP, createMemoryStorage());
  const services = { ...(await app.activate('cards')), narrator };
  await renderWithStore(
    <ExerciseStep lesson={lesson} exercise={def} guided={guided} nextStepIndex={1} />,
    services,
  );
  return narrator;
}

const pool = () => within(screen.getByRole('group', { name: 'Cards to sort' }));
const card = (name: string) => pool().getByRole('button', { name });
const zone = (name: string) => screen.getByRole('button', { name });
/** Taps the card, then the box. */
const put = (cardName: string, zoneName: string): void => {
  fireEvent.click(card(cardName));
  fireEvent.click(zone(zoneName));
};
async function expectNote(text: string): Promise<void> {
  expect(await screen.findByText(text)).toBeTruthy();
}
const starsEarned = (): number =>
  screen.getByTestId('stars-row').querySelectorAll('.reward-star-pop').length;
const hint = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
};

describe('group kind through the exercise step: the whole play', () => {
  it('a row: every card in its box, no error: "Amazing!" (3 stars), the boxes stay, Next appears', async () => {
    await renderExercise(ROW);
    await screen.findByText('Put each shape in its box.');
    put('red circle', 'Red');
    put('blue square', 'Blue');
    put('red triangle', 'Red');
    put('blue star', 'Blue');
    await expectNote('Amazing!');
    expect(starsEarned()).toBe(3);
    expect(screen.getByRole('button', { name: /^Next/ })).toBeTruthy();
    expect(zone('Red').querySelectorAll('svg')).toHaveLength(2);
    expect(screen.queryByRole('group', { name: 'Cards to sort' })).toBeNull();
  });

  it('a Carroll table: four cards into their four cells: 3 stars', async () => {
    await renderExercise(CARROLL);
    put('red circle', 'Red, Circle');
    put('red square', 'Red, Not circle');
    put('blue circle', 'Not red, Circle');
    put('yellow triangle', 'Not red, Not circle');
    await expectNote('Amazing!');
    expect(starsEarned()).toBe(3);
  });

  it('a Venn: four cards into its four regions: 3 stars', async () => {
    await renderExercise(VENN);
    put('blue square', 'In both');
    put('red square', 'Only Square');
    put('blue triangle', 'Only Blue');
    put('yellow circle', 'Neither');
    await expectNote('Amazing!');
    expect(starsEarned()).toBe(3);
  });
});

describe('group kind through the exercise step: what a wrong put says', () => {
  it('a row: the plain note, narrated; the card stays in the pool and the box flashes; the next right put clears the note', async () => {
    const narrator = await renderExercise(ROW);
    put('red circle', 'Blue');
    await expectNote('Not this box. Check what the box wants.');
    await waitFor(() => {
      expect(narrator.spoken).toContain('Not this box. Check what the box wants.');
    });
    expect(zone('Blue').getAttribute('data-wrong')).toBe('true');
    expect(card('red circle')).toBeTruthy();
    expect(card('red circle').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(zone('Red'));
    expect(zone('Blue').getAttribute('data-wrong')).toBe('false');
    expect(screen.queryByText('Not this box. Check what the box wants.')).toBeNull();
    expect(pool().queryByRole('button', { name: 'red circle' })).toBeNull();
  });

  it('a Carroll table: right column, wrong row; right row, wrong column; both wrong', async () => {
    await renderExercise(CARROLL);
    // The red circle belongs in "Red, Circle".
    put('red circle', 'Red, Not circle');
    await expectNote('Right column! Now check the row.');
    fireEvent.click(zone('Not red, Circle'));
    await expectNote('Right row! Now check the column.');
    expect(screen.queryByText('Right column! Now check the row.')).toBeNull();
    fireEvent.click(zone('Not red, Not circle'));
    await expectNote('Not this box. Check what the box wants.');
  });

  it('a Venn: the shared region and the outside get their own questions, anything else the plain note', async () => {
    await renderExercise(VENN);
    put('blue square', 'Only Square'); // belongs in both
    await expectNote('Does it fit both circles, or just one?');
    put('yellow circle', 'Only Blue'); // belongs outside
    await expectNote('Does it fit either circle?');
    put('red square', 'Only Blue'); // only a, put in only b
    await expectNote('Not this box. Check what the box wants.');
  });

  it('a wrong put costs a star: one error then a clean finish is "Well done!" (2 stars)', async () => {
    await renderExercise(ROW);
    put('red circle', 'Blue');
    put('red circle', 'Red');
    put('blue square', 'Blue');
    put('red triangle', 'Red');
    put('blue star', 'Blue');
    await expectNote('Well done!');
    expect(starsEarned()).toBe(2);
  });

  it('two wrong puts leave one star: "Good try!"', async () => {
    await renderExercise(ROW);
    put('red circle', 'Blue');
    fireEvent.click(zone('Blue'));
    put('blue square', 'Red');
    put('red circle', 'Red');
    put('blue square', 'Blue');
    put('red triangle', 'Red');
    put('blue star', 'Blue');
    await expectNote('Good try!');
    expect(starsEarned()).toBe(1);
  });

  it('a wrong note on an exercise with an easier variant joins the offer sentence', async () => {
    const withEasier: GroupDef = { ...ROW, easier: 'sort-easy' };
    await renderExercise(withEasier);
    put('red circle', 'Blue');
    fireEvent.click(zone('Blue'));
    put('blue square', 'Red');
    await screen.findByText(/Not this box\. Check what the box wants\./);
  });
});

describe('group kind through the exercise step: hints', () => {
  it('hint 1: "Look at what each box wants.", the labels are outlined, nothing else changes', async () => {
    const narrator = await renderExercise(CARROLL);
    hint();
    await expectNote('Look at what each box wants.');
    await waitFor(() => {
      expect(narrator.spoken).toContain('Look at what each box wants.');
    });
    const table = screen.getByRole('table', { name: 'Boxes' });
    expect(table.querySelectorAll('th[data-marked="true"]')).toHaveLength(4);
    expect(pool().getAllByRole('button')).toHaveLength(4);
  });

  it('hint 2: "It does not go here.", the first card is selected and a wrong box is dimmed for it', async () => {
    await renderExercise(CARROLL);
    hint();
    hint();
    await expectNote('It does not go here.');
    expect(card('red circle').getAttribute('aria-pressed')).toBe('true');
    const dimmed = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-disabled') === 'true');
    expect(dimmed).toHaveLength(1);
    expect(dimmed[0]?.getAttribute('data-zone')).not.toBe('a-b');
    // Header marks are gone once the hint moved on.
    expect(screen.getByRole('table').querySelectorAll('th[data-marked="true"]')).toHaveLength(0);
  });

  it('hint 3: "Watch: it goes here.", the first card lands in its box (animated), the rest wait', async () => {
    await renderExercise(CARROLL);
    hint();
    hint();
    hint();
    await expectNote('Watch: it goes here.');
    expect(pool().queryByRole('button', { name: 'red circle' })).toBeNull();
    expect(zone('Red, Circle').querySelector('.group-drop')).not.toBeNull();
    expect(pool().getAllByRole('button')).toHaveLength(3);
  });

  it('hints cost stars: hint 3 and solving by hand is "Good try!" (1 star); hint 1 alone leaves 2 ("Well done!")', async () => {
    await renderExercise(ROW);
    hint();
    put('red circle', 'Red');
    put('blue square', 'Blue');
    put('red triangle', 'Red');
    put('blue star', 'Blue');
    await expectNote('Well done!');
  });

  it('hint 3 repeated places the cards one by one and solves the exercise with 1 star (the last hint stays the note)', async () => {
    await renderExercise(ROW);
    for (let press = 0; press < 6; press += 1) {
      expect(screen.queryByRole('button', { name: /^Next/ })).toBeNull();
      hint();
    }
    await screen.findByRole('button', { name: /^Next/ });
    expect(starsEarned()).toBe(1);
    expect(zone('Red').querySelectorAll('svg')).toHaveLength(2);
    expect(zone('Blue').querySelectorAll('svg')).toHaveLength(2);
    expect(screen.getByText('Watch: it goes here.')).toBeTruthy();
  });

  it('a guided try shows hint 1 at once: the labels are outlined, no note (the instruction only)', async () => {
    await renderExercise(ROW, true);
    await screen.findByText('Put each shape in its box.');
    expect(document.querySelectorAll('[data-marked="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByText('Look at what each box wants.')).toBeNull();
  });
});

describe('group is opt-in', () => {
  it('is not one of the card kit UIs; a subject pack that registers it has a UI for every kind of its core', () => {
    expect(Object.keys(CARD_KIND_UI)).not.toContain('group');
    const pack = createCardTestPack();
    expect(pack.kinds.group).toBe(GROUP_KIND_UI);
    expect(Object.keys(pack.kinds).sort()).toEqual(Object.keys(cardCore.kinds).sort());
  });
});
