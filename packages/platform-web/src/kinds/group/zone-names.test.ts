import { describe, expect, it } from 'vitest';
import type { GroupDef } from '@learn/platform-core';
import { GROUP_SAMPLES } from '@learn/platform-core/testing';
import type { ContentText } from '../../content-text.ts';
import { boxLabel, zoneName } from './zone-names.ts';

const TEXTS: Readonly<Record<string, string>> = {
  'lessons:sort-red': 'Red',
  'lessons:sort-not-red': 'Not red',
  'lessons:sort-circle': 'Circle',
  'lessons:sort-not-circle': 'Not circle',
  'lessons:sort-square': 'Square',
  'lessons:sort-blue': 'Blue',
  'cards.group.zone': '{{column}}, {{row}}',
  'cards.group.venn.both': 'In both',
  'cards.group.venn.only': 'Only {{label}}',
  'cards.group.venn.neither': 'Neither',
  'cards.shape.label': '{{number}} {{size}} {{colour}} {{kind}}',
  'cards.shape.colour.blue': 'blue',
  'cards.shape.kind.star': 'star',
};
/** A tiny resolver: the key's text with its `{{vars}}` filled. */
const text: ContentText = (key, options = {}) =>
  (TEXTS[key] ?? key).replaceAll(/\{\{(\w+)\}\}/g, (_match, name: string) => {
    const value = options[name];
    return typeof value === 'string' ? value : '';
  });

const { row, carroll, venn } = GROUP_SAMPLES;

describe('boxLabel', () => {
  it('a row box: its text, else its shape, else its emoji, else its id as words', () => {
    expect(boxLabel({ id: 'a', textKey: 'lessons:sort-red', emoji: '🔴' }, text)).toBe('Red');
    expect(boxLabel({ id: 'a', shape: { kind: 'star', colour: 'blue' }, emoji: '🔴' }, text)).toBe(
      'blue star',
    );
    expect(boxLabel({ id: 'a', emoji: '🔴' }, text)).toBe('🔴');
    expect(boxLabel({ id: 'big-box' }, text)).toBe('big box');
  });
});

describe('zoneName', () => {
  it('a row: the box label; an unknown box its id as words', () => {
    expect(zoneName(row, 'red', text)).toBe('Red');
    expect(zoneName(row, 'blue', text)).toBe('Blue');
    expect(zoneName(row, 'dark-blue', text)).toBe('dark blue');
  });

  it('a Carroll cell: its column (axis a) and its row (axis b), the "not" text on the other side', () => {
    expect(zoneName(carroll, 'a-b', text)).toBe('Red, Circle');
    expect(zoneName(carroll, 'a-not-b', text)).toBe('Red, Not circle');
    expect(zoneName(carroll, 'not-a-b', text)).toBe('Not red, Circle');
    expect(zoneName(carroll, 'not-a-not-b', text)).toBe('Not red, Not circle');
  });

  it('a Venn region: in both, only each circle by its text, neither', () => {
    expect(zoneName(venn, 'both', text)).toBe('In both');
    expect(zoneName(venn, 'only-a', text)).toBe('Only Square');
    expect(zoneName(venn, 'only-b', text)).toBe('Only Blue');
    expect(zoneName(venn, 'neither', text)).toBe('Neither');
  });

  it('every zone of a layout has its own name', () => {
    for (const def of [row, carroll, venn] satisfies readonly GroupDef[]) {
      const zones = [...new Set(Object.values(def.answer))];
      const names = zones.map((zone) => zoneName(def, zone, text));
      expect(new Set(names).size, def.layout).toBe(zones.length);
    }
  });

  it('a layout without its boxes / axes still names a zone (its id as words)', () => {
    expect(zoneName({ ...carroll, axes: undefined }, 'a-b', text)).toBe('a b');
    expect(zoneName({ ...row, boxes: undefined }, 'red', text)).toBe('red');
  });
});
