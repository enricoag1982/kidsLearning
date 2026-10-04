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

  it('serves the compiled lessons, the two bosses, the catalog and the badges', async () => {
    const { pack } = await codingEntry.load();
    const content = pack.createServices().content;

    expect(
      content
        .lessons()
        .map((lesson) => lesson.id)
        .sort(),
    ).toEqual([
      'loop-chunk',
      'loop-debug',
      'loop-pattern',
      'loop-repeat',
      'seq-arrows',
      'seq-collect',
      'seq-debug',
      'seq-order',
    ]);
    expect(content.minigame('bug-squash')?.id).toBe('bug-squash');
    expect(content.minigame('fence-builder')?.id).toBe('fence-builder');
    expect(content.catalog?.().tracks.map((track) => track.id)).toEqual(['basics']);
    expect(content.badges?.().map((badge) => badge.id)).toEqual([
      'first-program',
      'bug-squasher',
      'meadow-walker',
      'hill-climber',
    ]);
  });
});
