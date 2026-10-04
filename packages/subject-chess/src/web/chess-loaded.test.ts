import { describe, expect, it } from 'vitest';
import { chessEntry } from '../entry.ts';
import { chessWeb } from './chess-pack.ts';

describe('chessEntry.load', () => {
  it('resolves to the chess pack with its merged English bundle', async () => {
    const loaded = await chessEntry.load();

    expect(loaded.pack).toBe(chessWeb);
    expect(loaded.pack.core.id).toBe(chessEntry.manifest.id);
    expect(Object.keys(loaded.locales)).toEqual(['en']);
    const common = loaded.locales.en?.common as { app?: { title?: string } } | undefined;
    expect(common?.app?.title).toBe('Chess');
  });
});
