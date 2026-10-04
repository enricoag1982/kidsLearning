import { beforeAll, describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import i18next from 'i18next';
import { PLACE_VALUE_SAMPLES } from '../../testing/place-value-samples.ts';
import { PLACE_VALUE_TEXTS } from '../../web/testing/place-value-fixtures.ts';
import { PlaceValueHarness } from '../../web/testing/place-value-harness.tsx';
import { renderMathUi } from '../../web/testing/render-math-ui.tsx';
import type { PlaceValueDef } from './def.ts';
import { placeValueUi } from './ui.ts';

beforeAll(() => {
  i18next.addResourceBundle('en', 'lessons', PLACE_VALUE_TEXTS, true, true);
});

const { hto, zero, thousands, start, nine } = PLACE_VALUE_SAMPLES;

function mount(def: PlaceValueDef = zero, props: { guided?: boolean; showHint?: boolean } = {}) {
  return renderMathUi(<PlaceValueHarness def={def} {...props} />);
}

const note = (): string | undefined => screen.queryByTestId('note')?.textContent ?? undefined;
const session = (): HTMLElement => screen.getByTestId('session');
const group = (name: string | RegExp): HTMLElement => screen.getByRole('group', { name });
const add = (place: string): HTMLElement => screen.getByRole('button', { name: `Add a ${place}` });
const remove = (place: string): HTMLElement =>
  screen.getByRole('button', { name: `Take away a ${place}` });
const tap = (button: HTMLElement, times = 1): void => {
  for (let index = 0; index < times; index += 1) fireEvent.click(button);
};
const check = (): HTMLElement => screen.getByRole('button', { name: 'Check' });
const hint = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
};
/** The blocks drawn in the column of `place`. */
const blocks = (place: string): number =>
  document.querySelectorAll(`svg[data-place="${place}"] [data-block]`).length;

/** Builds 3 hundreds, 0 tens, 5 ones in the 3-column exercise. */
function buildZero(): void {
  tap(add('hundred'), 3);
  tap(add('one'), 5);
}

