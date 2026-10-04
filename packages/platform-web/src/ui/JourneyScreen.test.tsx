// The Journey over a subject that is not chess (the card kit's fixture subject, platform texts merged): nothing on the map says
// "Basics" or a piece unless the subject's own texts do, and a subject without branch tracks shows no "Paths after" heading
// (chess, with its 3 paths, still shows "Paths after Basics").
import { beforeAll, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { createProfile, selectProfile } from '@learn/platform-core';
import type { AppConfig } from '@learn/platform-core';
import { createAppServices } from '../app/services.ts';
import { initI18n } from '../i18n.ts';
import { cardLocales, createCardTestEntry } from '../testing/card-test-entry.tsx';
import { createMemoryStorage } from '../testing/memory-storage.ts';
import { renderWithStore } from '../testing/render-with-store.tsx';
import { JourneyScreen } from './JourneyScreen.tsx';

const APP: Omit<AppConfig, 'version'> = {
  title: 'Cards app',
  storagePrefix: 'cards:',
  backupAppId: 'cards',
  backupFilePrefix: 'cards',
  parentCodeFilePrefix: 'cards-code',
};

beforeAll(() => {
  initI18n(cardLocales as Parameters<typeof initI18n>[0]);
});

describe('JourneyScreen over the card fixture subject', () => {
  it('shows its own world and no paths heading or chess wording when it has no branch tracks', async () => {
    const app = createAppServices([createCardTestEntry()], APP, createMemoryStorage());
    const services = await app.activate('cards');
    const profile = await createProfile(services.deps, 'Mia', 'fox');
    await selectProfile(services.deps, profile.id);

    await renderWithStore(<JourneyScreen />, services);

    await screen.findAllByRole('button');
    expect(screen.queryByText(/Paths after/)).toBeNull();
    expect(screen.queryByText(/Basics/)).toBeNull();
  });
});
