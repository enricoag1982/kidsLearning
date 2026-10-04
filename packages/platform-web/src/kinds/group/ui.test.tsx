import { useState } from 'react';
import type { JSX } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import type { GroupDef, GroupHint, GroupState } from '@learn/platform-core';
import { initGroupState } from '@learn/platform-core';
import { GROUP_SAMPLES } from '@learn/platform-core/testing';
import { renderCardUi } from '../../testing/card-test-entry.tsx';
import { GROUP_KIND_UI } from './ui.ts';

const { row, carroll, venn } = GROUP_SAMPLES;

interface Over {
  readonly core?: Partial<GroupState>;
  readonly hint?: GroupHint | null;
  readonly def?: GroupDef;
  readonly showHint?: boolean;
}

async function renderPlayArea(def: GroupDef, over: Over = {}) {
  const dispatch = vi.fn();
  const view = await renderCardUi(
    GROUP_KIND_UI.PlayArea({
      def: over.def ?? def,
      state: {
        core: { ...initGroupState(over.def ?? def), ...over.core },
        hint: over.hint ?? null,
        feedback: { kind: 'instruction' },
      },
      dispatch,
      showHint: over.showHint ?? true,
      showCheck: true,
      top: <p>Instruction</p>,
      done: <p>Done</p>,
    }),
  );
  return { dispatch, ...view };
}

const pool = () => within(screen.getByRole('group', { name: 'Cards to sort' }));
const zone = (name: string) => screen.getByRole('button', { name });
const zoneById = (container: HTMLElement, id: string): HTMLElement => {
  const found = container.querySelector<HTMLElement>(`[data-zone="${id}"]`);
  if (found === null) throw new Error(`no zone ${id}`);
  return found;
};

