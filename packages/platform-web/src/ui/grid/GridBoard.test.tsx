import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { Cell } from '@learn/platform-core';
import { stubMatchMedia } from '../../testing/mock-media-query.ts';
import { GridBoard } from './GridBoard.tsx';
import type { GridActor, GridBoardProps } from './GridBoard.tsx';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function board(props: Partial<GridBoardProps> = {}): GridBoardProps {
  return { size: { cols: 5, rows: 5 }, label: 'Meadow, 5 by 5', ...props };
}

function cellElement(x: number, y: number): HTMLElement {
  return screen.getByTestId(`grid-cell-${String(x)}-${String(y)}`);
}

const FOX: GridActor = {
  cell: { x: 1, y: 2 },
  image: '/fox.webp',
  label: 'Fox, facing right',
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('GridBoard cells', () => {
  it.each([
    { cols: 1, rows: 1 },
    { cols: 6, rows: 6 },
    { cols: 10, rows: 4 },
  ])('renders $cols x $rows cells', (size) => {
    render(<GridBoard {...board({ size })} />);
    expect(screen.getAllByTestId(/^grid-cell-/)).toHaveLength(size.cols * size.rows);
    expect(screen.getByTestId('grid-cell-0-0')).toBeTruthy();
    expect(
      screen.getByTestId(`grid-cell-${String(size.cols - 1)}-${String(size.rows - 1)}`),
    ).toBeTruthy();
    expect(screen.queryByTestId(`grid-cell-${String(size.cols)}-0`)).toBeNull();
    expect(screen.queryByTestId(`grid-cell-0-${String(size.rows)}`)).toBeNull();
  });

  it('is a labelled group', () => {
    render(<GridBoard {...board()} />);
    expect(screen.getByRole('group', { name: 'Meadow, 5 by 5' })).toBe(
      screen.getByTestId('grid-board'),
    );
  });

  it('exposes the cells row by row, top to bottom', () => {
    render(<GridBoard {...board({ size: { cols: 3, rows: 2 } })} />);
    const ids = screen.getAllByTestId(/^grid-cell-/).map((element) => element.dataset['testid']);
    expect(ids).toEqual([
      'grid-cell-0-0',
      'grid-cell-1-0',
      'grid-cell-2-0',
      'grid-cell-0-1',
      'grid-cell-1-1',
      'grid-cell-2-1',
    ]);
  });

  it('names a cell "row R, column C", 1-based from the top-left', () => {
    render(<GridBoard {...board()} />);
    expect(cellElement(0, 0).getAttribute('aria-label')).toBe('row 1, column 1');
    expect(cellElement(2, 1).getAttribute('aria-label')).toBe('row 2, column 3');
    expect(screen.getByRole('img', { name: 'row 5, column 5' })).toBe(cellElement(4, 4));
  });

  it('adds the content labels to the name: rock, star, flag, item and actor', () => {
    render(
      <GridBoard
        {...board({
          cells: {
            '0,0': { wall: true },
            '1,0': { star: true },
            '2,0': { goal: true },
            '3,0': { item: { emoji: '🍎', label: 'apple' } },
            '4,0': { star: true, goal: true },
            '0,1': { tone: 'filled' },
            '1,1': { tone: 'crossed' },
            '2,1': { tone: 'neutral' },
          },
          actor: { ...FOX, cell: { x: 3, y: 0 } },
        })}
      />,
    );
    expect(cellElement(0, 0).getAttribute('aria-label')).toBe('row 1, column 1, rock');
    expect(cellElement(1, 0).getAttribute('aria-label')).toBe('row 1, column 2, star');
    expect(cellElement(2, 0).getAttribute('aria-label')).toBe('row 1, column 3, flag');
    expect(cellElement(3, 0).getAttribute('aria-label')).toBe(
      'row 1, column 4, apple, Fox, facing right',
    );
    expect(cellElement(4, 0).getAttribute('aria-label')).toBe('row 1, column 5, star, flag');
    expect(cellElement(0, 1).getAttribute('aria-label')).toBe('row 2, column 1, filled');
    expect(cellElement(1, 1).getAttribute('aria-label')).toBe('row 2, column 2, crossed out');
    expect(cellElement(2, 1).getAttribute('aria-label')).toBe('row 2, column 3');
  });

  it('draws an item as an emoji, an image or text, none of it in the accessibility tree', () => {
    render(
      <GridBoard
        {...board({
          cells: {
            '0,0': { item: { emoji: '🍎', label: 'apple' } },
            '1,0': { item: { image: '/pear.png', label: 'pear' } },
            '2,0': { item: { text: '7', label: 'seven' } },
          },
        })}
      />,
    );
    expect(
      within(cellElement(0, 0)).getByText('🍎').closest('[aria-hidden="true"]'),
    ).not.toBeNull();
    expect(cellElement(1, 0).querySelector('img')?.getAttribute('src')).toBe('/pear.png');
    expect(within(cellElement(2, 0)).getByText('7')).toBeTruthy();
    expect(cellElement(2, 0).getAttribute('aria-label')).toBe('row 1, column 3, seven');
  });

  it('uses cellLabel when given', () => {
    const cellLabel = vi.fn((cell: Cell) => `square ${String(cell.x)}/${String(cell.y)}`);
    render(<GridBoard {...board({ cellLabel, cells: { '0,0': { wall: true } } })} />);
    expect(cellElement(0, 0).getAttribute('aria-label')).toBe('square 0/0');
    expect(cellElement(3, 2).getAttribute('aria-label')).toBe('square 3/2');
  });
});

describe('GridBoard tapping', () => {
  it('has no buttons and no tab stops without onCellTap: every cell is an image', () => {
    render(<GridBoard {...board()} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getAllByRole('img')).toHaveLength(25);
    expect(cellElement(0, 0).getAttribute('tabindex')).toBeNull();
  });

  it('makes every cell a named button and reports the tapped cell', () => {
    const onCellTap = vi.fn();
    render(<GridBoard {...board({ onCellTap, cells: { '3,2': { star: true } } })} />);
    expect(screen.getAllByRole('button')).toHaveLength(25);
    expect(screen.queryAllByRole('img')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'row 3, column 4, star' }));
    expect(onCellTap).toHaveBeenCalledTimes(1);
    expect(onCellTap).toHaveBeenLastCalledWith({ x: 3, y: 2 });

    fireEvent.click(cellElement(0, 4));
    expect(onCellTap).toHaveBeenLastCalledWith({ x: 0, y: 4 });
    expect(onCellTap).toHaveBeenCalledTimes(2);
  });

  it('keeps one tab stop and moves it with the arrow keys, not past the edge', () => {
    render(<GridBoard {...board({ onCellTap: vi.fn(), size: { cols: 3, rows: 3 } })} />);
    const tabStops = (): string[] =>
      screen
        .getAllByRole('button')
        .filter((button) => button.getAttribute('tabindex') === '0')
        .map((button) => button.dataset['testid'] ?? '');
    expect(tabStops()).toEqual(['grid-cell-0-0']);

    fireEvent.keyDown(cellElement(0, 0), { key: 'ArrowLeft' });
    fireEvent.keyDown(cellElement(0, 0), { key: 'ArrowUp' });
    expect(tabStops()).toEqual(['grid-cell-0-0']);

    fireEvent.keyDown(cellElement(0, 0), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(cellElement(1, 0));
    expect(tabStops()).toEqual(['grid-cell-1-0']);

    fireEvent.keyDown(cellElement(1, 0), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(cellElement(1, 1));
    fireEvent.keyDown(cellElement(1, 1), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(cellElement(0, 1));
    expect(tabStops()).toEqual(['grid-cell-0-1']);
  });
});

describe('GridBoard actor', () => {
  it('sits on its cell and slides by a transform when the cell changes', () => {
    const { rerender } = render(<GridBoard {...board({ actor: FOX })} />);
    const actor = screen.getByTestId('grid-actor');
    expect(actor.getAttribute('data-cell')).toBe('1,2');
    expect(actor.style.width).toBe('20%');
    expect(actor.style.height).toBe('20%');
    expect(actor.style.transform).toBe('translate(100%, 200%)');
    expect(actor.className).toContain('grid-actor-move');
    expect(actor.querySelector('img')?.getAttribute('src')).toBe('/fox.webp');

    rerender(<GridBoard {...board({ actor: { ...FOX, cell: { x: 4, y: 0 } } })} />);
    const moved = screen.getByTestId('grid-actor');
    expect(moved).toBe(actor);
    expect(moved.getAttribute('data-cell')).toBe('4,0');
    expect(moved.style.transform).toBe('translate(400%, 0%)');
  });

  it('scales the cell size to a non-square grid', () => {
    render(
      <GridBoard
        {...board({ size: { cols: 10, rows: 4 }, actor: { ...FOX, cell: { x: 9, y: 3 } } })}
      />,
    );
    const actor = screen.getByTestId('grid-actor');
    expect(actor.style.width).toBe('10%');
    expect(actor.style.height).toBe('25%');
    expect(actor.style.transform).toBe('translate(900%, 300%)');
  });

  it('is hidden from assistive technology; its label is part of its cell name', () => {
    render(<GridBoard {...board({ actor: FOX })} />);
    expect(screen.getByTestId('grid-actor').getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByRole('img', { name: 'Fox, facing right' })).toBeNull();
    expect(cellElement(1, 2).getAttribute('aria-label')).toBe('row 3, column 2, Fox, facing right');
  });

  it('is not drawn off the board or when absent', () => {
    const { rerender } = render(
      <GridBoard {...board({ actor: { ...FOX, cell: { x: 5, y: 0 } } })} />,
    );
    expect(screen.queryByTestId('grid-actor')).toBeNull();
    rerender(<GridBoard {...board()} />);
    expect(screen.queryByTestId('grid-actor')).toBeNull();
  });

  it('shows the heading chip only when the actor has a heading, rotated to it', () => {
    const { rerender } = render(<GridBoard {...board({ actor: FOX })} />);
    expect(screen.queryByTestId('grid-actor-heading')).toBeNull();
    expect(screen.getByTestId('grid-actor').getAttribute('data-heading')).toBeNull();

    const rotations = { up: 0, right: 90, down: 180, left: 270 } as const;
    for (const heading of ['up', 'right', 'down', 'left'] as const) {
      rerender(<GridBoard {...board({ actor: { ...FOX, heading } })} />);
      const chip = screen.getByTestId('grid-actor-heading');
      expect(chip.getAttribute('data-heading')).toBe(heading);
      expect(screen.getByTestId('grid-actor').getAttribute('data-heading')).toBe(heading);
      expect((chip.firstElementChild as HTMLElement).style.transform).toBe(
        `rotate(${String(rotations[heading])}deg)`,
      );
      expect(chip.querySelector('svg')).not.toBeNull();
    }
  });

  it('puts the chip on the edge the actor faces', () => {
    const edge: Record<string, string> = {
      up: 'top-0',
      right: 'right-0',
      down: 'bottom-0',
      left: 'left-0',
    };
    const { rerender } = render(<GridBoard {...board({ actor: { ...FOX, heading: 'up' } })} />);
    for (const heading of ['up', 'right', 'down', 'left'] as const) {
      rerender(<GridBoard {...board({ actor: { ...FOX, heading } })} />);
      const classes = screen.getByTestId('grid-actor-heading').className.split(' ');
      expect(classes).toContain(edge[heading]);
    }
  });

  it('shakes when bumped', () => {
    const { rerender } = render(<GridBoard {...board({ actor: FOX })} />);
    expect(document.querySelector('.grid-actor-bump')).toBeNull();
    rerender(<GridBoard {...board({ actor: { ...FOX, bumped: true } })} />);
    expect(document.querySelector('.grid-actor-bump')).not.toBeNull();
    rerender(<GridBoard {...board({ actor: { ...FOX, bumped: false } })} />);
    expect(document.querySelector('.grid-actor-bump')).toBeNull();
  });

  it('with reduced motion: no transition class and no shake, same position', () => {
    const restore = stubMatchMedia(REDUCED_MOTION);
    try {
      render(<GridBoard {...board({ actor: { ...FOX, bumped: true, heading: 'down' } })} />);
      const actor = screen.getByTestId('grid-actor');
      expect(actor.className).not.toContain('grid-actor-move');
      expect(document.querySelector('.grid-actor-bump')).toBeNull();
      expect(actor.getAttribute('data-cell')).toBe('1,2');
      expect(actor.style.transform).toBe('translate(100%, 200%)');
    } finally {
      restore();
    }
  });
});

describe('GridBoard trail', () => {
  it('marks each trail cell with a footprint and no other cell', () => {
    render(
      <GridBoard
        {...board({
          trail: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
          ],
        })}
      />,
    );
    expect(screen.getAllByTestId(/^grid-trail-/)).toHaveLength(3);
    for (const [x, y] of [
      [0, 0],
      [1, 0],
      [1, 1],
    ] as const) {
      expect(
        within(cellElement(x, y)).getByTestId(`grid-trail-${String(x)}-${String(y)}`),
      ).toBeTruthy();
    }
    expect(within(cellElement(2, 2)).queryByTestId(/^grid-trail-/)).toBeNull();
  });

  it('has none without a trail, and counts a revisited cell once', () => {
    const { rerender } = render(<GridBoard {...board()} />);
    expect(screen.queryAllByTestId(/^grid-trail-/)).toHaveLength(0);
    rerender(
      <GridBoard
        {...board({
          trail: [
            { x: 2, y: 2 },
            { x: 3, y: 2 },
            { x: 2, y: 2 },
          ],
        })}
      />,
    );
    expect(screen.getAllByTestId(/^grid-trail-/)).toHaveLength(2);
  });
});

describe('GridBoard highlights', () => {
  it('rings each highlighted cell with its kind and no other cell', () => {
    render(
      <GridBoard
        {...board({
          highlights: {
            '0,0': 'target',
            '1,0': 'hint',
            '2,0': 'selected',
            '3,0': 'good',
            '4,0': 'bad',
          },
        })}
      />,
    );
    const kinds = screen
      .getAllByTestId(/^grid-highlight-/)
      .map((ring) => `${ring.dataset['testid'] ?? ''}=${ring.dataset['kind'] ?? ''}`);
    expect(kinds).toEqual([
      'grid-highlight-0-0=target',
      'grid-highlight-1-0=hint',
      'grid-highlight-2-0=selected',
      'grid-highlight-3-0=good',
      'grid-highlight-4-0=bad',
    ]);
    expect(cellElement(0, 0).dataset['highlight']).toBe('target');
    expect(cellElement(0, 1).dataset['highlight']).toBeUndefined();
  });

  it('never relies on colour alone: good carries a check mark, bad a cross, the others none', () => {
    render(
      <GridBoard
        {...board({
          highlights: {
            '0,0': 'target',
            '1,0': 'hint',
            '2,0': 'selected',
            '3,0': 'good',
            '4,0': 'bad',
          },
        })}
      />,
    );
    const marks = screen.getAllByTestId(/^grid-mark-/);
    expect(
      marks.map((mark) => `${mark.dataset['testid'] ?? ''}=${mark.dataset['kind'] ?? ''}`),
    ).toEqual(['grid-mark-3-0=good', 'grid-mark-4-0=bad']);
    for (const mark of marks) {
      expect(mark.querySelector('svg path')).not.toBeNull();
    }
    // Check mark and cross are different drawings.
    expect(marks[0]?.querySelector('path')?.getAttribute('d')).not.toBe(
      marks[1]?.querySelector('path')?.getAttribute('d'),
    );
  });

  it('puts the meaning of every highlight into the cell name too', () => {
    render(
      <GridBoard
        {...board({
          cells: { '3,0': { star: true } },
          highlights: {
            '0,0': 'target',
            '1,0': 'hint',
            '2,0': 'selected',
            '3,0': 'good',
            '4,0': 'bad',
          },
        })}
      />,
    );
    expect(cellElement(0, 0).getAttribute('aria-label')).toBe('row 1, column 1, target');
    expect(cellElement(1, 0).getAttribute('aria-label')).toBe('row 1, column 2, hint');
    expect(cellElement(2, 0).getAttribute('aria-label')).toBe('row 1, column 3, selected');
    expect(cellElement(3, 0).getAttribute('aria-label')).toBe('row 1, column 4, star, correct');
    expect(cellElement(4, 0).getAttribute('aria-label')).toBe('row 1, column 5, not right');
  });

  it('keeps every mark out of the accessibility tree', () => {
    render(<GridBoard {...board({ highlights: { '0,0': 'good', '1,1': 'bad' } })} />);
    expect(screen.queryByRole('img', { name: /✓|✕|check|cross/i })).toBeNull();
    for (const mark of screen.getAllByTestId(/^grid-mark-/)) {
      expect(mark.closest('[aria-hidden="true"]')).not.toBeNull();
    }
  });

  it('ignores a highlight or content key outside the grid', () => {
    render(
      <GridBoard
        {...board({
          size: { cols: 2, rows: 2 },
          cells: { '5,5': { wall: true } },
          highlights: { '9,9': 'bad', nonsense: 'good' },
        })}
      />,
    );
    expect(screen.queryAllByTestId(/^grid-highlight-/)).toHaveLength(0);
    expect(screen.getAllByTestId(/^grid-cell-/)).toHaveLength(4);
  });
});

describe('GridBoard fitting', () => {
  function stubArea(width: number, height: number): void {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
  }

  it('sizes the board to square cells of the largest size its area allows', () => {
    stubArea(600, 400);
    render(<GridBoard {...board({ size: { cols: 6, rows: 6 } })} />);
    const group = screen.getByTestId('grid-board');
    // (400 - 2 * 12) / 6 = 62.67 -> 62 px cells: 6 * 62 + 24 = 396 each way.
    expect(group.style.width).toBe('396px');
    expect(group.style.height).toBe('396px');
    expect(group.style.getPropertyValue('--grid-cell')).toBe('62px');
  });

  it('keeps a wide grid wider than tall', () => {
    stubArea(1000, 800);
    render(<GridBoard {...board({ size: { cols: 10, rows: 4 } })} />);
    const group = screen.getByTestId('grid-board');
    // Width-bound: (1000 - 24) / 10 = 97.6 -> 97 px cells.
    expect(group.style.width).toBe('994px');
    expect(group.style.height).toBe('412px');
  });

  it('falls back to an aspect ratio when nothing can be measured', () => {
    render(<GridBoard {...board({ size: { cols: 10, rows: 4 } })} />);
    const group = screen.getByTestId('grid-board');
    expect(group.style.aspectRatio).toBe('10 / 4');
    expect(group.style.width).toBe('');
  });
});

function stubSizedArea(width: number, height: number): void {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  );
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width,
    height,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
}

