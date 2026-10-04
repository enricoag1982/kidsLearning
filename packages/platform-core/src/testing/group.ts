/**
 * `group` kind fixtures for tests (`@learn/platform-core/testing`, never the app bundle): one sample def per layout over shape
 * items. The text keys are those of platform-content's card fixture subject (its `sort-up` lesson), so a web test rendering them
 * with that subject's texts shows `Red`, `Not red`, ...
 */
import type { GroupDef } from '../domain/exercise/kinds/group/def.ts';

/** Two boxes by colour: every card has exactly one box whose rule it meets. */
const row: GroupDef = {
  id: 'gr1',
  concept: 'sorting',
  textKey: 'lessons:sort-g1',
  type: 'group',
  layout: 'row',
  boxes: [
    { id: 'red', textKey: 'lessons:sort-red', rule: { all: ['colour:red'] } },
    { id: 'blue', textKey: 'lessons:sort-blue', rule: { all: ['colour:blue'] } },
  ],
  items: [
    { id: 'r-circle', shape: { kind: 'circle', colour: 'red' } },
    { id: 'b-square', shape: { kind: 'square', colour: 'blue' } },
    { id: 'r-triangle', shape: { kind: 'triangle', colour: 'red' } },
    { id: 'b-star', shape: { kind: 'star', colour: 'blue' } },
  ],
  answer: { 'r-circle': 'red', 'b-square': 'blue', 'r-triangle': 'red', 'b-star': 'blue' },
};

/** Colour (columns) x kind (rows): one card in each of the four cells. */
const carroll: GroupDef = {
  id: 'gc1',
  concept: 'sorting',
  textKey: 'lessons:sort-02',
  type: 'group',
  layout: 'carroll',
  axes: [
    {
      textKey: 'lessons:sort-red',
      notTextKey: 'lessons:sort-not-red',
      rule: { all: ['colour:red'] },
    },
    {
      textKey: 'lessons:sort-circle',
      notTextKey: 'lessons:sort-not-circle',
      rule: { all: ['kind:circle'] },
    },
  ],
  items: [
    { id: 'r-circle', shape: { kind: 'circle', colour: 'red' } },
    { id: 'r-square', shape: { kind: 'square', colour: 'red' } },
    { id: 'b-circle', shape: { kind: 'circle', colour: 'blue' } },
    { id: 'y-triangle', shape: { kind: 'triangle', colour: 'yellow' } },
  ],
  answer: {
    'r-circle': 'a-b',
    'r-square': 'a-not-b',
    'b-circle': 'not-a-b',
    'y-triangle': 'not-a-not-b',
  },
};

/** Square and blue as the two circles; one card in each region, one of them outside both. */
const venn: GroupDef = {
  id: 'gv1',
  concept: 'sorting',
  textKey: 'lessons:sort-03',
  type: 'group',
  layout: 'venn',
  axes: [
    {
      textKey: 'lessons:sort-square',
      notTextKey: 'lessons:sort-not-square',
      rule: { all: ['kind:square'] },
    },
    {
      textKey: 'lessons:sort-blue',
      notTextKey: 'lessons:sort-not-blue',
      rule: { all: ['colour:blue'] },
    },
  ],
  items: [
    { id: 'b-square', shape: { kind: 'square', colour: 'blue' } },
    { id: 'r-square', shape: { kind: 'square', colour: 'red' } },
    { id: 'b-triangle', shape: { kind: 'triangle', colour: 'blue' } },
    { id: 'y-circle', shape: { kind: 'circle', colour: 'yellow' } },
  ],
  answer: {
    'b-square': 'both',
    'r-square': 'only-a',
    'b-triangle': 'only-b',
    'y-circle': 'neither',
  },
};

/** One valid def of each layout. */
export const GROUP_SAMPLES = { row, carroll, venn } as const satisfies Readonly<
  Record<GroupDef['layout'], GroupDef>
>;