describe('group UI: a row', () => {
  it('shows the instruction, Hint, one box per rule named by its text, and every card in the pool named by its shape', async () => {
    const { container } = await renderPlayArea(row);
    expect(screen.getByText('Instruction')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hint' })).toBeTruthy();
    const boxes = within(screen.getByRole('group', { name: 'Boxes' }));
    expect(boxes.getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual(
      ['Red', 'Blue'],
    );
    expect(
      pool()
        .getAllByRole('button')
        .map((tile) => tile.getAttribute('aria-label')),
    ).toEqual(['red circle', 'blue square', 'red triangle', 'blue star']);
    expect(container.querySelector('[data-layout="row"]')).not.toBeNull();
    // The box's visible label is its text; the drawn parts are hidden from a screen reader.
    expect(within(zone('Red')).getByText('Red').closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('puts the boxes above the pool, under the instruction', async () => {
    await renderPlayArea(row);
    const boxes = screen.getByRole('group', { name: 'Boxes' });
    const cards = screen.getByRole('group', { name: 'Cards to sort' });
    expect(boxes.compareDocumentPosition(cards) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Instruction').compareDocumentPosition(boxes)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('a tap on a card selects it (aria-pressed); tapping it again keeps it, another card replaces it', async () => {
    await renderPlayArea(row);
    const card = (name: string) => pool().getByRole('button', { name });
    expect(card('red circle').getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(card('red circle'));
    expect(card('red circle').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(card('red circle'));
    expect(card('red circle').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(card('blue square'));
    expect(card('red circle').getAttribute('aria-pressed')).toBe('false');
    expect(card('blue square').getAttribute('aria-pressed')).toBe('true');
  });

  it('a box tap puts the selected card there (dispatch put-item); with no card selected it does nothing', async () => {
    const { dispatch } = await renderPlayArea(row);
    fireEvent.click(zone('Blue'));
    expect(dispatch).not.toHaveBeenCalled();
    fireEvent.click(pool().getByRole('button', { name: 'red circle' }));
    fireEvent.click(zone('Blue'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'put-item', itemId: 'r-circle', boxId: 'blue' });
  });

  it('keeps the selection after a wrong put, so another box can be tried', async () => {
    function Harness(): JSX.Element {
      const [core, setCore] = useState<GroupState>(initGroupState(row));
      return (
        <>
          {GROUP_KIND_UI.PlayArea({
            def: row,
            state: { core, hint: null, feedback: { kind: 'instruction' } },
            dispatch: (action) => {
              if (action.type === 'put-item') {
                setCore({
                  ...core,
                  errors: core.errors + 1,
                  wrong: { itemId: 'r-circle', boxId: 'blue' },
                });
              }
            },
            showHint: true,
            showCheck: true,
            top: null,
            done: null,
          })}
        </>
      );
    }
    await renderCardUi(<Harness />);
    fireEvent.click(pool().getByRole('button', { name: 'red circle' }));
    fireEvent.click(zone('Blue'));
    expect(zone('Blue').getAttribute('data-wrong')).toBe('true');
    expect(pool().getByRole('button', { name: 'red circle' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('boxes are at least 64 px (min-h-24, min-w-16), pool cards too (min-h-20, min-w-16), all raised', async () => {
    await renderPlayArea(row);
    for (const name of ['Red', 'Blue']) {
      expect(zone(name).className).toContain('min-h-24');
      expect(zone(name).className).toContain('min-w-16');
      expect(zone(name).className).toContain('tap-raised');
    }
    for (const tile of pool().getAllByRole('button')) {
      expect(tile.className).toContain('min-h-20');
      expect(tile.className).toContain('min-w-16');
    }
  });

  it('2 boxes stay side by side, 3 and 4 wrap to two columns under 480 px', async () => {
    const boxes = (count: number): GroupDef => ({
      ...row,
      boxes: Array.from({ length: count }, (_unused, index) => ({
        id: `b${String(index)}`,
        textKey: 'lessons:sort-red',
      })),
      answer: {},
    });
    const classes: Record<number, string> = {};
    for (const count of [2, 3, 4]) {
      const { container } = await renderPlayArea(boxes(count));
      classes[count] = container.querySelector('[data-layout="row"]')?.className ?? '';
      cleanup();
    }
    expect(classes[2]).toContain('grid-cols-2');
    expect(classes[2]).not.toContain('min-[480px]');
    expect(classes[3]).toContain('grid-cols-2 min-[480px]:grid-cols-3');
    expect(classes[4]).toContain('grid-cols-2 min-[480px]:grid-cols-4');
  });

  it('a box can be labelled by an emoji or a shape (and is named by it)', async () => {
    const def: GroupDef = {
      ...row,
      boxes: [
        { id: 'sun', emoji: '☀️' },
        { id: 'star', shape: { kind: 'star', colour: 'yellow' } },
      ],
      answer: { 'r-circle': 'sun', 'b-square': 'star', 'r-triangle': 'sun', 'b-star': 'star' },
    };
    const { container } = await renderPlayArea(def);
    expect(zone('☀️').querySelector('span[aria-hidden="true"]')?.textContent).toContain('☀️');
    expect(zone('yellow star').querySelectorAll('svg')).toHaveLength(1);
    expect(container.querySelectorAll('[data-zone]')).toHaveLength(2);
  });
});

describe('group UI: a Carroll table', () => {
  it('is a table with the column headers (axis a, yes then not) and the row headers (axis b)', async () => {
    await renderPlayArea(carroll);
    const table = screen.getByRole('table', { name: 'Boxes' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(['Red', 'Not red']);
    expect(
      within(table)
        .getAllByRole('rowheader')
        .map((header) => header.textContent),
    ).toEqual(['Circle', 'Not circle']);
  });

  it('has one box per cell named "column, row", the cell order reading across', async () => {
    const { container } = await renderPlayArea(carroll);
    const named = [...container.querySelectorAll<HTMLElement>('[data-zone]')].map((button) => [
      button.getAttribute('data-zone'),
      button.getAttribute('aria-label'),
    ]);
    expect(named).toEqual([
      ['a-b', 'Red, Circle'],
      ['not-a-b', 'Not red, Circle'],
      ['a-not-b', 'Red, Not circle'],
      ['not-a-not-b', 'Not red, Not circle'],
    ]);
    for (const [, name] of named) {
      expect(zone(name ?? '').className).toContain('min-h-24');
    }
  });

  it('a tap on a card, then on "Red, Not circle" puts it in a-not-b', async () => {
    const { dispatch } = await renderPlayArea(carroll);
    fireEvent.click(pool().getByRole('button', { name: 'red square' }));
    fireEvent.click(zone('Red, Not circle'));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'put-item',
      itemId: 'r-square',
      boxId: 'a-not-b',
    });
  });
});

describe('group UI: a Venn', () => {
  it('draws two circles in a frame as decor (aria-hidden), their names above', async () => {
    const { container } = await renderPlayArea(venn);
    const svg = container.querySelector('svg[aria-hidden="true"]');
    expect(svg?.querySelectorAll('circle')).toHaveLength(2);
    expect(svg?.querySelectorAll('rect')).toHaveLength(1);
    const labels = [
      ...container.querySelectorAll('[data-layout="venn"] > span[aria-hidden="true"]'),
    ];
    expect(labels.map((label) => label.textContent)).toEqual(['Square', 'Blue']);
  });

  it('lays four boxes over the regions, named "In both", "Only Square", "Only Blue", "Neither"', async () => {
    const { container } = await renderPlayArea(venn);
    const named = [...container.querySelectorAll<HTMLElement>('[data-zone]')].map((button) => [
      button.getAttribute('data-zone'),
      button.getAttribute('aria-label'),
    ]);
    expect(named).toEqual([
      ['only-a', 'Only Square'],
      ['both', 'In both'],
      ['only-b', 'Only Blue'],
      ['neither', 'Neither'],
    ]);
    for (const [, name] of named) {
      const style = zone(name ?? '').style;
      expect(style.position).toBe('absolute');
      expect(style.left).toMatch(/%$/);
      expect(style.width).toMatch(/%$/);
    }
  });

  it('a tap on a card, then on "In both" puts it in both', async () => {
    const { dispatch } = await renderPlayArea(venn);
    fireEvent.click(pool().getByRole('button', { name: 'blue square' }));
    fireEvent.click(zone('In both'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'put-item', itemId: 'b-square', boxId: 'both' });
  });
});

describe('group UI: placed cards, wrong box, hints, solved', () => {
  it('shows a placed card small inside its box, listed in the box description, and not in the pool', async () => {
    const { container } = await renderPlayArea(row, { core: { placed: { 'r-circle': 'red' } } });
    const box = zone('Red');
    expect(box.querySelectorAll('svg')).toHaveLength(1);
    expect(box.querySelector('[data-compact="true"]')).not.toBeNull();
    const description = document.getElementById(box.getAttribute('aria-describedby') ?? '');
    expect(description?.textContent).toBe('Holds: red circle');
    expect(description?.className).toContain('sr-only');
    expect(zone('Blue').getAttribute('aria-describedby')).toBeNull();
    expect(pool().queryByRole('button', { name: 'red circle' })).toBeNull();
    expect(pool().getAllByRole('button')).toHaveLength(3);
    expect(container.querySelectorAll('[data-compact="true"]')).toHaveLength(1);
  });

  it('flashes the wrong box: shake, orange border, data-wrong', async () => {
    const { container } = await renderPlayArea(carroll, {
      core: { errors: 1, wrong: { itemId: 'r-circle', boxId: 'not-a-b' } },
    });
    const wrong = zoneById(container, 'not-a-b');
    expect(wrong.getAttribute('data-wrong')).toBe('true');
    expect(wrong.className).toContain('card-shake');
    expect(wrong.className).toContain('border-today');
    expect(zoneById(container, 'a-b').getAttribute('data-wrong')).toBe('false');
    expect(zoneById(container, 'a-b').className).not.toContain('card-shake');
  });

  it('restarts the shake when the same box is wrong twice (the element is replaced)', async () => {
    function Harness(): JSX.Element {
      const [errors, setErrors] = useState(1);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setErrors(2);
            }}
          >
            tap wrong again
          </button>
          {GROUP_KIND_UI.PlayArea({
            def: row,
            state: {
              core: {
                ...initGroupState(row),
                errors,
                wrong: { itemId: 'r-circle', boxId: 'blue' },
              },
              hint: null,
              feedback: { kind: 'group-wrong' },
            },
            dispatch: vi.fn(),
            showHint: true,
            showCheck: true,
            top: null,
            done: null,
          })}
        </>
      );
    }
    await renderCardUi(<Harness />);
    const before = zone('Blue');
    fireEvent.click(screen.getByRole('button', { name: 'tap wrong again' }));
    expect(zone('Blue')).not.toBe(before);
    expect(zone('Blue').className).toContain('card-shake');
    expect(zone('Red')).toBe(zone('Red'));
  });

  it('hint 1 outlines the box labels (row), the headers (Carroll) and the circle names (Venn)', async () => {
    const level1: GroupHint = { kind: 'group', level: 1 };
    for (const [def, selector] of [
      [row, '[data-layout="row"] [data-marked]'],
      [carroll, 'th[data-marked]'],
      [venn, '[data-layout="venn"] > span[data-marked]'],
    ] as const) {
      const { container } = await renderPlayArea(def, { hint: level1 });
      const marked = [...container.querySelectorAll(selector)];
      expect(marked.length, def.layout).toBeGreaterThan(0);
      expect(marked.every((node) => node.getAttribute('data-marked') === 'true')).toBe(true);
      expect(container.innerHTML, def.layout).toContain('ring-today');
      cleanup();
    }
    const { container } = await renderPlayArea(row);
    expect(container.innerHTML).not.toContain('ring-today');
  });

  it('hint 2 selects its card and dims the crossed-out box for it: disabled, faded; the others stay tappable', async () => {
    const { container } = await renderPlayArea(carroll, {
      core: { ruledOut: [{ itemId: 'r-circle', boxId: 'a-not-b' }] },
      hint: { kind: 'group', level: 2, itemId: 'r-circle', boxId: 'a-not-b' },
    });
    expect(pool().getByRole('button', { name: 'red circle' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    const dimmed = zoneById(container, 'a-not-b');
    expect(dimmed.hasAttribute('disabled')).toBe(true);
    expect(dimmed.getAttribute('aria-disabled')).toBe('true');
    expect(dimmed.className).toContain('opacity-50');
    expect(zoneById(container, 'a-b').hasAttribute('disabled')).toBe(false);
  });

  it('a crossed-out box is dimmed only while that card is selected', async () => {
    const { container } = await renderPlayArea(carroll, {
      core: { ruledOut: [{ itemId: 'r-circle', boxId: 'a-not-b' }] },
      hint: { kind: 'group', level: 2, itemId: 'r-circle', boxId: 'a-not-b' },
    });
    fireEvent.click(pool().getByRole('button', { name: 'blue circle' }));
    expect(zoneById(container, 'a-not-b').hasAttribute('disabled')).toBe(false);
    fireEvent.click(pool().getByRole('button', { name: 'red circle' }));
    expect(zoneById(container, 'a-not-b').hasAttribute('disabled')).toBe(true);
  });

  it('hint 3 animates the card it put (group-drop); another placed card stands still', async () => {
    await renderPlayArea(row, {
      core: { placed: { 'r-circle': 'red', 'b-square': 'blue' } },
      hint: { kind: 'group', level: 3, itemId: 'b-square', boxId: 'blue' },
    });
    const dropped = zone('Blue').querySelector('.group-drop');
    expect(dropped).not.toBeNull();
    expect(zone('Red').querySelector('.group-drop')).toBeNull();
  });

  it('keeps the finished sort on screen and swaps the pool for the done block once solved', async () => {
    await renderPlayArea(row, {
      core: {
        solved: true,
        placed: { 'r-circle': 'red', 'b-square': 'blue', 'r-triangle': 'red', 'b-star': 'blue' },
      },
    });
    expect(screen.getByText('Done')).toBeTruthy();
    expect(zone('Red').querySelectorAll('svg')).toHaveLength(2);
    expect(screen.queryByRole('group', { name: 'Cards to sort' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Hint' })).toBeNull();
  });

  it('hides Hint when the host says so', async () => {
    await renderPlayArea(row, { showHint: false });
    expect(screen.queryByRole('button', { name: 'Hint' })).toBeNull();
  });

  it('gives the panel the full width without a prompt, and shows the prompt card as the board with one', async () => {
    const { container } = await renderPlayArea(row);
    expect(container.firstElementChild?.className).toBe('flex min-h-0 flex-1 flex-col gap-4');
    cleanup();
    await renderPlayArea(row, { def: { ...row, prompt: { emoji: '🧺' } } });
    expect(screen.getByText('🧺')).toBeTruthy();
  });

  it('maps outcomes to notes: a wrong put names what it got half right, solved praises, a placed card clears the note', () => {
    const put = { type: 'put-item', itemId: 'a', boxId: 'b' } as const;
    const fresh = initGroupState(carroll);
    expect(GROUP_KIND_UI.toUi({ kind: 'wrong', itemId: 'a', boxId: 'b' }, put, fresh)).toEqual({
      feedback: { kind: 'group-wrong' },
      hint: null,
    });
    expect(
      GROUP_KIND_UI.toUi({ kind: 'wrong', itemId: 'a', boxId: 'b', miss: 'row' }, put, fresh),
    ).toEqual({ feedback: { kind: 'group-wrong', miss: 'row' }, hint: null });
    expect(GROUP_KIND_UI.toUi({ kind: 'solved' }, put, fresh)).toEqual({
      feedback: { kind: 'solved' },
      hint: null,
    });
    for (const kind of ['placed', 'ignored'] as const) {
      expect(GROUP_KIND_UI.toUi({ kind }, put, fresh)).toEqual({
        feedback: { kind: 'instruction' },
        hint: null,
      });
    }
    expect(GROUP_KIND_UI.initUi(carroll)).toEqual({});
    expect(GROUP_KIND_UI.clearWrongUi()).toEqual({});
  });
});
