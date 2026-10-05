// The Journey over a subject that is not chess (the card kit's fixture subject, platform texts merged): nothing on the map says
// "Basics" or a piece unless the subject's own texts do, and a subject without branch tracks shows no "Paths after" heading
// (chess, with its 3 paths, still shows "Paths after Basics").
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { createProfile, selectProfile } from '@learn/platform-core';
import type { AppConfig } from '@learn/platform-core';
import { createAppServices } from '../app/services.ts';
import { initI18n } from '../i18n.ts';
import { cardLocales, createCardTestEntry } from '../testing/card-test-entry.tsx';
import { createMemoryStorage } from '../testing/memory-storage.ts';
import { stubMatchMedia } from '../testing/mock-media-query.ts';
import { renderWithStore } from '../testing/render-with-store.tsx';
import { animalImage } from './art/animal-images.ts';
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

  it("shows the subject's own lesson character, not the Owl, on a World 1 node (the Owl stays for chess's Owl-taught World 1)", async () => {
    const app = createAppServices([createCardTestEntry()], APP, createMemoryStorage());
    const services = await app.activate('cards');
    const profile = await createProfile(services.deps, 'Mia', 'fox');
    await selectProfile(services.deps, profile.id);

    await renderWithStore(<JourneyScreen />, services);

    await screen.findAllByRole('button');
    const sources = [...document.querySelectorAll('img')].map((img) => img.getAttribute('src'));
    expect(sources).toContain(animalImage('fox'));
    expect(sources).not.toContain(animalImage('owl'));
  });
});

describe('JourneyScreen world tabs', () => {
  const scrollIntoView = vi.fn();
  const proto = HTMLElement.prototype as { scrollIntoView?: unknown };

  beforeEach(() => {
    scrollIntoView.mockClear();
    proto.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    delete proto.scrollIntoView;
  });

  async function openJourney(): Promise<void> {
    const app = createAppServices([createCardTestEntry()], APP, createMemoryStorage());
    const services = await app.activate('cards');
    const profile = await createProfile(services.deps, 'Mia', 'fox');
    await selectProfile(services.deps, profile.id);
    await renderWithStore(<JourneyScreen />, services);
    await screen.findAllByRole('button');
  }

  const tab = (name: string): HTMLElement => screen.getByRole('button', { name });

  it("brings the current world's tab into view when the map opens, and again when another tab is chosen", async () => {
    await openJourney();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenLastCalledWith({
      inline: 'nearest',
      block: 'nearest',
      behavior: 'smooth',
    });
    expect(scrollIntoView.mock.contexts[0]).toBe(tab('1Counting'));

    fireEvent.click(tab('2Sorting'));
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
    expect(scrollIntoView.mock.contexts[1]).toBe(tab('2Sorting'));

    // Tapping the tab that is already selected scrolls nothing more.
    fireEvent.click(tab('2Sorting'));
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it('jumps instead of gliding with reduced motion', async () => {
    const restore = stubMatchMedia('(prefers-reduced-motion: reduce)');
    try {
      await openJourney();
      expect(scrollIntoView).toHaveBeenLastCalledWith({
        inline: 'nearest',
        block: 'nearest',
        behavior: 'auto',
      });
    } finally {
      restore();
    }
  });
});
