import { describe, expect, it } from 'vitest';
import { GROUP_SAMPLES } from '../../../../testing/group.ts';
import type { GroupDef, GroupItem } from './def.ts';
import { CARROLL_ZONES, VENN_ZONES } from './def.ts';
import { carrollSides, groupZones, itemFacts, zoneOf } from './engine.ts';

const { row, carroll, venn } = GROUP_SAMPLES;
const redCircle: GroupItem = { id: 'x', shape: { kind: 'circle', colour: 'red' } };

describe('groupZones', () => {
  it('a row: its box ids in order; a Carroll table and a Venn: their four fixed zones', () => {
    expect(groupZones(row)).toEqual(['red', 'blue']);
    expect(groupZones(carroll)).toEqual([...CARROLL_ZONES]);
    expect(groupZones(venn)).toEqual([...VENN_ZONES]);
    expect([...CARROLL_ZONES]).toEqual(['a-b', 'a-not-b', 'not-a-b', 'not-a-not-b']);
    expect([...VENN_ZONES]).toEqual(['both', 'only-a', 'only-b', 'neither']);
  });

  it('a row without boxes has no zone', () => {
    expect(groupZones({ ...row, boxes: undefined })).toEqual([]);
  });
});

describe('carrollSides', () => {
  it('names the side of each axis of the four cells; an id that is no cell has none', () => {
    expect(CARROLL_ZONES.map((zone) => carrollSides(zone))).toEqual([
      { a: true, b: true },
      { a: true, b: false },
      { a: false, b: true },
      { a: false, b: false },
    ]);
    expect(carrollSides('both')).toBeUndefined();
  });
});

describe('itemFacts', () => {
  it('a shape gives its facts (defaults filled in), tags follow', () => {
    expect(itemFacts(redCircle)).toEqual(['kind:circle', 'colour:red', 'size:big', 'count:1']);
    expect(
      itemFacts({
        id: 'y',
        shape: { kind: 'star', colour: 'blue', size: 'small', count: 3 },
        tags: ['has:points', 'sky'],
      }),
    ).toEqual(['kind:star', 'colour:blue', 'size:small', 'count:3', 'has:points', 'sky']);
  });

  it('a card without a shape has only its tags (none: no facts)', () => {
    expect(itemFacts({ id: 'z', emoji: '🐶', tags: ['animal'] })).toEqual(['animal']);
    expect(itemFacts({ id: 'z', emoji: '🐶' })).toEqual([]);
  });
});

describe('zoneOf', () => {
  it('a row: the one box whose rule the card meets', () => {
    expect(zoneOf(row, redCircle)).toBe('red');
    expect(zoneOf(row, { id: 'b', shape: { kind: 'star', colour: 'blue' } })).toBe('blue');
  });

  it('a row: no box fits, or several do, or there are no rules: undefined', () => {
    expect(zoneOf(row, { id: 'y', shape: { kind: 'star', colour: 'yellow' } })).toBeUndefined();
    const both: GroupDef = {
      ...row,
      boxes: [
        { id: 'a', textKey: 'k', rule: { all: ['colour:red'] } },
        { id: 'b', textKey: 'k', rule: { all: ['kind:circle'] } },
      ],
    };
    expect(zoneOf(both, redCircle)).toBeUndefined();
    const plain: GroupDef = {
      ...row,
      boxes: [
        { id: 'red', textKey: 'k' },
        { id: 'blue', textKey: 'k' },
      ],
    };
    expect(zoneOf(plain, redCircle)).toBeUndefined();
  });

  it('a row: `none` excludes, `all` needs every fact', () => {
    const def: GroupDef = {
      ...row,
      boxes: [
        { id: 'plain', textKey: 'k', rule: { all: ['colour:red'], none: ['kind:circle'] } },
        { id: 'round', textKey: 'k', rule: { all: ['colour:red', 'kind:circle'] } },
      ],
    };
    expect(zoneOf(def, redCircle)).toBe('round');
    expect(zoneOf(def, { id: 's', shape: { kind: 'square', colour: 'red' } })).toBe('plain');
    expect(zoneOf(def, { id: 't', shape: { kind: 'square', colour: 'blue' } })).toBeUndefined();
  });

  it('a Carroll table: column by axis a, row by axis b', () => {
    const cases: readonly [GroupItem, string][] = [
      [{ id: '1', shape: { kind: 'circle', colour: 'red' } }, 'a-b'],
      [{ id: '2', shape: { kind: 'square', colour: 'red' } }, 'a-not-b'],
      [{ id: '3', shape: { kind: 'circle', colour: 'blue' } }, 'not-a-b'],
      [{ id: '4', shape: { kind: 'square', colour: 'blue' } }, 'not-a-not-b'],
    ];
    for (const [item, zone] of cases) expect(zoneOf(carroll, item), item.id).toBe(zone);
  });

  it('a Venn: both, only a, only b, neither', () => {
    const cases: readonly [GroupItem, string][] = [
      [{ id: '1', shape: { kind: 'square', colour: 'blue' } }, 'both'],
      [{ id: '2', shape: { kind: 'square', colour: 'red' } }, 'only-a'],
      [{ id: '3', shape: { kind: 'circle', colour: 'blue' } }, 'only-b'],
      [{ id: '4', shape: { kind: 'circle', colour: 'red' } }, 'neither'],
    ];
    for (const [item, zone] of cases) expect(zoneOf(venn, item), item.id).toBe(zone);
  });

  it('a Carroll table or Venn needs a rule on both axes', () => {
    const [a, b] = carroll.axes ?? [];
    if (a === undefined || b === undefined) throw new Error('sample has no axes');
    const noRuleB: GroupDef = { ...carroll, axes: [a, { ...b, rule: undefined }] };
    const noRuleA: GroupDef = { ...venn, axes: [{ ...a, rule: undefined }, b] };
    expect(zoneOf(noRuleB, redCircle)).toBeUndefined();
    expect(zoneOf(noRuleA, redCircle)).toBeUndefined();
    expect(zoneOf({ ...carroll, axes: undefined }, redCircle)).toBeUndefined();
  });
});
