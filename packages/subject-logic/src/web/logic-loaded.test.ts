import { describe, expect, it } from 'vitest';
import { logicEntry } from '../entry.ts';
import { logicWeb } from './logic-pack.ts';

describe('logicEntry.load', () => {
  it('resolves to the card pack with its merged English bundle', async () => {
    const loaded = await logicEntry.load();

    expect(loaded.pack).toBe(logicWeb);
    expect(loaded.pack.core.id).toBe(logicEntry.manifest.id);
    expect(Object.keys(loaded.locales)).toEqual(['en']);
    const common = loaded.locales.en?.common as { app?: { title?: string } } | undefined;
    expect(common?.app?.title).toBe('Logic');
  });

  it('serves the compiled lessons, the boss, the catalog and the badges', async () => {
    const { pack } = await logicEntry.load();
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
