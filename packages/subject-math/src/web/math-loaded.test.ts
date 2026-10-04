import { describe, expect, it } from 'vitest';
import { CARD_KIND_UI } from '@learn/platform-web/kinds/cards/ui-registry.ts';
import { mathEntry } from '../entry.ts';
import { numberLineUi } from '../kinds/number-line/ui.ts';
import { placeValueUi } from '../kinds/place-value/ui.ts';
import { MATH_KIND_UI } from './kinds/ui-registry.ts';
import { mathWeb } from './math-pack.ts';

describe('mathEntry.load', () => {
  it('resolves to the math pack with its merged English bundle', async () => {
    const loaded = await mathEntry.load();

    expect(loaded.pack).toBe(mathWeb);
    expect(loaded.pack.core.id).toBe(mathEntry.manifest.id);
    expect(Object.keys(loaded.locales)).toEqual(['en']);
    const common = loaded.locales.en?.common as { app?: { title?: string } } | undefined;
    expect(common?.app?.title).toBe('Math');
  });

  it('serves the compiled demo world: 3 lessons and the Number Parade, in the Numbers track', async () => {
    const { pack } = await mathEntry.load();
    const content = pack.createServices().content;

    expect(content.lessons().map((lesson) => lesson.id)).toEqual([
      'add-within-10',
      'add-within-5',
      'take-away',
    ]);
    expect(content.minigame('number-parade')?.id).toBe('number-parade');
    expect(content.catalog?.().tracks.map((track) => track.id)).toEqual(['numbers']);
    expect(content.badges?.().map((badge) => badge.id)).toEqual(['first-sums', 'star-counter']);
  });

  it('draws the card kit kinds, the number line and place-value, in math’s own UI registry (the kit UIs, same objects)', async () => {
    const { pack } = await mathEntry.load();
    expect(Object.keys(pack.kinds).sort()).toEqual([
      'choice',
      'number-entry',
      'number-line',
      'order',
      'place-value',
      'true-false',
    ]);
    expect(pack.kinds).toBe(MATH_KIND_UI);
    for (const [type, kindUi] of Object.entries(CARD_KIND_UI)) {
      expect(pack.kinds[type], type).toBe(kindUi);
    }
    expect(pack.kinds['number-line']).toBe(numberLineUi);
    expect(pack.kinds['place-value']).toBe(placeValueUi);
    // Every kind the core registers has a UI, and the other way round.
    expect(Object.keys(pack.kinds).sort()).toEqual(Object.keys(pack.core.kinds).sort());
  });
});
