import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { CHESS_APP_CONFIG, chessEntry } from '@learn/subject-chess/entry';
import { mountApp, START_FAILED_RESOURCES } from '@learn/platform-web/mount.tsx';

const registerSW = () => () => Promise.resolve();

async function mountAt(hash: string): Promise<void> {
  document.body.innerHTML = '<div id="root"></div>';
  window.location.hash = hash;
  await mountApp({ subjects: [chessEntry], app: CHESS_APP_CONFIG, registerSW });
}

afterEach(() => {
  document.body.innerHTML = '';
  window.location.hash = '';
  vi.resetModules();
});

describe('mountApp', () => {
  it('renders the pack playground for an exact dev hash', async () => {
    await mountAt('#board');
    await screen.findByRole('heading', { name: 'Board playground (dev only)' });
  });

  it('matches a dev key ending in "=" as a prefix', async () => {
    await mountAt('#lesson=rook&view=story');
    await screen.findByText('Lesson preview (dev only):');
  });

  it('boots the app for any other hash', async () => {
    await mountAt('#unknown');
    await screen.findByRole('heading', { name: 'Chess for Kids' });
  });

  it('rejects without a root element', async () => {
    document.body.innerHTML = '';
    await expect(
      mountApp({ subjects: [chessEntry], app: CHESS_APP_CONFIG, registerSW }),
    ).rejects.toThrow('#root');
  });

  it('shows the error screen, not a blank page, when the subject pack fails to load', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const broken = { ...chessEntry, load: () => Promise.reject(new Error('chunk missing')) };

    await mountApp({ subjects: [broken], app: CHESS_APP_CONFIG, registerSW });

    await screen.findByRole('heading', { name: 'Oops, something went wrong' });
    expect(screen.getByText('chunk missing')).toBeTruthy();
  });

  it('shows the error screen with its own texts when no bundle was ever loaded', async () => {
    // A fresh module graph: i18next is not initialised, as at a first start whose pack chunk fails.
    vi.resetModules();
    const fresh = await import('@learn/platform-web/mount.tsx');
    document.body.innerHTML = '<div id="root"></div>';
    const broken = { ...chessEntry, load: () => Promise.reject(new Error('chunk missing')) };

    await fresh.mountApp({ subjects: [broken], app: CHESS_APP_CONFIG, registerSW });

    await screen.findByRole('heading', { name: 'Oops, something went wrong' });
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('keeps the start-failed texts equal to the platform bundle', async () => {
    const { locales } = await chessEntry.load();
    const common = locales.en?.common as { 'app-error': unknown };

    expect(START_FAILED_RESOURCES.en.common['app-error']).toEqual(common['app-error']);
  });
});