function boxEdgesOf(x: number, y: number): string | undefined {
  return cellElement(x, y).dataset['boxEdges'];
}

describe('GridBoard box borders', () => {
  it('has no box edge without `boxes`, and ignores a box size below 1', () => {
    const { rerender } = render(<GridBoard {...board({ size: { cols: 4, rows: 4 } })} />);
    for (const element of screen.getAllByTestId(/^grid-cell-/)) {
      expect(element.dataset['boxEdges']).toBeUndefined();
      expect(element.getAttribute('style')).toBeNull();
    }
    rerender(<GridBoard {...board({ size: { cols: 4, rows: 4 }, boxes: { cols: 0, rows: 2 } })} />);
    expect(
      screen.getAllByTestId(/^grid-cell-/).every((el) => el.dataset['boxEdges'] === undefined),
    ).toBe(true);
  });

  it('marks a 4 x 4 sudoku (boxes 2 x 2) on both sides of the two inner lines, never on the outer frame', () => {
    render(<GridBoard {...board({ size: { cols: 4, rows: 4 }, boxes: { cols: 2, rows: 2 } })} />);
    const edges = [0, 1, 2, 3].map((y) => [0, 1, 2, 3].map((x) => boxEdgesOf(x, y) ?? '-'));
    expect(edges).toEqual([
      ['-', 'right', 'left', '-'],
      ['bottom', 'right bottom', 'bottom left', 'bottom'],
      ['top', 'top right', 'top left', 'top'],
      ['-', 'right', 'left', '-'],
    ]);
    // Row 1 / column 1 of the outer frame: no cell reports an outer side.
    expect(cellElement(0, 0).dataset['boxEdges']).toBeUndefined();
    expect(cellElement(3, 3).dataset['boxEdges']).toBeUndefined();
  });

  it('marks a 6 x 6 sudoku with 3 x 2 boxes: one vertical line after column 3, horizontal lines after rows 2 and 4', () => {
    render(<GridBoard {...board({ size: { cols: 6, rows: 6 }, boxes: { cols: 3, rows: 2 } })} />);
    const withEdge = (edge: string): string[] =>
      screen
        .getAllByTestId(/^grid-cell-/)
        .filter((element) => (element.dataset['boxEdges'] ?? '').split(' ').includes(edge))
        .map((element) => element.dataset['testid']?.replace('grid-cell-', '') ?? '');
    expect(withEdge('right')).toEqual(['2-0', '2-1', '2-2', '2-3', '2-4', '2-5']);
    expect(withEdge('left')).toEqual(['3-0', '3-1', '3-2', '3-3', '3-4', '3-5']);
    expect(withEdge('bottom')).toEqual([
      '0-1',
      '1-1',
      '2-1',
      '3-1',
      '4-1',
      '5-1',
      '0-3',
      '1-3',
      '2-3',
      '3-3',
      '4-3',
      '5-3',
    ]);
    expect(withEdge('top')).toEqual([
      '0-2',
      '1-2',
      '2-2',
      '3-2',
      '4-2',
      '5-2',
      '0-4',
      '1-4',
      '2-4',
      '3-4',
      '4-4',
      '5-4',
    ]);
  });

  it('draws each box line once, 3 px dark, in the cell right of / below it; the rest stays 1 px', () => {
    render(<GridBoard {...board({ size: { cols: 4, rows: 4 }, boxes: { cols: 2, rows: 2 } })} />);
    const left = cellElement(1, 0).style.boxShadow;
    const right = cellElement(2, 0).style.boxShadow;
    // The left cell draws no right side, the right cell a 3 px dark left side; both keep the 1 px lines elsewhere.
    expect(left).not.toContain('-1px 0 0 0');
    expect(left).toContain('1px 0 0 0');
    expect(right).toContain('3px 0 0 0');
    expect(right).toContain('var(--color-ink)');
    const below = cellElement(0, 2).style.boxShadow;
    expect(below).toContain('0 3px 0 0');
    expect(cellElement(0, 1).style.boxShadow).not.toContain('0 -1px 0 0');
    // A cell with no box edge keeps the plain 1 px line of every other board.
    expect(cellElement(0, 0).getAttribute('style')).toBeNull();
  });

  it('keeps the cell positions and count with or without boxes', () => {
    render(<GridBoard {...board({ size: { cols: 6, rows: 6 }, boxes: { cols: 3, rows: 2 } })} />);
    expect(screen.getAllByTestId(/^grid-cell-/)).toHaveLength(36);
    expect(cellElement(3, 2).getAttribute('aria-label')).toBe('row 3, column 4');
  });
});

