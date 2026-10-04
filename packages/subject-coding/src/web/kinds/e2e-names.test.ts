import { describe, expect, it } from 'vitest';
import type { Tile } from '../../core/tiles.ts';
import { cellLabelPattern, fill, pickLabel, tileLabel, trayLabel } from './e2e-names.ts';

/** The compiled templates, `{{vars}}` untouched, as the e2e kit's `contentText` gives them. */
const TEXTS: Readonly<Record<string, string>> = {
  'coding.tiles.up': 'Step up',
  'coding.tiles.right': 'Step right',
  'coding.tiles.repeat': 'Repeat {{times}} times',
  'coding.tiles.repeat-new': 'Repeat',
  'coding.strip.tile': 'Tile {{n}}: {{tile}}',
  'coding.board.cell': 'Row {{row}}, column {{column}}',
};
const text = (key: string): string => TEXTS[key] ?? key;

const program: Tile[] = [
  { kind: 'right' },
  { kind: 'repeat', times: 3, body: [{ kind: 'up' }] },
  { kind: 'right' },
];

describe('e2e names', () => {
  it('fills every {{name}}, leaving an unknown one as it is', () => {
    expect(fill('{{a}} and {{b}} and {{a}}', { a: 1, b: 'two' })).toBe('1 and two and 1');
    expect(fill('{{missing}}', {})).toBe('{{missing}}');
  });

  it('names a tile, and the tray button of a repeat apart from the repeat in the strip', () => {
    expect(tileLabel(text, { kind: 'up' })).toBe('Step up');
    expect(tileLabel(text, program[1] as Tile)).toBe('Repeat 3 times');
    expect(trayLabel(text, 'up')).toBe('Step up');
    expect(trayLabel(text, 'repeat')).toBe('Repeat');
  });

  it('names the button of a tile in a read-only strip, numbering a repeat and what is inside it', () => {
    expect(pickLabel(text, program, [0])).toBe('Tile 1: Step right');
    expect(pickLabel(text, program, [1])).toBe('Tile 2: Repeat 3 times');
    expect(pickLabel(text, program, [1, 0])).toBe('Tile 3: Step up');
    expect(pickLabel(text, program, [2])).toBe('Tile 4: Step right');
    expect(() => pickLabel(text, program, [5])).toThrow('no tile at path [5]');
  });

  it('matches a cell by its position, not by what is on it, and never column 1 for column 10', () => {
    const pattern = cellLabelPattern(text, { x: 0, y: 1 });
    expect(pattern.test('Row 2, column 1')).toBe(true);
    expect(pattern.test('Row 2, column 1, Fox, flag')).toBe(true);
    expect(pattern.test('Row 2, column 10')).toBe(false);
    expect(pattern.test('Row 12, column 1')).toBe(false);
  });
});
