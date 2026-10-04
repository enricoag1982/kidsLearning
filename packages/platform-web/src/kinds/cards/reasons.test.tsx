// Reasons (docs/subjects/math/plan.md G5) through the real exercise step: a wrong answer that matches a known misconception
// shows and narrates its reason instead of the default wrong note; any other wrong answer keeps the default; the right answer
// is unchanged. One test per card kind that has a reason (choice option, true-false statement, number-entry value).
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AppConfig } from '@learn/platform-core';
import type {
  CardChoiceDef,
  CardExerciseDef,
} from '@learn/platform-core/domain/exercise/kinds/cards/def';
import type { NumberEntryDef } from '@learn/platform-core/domain/exercise/kinds/number-entry/def';
import type { TrueFalseDef } from '@learn/platform-core/domain/exercise/kinds/true-false/def';
import { CARD_SAMPLES } from '@learn/platform-core/testing';
import { createAppServices } from '../../app/services.ts';
import { initI18n } from '../../i18n.ts';
import { cardFixture, cardLesson, createCardTestPack } from '../../testing/card-test-entry.tsx';
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

const REASON = {
  five: 'A hand is five fingers. Count the apples!',
  times: 'That is seven times five. This one is plus!',
  statement: 'Two and two make four, not five.',
} as const;
const DEFAULT_WRONG = 'Not quite! Try again.';
const DEFAULT_NUMBER = 'Not that number. Try again!';

// The fixture's texts plus the three reasons (`lessons:why-*`).
const fixtureEn = cardFixture.locales.en ?? {};
const locales = {
  en: {
    ...fixtureEn,
    lessons: {
      ...fixtureEn.lessons,
      'why-five': REASON.five,
      'why-times': REASON.times,
      'why-statement': REASON.statement,
    },
  },
};

beforeAll(() => {
  initI18n(locales);
});

/** `def` as a scored exercise of the fixture lesson, a fake narrator on the services. */
async function renderExercise(def: CardExerciseDef): Promise<FakeNarrator> {
  const narrator = createFakeNarrator();
  const entry = createTestEntry(createCardTestPack(), { names: { en: 'Cards' }, locales });
  const app = createAppServices([entry], APP, createMemoryStorage());
  const services = { ...(await app.activate('cards')), narrator };
  await renderWithStore(
    <ExerciseStep lesson={cardLesson} exercise={def} guided={false} nextStepIndex={1} />,
    services,
  );
  return narrator;
}

const press = (...names: readonly string[]): void => {
  for (const name of names) fireEvent.click(screen.getByRole('button', { name }));
};

/** The note is under the instruction, and the narrator was asked to say it. */
async function expectSpoken(narrator: FakeNarrator, text: string): Promise<void> {
  expect(await screen.findByText(text)).toBeTruthy();
  await waitFor(() => {
    expect(narrator.spoken).toContain(text);
  });
}

describe('a card reason, played through the exercise step', () => {
  it('choice: the option with a reason speaks it, another wrong option the default, the right one praises', async () => {
    const def: CardChoiceDef = {
      ...CARD_SAMPLES.choice,
      options: CARD_SAMPLES.choice.options.map((option) =>
        option.id === 'c' ? { ...option, reasonKey: 'lessons:why-five' } : option,
      ),
    };
    const narrator = await renderExercise(def);

    press('2'); // option a: wrong, no reason
    await expectSpoken(narrator, DEFAULT_WRONG);
    expect(screen.queryByText(REASON.five)).toBeNull();

    press('Five'); // option c: wrong, with a reason
    await expectSpoken(narrator, REASON.five);
    expect(screen.queryByText(DEFAULT_WRONG)).toBeNull();

    press('3'); // option b: right
    expect(await screen.findByText('Good try!')).toBeTruthy();
    expect(screen.queryByText(REASON.five)).toBeNull();
  });

  it("true-false: a wrong answer speaks the statement's reason, the right one praises", async () => {
    const def: TrueFalseDef = {
      ...CARD_SAMPLES['true-false'],
      prompt: { big: '2 + 2 = 5' },
      answer: false,
      reasonKey: 'lessons:why-statement',
    };
    const narrator = await renderExercise(def);

    press('True'); // wrong
    await expectSpoken(narrator, REASON.statement);
    expect(screen.queryByText(DEFAULT_WRONG)).toBeNull();

    press('False'); // right
    expect(await screen.findByText('Well done!')).toBeTruthy();
    expect(screen.queryByText(REASON.statement)).toBeNull();
  });

  it('true-false without a reason keeps the default wrong note', async () => {
    const narrator = await renderExercise({ ...CARD_SAMPLES['true-false'], answer: false });
    press('True');
    await expectSpoken(narrator, DEFAULT_WRONG);
  });

  it('number-entry: the typed value with a reason speaks it, any other wrong value the default, the right one praises', async () => {
    const def: NumberEntryDef = {
      ...CARD_SAMPLES['number-entry'],
      reasons: [{ value: 35, reasonKey: 'lessons:why-times' }],
    };
    const narrator = await renderExercise(def);

    press('1', '3', 'Check'); // 13: wrong, no reason
    await expectSpoken(narrator, DEFAULT_NUMBER);
    expect(screen.queryByText(REASON.times)).toBeNull();

    press('3', '5', 'Check'); // 35: wrong, with a reason
    await expectSpoken(narrator, REASON.times);
    expect(screen.queryByText(DEFAULT_NUMBER)).toBeNull();

    press('1', '2', 'Check'); // 12: right
    expect(await screen.findByText('Good try!')).toBeTruthy();
    expect(screen.queryByText(REASON.times)).toBeNull();
  });
});
