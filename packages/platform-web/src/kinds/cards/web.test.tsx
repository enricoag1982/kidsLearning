import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { cardLesson, renderCardUi } from '../../testing/card-test-entry.tsx';
import { createCardWeb } from './web.ts';
import { SurfaceDemo, SurfaceStory, SurfaceView } from './surface.tsx';
import { createCardCore } from '@learn/platform-core/domain/exercise/kinds/cards/core';
import { initCardState } from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { CARD_FIXTURE_CHARACTERS } from '@learn/platform-content/testing/card-fixture';
import { CARD_SAMPLES, makeContentSource } from '@learn/platform-core/testing';

const content = makeContentSource({ lessons: [cardLesson] });
/** The bare kit's core (the test entry's `cardCore` also carries the opt-in `group` kind, which `createCardWeb` does not draw). */
const cardCore = createCardCore({ id: 'cards', characters: CARD_FIXTURE_CHARACTERS });
const web = createCardWeb({
  core: cardCore,
  content,
  art: { fox: '/art/fox.webp' },
  rankGlyphs: { sprout: '1' },
});

describe('createCardWeb', () => {
  it('is a whole SubjectWeb: the four card UIs, no mode UI, no routes', () => {
    expect(web.core).toBe(cardCore);
    expect(Object.keys(web.kinds).sort()).toEqual(
      ['choice', 'number-entry', 'order', 'true-false'].sort(),
    );
    for (const [type, ui] of Object.entries(web.kinds)) expect(ui.type).toBe(type);
    expect(web.modes).toEqual({});
    expect(web.routes).toEqual({});
    expect(web.art).toEqual({ fox: '/art/fox.webp' });
    expect(web.homeTiles).toBeUndefined();
    expect(web.createSlice).toBeUndefined();
    expect('loadParent' in web).toBe(false);
  });

  it('every kind of the core has a UI, so no exercise dispatches to nothing', () => {
    expect(Object.keys(web.kinds).sort()).toEqual(Object.keys(cardCore.kinds).sort());
  });

  it('serves the given content and no subject services', () => {
    const services = web.createServices();
    expect(services.content).toBe(content);
    expect(services.subject).toEqual({});
  });

  it('draws the rank ladder from the given glyphs, and ? for a rank without one', () => {
    expect(web.den.rankGlyph('sprout')).toBe('1');
    expect(web.den.rankGlyph('unknown')).toBe('?');
  });

  it('passes a character colour on, and has none by default', () => {
    expect('characterColor' in web).toBe(false);
    const coloured = createCardWeb({
      core: cardCore,
      content,
      art: {},
      rankGlyphs: {},
      characterColor: (character) => (character === 'fox' ? '#F5D0A9' : undefined),
    });
    expect(coloured.characterColor?.('fox')).toBe('#F5D0A9');
    expect(coloured.characterColor?.('owl')).toBeUndefined();
  });
});

describe('card surfaces', () => {
  it("Story: the demo's card, small on a phone column and beside the text otherwise", async () => {
    const { container, unmount } = await renderCardUi(<SurfaceStory lesson={cardLesson} compact />);
    expect(screen.getByText('🍎🍎🍎').className).toContain('text-5xl');
    expect(container.firstElementChild?.className).toContain('max-w-[240px]');
    unmount();
    const wide = await renderCardUi(<SurfaceStory lesson={cardLesson} compact={false} />);
    expect(wide.container.firstElementChild?.className).toContain('sm:h-52');
  });

  it("Demo: the demo's card at full size", async () => {
    await renderCardUi(<SurfaceDemo lesson={cardLesson} />);
    expect(screen.getByText('🍎🍎🍎').className).toContain('text-[96px]');
    expect(screen.getByText('3').className).toContain('text-5xl');
  });

  it("Story and Demo: a demo without a prompt shows the lesson's character instead", async () => {
    const bare = { ...cardLesson, demo: { textKey: cardLesson.demo.textKey } };
    const story = await renderCardUi(<SurfaceStory lesson={bare} compact={false} />);
    expect(story.container.querySelector('img')).not.toBeNull();
    expect(screen.queryByText('🍎🍎🍎')).toBeNull();
    story.unmount();
    const demo = await renderCardUi(<SurfaceDemo lesson={bare} />);
    expect(demo.container.querySelector('img')).not.toBeNull();
  });

  it("View: a finished round's prompt, or nothing for a round without one", async () => {
    const withPrompt = await renderCardUi(
      <SurfaceView state={initCardState(CARD_SAMPLES['true-false'])} />,
    );
    expect(screen.getByText('2 + 2 = 4')).toBeTruthy();
    withPrompt.unmount();
    const bare = { ...CARD_SAMPLES['true-false'], prompt: undefined };
    const without = await renderCardUi(<SurfaceView state={initCardState(bare)} />);
    expect(without.container.textContent).toBe('');
  });
});
