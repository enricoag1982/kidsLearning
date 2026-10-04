import { describe, expect, it } from 'vitest';
import { codingEntry } from '../entry.ts';
import { codingWeb } from './coding-pack.ts';

describe('codingEntry.load', () => {
  it('resolves to the card pack with its merged English bundle', async () => {
    const loaded = await codingEntry.load();

    expect(loaded.pack).toBe(codingWeb);
    expect(loaded.pack.core.id).toBe(codingEntry.manifest.id);
    expect(Object.keys(loaded.locales)).toEqual(['en']);
    const common = loaded.locales.en?.common as { app?: { title?: string } } | undefined;
    expect(common?.app?.title).toBe('Coding');
  });

  it('serves the compiled lessons, the boss, the catalog and the badges', async () => {
    const { pack } = await codingEntry.load();
    const content = pack.createServices().content;

    expect(content.lessons().map((lesson) => lesson.id)).toEqual(['seq-arrows']);
    expect(content.minigame('fixture-boss')?.id).toBe('fixture-boss');
    expect(content.catalog?.().tracks.map((track) => track.id)).toEqual(['basics']);
    expect(content.badges?.().map((badge) => badge.id)).toEqual(['first-lesson', 'star-collector']);
  });
});
