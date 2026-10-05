// The Home of a subject that is not chess (the card kit's fixture subject: no `homeTiles`, so Journey / Practice / My Den): the phone
// layout contracts the e2e `fit-shell.spec.ts` measures at 390 x 844: the header actions are icon-only round buttons that keep their
// accessible name and show a text label from `sm`, the pills are 36 px lines on a phone, and an odd number of tiles ends in a full row.
import { beforeAll, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { createProfile, selectProfile } from '@learn/platform-core';
import type { AppConfig } from '@learn/platform-core';
import { createAppServices } from '../app/services.ts';
import { initI18n } from '../i18n.ts';
import { cardLocales, createCardTestEntry } from '../testing/card-test-entry.tsx';
import { createMemoryStorage } from '../testing/memory-storage.ts';
import { renderWithStore } from '../testing/render-with-store.tsx';
import { HomeScreen } from './HomeScreen.tsx';

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

async function openHome(): Promise<void> {
  const app = createAppServices([createCardTestEntry()], APP, createMemoryStorage());
  const services = await app.activate('cards');
  const profile = await createProfile(services.deps, 'Mia', 'fox');
  await selectProfile(services.deps, profile.id);
  await renderWithStore(<HomeScreen />, services);
  await screen.findByRole('button', { name: 'Switch player' });
}

describe('HomeScreen phone layout (card fixture subject)', () => {
  it('header action: icon-only round button below lg (accessible name kept), icon + text label from lg (1024 px)', async () => {
    await openHome();

    const action = screen.getByRole('button', { name: 'Switch player' });
    expect(action.getAttribute('aria-label')).toBe('Switch player');
    expect(action.className).toContain('h-16');
    expect(action.className).toContain('w-16');
    expect(action.className).toContain('rounded-full');
    expect(action.className).toContain('lg:w-auto');
    const label = action.querySelector('span');
    expect(label?.textContent).toBe('Switch player');
    expect(label?.className).toContain('hidden');
    expect(label?.className).toContain('lg:inline');
    expect(action.querySelector('svg')).not.toBeNull();
  });

  it('pills are a 36 px line on a phone with no side padding, 56 px from sm', async () => {
    await openHome();

    const stars = screen.getByTestId('stars-pill');
    expect(stars.className).toContain('h-9');
    expect(stars.className).toContain('sm:h-14');
    expect(stars.className).toContain('px-0');
    expect(stars.className).toContain('sm:px-4');
    const rank = screen.getByTestId('rank-pill');
    expect(rank.className).toContain('h-9');
    expect(rank.className).toContain('sm:h-14');
  });

  it('an odd number of tiles (3 here): only the last one spans the 2-column phone grid', async () => {
    await openHome();

    const tiles = ['Journey', 'Practice', 'My Den'].map((name) =>
      screen.getByRole('button', { name: new RegExp(name) }),
    );
    expect(tiles.map((tile) => tile.className.includes('col-span-2'))).toEqual([
      false,
      false,
      true,
    ]);
    // From sm every tile has its own column again, and every tile stays a big target on a phone.
    expect(tiles[2]?.className).toContain('sm:col-span-1');
    for (const tile of tiles) expect(tile.className).toContain('min-h-20');
  });
});
