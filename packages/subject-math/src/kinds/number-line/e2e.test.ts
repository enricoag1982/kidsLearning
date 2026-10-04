import { describe, expect, it } from 'vitest';
import type { NumberLineDef } from './def.ts';
import { keysToValue, numberLineE2E } from './e2e.ts';
import { NUMBER_LINE_SAMPLES } from './samples.ts';
import { numberLineSolution, numberLineWrongAction } from './solution.ts';

const { exact100, exact10, exact50, estimate } = NUMBER_LINE_SAMPLES;

/** The calls a driver makes on a Playwright `Page`, in order. */
type Call = string;

function fakePage(calls: Call[]) {
  return {
    getByRole(role: string, options?: { readonly name?: string; readonly exact?: boolean }) {
      const where = `${role}${options?.name === undefined ? '' : `[${options.name}${options.exact === true ? ', exact' : ''}]`}`;
      return {
        press(key: string): Promise<void> {
          calls.push(`${where}.press(${key})`);
          return Promise.resolve();
        },
        click(): Promise<void> {
          calls.push(`${where}.click()`);
          return Promise.resolve();
        },
      };
    },
  };
}

async function drive(def: NumberLineDef, value: number): Promise<readonly Call[]> {
  const calls: Call[] = [];
  const page = fakePage(calls) as unknown as Parameters<typeof numberLineE2E.perform>[0];
  await numberLineE2E.perform(
    page,
    { type: 'place', value },
    {
      def,
      before: { def, moves: 0, solved: false, errors: 0, hintLevel: 0 },
      outcome: { kind: 'solved' },
      text: (key) => (key === 'exercise.check' ? 'Check' : key),
    },
  );
  return calls;
}

describe('keysToValue', () => {
  it('an exact item: one arrow press per tick from the left end', () => {
    expect(keysToValue(exact100, 0)).toEqual([]);
    expect(keysToValue(exact100, 300)).toEqual(['ArrowRight', 'ArrowRight', 'ArrowRight']);
    expect(keysToValue(exact10, 100)).toHaveLength(10);
    expect(keysToValue(exact50, 350)).toHaveLength(7);
  });

  it('an estimate item: whole-interval jumps, then the rest from the nearer tick', () => {
    expect(keysToValue(estimate, 300)).toEqual(['PageUp', 'PageUp', 'PageUp']);
    expect(keysToValue(estimate, 340)).toEqual([
      'PageUp',
      'PageUp',
      'PageUp',
      ...Array.from({ length: 40 }, () => 'ArrowRight'),
    ]);
    // 390 is nearer 400: jump to 400, then back 10.
    expect(keysToValue(estimate, 390)).toEqual([
      'PageUp',
      'PageUp',
      'PageUp',
      'PageUp',
      ...Array.from({ length: 10 }, () => 'ArrowLeft'),
    ]);
    // The half-way point walks right.
    expect(keysToValue(estimate, 350).filter((key) => key === 'ArrowRight')).toHaveLength(50);
    expect(keysToValue(estimate, 1000)).toHaveLength(10);
  });

  it('every key sequence ends on the value (replayed on the slider the UI draws: Home, arrows by 1 or the step, Page keys by the step)', () => {
    const replay = (def: NumberLineDef, value: number): number => {
      let at = def.from;
      const inc = def.tolerance === 0 ? def.step : 1;
      for (const key of keysToValue(def, value)) {
        if (key === 'ArrowRight') at += inc;
        else if (key === 'ArrowLeft') at -= inc;
        else if (key === 'PageUp') at += def.step;
        else if (key === 'PageDown') at -= def.step;
      }
      return at;
    };
    for (const def of Object.values(NUMBER_LINE_SAMPLES)) {
      for (const action of [...numberLineSolution(def), ...numberLineWrongAction(def)]) {
        expect(replay(def, action.value), `${def.id} ${String(action.value)}`).toBe(action.value);
      }
    }
    for (let value = 0; value <= 1000; value += 7) {
      expect(replay(estimate, value), String(value)).toBe(value);
    }
  });
});

describe('number-line e2e driver', () => {
  it('focuses the slider with Home, presses the keys to the value, then taps Check by its text', async () => {
    expect(await drive(exact100, 300)).toEqual([
      'slider.press(Home)',
      'slider.press(ArrowRight)',
      'slider.press(ArrowRight)',
      'slider.press(ArrowRight)',
      'button[Check, exact].click()',
    ]);
  });

  it('places the left end with Home alone', async () => {
    expect(await drive(exact100, 0)).toEqual([
      'slider.press(Home)',
      'button[Check, exact].click()',
    ]);
  });

  it('plays a wrong value the same way', async () => {
    const [wrong] = numberLineWrongAction(exact10);
    expect(wrong?.value).toBe(80);
    const calls = await drive(exact10, wrong?.value ?? -1);
    expect(calls.filter((call) => call === 'slider.press(ArrowRight)')).toHaveLength(8);
    expect(calls.at(-1)).toBe('button[Check, exact].click()');
  });
});