describe('place-value UI: what it shows', () => {
  it('shows the instruction, the prompt, a column per place headed by its name, Check and Hint', () => {
    mount();
    expect(screen.getByTestId('instruction').textContent).toBe('Build 305 with the blocks.');
    expect(screen.getByText('305')).toBeTruthy();
    expect(screen.getAllByRole('group').map((column) => column.getAttribute('aria-label'))).toEqual(
      ['Hundreds: 0', 'Tens: 0', 'Ones: 0'],
    );
    expect(within(group('Hundreds: 0')).getByText('H')).toBeTruthy();
    expect(within(group('Tens: 0')).getByText('T')).toBeTruthy();
    expect(within(group('Ones: 0')).getByText('O')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Check' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hint' })).toBeTruthy();
  });

  it('shows 4 columns Th, H, T, O for a 4-column exercise', () => {
    mount(thousands);
    expect(screen.getAllByRole('group').map((column) => column.getAttribute('aria-label'))).toEqual(
      ['Thousands: 0', 'Hundreds: 0', 'Tens: 0', 'Ones: 0'],
    );
    expect(within(group('Thousands: 0')).getByText('Th')).toBeTruthy();
  });

  it('draws nothing before the first tap, then one block per tap in the column of its place', () => {
    mount();
    for (const place of ['hundreds', 'tens', 'ones']) expect(blocks(place)).toBe(0);
    tap(add('hundred'), 2);
    tap(add('ten'));
    tap(add('one'), 4);
    expect([blocks('hundreds'), blocks('tens'), blocks('ones')]).toEqual([2, 1, 4]);
    expect(group('Hundreds: 2')).toBeTruthy();
    expect(group('Tens: 1')).toBeTruthy();
    expect(group('Ones: 4')).toBeTruthy();
  });

  it('draws the place’s own shape: a cube, a rod, a flat square and a big cube, each in its own colour', () => {
    mount(thousands);
    tap(add('thousand'));
    tap(add('hundred'));
    tap(add('ten'));
    tap(add('one'));
    const svg = (place: string): Element => {
      const element = document.querySelector(`svg[data-place="${place}"]`);
      if (element === null) throw new Error(`no column ${place}`);
      return element;
    };
    // A one: one square; a ten: a rod = a rectangle plus its 9 lines; a hundred: a flat = a square plus 2 x 9 lines; a thousand: 3 faces.
    expect(svg('ones').querySelectorAll('rect')).toHaveLength(1);
    expect(svg('tens').querySelectorAll('rect, line')).toHaveLength(1 + 9);
    expect(svg('hundreds').querySelectorAll('rect, line')).toHaveLength(1 + 18);
    expect(svg('thousands').querySelectorAll('rect, polygon')).toHaveLength(3);
    const colours = ['thousands', 'hundreds', 'tens', 'ones'].map((place) =>
      svg(place).getAttribute('class'),
    );
    expect(new Set(colours).size).toBe(4);
    for (const place of ['thousands', 'hundreds', 'tens', 'ones']) {
      expect(svg(place).getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('lays 9 blocks in rows of 3 inside the column’s sheet, none outside it', () => {
    mount(nine);
    tap(add('ten'), 9);
    const [sheet] = Array.from(document.querySelectorAll('svg[data-place="tens"]'));
    const box = (sheet?.getAttribute('viewBox') ?? '').split(' ').map(Number);
    const [, , width = 0, height = 0] = box;
    const rects = Array.from(sheet?.querySelectorAll('[data-block] > rect') ?? []).map((rect) => ({
      x: Number(rect.getAttribute('x')),
      y: Number(rect.getAttribute('y')),
      w: Number(rect.getAttribute('width')),
      h: Number(rect.getAttribute('height')),
    }));
    expect(rects).toHaveLength(9);
    expect(new Set(rects.map((rect) => rect.y)).size).toBe(3);
    expect(new Set(rects.map((rect) => rect.x)).size).toBe(3);
    for (const rect of rects) {
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.w).toBeLessThanOrEqual(width);
      expect(rect.y + rect.h).toBeLessThanOrEqual(height);
    }
  });

  it('starts from the exercise’s start: its blocks are there, and a 9 cannot take another', () => {
    mount(start);
    expect([blocks('hundreds'), blocks('tens'), blocks('ones')]).toEqual([2, 5, 9]);
    expect(group('Ones: 9')).toBeTruthy();
    expect((add('one') as HTMLButtonElement).disabled).toBe(true);
    expect((add('ten') as HTMLButtonElement).disabled).toBe(false);
    tap(remove('one'));
    expect(blocks('ones')).toBe(8);
    expect((add('one') as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows no prompt card when the exercise has none', () => {
    const bare: PlaceValueDef = {
      id: zero.id,
      concept: zero.concept,
      textKey: zero.textKey,
      type: 'place-value',
      target: 305,
      columns: 3,
    };
    mount(bare);
    expect(screen.queryByText('305')).toBeNull();
    expect(screen.getAllByRole('group')).toHaveLength(3);
  });
});

describe('place-value UI: Add and Take away', () => {
  it('name each button by its place, in every column', () => {
    mount(thousands);
    for (const place of ['thousand', 'hundred', 'ten', 'one']) {
      expect(add(place)).toBeTruthy();
      expect(remove(place)).toBeTruthy();
    }
  });

  it('are at least 64 px tall by their class (h-16), the Add of a green fill and the Take away neutral', () => {
    mount();
    for (const button of [add('hundred'), remove('hundred')]) {
      expect(button.className).toMatch(/\bh-16\b/);
      expect(button.className).toMatch(/\bw-full\b/);
    }
  });

  it('cannot take away from an empty column, nor add past 9', () => {
    mount();
    expect((remove('ten') as HTMLButtonElement).disabled).toBe(true);
    expect((add('ten') as HTMLButtonElement).disabled).toBe(false);
    tap(add('ten'), 9);
    expect(blocks('tens')).toBe(9);
    expect((add('ten') as HTMLButtonElement).disabled).toBe(true);
    expect((remove('ten') as HTMLButtonElement).disabled).toBe(false);
    // A tap on a disabled button does nothing.
    tap(add('ten'));
    expect(blocks('tens')).toBe(9);
    tap(remove('ten'), 9);
    expect(blocks('tens')).toBe(0);
    expect((remove('ten') as HTMLButtonElement).disabled).toBe(true);
  });

  it('count every column on its own: no exchange of 10 ones for a ten', () => {
    mount();
    tap(add('one'), 9);
    expect(blocks('ones')).toBe(9);
    expect(blocks('tens')).toBe(0);
    expect(group('Ones: 9')).toBeTruthy();
  });

  it('announce the change in a live region: the column and its new count', () => {
    mount();
    const live = screen.getByTestId('announce');
    expect(live.textContent).toBe('');
    tap(add('hundred'));
    expect(live.textContent).toBe('Hundreds: 1');
    tap(add('ten'), 2);
    expect(live.textContent).toBe('Tens: 2');
    tap(remove('ten'));
    expect(live.textContent).toBe('Tens: 1');
  });

  it('send nothing to the engine: no move, no error until Check', () => {
    mount();
    buildZero();
    expect(session().dataset['moves']).toBe('0');
    expect(session().dataset['errors']).toBe('0');
    expect(note()).toBeUndefined();
  });
});

describe('place-value UI: Check', () => {
  it('is off while nothing is built, so a stray tap costs no star', () => {
    mount();
    expect((check() as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(check());
    expect(session().dataset['errors']).toBe('0');
    tap(add('one'));
    expect((check() as HTMLButtonElement).disabled).toBe(false);
    tap(remove('one'));
    expect((check() as HTMLButtonElement).disabled).toBe(true);
  });

  it('sends the build: the target solves with praise, 3 stars, and the blocks and numeral stay', () => {
    mount();
    buildZero();
    fireEvent.click(check());
    expect(session().dataset['solved']).toBe('true');
    expect(session().dataset['errors']).toBe('0');
    expect(session().dataset['moves']).toBe('1');
    expect(note()).toBe('Amazing!');
    expect(screen.getByTestId('done').dataset['stars']).toBe('3');
    expect([blocks('hundreds'), blocks('tens'), blocks('ones')]).toEqual([3, 0, 5]);
    const numeral = screen.getByTestId('numeral');
    expect(numeral.dataset['state']).toBe('good');
    expect(numeral.className).toMatch(/text-go/);
    expect(within(numeral).getByLabelText('Your number: 305').textContent).toBe('305');
  });

  it('a build with the reason of its value says the reason, an error counts and the blocks stay to be changed', () => {
    mount();
    tap(add('hundred'), 3);
    tap(add('ten'), 5);
    fireEvent.click(check());
    expect(note()).toBe('Look at the order: hundreds, then tens, then ones.');
    expect(screen.getByTestId('note').dataset['tone']).toBe('attention');
    expect(session().dataset['errors']).toBe('1');
    expect(session().dataset['solved']).toBe('false');
    expect([blocks('hundreds'), blocks('tens'), blocks('ones')]).toEqual([3, 5, 0]);
    // Take the 5 tens away, add 5 ones: the child changes the blocks she has, she does not start again.
    tap(remove('ten'), 5);
    tap(add('one'), 5);
    fireEvent.click(check());
    expect(session().dataset['solved']).toBe('true');
    expect(session().dataset['errors']).toBe('1');
    expect(screen.getByTestId('done').dataset['stars']).toBe('2');
  });

  it('any other wrong build says to count the columns again', () => {
    mount();
    tap(add('hundred'), 2);
    fireEvent.click(check());
    expect(note()).toBe('Count the blocks in each column again.');
    expect(session().dataset['errors']).toBe('1');
    tap(add('hundred'));
    tap(add('one'), 5);
    fireEvent.click(check());
    expect(session().dataset['solved']).toBe('true');
    expect(session().dataset['errors']).toBe('1');
  });

  it('the reason is the one of the exact value: another wrong value gets the default note', () => {
    mount(thousands);
    tap(add('thousand'), 4);
    tap(add('ten'), 2);
    tap(add('one'), 7);
    fireEvent.click(check());
    expect(note()).toBe('Look at the order: hundreds, then tens, then ones.');
    tap(add('one'));
    fireEvent.click(check());
    expect(note()).toBe('Count the blocks in each column again.');
    expect(session().dataset['errors']).toBe('2');
  });

  it('after it is solved the buttons are off and the Check and Hint are gone, the done block is there', () => {
    mount(hto);
    tap(add('hundred'), 2);
    tap(add('ten'), 4);
    tap(add('one'), 3);
    fireEvent.click(check());
    expect(screen.getByTestId('done')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Check' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Hint' })).toBeNull();
    for (const place of ['hundred', 'ten', 'one']) {
      expect((add(place) as HTMLButtonElement).disabled).toBe(true);
      expect((remove(place) as HTMLButtonElement).disabled).toBe(true);
    }
    tap(add('ten'));
    expect(blocks('tens')).toBe(4);
  });

  it('hides Hint when the host says so (an assessment task)', () => {
    mount(zero, { showHint: false });
    expect(screen.queryByRole('button', { name: 'Hint' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Check' })).toBeTruthy();
  });
});

describe('place-value UI: hints', () => {
  const labelOf = (name: string): HTMLElement => {
    const label = within(group(name)).getByText(/^(Th|H|T|O)$/);
    return label;
  };

  it('hint 1 emphasises the column labels and says to count each column; they stay for the exercise', () => {
    mount();
    expect(labelOf('Hundreds: 0').dataset['emphasis']).toBe('false');
    hint();
    expect(note()).toBe('Hundreds, tens and ones: count each column.');
    for (const name of ['Hundreds: 0', 'Tens: 0', 'Ones: 0']) {
      expect(labelOf(name).dataset['emphasis']).toBe('true');
    }
    expect(session().dataset['hintLevel']).toBe('1');
    // A wrong build takes the hint's words away, not the emphasis of the labels.
    tap(add('one'));
    fireEvent.click(check());
    expect(note()).toBe('Count the blocks in each column again.');
    expect(labelOf('Ones: 1').dataset['emphasis']).toBe('true');
  });

  it('hint 2 shows the numeral of the build beside the blocks, which follows every tap', () => {
    mount();
    expect(screen.queryByLabelText(/^Your number/)).toBeNull();
    hint();
    expect(screen.queryByLabelText(/^Your number/)).toBeNull();
    hint();
    expect(note()).toBe('The number beside the blocks shows what you built.');
    expect(screen.getByLabelText('Your number: 0').textContent).toBe('0');
    tap(add('hundred'), 3);
    tap(add('one'), 5);
    expect(screen.getByLabelText('Your number: 305').textContent).toBe('305');
    tap(remove('hundred'));
    expect(screen.getByLabelText('Your number: 205').textContent).toBe('205');
    expect(screen.getByTestId('numeral').dataset['state']).toBe('building');
  });

  it('the numeral stays after a wrong build', () => {
    mount();
    hint();
    hint();
    tap(add('one'), 2);
    fireEvent.click(check());
    expect(screen.getByLabelText('Your number: 2')).toBeTruthy();
  });

  it('hint 3 puts the target’s digit in the highest column, leaves the rest to the child, and the child finishes and checks', () => {
    mount();
    tap(add('one'), 2);
    hint();
    hint();
    hint();
    expect(note()).toBe('Here are the hundreds. Now finish!');
    expect(group('Hundreds: 3')).toBeTruthy();
    expect([blocks('hundreds'), blocks('tens'), blocks('ones')]).toEqual([3, 0, 2]);
    expect(session().dataset['solved']).toBe('false');
    tap(add('one'), 3);
    fireEvent.click(check());
    expect(session().dataset['solved']).toBe('true');
    expect(session().dataset['errors']).toBe('0');
    expect(screen.getByTestId('done').dataset['stars']).toBe('1');
  });

  it('hint 3 names the place it fills: thousands in 4 columns, tens for a two-digit target', () => {
    mount(thousands);
    hint();
    hint();
    hint();
    expect(note()).toBe('Here are the thousands. Now finish!');
    expect(group('Thousands: 4')).toBeTruthy();
    expect([blocks('thousands'), blocks('hundreds')]).toEqual([4, 0]);
  });

  it('hint 3 asked again sets the column again', () => {
    mount();
    hint();
    hint();
    hint();
    tap(remove('hundred'), 2);
    expect(group('Hundreds: 1')).toBeTruthy();
    hint();
    expect(group('Hundreds: 3')).toBeTruthy();
  });

  it('a guided try starts with hint 1: the labels are emphasised, its words are the note', () => {
    mount(hto, { guided: true });
    expect(note()).toBeUndefined();
    expect(within(group('Hundreds: 0')).getByText('H').dataset['emphasis']).toBe('true');
    expect(session().dataset['solved']).toBe('false');
  });
});

describe('place-value UI: toUi', () => {
  const next = (def: PlaceValueDef) => ({
    def,
    moves: 1,
    solved: false,
    errors: 1,
    hintLevel: 0 as const,
  });

  it('a wrong build says the reason of its value, else the default; both clear the hint', () => {
    expect(
      placeValueUi.toUi(
        { kind: 'wrong', value: 350 },
        { type: 'build', counts: [3, 5, 0] },
        next(zero),
      ),
    ).toEqual({
      feedback: { kind: 'pv-wrong', reasonKey: 'lessons:pvfx-bug-swap' },
      hint: null,
    });
    expect(
      placeValueUi.toUi(
        { kind: 'wrong', value: 12 },
        { type: 'build', counts: [0, 1, 2] },
        next(zero),
      ),
    ).toEqual({ feedback: { kind: 'pv-wrong' }, hint: null });
    expect(
      placeValueUi.toUi(
        { kind: 'wrong', value: 350 },
        { type: 'build', counts: [3, 5, 0] },
        next(hto),
      ),
    ).toEqual({ feedback: { kind: 'pv-wrong' }, hint: null });
  });

  it('solved praises and clears the hint; a Check after it keeps the praise; an invalid build changes nothing', () => {
    const action = { type: 'build', counts: [3, 0, 5] } as const;
    expect(placeValueUi.toUi({ kind: 'solved' }, action, next(zero))).toEqual({
      feedback: { kind: 'solved' },
      hint: null,
    });
    expect(placeValueUi.toUi({ kind: 'ignored' }, action, next(zero))).toEqual({
      feedback: { kind: 'solved' },
      hint: null,
    });
    expect(placeValueUi.toUi({ kind: 'invalid' }, action, next(zero))).toEqual({
      feedback: { kind: 'instruction' },
    });
  });

  it('has no UI extras', () => {
    expect(placeValueUi.initUi(zero)).toEqual({});
    expect(placeValueUi.clearWrongUi()).toEqual({});
    expect(placeValueUi.type).toBe('place-value');
  });
});
