import { beforeAll, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import i18next from 'i18next';
import { NumberLineHarness } from '../../web/testing/NumberLineHarness.tsx';
import { renderLineUi } from '../../web/testing/render-line-ui.tsx';
import type { NumberLineDef } from './def.ts';
import { NUMBER_LINE_SAMPLES, NUMBER_LINE_SAMPLE_TEXTS } from './samples.ts';
import { numberLineUi } from './ui.ts';

const { exact100, exact10, estimate, labelList, withReason } = NUMBER_LINE_SAMPLES;

beforeAll(() => {
  // The samples' instructions and reason: no shipped lesson has them yet.
  i18next.addResourceBundle('en', 'lessons', NUMBER_LINE_SAMPLE_TEXTS, true, true);
});

function mount(
  def: NumberLineDef = exact100,
  props: { guided?: boolean; showHint?: boolean } = {},
) {
  const view = renderLineUi(<NumberLineHarness def={def} {...props} />);
  // jsdom lays nothing out: the track is 1000 px wide from x = 0, so a tap at x is the fraction x / 1000 of the line.
  const track = screen.getByTestId('number-line-track');
  track.getBoundingClientRect = () => ({
    left: 0,
    width: 1000,
    right: 1000,
    top: 0,
    bottom: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  return view;
}

const band = (): HTMLElement => screen.getByRole('slider');
const check = (): HTMLButtonElement =>
  screen.getByRole<HTMLButtonElement>('button', { name: 'Check' });
const hint = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
};
const note = (): string | undefined => screen.queryByTestId('note')?.textContent ?? undefined;
const session = (): HTMLElement => screen.getByTestId('session');
const marker = (): HTMLElement | null => screen.queryByTestId('number-line-marker');
const value = (): string | undefined =>
  screen.queryByTestId('number-line-value')?.textContent ?? undefined;
const labels = (): string[] =>
  screen.queryAllByTestId(/^number-line-label-/).map((label) => label.textContent);
const tapAt = (x: number): void => {
  fireEvent.pointerDown(band(), { clientX: x, pointerId: 1 });
  fireEvent.pointerUp(band(), { clientX: x, pointerId: 1 });
};
const press = (key: string, init: KeyboardEventInit = {}): void => {
  fireEvent.keyDown(band(), { key, ...init });
};
const markerAt = (): string | null => band().getAttribute('aria-valuetext');

/** A length of the band's stage as the markup writes it: `px` at the base size, times `--nl-scale` on a big board. */
const scaled = (px: number): string => `calc(${String(px)}px * var(--nl-scale))`;

/** What a child sees: the marker's place on the line (percent of the track), if it is there. */
const markerLeft = (): string | undefined => marker()?.style.left;

describe('number-line UI: the board', () => {
  it('shows the instruction, the prompt card, the line and Hint and Check (Check waits for a marker)', () => {
    mount();
    expect(screen.getByTestId('instruction').textContent).toBe('Put the marker on 300.');
    expect(screen.getByText('300')).toBeTruthy();
    expect(band()).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hint' })).toBeTruthy();
    expect(check().disabled).toBe(true);
    expect(marker()).toBeNull();
  });

  it('draws a tick for every mark, the ends numbered and no other number', () => {
    mount();
    expect(screen.getAllByTestId(/^number-line-tick-/)).toHaveLength(11);
    expect(labels()).toEqual(['0', '1000']);
    expect(screen.getByTestId('number-line-tick-300').style.left).toBe('30%');
    expect(screen.getByTestId('number-line-tick-1000').style.left).toBe('100%');
  });

  it('numbers the ticks the labels say: a list, or all of them (every other number on a second row when there are many)', () => {
    mount(labelList);
    expect(labels()).toEqual(['0', '500', '1000']);
  });

  it('draws as many ticks as the line has: 0-100 in tens, 0-500 in fifties', () => {
    mount(exact10);
    expect(screen.getAllByTestId(/^number-line-tick-/)).toHaveLength(11);
    expect(labels()).toEqual(['0', '100']);
  });

  it('has no prompt card when the def has none', () => {
    mount({ ...exact100, prompt: undefined });
    expect(screen.queryByText('300')).toBeNull();
    expect(band()).toBeTruthy();
  });
});

describe('number-line UI: the accessible slider', () => {
  it('is a slider named for its line, with its range and no marker yet', () => {
    mount();
    const slider = screen.getByRole('slider', {
      name: 'Number line from 0 to 1000, a mark every 100',
    });
    expect(slider.getAttribute('aria-valuemin')).toBe('0');
    expect(slider.getAttribute('aria-valuemax')).toBe('1000');
    expect(slider.getAttribute('aria-valuenow')).toBe('0');
    expect(slider.getAttribute('aria-valuetext')).toBe('No marker yet');
    expect(slider.getAttribute('tabindex')).toBe('0');
  });

  it('says where the marker is once it is placed, and nothing else leaks the number', () => {
    mount();
    tapAt(340);
    expect(band().getAttribute('aria-valuenow')).toBe('300');
    expect(markerAt()).toBe('Marker at 300');
    expect(value()).toBeUndefined();
  });

  it('keeps the ticks and numbers out of the accessibility tree (the slider says it all)', () => {
    mount();
    expect(screen.getByTestId('number-line-tick-300').getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });
});

describe('number-line UI: placing the marker', () => {
  it('a tap places it on the nearest tick (an exact item)', () => {
    mount();
    tapAt(340);
    expect(markerAt()).toBe('Marker at 300');
    expect(markerLeft()).toBe('30%');
    tapAt(360);
    expect(markerAt()).toBe('Marker at 400');
    tapAt(960);
    expect(markerAt()).toBe('Marker at 1000');
    expect(check().disabled).toBe(false);
  });

  it('a tap past either end goes to that end', () => {
    mount();
    tapAt(-80);
    expect(markerAt()).toBe('Marker at 0');
    tapAt(2000);
    expect(markerAt()).toBe('Marker at 1000');
  });

  it('a tap places it on the nearest whole number (an estimate item)', () => {
    mount(estimate);
    tapAt(341.6);
    expect(markerAt()).toBe('Marker at 342');
    tapAt(300);
    expect(markerAt()).toBe('Marker at 300');
    expect(markerLeft()).toBe('30%');
  });

  it('a drag follows the pointer, and stops when it is lifted', () => {
    mount();
    fireEvent.pointerDown(band(), { clientX: 100, pointerId: 1 });
    expect(markerAt()).toBe('Marker at 100');
    fireEvent.pointerMove(band(), { clientX: 520, pointerId: 1 });
    expect(markerAt()).toBe('Marker at 500');
    fireEvent.pointerMove(band(), { clientX: 790, pointerId: 1 });
    expect(markerAt()).toBe('Marker at 800');
    fireEvent.pointerUp(band(), { pointerId: 1 });
    fireEvent.pointerMove(band(), { clientX: 100, pointerId: 1 });
    expect(markerAt()).toBe('Marker at 800');
  });

  it('a move without a press places nothing', () => {
    mount();
    fireEvent.pointerMove(band(), { clientX: 500, pointerId: 1 });
    expect(markerAt()).toBe('No marker yet');
    expect(marker()).toBeNull();
  });

  it('the marker draws above the line and is at least 48 px tall', () => {
    mount();
    tapAt(300);
    const pin = marker()?.querySelector('svg');
    expect(Number(pin?.getAttribute('height'))).toBeGreaterThanOrEqual(48);
  });
});

describe('number-line UI: the keyboard', () => {
  it('an exact item: arrows move a tick, Page keys too, Home and End go to the ends', () => {
    mount();
    press('ArrowRight');
    expect(markerAt()).toBe('Marker at 100');
    press('ArrowRight');
    press('ArrowUp');
    expect(markerAt()).toBe('Marker at 300');
    press('ArrowLeft');
    press('ArrowDown');
    expect(markerAt()).toBe('Marker at 100');
    press('PageUp');
    expect(markerAt()).toBe('Marker at 200');
    press('PageDown');
    press('PageDown');
    press('PageDown');
    expect(markerAt()).toBe('Marker at 0');
    press('End');
    expect(markerAt()).toBe('Marker at 1000');
    press('ArrowRight');
    expect(markerAt()).toBe('Marker at 1000');
    press('Home');
    expect(markerAt()).toBe('Marker at 0');
    expect(check().disabled).toBe(false);
  });

  it('with no marker yet, Home places the left end and an arrow moves from it', () => {
    mount();
    press('Home');
    expect(markerAt()).toBe('Marker at 0');
    press('ArrowRight');
    expect(markerAt()).toBe('Marker at 100');
  });

  it('an estimate item: arrows move by 1, Page keys by a whole interval', () => {
    mount(estimate);
    press('Home');
    press('PageUp');
    press('PageUp');
    press('PageUp');
    press('ArrowRight');
    press('ArrowRight');
    expect(markerAt()).toBe('Marker at 302');
    press('ArrowLeft');
    expect(markerAt()).toBe('Marker at 301');
    press('PageDown');
    expect(markerAt()).toBe('Marker at 201');
  });

  it('ignores other keys and keys with Alt, Ctrl or Meta held', () => {
    mount();
    press('a');
    press('Tab');
    press('ArrowRight', { altKey: true });
    press('ArrowRight', { ctrlKey: true });
    press('ArrowRight', { metaKey: true });
    expect(markerAt()).toBe('No marker yet');
    expect(marker()).toBeNull();
  });

  it('Enter checks the marker; with no marker it does nothing', () => {
    mount();
    press('Enter');
    expect(session().dataset['errors']).toBe('0');
    expect(note()).toBeUndefined();
    press('Home');
    press('Enter');
    expect(session().dataset['errors']).toBe('1');
    expect(note()).toBe('Not there yet. Look at the numbers on the line.');
    press('ArrowRight');
    press('ArrowRight');
    press('ArrowRight');
    press('Enter');
    expect(session().dataset['solved']).toBe('true');
  });
});

describe('number-line UI: wrong tries', () => {
  it('a wrong Check says so, counts an error, and shakes the marker where it is (not red: orange)', () => {
    mount();
    tapAt(400);
    fireEvent.click(check());
    expect(note()).toBe('Not there yet. Look at the numbers on the line.');
    expect(screen.getByTestId('note').dataset['tone']).toBe('attention');
    expect(session().dataset['errors']).toBe('1');
    expect(session().dataset['solved']).toBe('false');
    expect(marker()?.dataset['status']).toBe('wrong');
    expect(marker()?.querySelector('.card-shake')).not.toBeNull();
    expect(markerAt()).toBe('Marker at 400');
    // The answer is still not read out.
    expect(value()).toBeUndefined();
  });

  it('Check waits until the marker has moved, so one wrong place never costs two errors', () => {
    mount();
    tapAt(400);
    fireEvent.click(check());
    expect(check().disabled).toBe(true);
    press('Enter');
    fireEvent.click(check());
    expect(session().dataset['errors']).toBe('1');

    tapAt(500);
    expect(check().disabled).toBe(false);
    expect(marker()?.dataset['status']).toBe('idle');
    expect(marker()?.querySelector('.card-shake')).toBeNull();
    fireEvent.click(check());
    expect(session().dataset['errors']).toBe('2');
  });

  it('a hint lets the same place be checked again', () => {
    mount();
    tapAt(400);
    fireEvent.click(check());
    hint();
    expect(check().disabled).toBe(false);
    expect(marker()?.dataset['status']).toBe('idle');
  });

  it('a value with a reason speaks it instead of the default note', () => {
    mount(withReason);
    tapAt(500);
    fireEvent.click(check());
    expect(note()).toBe('Count the jumps between the marks, not the marks.');
    tapAt(600);
    fireEvent.click(check());
    expect(note()).toBe('Not there yet. Look at the numbers on the line.');
    expect(session().dataset['errors']).toBe('2');
  });

  it('an estimate: just outside the tolerance is wrong, its border is right', () => {
    mount(estimate);
    tapAt(289);
    fireEvent.click(check());
    expect(session().dataset['errors']).toBe('1');
    expect(session().dataset['solved']).toBe('false');
    tapAt(391);
    fireEvent.click(check());
    expect(session().dataset['errors']).toBe('2');
    tapAt(390);
    fireEvent.click(check());
    expect(session().dataset['solved']).toBe('true');
  });
});

describe('number-line UI: solved', () => {
  it('the right tick solves: praise, 3 stars, the marker in the good colour with its value, the line locked', () => {
    mount();
    tapAt(300);
    expect(value()).toBeUndefined();
    fireEvent.click(check());
    expect(session().dataset['solved']).toBe('true');
    expect(screen.getByTestId('done').dataset['stars']).toBe('3');
    expect(note()).toBe('Amazing!');
    expect(marker()?.dataset['status']).toBe('good');
    expect(value()).toBe('300');
    expect(band().getAttribute('aria-readonly')).toBe('true');
    // Nothing moves any more.
    tapAt(700);
    press('End');
    expect(markerAt()).toBe('Marker at 300');
    expect(screen.queryByRole('button', { name: 'Check' })).toBeNull();
  });

  it('a wrong try first costs a star', () => {
    mount();
    tapAt(400);
    fireEvent.click(check());
    tapAt(300);
    fireEvent.click(check());
    expect(screen.getByTestId('done').dataset['stars']).toBe('2');
    expect(note()).toBe('Well done!');
  });
});

describe('number-line UI: hints', () => {
  it('hint 1 numbers the middle tick and says so', () => {
    mount();
    expect(labels()).toEqual(['0', '1000']);
    hint();
    expect(note()).toBe('Find the middle: 500.');
    expect(labels().sort()).toEqual(['0', '1000', '500']);
    expect(marker()).toBeNull();
  });

  it('hint 2 numbers every tick and says to read them', () => {
    mount();
    hint();
    hint();
    expect(note()).toBe('Read the numbers on every mark.');
    expect(labels()).toHaveLength(11);
    expect(screen.getByTestId('number-line-label-300').textContent).toBe('300');
  });

  it('hint 3 gives the answer: the marker goes to the target and shows its value; the child still taps Check', () => {
    mount();
    tapAt(900);
    hint();
    hint();
    hint();
    expect(note()).toBe('Here is the answer.');
    expect(markerAt()).toBe('Marker at 300');
    expect(markerLeft()).toBe('30%');
    expect(value()).toBe('300');
    expect(session().dataset['solved']).toBe('false');
    expect(check().disabled).toBe(false);
    fireEvent.click(check());
    expect(session().dataset['solved']).toBe('true');
    expect(screen.getByTestId('done').dataset['stars']).toBe('1');
  });

  it('hint 3 on an estimate puts the marker on the target number', () => {
    mount(estimate);
    hint();
    hint();
    hint();
    expect(markerAt()).toBe('Marker at 340');
    expect(markerLeft()).toBe('34%');
  });

  it('asking hint 3 again puts the marker back on the target', () => {
    mount();
    hint();
    hint();
    hint();
    tapAt(900);
    expect(markerAt()).toBe('Marker at 900');
    hint();
    expect(markerAt()).toBe('Marker at 300');
  });

  it('the hint labels stay after a wrong try', () => {
    mount();
    hint();
    hint();
    tapAt(400);
    fireEvent.click(check());
    expect(labels()).toHaveLength(11);
  });

  it('a guided try starts with hint 1: the middle already numbered', () => {
    mount(exact100, { guided: true });
    expect(labels().sort()).toEqual(['0', '1000', '500']);
    expect(session().dataset['hintLevel']).toBe('1');
  });

  it('without hints (an assessment task) there is no Hint button', () => {
    mount(exact100, { showHint: false });
    expect(screen.queryByRole('button', { name: 'Hint' })).toBeNull();
    expect(check()).toBeTruthy();
  });
});

describe('number-line UI: the line card on a tablet', () => {
  it('is 152 px on a phone and grows with its slot from `lg`: its stage (line, ticks, numbers, pin) scales by 1.6 and sits in the middle of the card', () => {
    mount();
    const card = band();
    expect(card.className).toContain('h-[152px]');
    expect(card.className).toContain('[--nl-scale:1]');
    expect(card.className).toContain('lg:[--nl-scale:1.6]');
    expect(card.className).toContain('lg:h-full');
    expect(card.className).toContain('lg:min-h-[calc(152px*var(--nl-scale))]');
    const track = screen.getByTestId('number-line-track');
    expect(track.style.height).toBe(scaled(152));
    expect(track.className).toContain('top-1/2');
    expect(track.className).toContain('lg:inset-x-10');
    // The ticks, their numbers and the line are scaled the same way, the marker's pin too.
    expect(screen.getByTestId('number-line-tick-0').style.top).toBe(scaled(88 - 14));
    expect(screen.getByTestId('number-line-label-0').className).toContain('lg:text-[22px]');
    fireEvent.click(screen.getByTestId('number-line-track'));
    press('Home');
    const pin = marker()?.querySelector('svg');
    expect(pin?.style.width).toBe(scaled(40));
    expect(pin?.style.height).toBe(scaled(56));
  });

  it('shares the board slot with the prompt card by parts: 2 for the prompt card, 3 for the line card (a phone: the prompt card takes what the line card leaves)', () => {
    mount();
    const cardSlot = screen.getByTestId('number-line').parentElement;
    const promptSlot = cardSlot?.previousElementSibling;
    expect(promptSlot?.className).toContain('flex-1');
    expect(promptSlot?.className).toContain('lg:flex-[2]');
    expect(cardSlot?.className).toContain('lg:flex-[3]');
    expect(cardSlot?.className).toContain('lg:min-h-0');
  });
});

describe('number-line UI: many numbers', () => {
  it('with every tick numbered the numbers alternate between two rows, so they never touch', () => {
    mount();
    hint();
    hint();
    const top = (tick: number): string | undefined =>
      screen.getByTestId(`number-line-label-${String(tick)}`).style.top;
    expect(top(0)).toBe(scaled(28));
    expect(top(100)).toBe(scaled(48));
    expect(top(200)).toBe(scaled(28));
    expect(top(1000)).toBe(scaled(28));
  });

  it('a few numbers stay on one row', () => {
    mount(labelList);
    for (const tick of [0, 500, 1000]) {
      expect(screen.getByTestId(`number-line-label-${String(tick)}`).style.top).toBe(scaled(28));
    }
  });
});

describe('number-line UI: the kind UI itself', () => {
  it('clears the wrong mark on a hint', () => {
    expect(numberLineUi.clearWrongUi()).toEqual({ wrongValue: undefined });
    expect(numberLineUi.initUi(exact100)).toEqual({});
  });

  it('turns a wrong outcome into the line note with the placed value, a solved one into praise', () => {
    const state = { def: withReason, moves: 1, solved: false, errors: 1, hintLevel: 0 } as const;
    expect(
      numberLineUi.toUi({ kind: 'wrong', value: 20 }, { type: 'place', value: 20 }, state),
    ).toEqual({
      feedback: { kind: 'line-wrong' },
      hint: null,
      wrongValue: 20,
    });
    expect(
      numberLineUi.toUi({ kind: 'wrong', value: 50 }, { type: 'place', value: 50 }, state),
    ).toEqual({
      feedback: { kind: 'line-wrong', reasonKey: 'lessons:bugs.ticks-not-gaps' },
      hint: null,
      wrongValue: 50,
    });
    expect(numberLineUi.toUi({ kind: 'solved' }, { type: 'place', value: 40 }, state)).toEqual({
      feedback: { kind: 'solved' },
      hint: null,
      wrongValue: undefined,
    });
    expect(
      numberLineUi.toUi({ kind: 'ignored' }, { type: 'place', value: 40 }, state).feedback,
    ).toEqual({
      kind: 'solved',
    });
  });
});
