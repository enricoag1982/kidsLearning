import { describe, expect, it } from 'vitest';
import { mathEntry } from '../entry.ts';
import { mathWeb } from './math-pack.ts';

describe('mathEntry.load', () => {
  it('resolves to the math pack with its merged English bundle', async () => {
    const loaded = await mathEntry.load();

    expect(loaded.pack).toBe(mathWeb);
    expect(loaded.pack.core.id).toBe(mathEntry.manifest.id);
    expect(Object.keys(loaded.locales)).toEqual(['en']);
    const common = loaded.locales.en?.common as { app?: { title?: string } } | undefined;
    expect(common?.app?.title).toBe('Math for Kids');
  });
});