describe('GridBoard edge labels', () => {
  const clues = { top: ['1 1', '3', '', '5', '2'], left: ['1 1 1', '3', '1', '', '5'] };

  it('draws a lane of labels on each edge, top words one under the other, hidden from assistive technology', () => {
    render(<GridBoard {...board({ edgeLabels: clues })} />);
    const top = screen.getByTestId('grid-lane-top');
    const left = screen.getByTestId('grid-lane-left');
    expect(top.getAttribute('aria-hidden')).toBe('true');
    expect(left.getAttribute('aria-hidden')).toBe('true');
    const topFirst = screen.getByTestId('grid-clue-top-0');
    expect(Array.from(topFirst.querySelectorAll('span')).map((span) => span.textContent)).toEqual([
      '1',
      '1',
    ]);
    expect(screen.getByTestId('grid-clue-top-1').textContent).toBe('3');
    expect(screen.getByTestId('grid-clue-top-2').textContent).toBe('');
    // A left label's words stay on one line, as separate spans a gap apart.
    const leftFirst = screen.getByTestId('grid-clue-left-0');
    expect(Array.from(leftFirst.querySelectorAll('span')).map((span) => span.textContent)).toEqual([
      '1',
      '1',
      '1',
    ]);
    expect(screen.getAllByTestId(/^grid-clue-top-/)).toHaveLength(5);
    expect(screen.getAllByTestId(/^grid-clue-left-/)).toHaveLength(5);
    expect(screen.queryAllByRole('img').every((cell) => !top.contains(cell))).toBe(true);
  });

  it('adds the column clue, then the row clue, to every cell name; a blank label adds none', () => {
    render(<GridBoard {...board({ edgeLabels: clues })} />);
    expect(cellElement(0, 0).getAttribute('aria-label')).toBe(
      'row 1, column 1, clue 1 1, clue 1 1 1',
    );
    expect(cellElement(1, 2).getAttribute('aria-label')).toBe('row 3, column 2, clue 3, clue 1');
    expect(cellElement(2, 3).getAttribute('aria-label')).toBe('row 4, column 3');
    expect(cellElement(2, 4).getAttribute('aria-label')).toBe('row 5, column 3, clue 5');
    expect(cellElement(3, 3).getAttribute('aria-label')).toBe('row 4, column 4, clue 5');
  });

  it('works with one edge only', () => {
    render(<GridBoard {...board({ edgeLabels: { left: ['2', '1', '1', '1', '4'] } })} />);
    expect(screen.queryByTestId('grid-lane-top')).toBeNull();
    expect(screen.getByTestId('grid-lane-left')).toBeTruthy();
    expect(cellElement(4, 0).getAttribute('aria-label')).toBe('row 1, column 5, clue 2');
  });

  it('adds no lane without labels (a coding or math board)', () => {
    render(<GridBoard {...board({ edgeLabels: {} })} />);
    expect(screen.queryByTestId('grid-lane-top')).toBeNull();
    expect(screen.queryByTestId('grid-lane-left')).toBeNull();
    expect(cellElement(0, 0).getAttribute('aria-label')).toBe('row 1, column 1');
  });

  it('puts the clue after every other part of the name', () => {
    render(
      <GridBoard
        {...board({
          edgeLabels: { top: ['2'] },
          cells: {
            '0,0': { item: { text: '4', label: '4', style: 'given' }, marks: ['1'] },
          },
          highlights: { '0,0': 'selected' },
        })}
      />,
    );
    expect(cellElement(0, 0).getAttribute('aria-label')).toBe(
      'row 1, column 1, 4, selected, given, notes 1, clue 2',
    );
  });

  it('lets cellLabel name the cell alone', () => {
    render(
      <GridBoard
        {...board({ edgeLabels: { top: ['2'] }, cellLabel: () => 'square', cells: {} })}
      />,
    );
    expect(cellElement(0, 0).getAttribute('aria-label')).toBe('square');
  });

  it('shrinks the cells so the lanes fit the same area', () => {
    stubSizedArea(600, 400);
    const { unmount } = render(<GridBoard {...board()} />);
    // No lanes: (400 - 24) / 5 = 75.2 -> 75 px cells.
    expect(screen.getByTestId('grid-board').style.getPropertyValue('--grid-cell')).toBe('75px');
    unmount();

    render(
      <GridBoard
        {...board({
          edgeLabels: { top: ['1 1', '3', '', '5', '2'], left: ['1 1', '3', '1', '', '5'] },
        })}
      />,
    );
    const group = screen.getByTestId('grid-board');
    // Lanes: top 2 lines * 22 + 8 = 52, left "1 1" = 2 chars * 11 + one 8 px gap + 16 = 46: min((600 - 24 - 46) / 5, (400 - 24 - 52) / 5) = 64.8 -> 64.
    expect(group.style.getPropertyValue('--grid-cell')).toBe('64px');
    expect(group.style.width).toBe(String(64 * 5 + 24 + 46) + 'px');
    expect(group.style.height).toBe(String(64 * 5 + 24 + 52) + 'px');
  });

  it('sizes the top lane by its tallest label and the left lane by its longest', () => {
    stubSizedArea(900, 900);
    render(
      <GridBoard
        {...board({
          edgeLabels: { top: ['1', '1 1 1', '2', '1', '1'], left: ['1', '1', '1', '1', '1 1 1'] },
        })}
      />,
    );
    const group = screen.getByTestId('grid-board');
    // top 3 * 22 + 8 = 74, left "1 1 1" = 3 chars * 11 + two 8 px gaps + 16 = 65: (900 - 24 - 74) / 5 = 160.4 -> 160.
    expect(group.style.getPropertyValue('--grid-cell')).toBe('160px');
    expect(group.style.height).toBe(String(160 * 5 + 24 + 74) + 'px');
    expect(group.style.width).toBe(String(160 * 5 + 24 + 65) + 'px');
  });

  it('keeps the cells at the same size when a lane is absent', () => {
    stubSizedArea(600, 400);
    render(<GridBoard {...board({ edgeLabels: { top: [], left: [] } })} />);
    const group = screen.getByTestId('grid-board');
    expect(group.style.getPropertyValue('--grid-cell')).toBe('75px');
    expect(group.style.width).toBe('399px');
  });
});

