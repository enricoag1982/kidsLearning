import type { ResourceLanguage } from 'i18next';
import { describe, expect, it } from 'vitest';
import type {
  CardChoiceDef,
  CardExerciseDef,
} from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { initCardState } from '@learn/platform-core/domain/exercise/kinds/cards/def';
import type { NumberEntryDef } from '@learn/platform-core/domain/exercise/kinds/number-entry/def';
import { CARD_SAMPLES, CARD_TYPES } from '@learn/platform-core/testing';
import { createE2ETexts } from '../../../e2e/i18n.ts';
import { cardLocales } from '../../testing/card-test-entry.tsx';
import { CARD_KIND_E2E, cardKindE2EOf } from './e2e-registry.ts';
import type { CardKindE2E } from './e2e-registry.ts';

type Page = Parameters<CardKindE2E['perform']>[0];

/** A page that only records the `getByRole(...).click()` it is asked for. */
function recordingPage(): { readonly page: Page; readonly clicks: string[] } {
  const clicks: string[] = [];
  const page = {
    getByRole(role: string, options: { name: string; exact: boolean }) {
      return {
        click: () => {
          clicks.push(`${role} "${options.name}"${options.exact ? ' exact' : ''}`);
          return Promise.resolve();
        },
      };
    },
  };
  return { page: page as unknown as Page, clicks };
}

/** Resolves a text key as `<key>`, so a click on a text name shows which key it came from. */
const text = (key: string): string => `<${key}>`;

/** What the e2e kit hands a driver; no driver reads `outcome` or `before`, and 'solved' is an outcome of every kind. */
function ctxOf<D extends CardExerciseDef>(def: D) {
  return { def, before: initCardState(def), outcome: { kind: 'solved' } as const, text };
}

describe('card e2e drivers', () => {
  it('cover every card kind, and the registry hands out each by type', () => {
    expect(Object.keys(CARD_KIND_E2E).sort()).toEqual([...CARD_TYPES].sort());
    for (const type of CARD_TYPES) expect(cardKindE2EOf(type)).toBe(CARD_KIND_E2E[type]);
  });

  it('choice: clicks the option by its text, else its big text, else its emoji, else its id as words', async () => {
    const def: CardChoiceDef = {
      ...CARD_SAMPLES.choice,
      options: [
        { id: 'a', big: '2' },
        { id: 'b', textKey: 'lessons:five', emoji: '🖐️' },
        { id: 'c', emoji: '🍎' },
        { id: 'ice-cream', image: 'fox' },
      ],
    };
    const { page, clicks } = recordingPage();
    for (const optionId of ['a', 'b', 'c', 'ice-cream']) {
      await CARD_KIND_E2E.choice.perform(page, { type: 'answer-choice', optionId }, ctxOf(def));
    }
    expect(clicks).toEqual([
      'button "2" exact',
      'button "<lessons:five>" exact',
      'button "🍎" exact',
      'button "ice cream" exact',
    ]);
  });

  it('choice: an unknown option is an error', async () => {
    const { page } = recordingPage();
    await expect(
      CARD_KIND_E2E.choice.perform(
        page,
        { type: 'answer-choice', optionId: 'zzz' },
        ctxOf(CARD_SAMPLES.choice),
      ),
    ).rejects.toThrow('choice "cc1": no option "zzz"');
  });

  it('true-false: clicks True or False by the platform texts', async () => {
    const { page, clicks } = recordingPage();
    const ctx = ctxOf(CARD_SAMPLES['true-false']);
    await CARD_KIND_E2E['true-false'].perform(
      page,
      { type: 'answer-true-false', value: true },
      ctx,
    );
    await CARD_KIND_E2E['true-false'].perform(
      page,
      { type: 'answer-true-false', value: false },
      ctx,
    );
    expect(clicks).toEqual(['button "<cards.true>" exact', 'button "<cards.false>" exact']);
  });

  it('number-entry: clicks the digit, Delete and Check keys', async () => {
    const def: NumberEntryDef = CARD_SAMPLES['number-entry'];
    const { page, clicks } = recordingPage();
    const driver = CARD_KIND_E2E['number-entry'];
    await driver.perform(page, { type: 'enter-digit', digit: 7 }, ctxOf(def));
    await driver.perform(page, { type: 'erase-digit' }, ctxOf(def));
    await driver.perform(page, { type: 'submit-number' }, ctxOf(def));
    expect(clicks).toEqual([
      'button "7" exact',
      'button "<cards.erase>" exact',
      'button "<exercise.check>" exact',
    ]);
  });

  it('choice: clicks a shape option by the label the app gives it, the e2e texts resolving the plural and the template', async () => {
    const { contentText } = createE2ETexts({ en: (cardLocales.en ?? {}) as ResourceLanguage });
    const def: CardChoiceDef = {
      ...CARD_SAMPLES.choice,
      options: [
        { id: 'a', shape: { kind: 'circle', colour: 'red', size: 'small', count: 3 } },
        { id: 'b', shape: { kind: 'square', colour: 'blue' } },
        {
          id: 'c',
          textKey: 'lessons:count-01-opt-c',
          shape: { kind: 'star', colour: 'yellow' },
        },
      ],
    };
    const { page, clicks } = recordingPage();
    for (const optionId of ['a', 'b', 'c']) {
      await CARD_KIND_E2E.choice.perform(
        page,
        { type: 'answer-choice', optionId },
        { ...ctxOf(def), text: contentText },
      );
    }
    expect(clicks).toEqual([
      'button "3 small red circles" exact',
      'button "blue square" exact',
      'button "Five" exact',
    ]);
  });

  it('order: clicks a shape card by its shape label', async () => {
    const { contentText } = createE2ETexts({ en: (cardLocales.en ?? {}) as ResourceLanguage });
    const def = {
      ...CARD_SAMPLES.order,
      items: [
        { id: 'one', shape: { kind: 'heart', colour: 'purple', count: 2 } },
        { id: 'two', shape: { kind: 'diamond', colour: 'orange', size: 'tiny' } },
      ],
      answer: ['one', 'two'],
    } satisfies typeof CARD_SAMPLES.order;
    const { page, clicks } = recordingPage();
    for (const itemId of ['one', 'two']) {
      await CARD_KIND_E2E.order.perform(
        page,
        { type: 'place-item', itemId },
        { ...ctxOf(def), text: contentText },
      );
    }
    expect(clicks).toEqual([
      'button "2 purple hearts" exact',
      'button "tiny orange diamond" exact',
    ]);
  });

  it('order: clicks the card by its text, else its big text; an unknown card is an error', async () => {
    const def = CARD_SAMPLES.order;
    const { page, clicks } = recordingPage();
    const driver = CARD_KIND_E2E.order;
    await driver.perform(page, { type: 'place-item', itemId: 'one' }, ctxOf(def));
    await driver.perform(page, { type: 'place-item', itemId: 'two' }, ctxOf(def));
    expect(clicks).toEqual(['button "1" exact', 'button "<lessons:count-04-two>" exact']);
    await expect(
      driver.perform(page, { type: 'place-item', itemId: 'zzz' }, ctxOf(def)),
    ).rejects.toThrow('order "co1": no item "zzz"');
  });
});
