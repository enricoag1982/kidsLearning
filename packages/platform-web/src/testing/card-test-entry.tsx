// A whole card subject for platform-web's own tests: `createCardCore` + `createCardContent` compiled from platform-content's card
// fixture (YAML) + `createCardWeb` — what a subject made only of YAML and art is. Never imported by app code.
import { createInstance } from 'i18next';
import type { i18n as I18n, InitOptions } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createDuelMode } from '@learn/platform-core';
import type { SubjectCore } from '@learn/platform-core';
import { makeContentSource, takeAwayGame } from '@learn/platform-core/testing';
import { createCardCore } from '@learn/platform-core/domain/exercise/kinds/cards/core';
import type {
  CardDemo,
  CardExerciseDef,
} from '@learn/platform-core/domain/exercise/kinds/cards/def';
import type { Lesson } from '@learn/platform-core';
import { compileAll } from '@learn/platform-content/compile-all';
import {
  CARD_FIXTURE_CHARACTERS,
  CARD_FIXTURE_ROOT,
  createCardFixtureContent,
} from '@learn/platform-content/testing/card-fixture';
import { PackProvider } from '../app/subject.ts';
import type { LoadedSubject, SubjectEntry, SubjectWeb } from '../app/subject.ts';
import { i18nOptions } from '../i18n-options.ts';
import { createCardWeb } from '../kinds/cards/web.ts';
import { createDuelModeUi } from '../modes/duel/mode-ui.ts';
import { createTestEntry } from './test-pack.ts';
import { TakeAwayBoard } from './take-away-board.tsx';

/** The fixture subject compiled once per test file (YAML → JSON, in memory). */
export const cardFixture = compileAll(createCardFixtureContent(), CARD_FIXTURE_ROOT);

/** The fixture's merged English bundles (platform + subject), as `dist/locales/en.json` would hold them. */
export const cardLocales: LoadedSubject['locales'] = { en: cardFixture.locales.en ?? {} };

/** The card core plus the opt-in `duel` mode over the fixture's take-away game. */
const baseCardCore = createCardCore({ id: 'cards', characters: CARD_FIXTURE_CHARACTERS });
export const cardCore: SubjectCore = {
  ...baseCardCore,
  modes: { ...baseCardCore.modes, duel: createDuelMode({ [takeAwayGame.id]: takeAwayGame }) },
};

export const cardLesson = cardFixture.content.lessons[0] as Lesson<CardExerciseDef, CardDemo>;

/** The card pack over the fixture's content, plus the opt-in `duel` mode UI over the take-away board; `art` is the subject's own
 * image ids → URLs. */
export function createCardTestPack(art: Readonly<Record<string, string>> = {}): SubjectWeb {
  const cards = createCardWeb({
    core: cardCore,
    content: makeContentSource({
      lessons: cardFixture.content.lessons,
      minigames: cardFixture.content.minigames,
      catalog: cardFixture.tracks,
      badges: cardFixture.badges,
    }),
    art,
    rankGlyphs: { sprout: '1', counter: '2' },
  });
  return {
    ...cards,
    modes: { ...cards.modes, duel: createDuelModeUi({ [takeAwayGame.id]: TakeAwayBoard }) },
  };
}

/** The card subject as the app shell registers it (`mountApp({ subjects })`): its manifest and a `load()` for the pack. */
export function createCardTestEntry(): SubjectEntry {
  return createTestEntry(createCardTestPack(), { names: { en: 'Cards' }, locales: cardLocales });
}

/** An i18next instance holding the fixture's real texts (platform `cards.*`, `exercise.*`, the fixture's lessons). */
export async function createCardI18n(): Promise<I18n> {
  const instance = createInstance();
  await instance.init(i18nOptions(cardLocales as InitOptions['resources']));
  return instance;
}

/** `ui` under the card pack and the fixture's texts. */
export async function renderCardUi(
  ui: ReactElement,
  art: Readonly<Record<string, string>> = {},
): Promise<ReturnType<typeof render>> {
  const i18n = await createCardI18n();
  return render(
    <I18nextProvider i18n={i18n}>
      <PackProvider value={createCardTestPack(art)}>{ui}</PackProvider>
    </I18nextProvider>,
  );
}
