import { describe, expect, it } from 'vitest';

import {
  HEADINGS,
  MAX_GRID_SIDE,
  cellKey,
  cellPosition,
  inGrid,
  parseCellKey,
  parseGridMap,
  sameCell,
  step,
  turnLeft,
  turnRight,
} from './grid.ts';
import type { Heading } from './grid.ts';

describe('cellKey / parseCellKey', () => {
  it('writes "x,y"', () => {
    expect(cellKey({ x: 0, y: 0 })).toBe('0,0');
    expect(cellKey({ x: 3, y: 9 })).toBe('3,9');
  });

  it('round-trips every cell of the largest grid and cells just outside it', () => {
    for (let y = -1; y <= MAX_GRID_SIDE; y += 1) {
      for (let x = -1; x <= MAX_GRID_SIDE; x += 1) {
        expect(parseCellKey(cellKey({ x, y }))).toEqual({ x, y });
      }
    }
  });

  it.each([
    '',
    '1',
    '1,',
    ',1',
    '1,2,3',
    'a,b',
    '1;2',
    ' 1,2',
    '1, 2',
    '1.5,2',
    '01,2',
    '-0,1',
    '+1,2',
    '1,2 ',
  ])('rejects the bad key %j', (key) => {
    expect(() => parseCellKey(key)).toThrow(/cell key/i);
  });
});

describe('inGrid', () => {
  const size = { cols: 5, rows: 3 };

  it('accepts all four corners', () => {
    expect(inGrid(size, { x: 0, y: 0 })).toBe(true);
    expect(inGrid(size, { x: 4, y: 0 })).toBe(true);
    expect(inGrid(size, { x: 0, y: 2 })).toBe(true);
    expect(inGrid(size, { x: 4, y: 2 })).toBe(true);
  });

  it('rejects one step past each edge', () => {
    expect(inGrid(size, { x: -1, y: 1 })).toBe(false);
    expect(inGrid(size, { x: 5, y: 1 })).toBe(false);
    expect(inGrid(size, { x: 2, y: -1 })).toBe(false);
    expect(inGrid(size, { x: 2, y: 3 })).toBe(false);
  });

  it('rejects a non-integer cell', () => {
    expect(inGrid(size, { x: 1.5, y: 1 })).toBe(false);
    expect(inGrid(size, { x: 1, y: Number.NaN })).toBe(false);
  });

  it('a 1 x 1 grid holds only 0,0', () => {
    expect(inGrid({ cols: 1, rows: 1 }, { x: 0, y: 0 })).toBe(true);
    expect(inGrid({ cols: 1, rows: 1 }, { x: 1, y: 0 })).toBe(false);
    expect(inGrid({ cols: 1, rows: 1 }, { x: 0, y: 1 })).toBe(false);
  });
});

describe('step', () => {
  const from = { x: 2, y: 2 };

  it('moves one cell by default; y = 0 is the top row, so up decreases y', () => {
    expect(step(from, 'up')).toEqual({ x: 2, y: 1 });
    expect(step(from, 'right')).toEqual({ x: 3, y: 2 });
    expect(step(from, 'down')).toEqual({ x: 2, y: 3 });
    expect(step(from, 'left')).toEqual({ x: 1, y: 2 });
  });

  it('moves n cells', () => {
    expect(step(from, 'right', 3)).toEqual({ x: 5, y: 2 });
    expect(step(from, 'up', 2)).toEqual({ x: 2, y: 0 });
    expect(step(from, 'left', 0)).toEqual(from);
  });

  it('may leave the grid; the caller checks inGrid', () => {
    const size = { cols: 3, rows: 3 };
    const out = step({ x: 0, y: 0 }, 'up');
    expect(out).toEqual({ x: 0, y: -1 });
    expect(inGrid(size, out)).toBe(false);
    expect(inGrid(size, step({ x: 2, y: 2 }, 'right'))).toBe(false);
    expect(inGrid(size, step({ x: 2, y: 2 }, 'down'))).toBe(false);
    expect(inGrid(size, step({ x: 0, y: 0 }, 'left'))).toBe(false);
  });

  it('does not change its input', () => {
    const cell = { x: 1, y: 1 };
    step(cell, 'down', 4);
    expect(cell).toEqual({ x: 1, y: 1 });
  });
});