describe('GridBoard pencil marks', () => {
  function marksOf(x: number, y: number): HTMLElement | null {
    return screen.queryByTestId(`grid-marks-${String(x)}-${String(y)}`);
  }

  it('lays up to 4 marks in a 2 x 2 mini grid and 5 to 9 in a 3 x 3 one, in the order given', () => {
    render(
      <GridBoard
        {...board({
          cells: {
            '0,0': { marks: ['1'] },
            '1,0': { marks: ['1', '4'] },
            '2,0': { marks: ['1', '2', '3', '4'] },
            '3,0': { marks: ['1', '2', '3', '4', '5'] },
            '4,0': { marks: ['1', '2', '3', '4', '5', '6', '7', '8', '9'] },
          },
        })}
      />,
    );
    const columns = (x: number): string | undefined => marksOf(x, 0)?.style.gridTemplateColumns;
    expect(columns(0)).toBe('repeat(2, minmax(0, 1fr))');
    expect(columns(1)).toBe('repeat(2, minmax(0, 1fr))');
    expect(columns(2)).toBe('repeat(2, minmax(0, 1fr))');
    expect(columns(3)).toBe('repeat(3, minmax(0, 1fr))');
    expect(columns(4)).toBe('repeat(3, minmax(0, 1fr))');
    expect(marksOf(1, 0)?.textContent).toBe('14');
    expect(
      Array.from(marksOf(4, 0)?.querySelectorAll('span') ?? []).map((span) => span.textContent),
    ).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
  });

  it('draws at most 9 marks and skips blank ones', () => {
    render(
      <GridBoard
        {...board({
          cells: {
            '0,0': { marks: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '9', '9'] },
            '1,0': { marks: ['', '3', ''] },
          },
        })}
      />,
    );
    expect(marksOf(0, 0)?.querySelectorAll('span')).toHaveLength(9);
    expect(marksOf(1, 0)?.textContent).toBe('3');
    expect(marksOf(2, 0)).toBeNull();
    expect(cellElement(0, 0).getAttribute('aria-label')).toBe(
      'row 1, column 1, notes 1, 2, 3, 4, 5, 6, 7, 8 and 9',
    );
  });

  it('keeps the marks out of the accessibility tree and names them "notes 1 and 4"', () => {
    render(
      <GridBoard
        {...board({
          cells: {
            '0,0': { marks: ['1', '4'] },
            '1,0': { marks: ['2'] },
            '2,0': { marks: ['1', '2', '4'] },
            '3,0': { marks: [] },
          },
        })}
      />,
    );
    expect(marksOf(0, 0)?.getAttribute('aria-hidden')).toBe('true');
    expect(cellElement(0, 0).getAttribute('aria-label')).toBe('row 1, column 1, notes 1 and 4');
    expect(cellElement(1, 0).getAttribute('aria-label')).toBe('row 1, column 2, notes 2');
    expect(cellElement(2, 0).getAttribute('aria-label')).toBe('row 1, column 3, notes 1, 2 and 4');
    expect(cellElement(3, 0).getAttribute('aria-label')).toBe('row 1, column 4');
    expect(marksOf(3, 0)).toBeNull();
  });

  it('sizes the digits to a quarter of the cell', () => {
    render(<GridBoard {...board({ cells: { '0,0': { marks: ['1'] } } })} />);
    expect(marksOf(0, 0)?.style.fontSize).toBe('calc(var(--grid-cell, 3rem) * 0.25)');
  });

  it('hides the marks, and their words in the name, when the cell is under 40 px', () => {
    // (219 - 24) / 5 = 39 px cells.
    stubSizedArea(219, 219);
    const { unmount } = render(
      <GridBoard {...board({ cells: { '0,0': { marks: ['1', '4'] } } })} />,
    );
    expect(screen.getByTestId('grid-board').style.getPropertyValue('--grid-cell')).toBe('39px');
    expect(marksOf(0, 0)).toBeNull();
    expect(cellElement(0, 0).getAttribute('aria-label')).toBe('row 1, column 1');
    unmount();

    // (224 - 24) / 5 = 40 px cells.
    vi.restoreAllMocks();
    stubSizedArea(224, 224);
    render(<GridBoard {...board({ cells: { '0,0': { marks: ['1', '4'] } } })} />);
    expect(screen.getByTestId('grid-board').style.getPropertyValue('--grid-cell')).toBe('40px');
    expect(marksOf(0, 0)).not.toBeNull();
    expect(cellElement(0, 0).getAttribute('aria-label')).toBe('row 1, column 1, notes 1 and 4');
  });

  it('draws the marks while the cell size is unknown', () => {
    render(<GridBoard {...board({ cells: { '0,0': { marks: ['1'] } } })} />);
    expect(marksOf(0, 0)).not.toBeNull();
  });
});

