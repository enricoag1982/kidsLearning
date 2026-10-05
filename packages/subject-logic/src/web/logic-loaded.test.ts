import { describe, expect, it } from 'vitest';
import { CARD_KIND_UI } from '@learn/platform-web/kinds/cards/ui-registry.ts';
import { GROUP_KIND_UI } from '@learn/platform-web/kinds/group/ui.ts';
import { logicEntry } from '../entry.ts';
import { gridFillUi } from '../kinds/grid-fill/ui.ts';
import { LOGIC_KIND_UI } from './kinds/ui-registry.ts';
import { logicWeb } from './logic-pack.ts';

describe('logicEntry.load', () => {
  it('resolves to the logic pack with its merged English bundle', async () => {
    const loaded = await logicEntry.load();

    expect(loaded.pack).toBe(logicWeb);
    expect(loaded.pack.core.id).toBe(logicEntry.manifest.id);
    expect(Object.keys(loaded.locales)).toEqual(['en']);
    const common = loaded.locales.en?.common as { app?: { title?: string } } | undefined;
    expect(common?.app?.title).toBe('Logic');
  });

  it('serves the compiled Pattern Pond: the 4 lessons, the Pattern Train, the track, the catalog and the badges', async () => {
    const { pack } = await logicEntry.load();
    const content = pack.createServices().content;

    expect(
      [...content.lessons()].sort((a, b) => a.order - b.order).map((lesson) => lesson.id),
    ).toEqual(['pat-repeat', 'pat-steps', 'pat-grow', 'pat-far']);
    expect(content.minigames().map((game) => game.id)).toEqual(['pattern-train']);
    expect(content.catalog?.().tracks.map((track) => track.id)).toEqual(['puzzles']);
    expect(content.catalog?.().tracks[0]?.worlds.map((world) => world.id)).toEqual([
      'pattern-pond',
    ]);
    expect(content.badges?.().map((badge) => badge.id)).toEqual([
      'pattern-spotter',
      'star-collector',
    ]);
  });

  it('draws the card kit kinds in logic’s own UI registry (the kit UIs, same objects), one UI per core kind', async () => {
    const { pack } = await logicEntry.load();
    expect(pack.kinds).toBe(LOGIC_KIND_UI);
    for (const [type, kindUi] of Object.entries(CARD_KIND_UI)) {
      expect(pack.kinds[type], type).toBe(kindUi);
    }
    // The platform's opt-in group UI (same object) joins them since m14.10.
    expect(pack.kinds['group']).toBe(GROUP_KIND_UI);
    expect(Object.keys(pack.kinds).sort()).toEqual([
      'choice',
      'grid-fill',
      'group',
      'number-entry',
      'order',
      'true-false',
    ]);
    expect(pack.kinds['grid-fill']).toBe(gridFillUi);
    expect(Object.keys(pack.kinds).sort()).toEqual(Object.keys(pack.core.kinds).sort());
  });
});
