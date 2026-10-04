// Hand-built place-value exercises for tests, the App-flow test and the `#math` playground, whatever the shipped content is: 3 and 4
// columns, a zero digit, a prefilled `start`, a reason, a 9 in a column. Texts: `web/testing/place-value-fixtures.ts`.
import type { PlaceValueDef } from '../kinds/place-value/def.ts';

const base = (id: string, text: string) => ({
  id: `pvfx-${id}`,
  concept: 'pv-fx',
  textKey: `lessons:pvfx-${text}`,
});

/** Hundreds, tens, ones, no zero. */
const hto: PlaceValueDef = {
  ...base('hto', 'hto'),
  prompt: { big: '243' },
  type: 'place-value',
  target: 243,
  columns: 3,
};

/** A zero in the tens; building the tens and ones the wrong way round (350) has its reason. */
const zero: PlaceValueDef = {
  ...base('zero', 'zero'),
  prompt: { big: '305' },
  type: 'place-value',
  target: 305,
  columns: 3,
  reasons: [{ value: 350, reasonKey: 'lessons:pvfx-bug-swap' }],
};

/** Four columns, a zero in the hundreds. */
const thousands: PlaceValueDef = {
  ...base('thousands', 'thousands'),
  prompt: { big: '4072' },
  type: 'place-value',
  target: 4072,
  columns: 4,
  reasons: [{ value: 4027, reasonKey: 'lessons:pvfx-bug-swap' }],
};

/** The columns start full of blocks (a 9 among them, so its + is disabled): the child takes some away. */
const start: PlaceValueDef = {
  ...base('start', 'start'),
  prompt: { big: '128' },
  type: 'place-value',
  target: 128,
  columns: 3,
  start: [2, 5, 9],
};

/** Four different digits, a 9 among them. */
const nine: PlaceValueDef = {
  ...base('nine', 'nine'),
  prompt: { big: '3956' },
  type: 'place-value',
  target: 3956,
  columns: 4,
};

/** One valid def of each shape the kind has to handle. */
export const PLACE_VALUE_SAMPLES = { hto, zero, thousands, start, nine } as const;