describe('HEADINGS, turnLeft, turnRight', () => {
  it('lists the headings clockwise from up', () => {
    expect(HEADINGS).toEqual(['up', 'right', 'down', 'left']);
  });

  it('turnRight goes clockwise and wraps', () => {
    expect(turnRight('up')).toBe('right');
    expect(turnRight('right')).toBe('down');
    expect(turnRight('down')).toBe('left');
    expect(turnRight('left')).toBe('up');
  });

  it('turnLeft goes counter-clockwise and wraps', () => {
    expect(turnLeft('up')).toBe('left');
    expect(turnLeft('left')).toBe('down');
    expect(turnLeft('down')).toBe('right');
    expect(turnLeft('right')).toBe('up');
  });

  it.each(HEADINGS)(
    'left and right undo each other from %s; four turns return to the start',
    (heading) => {
      expect(turnLeft(turnRight(heading))).toBe(heading);
      expect(turnRight(turnLeft(heading))).toBe(heading);
      let turned: Heading = heading;
      for (let i = 0; i < 4; i += 1) turned = turnRight(turned);
      expect(turned).toBe(heading);
    },
  );
});

describe('sameCell', () => {
  it('compares by position, not identity', () => {
    expect(sameCell({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
    expect(sameCell({ x: 1, y: 2 }, { x: 2, y: 1 })).toBe(false);
    expect(sameCell({ x: 1, y: 2 }, { x: 1, y: 3 })).toBe(false);
  });
});

describe('cellPosition', () => {
  it('is 1-based with the top row as row 1', () => {
    expect(cellPosition({ x: 0, y: 0 })).toEqual({ row: 1, column: 1 });
    expect(cellPosition({ x: 2, y: 1 })).toEqual({ row: 2, column: 3 });
    expect(cellPosition({ x: 9, y: 9 })).toEqual({ row: 10, column: 10 });
  });
});

describe('parseGridMap', () => {
  it('reads the size and the cells of each listed char, row by row', () => {
    const { size, cells } = parseGridMap(['R.S', '.#.', 'F..'], 'RS#F');
    expect(size).toEqual({ cols: 3, rows: 3 });
    expect(cells['R']).toEqual([{ x: 0, y: 0 }]);
    expect(cells['S']).toEqual([{ x: 2, y: 0 }]);
    expect(cells['#']).toEqual([{ x: 1, y: 1 }]);
    expect(cells['F']).toEqual([{ x: 0, y: 2 }]);
  });

  it('lists several cells of one char in reading order', () => {
    const { cells } = parseGridMap(['#.#', '.#.'], '#');
    expect(cells['#']).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
    ]);
  });

  it('gives a listed char that does not occur an empty list; unlisted chars are ignored', () => {
    const { cells } = parseGridMap(['..', '.x'], '#S');
    expect(cells).toEqual({ '#': [], S: [] });
    expect(Object.keys(cells)).toEqual(['#', 'S']);
  });

  it('accepts a 1 x 1 and a 10 x 10 map', () => {
    expect(parseGridMap(['#'], '#').size).toEqual({ cols: 1, rows: 1 });
    const big = Array.from({ length: 10 }, () => '.'.repeat(10));
    expect(parseGridMap(big, '#').size).toEqual({ cols: 10, rows: 10 });
  });

  it('counts an emoji marker as one column', () => {
    const { size, cells } = parseGridMap(['⭐.', '.🪨'], '⭐🪨');
    expect(size).toEqual({ cols: 2, rows: 2 });
    expect(cells['⭐']).toEqual([{ x: 0, y: 0 }]);
    expect(cells['🪨']).toEqual([{ x: 1, y: 1 }]);
  });

  it('throws on ragged rows', () => {
    expect(() => parseGridMap(['...', '..'], '#')).toThrow(/ragged/i);
    expect(() => parseGridMap(['..', '...'], '#')).toThrow(/ragged/i);
  });

  it('throws on a side over 10', () => {
    expect(() => parseGridMap(['.'.repeat(11)], '#')).toThrow(/too large/i);
    expect(() =>
      parseGridMap(
        Array.from({ length: 11 }, () => '.'),
        '#',
      ),
    ).toThrow(/too large/i);
  });

  it('throws on no rows or an empty row', () => {
    expect(() => parseGridMap([], '#')).toThrow(/at least one/i);
    expect(() => parseGridMap([''], '#')).toThrow(/at least one/i);
  });
});
