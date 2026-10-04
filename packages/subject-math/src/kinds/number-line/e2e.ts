import type { MathKindE2E } from '../../web/kinds/e2e-registry.ts';
import type { NumberLineDef, NumberLineOutcome, PlaceAction } from './def.ts';

const times = (count: number, key: string): readonly string[] =>
  Array.from({ length: count }, () => key);

/** The keys that carry the marker from the left end (Home) to `value`: an exact item moves a tick per arrow press; an estimate item
 * jumps a whole interval per Page key, then walks the rest one by one from the nearer tick. */
export function keysToValue(def: NumberLineDef, value: number): readonly string[] {
  const offset = value - def.from;
  if (def.tolerance === 0) {
    return times(offset / def.step, 'ArrowRight');
  }
  const jumps = Math.floor(offset / def.step);
  const rest = offset - jumps * def.step;
  return rest * 2 <= def.step
    ? [...times(jumps, 'PageUp'), ...times(rest, 'ArrowRight')]
    : [...times(jumps + 1, 'PageUp'), ...times(def.step - rest, 'ArrowLeft')];
}

/** Places the marker with the keyboard (focus the slider, Home, then the presses: the same keys whatever the width of the page),
 * then taps Check. */
export const numberLineE2E: MathKindE2E<NumberLineDef, PlaceAction, NumberLineOutcome> = {
  async perform(page, action, { def, text }) {
    const slider = page.getByRole('slider');
    for (const key of ['Home', ...keysToValue(def, action.value)]) {
      await slider.press(key);
    }
    await page.getByRole('button', { name: text('exercise.check'), exact: true }).click();
  },
};
