import { describe, expect, it } from 'vitest';
import { templateEntry } from '../entry.ts';
import { templateWeb } from './template-pack.ts';

describe('templateEntry.load', () => {
  it('resolves to the card pack with its merged English bundle', async () => {
    const loaded = await templateEntry.load();

    expect(loaded.pack).toBe(templateWeb);
    expect(loaded.pack.core.id).toBe(templateEntry.manifest.id);
    expect(Object.keys(loaded.locales)).toEqual(['en']);
    const common = loaded.locales.en?.common as { app?: { title?: string } } | undefined;
    expect(common?.app?.title).toBe('Template');
  });

  it('serves the compiled lessons, the boss, the catalog and the badges', async () => {
    const { pack } = await templateEntry.load();
    const content = pack.createServices().content;

    expect(content.lessons().map((lesson) => lesson.id)).toEqual([
      'sample-lesson-1',
      'sample-lesson-2',
    ]);
    expect(content.minigame('sample-boss')?.id).toBe('sample-boss');
    expect(content.catalog?.().tracks.map((track) => track.id)).toEqual(['basics']);
    expect(content.badges?.().map((badge) => badge.id)).toEqual(['first-lesson', 'star-collector']);
  });
});
