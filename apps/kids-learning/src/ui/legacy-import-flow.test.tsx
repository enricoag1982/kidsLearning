// The first run's one-time offer to bring Chess for Kids progress along (docs/multi-subject.md F1), through the real screens: the
// older app's `chess-kids:*` keys (recorded from the v2.0.0 app) sit in the same `localStorage`.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderAppRaw } from '@learn/subject-chess/web/testing/render-app.tsx';
import { fixtureContentSource, fixtureLesson } from '@learn/subject-chess/web/testing/fixtures.ts';
import { createTestServices } from '@learn/subject-chess/web/testing/test-services.ts';

const OFFER = 'Found chess progress from Chess for Kids on this device. Bring it here?';
const FAILED = "That did not work. Let's start fresh!";

function chessKidsKeys(): Record<string, string> {
  const path = join(
    import.meta.dirname,
    '..',
    '..',
    'test-fixtures',
    'storage',
    'v2.0.0',
    'local-storage.json',
  );
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, string>;
}

function seedChessKids(overrides: Record<string, string> = {}): void {
  for (const [key, value] of Object.entries({ ...chessKidsKeys(), ...overrides })) {
    window.localStorage.setItem(key, value);
  }
}

/** Welcome → parent code → Saved → Next: lands on whatever the first run shows after the code. */
async function throughParentCode(): Promise<void> {
  fireEvent.click(await screen.findByRole('button', { name: 'Start setup' }));
  fireEvent.change(await screen.findByLabelText('Parent code'), { target: { value: '1234' } });
  fireEvent.change(screen.getByLabelText('Repeat parent code'), { target: { value: '1234' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save parent code' }));
  await screen.findByText('Parent code saved!');
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
}

function firstRunServices(): ReturnType<typeof createTestServices> {
  return createTestServices(fixtureContentSource(fixtureLesson()));
}

afterEach(() => {
  window.localStorage.clear();
});

describe('first run with Chess for Kids progress on this device', () => {
  it('offers to bring it after the parent code; Yes imports both children, then the picker shows them', async () => {
    seedChessKids();
    const before = chessKidsKeys();
    const services = firstRunServices();
    renderAppRaw(services);

    await throughParentCode();
    await screen.findByText(OFFER);
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));

    await screen.findByRole('heading', { name: "Who's playing today?" });
    expect(screen.getByRole('button', { name: /Mia/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Leo/ })).toBeTruthy();
    expect((await services.deps.profiles.list()).map((profile) => profile.nickname)).toEqual([
      'Mia',
      'Leo',
    ]);
    expect(window.localStorage.getItem('kids:legacy-import')).toBe('"done"');
    for (const [key, value] of Object.entries(before)) {
      expect(window.localStorage.getItem(key), key).toBe(value);
    }
  });

  it('"Not now" goes on to the new-player wizard with nothing imported, and remembers the answer', async () => {
    seedChessKids();
    const services = firstRunServices();
    renderAppRaw(services);

    await throughParentCode();
    await screen.findByText(OFFER);
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));

    await screen.findByPlaceholderText('Your name');
    expect(await services.deps.profiles.list()).toEqual([]);
    expect(window.localStorage.getItem('kids:legacy-import')).toBe('"declined"');
  });

  it('an import that does not work says so once, changes nothing, and goes on with Next', async () => {
    seedChessKids({ 'chess-kids:lesson-progress': '{broken' });
    const services = firstRunServices();
    renderAppRaw(services);

    await throughParentCode();
    await screen.findByText(OFFER);
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));

    await screen.findByText(FAILED);
    expect(screen.queryByRole('button', { name: 'Yes' })).toBeNull();
    expect(await services.deps.profiles.list()).toEqual([]);
    expect(window.localStorage.getItem('kids:legacy-import')).toBe('"declined"');
    expect(window.localStorage.getItem('chess-kids:lesson-progress')).toBe('{broken');

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByPlaceholderText('Your name');
  });

  it('is not offered when it was answered before (a stored "declined")', async () => {
    seedChessKids();
    window.localStorage.setItem('kids:legacy-import', '"declined"');
    renderAppRaw(firstRunServices());

    await throughParentCode();

    await screen.findByPlaceholderText('Your name');
    expect(screen.queryByText(OFFER)).toBeNull();
  });

  it('is not offered on a device with no older store (the plain first run), nor for a store with only a parent code', async () => {
    window.localStorage.setItem('chess-kids:parent-lock', '{"id":"p","password":"1234"}');
    renderAppRaw(firstRunServices());

    await throughParentCode();

    await screen.findByPlaceholderText('Your name');
    expect(screen.queryByText(OFFER)).toBeNull();
    expect(window.localStorage.getItem('kids:legacy-import')).toBeNull();
  });
});
