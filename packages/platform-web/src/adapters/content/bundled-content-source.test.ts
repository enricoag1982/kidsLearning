import { describe, expect, it } from 'vitest';
import type { BadgeDef, CompiledContent, TracksCatalog } from '@learn/platform-core';
import { makeLesson } from '@learn/platform-core/testing';
import { createBundledContentSource } from './bundled-content-source.ts';

const content: CompiledContent = {
  version: 1,
  lessons: [makeLesson({ id: 'one', order: 1 }), makeLesson({ id: 'two', order: 2 })],
  minigames: [
    {
      id: 'boss',
      mode: 'series',
      concept: 'c',
      titleKey: 'lessons:boss.title',
      goalKey: 'lessons:boss.goal',
      unlockAfter: 'two',
    },
  ],
};
const tracks: TracksCatalog = { tracks: [], ranks: [{ id: 'start', after: 'start' }] };
const badges: readonly BadgeDef[] = [
  {
    id: 'first',
    category: 'skill',
    nameKey: 'rewards:badges.first.name',
    conditionKey: 'rewards:badges.first.condition',
    condition: { type: 'stars-total', thresholds: [3] },
  },
];

describe('createBundledContentSource', () => {
  const source = createBundledContentSource({ content, tracks, badges });

  it('lists and finds lessons by id', () => {
    expect(source.lessons().map((lesson) => lesson.id)).toEqual(['one', 'two']);
    expect(source.lesson('two')?.id).toBe('two');
    expect(source.lesson('missing')).toBeUndefined();
  });

  it('lists and finds mini-games by id', () => {
    expect(source.minigames().map((game) => game.id)).toEqual(['boss']);
    expect(source.minigame('boss')?.id).toBe('boss');
    expect(source.minigame('missing')).toBeUndefined();
  });

  it('hands out the catalog and the badges as given', () => {
    expect(source.catalog()).toBe(tracks);
    expect(source.badges()).toBe(badges);
  });
});
