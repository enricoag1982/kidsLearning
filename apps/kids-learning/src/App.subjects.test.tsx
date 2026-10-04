// The whole deployed app over the real chess and math packs: the hub, the subject switch and the storage layout.
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { InitOptions } from 'i18next';
import { createProfile, selectProfile, setupParentPassword } from '@learn/platform-core';
import App from '@learn/platform-web/App.tsx';
import { createAppServices } from '@learn/platform-web/app/services.ts';
import type { Services } from '@learn/platform-web/app/services.ts';
import { initI18n } from '@learn/platform-web/i18n.ts';
import { createFakePasswordFileWriter } from '@learn/platform-web/testing/fake-password-file-writer.ts';
import { createMemoryStorage } from '@learn/platform-web/testing/memory-storage.ts';
import { chessEntry } from '@learn/subject-chess/entry';
import { mathEntry } from '@learn/subject-math/entry';
import { KIDS_APP_CONFIG } from './app-config.ts';

function storageKeys(storage: Storage): readonly string[] {
  return Array.from({ length: storage.length }, (_, index) => storage.key(index) ?? '');
}

/** The real services over `storage` with chess active and one profile, except the parent-code file (a browser download). */
async function kidsApp(storage: Storage): Promise<Services> {
  const app = createAppServices([chessEntry, mathEntry], KIDS_APP_CONFIG, storage);
  const services = await app.activate(await app.initialSubjectId());
  initI18n(services.locales as InitOptions['resources']);
  const deps = { ...services.deps, passwordFile: createFakePasswordFileWriter() };
  await setupParentPassword(deps, '1234');
  const profile = await createProfile(deps, 'Mia', 'fox');
  await selectProfile(deps, profile.id);
  return { ...services, deps };
}

describe('Kids Learning app', () => {
  it('profile → hub with both subjects → Math Home → first lesson; every stored key is under kids: / kids-<id>:', async () => {
    const storage = createMemoryStorage();
    const services = await kidsApp(storage);
    render(<App services={services} />);

    fireEvent.click(await screen.findByRole('button', { name: /Mia/ }));
    await screen.findByRole('heading', { level: 1, name: 'What shall we learn?' });
    expect(screen.getByTestId('subject-tile-chess').textContent).toContain('Chess');
    expect(screen.getByTestId('subject-tile-math').textContent).toContain('Math');

    fireEvent.click(screen.getByTestId('subject-tile-math'));
    fireEvent.click(await screen.findByRole('button', { name: 'No, start at World 1' }));
    await screen.findByRole('heading', { level: 1, name: 'Math' });
    fireEvent.click(await screen.findByRole('button', { name: /Start/ }));
    await screen.findByRole('button', { name: /Let me try/ });
    await screen.findByText('2 + 1 = ?');

    const keys = storageKeys(storage);
    expect(keys).toContain('kids:profiles');
    // Math was opened, so Chess's own store holds nothing but its version.
    expect(Object.values((await services.deps.settings.get()).lastSubjectByProfile ?? {})).toEqual([
      'math',
    ]);
    expect(
      keys.filter((key) => key.startsWith('kids-chess:') && !key.endsWith(':schema-version')),
    ).toEqual([]);
    expect(keys.filter((key) => !/^kids(-chess|-math)?:/.test(key))).toEqual([]);
  });
});