describe('GridBoard given and entered digits', () => {
  function digit(x: number, y: number): HTMLElement {
    const element = within(cellElement(x, y)).getByText(/^\d$/);
    return element;
  }

  it('shows a given digit bold in ink, with "given" in the name', () => {
    render(
      <GridBoard
        {...board({ cells: { '0,0': { item: { text: '3', label: '3', style: 'given' } } } })}
      />,
    );
    expect(digit(0, 0).className).toContain('font-bold');
    expect(digit(0, 0).className).toContain('text-ink');
    expect(digit(0, 0).closest('[data-style]')?.getAttribute('data-style')).toBe('given');
    expect(cellElement(0, 0).getAttribute('aria-label')).toBe('row 1, column 1, 3, given');
  });

  it('shows an entered digit in the info colour and normal weight, no word in the name', () => {
    render(
      <GridBoard
        {...board({ cells: { '1,0': { item: { text: '2', label: '2', style: 'entry' } } } })}
      />,
    );
    expect(digit(1, 0).className).toContain('text-info');
    expect(digit(1, 0).className).toContain('font-normal');
    expect(digit(1, 0).className).not.toContain('font-bold');
    expect(digit(1, 0).closest('[data-style]')?.getAttribute('data-style')).toBe('entry');
    expect(cellElement(1, 0).getAttribute('aria-label')).toBe('row 1, column 2, 2');
  });

  it('keeps an item without a style as before: semibold ink, no data-style', () => {
    render(<GridBoard {...board({ cells: { '2,0': { item: { text: '7', label: 'seven' } } } })} />);
    expect(digit(2, 0).className).toContain('font-semibold');
    expect(digit(2, 0).className).toContain('text-ink');
    expect(digit(2, 0).closest('[data-style]')).toBeNull();
    expect(cellElement(2, 0).getAttribute('aria-label')).toBe('row 1, column 3, seven');
  });

  it('keeps white digits on a filled cell whatever the style', () => {
    render(
      <GridBoard
        {...board({
          cells: {
            '0,0': { tone: 'filled', item: { text: '1', label: '1', style: 'given' } },
            '1,0': { tone: 'filled', item: { text: '2', label: '2', style: 'entry' } },
          },
        })}
      />,
    );
    expect(digit(0, 0).className).toContain('text-white');
    expect(digit(1, 0).className).toContain('text-white');
  });

  it('works in tap mode: a given digit is a named button too', () => {
    render(
      <GridBoard
        {...board({
          onCellTap: vi.fn(),
          cells: { '0,0': { item: { text: '3', label: '3', style: 'given' } } },
        })}
      />,
    );
    expect(screen.getByRole('button', { name: 'row 1, column 1, 3, given' })).toBe(
      cellElement(0, 0),
    );
  });
});
