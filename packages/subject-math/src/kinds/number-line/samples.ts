// Hand-built `number-line` defs for tests and the dev playground (`/#math`): no shipped lesson uses the kind yet (the first ones come
// with the World 1 content). They cover what the kind and its UI must handle: exact items on three step sizes, an estimate, a label
// list and a reason. The text keys are `lessons:fx-nl-*`; `NUMBER_LINE_SAMPLE_TEXTS` holds their English (the `lessons` namespace), which
// a test or the playground adds to i18next. Never imported by app code (the playground is a dev-only chunk).
import type { NumberLineDef } from './def.ts';

const base = (id: string) => ({
  id,
  concept: 'number-line',
  textKey: `lessons:${id}`,
});

/** 0 to 1000 in steps of 100; only the ends are numbered. */
const exact100: NumberLineDef = {
  ...base('fx-nl-100'),
  prompt: { big: '300' },
  type: 'number-line',
  from: 0,
  to: 1000,
  step: 100,
  labels: 'ends',
  target: 300,
  tolerance: 0,
};

/** 0 to 100 in steps of 10. */
const exact10: NumberLineDef = {
  ...base('fx-nl-10'),
  prompt: { big: '70' },
  type: 'number-line',
  from: 0,
  to: 100,
  step: 10,
  labels: 'ends',
  target: 70,
  tolerance: 0,
};

/** 0 to 500 in steps of 50 (ten gaps). */
const exact50: NumberLineDef = {
  ...base('fx-nl-50'),
  prompt: { big: '350' },
  type: 'number-line',
  from: 0,
  to: 500,
  step: 50,
  labels: 'ends',
  target: 350,
  tolerance: 0,
};

/** The target sits between two ticks: any value within 50 of it counts. */
const estimate: NumberLineDef = {
  ...base('fx-nl-estimate'),
  prompt: { big: '340' },
  type: 'number-line',
  from: 0,
  to: 1000,
  step: 100,
  labels: 'ends',
  target: 340,
  tolerance: 50,
};

/** The ends and the middle are numbered. */
const labelList: NumberLineDef = {
  ...base('fx-nl-list'),
  prompt: { big: '700' },
  type: 'number-line',
  from: 0,
  to: 1000,
  step: 100,
  labels: [0, 500, 1000],
  target: 700,
  tolerance: 0,
};

/** One mark too far (counting the first mark as 1) speaks a reason. */
const withReason: NumberLineDef = {
  ...base('fx-nl-reason'),
  prompt: { big: '40' },
  type: 'number-line',
  from: 0,
  to: 100,
  step: 10,
  labels: 'ends',
  target: 40,
  tolerance: 0,
  reasons: [{ value: 50, reasonKey: 'lessons:bugs.ticks-not-gaps' }],
};

/** A guided try: 0 to 100 in steps of 10, the target 20. */
const guided: NumberLineDef = {
  ...base('fx-nl-guided'),
  prompt: { big: '20' },
  type: 'number-line',
  from: 0,
  to: 100,
  step: 10,
  labels: 'ends',
  target: 20,
  tolerance: 0,
};

export const NUMBER_LINE_SAMPLES = {
  guided,
  exact100,
  exact10,
  exact50,
  estimate,
  labelList,
  withReason,
} as const satisfies Readonly<Record<string, NumberLineDef>>;

/** The samples' English: instructions and the reason, in the `lessons` namespace. */
export const NUMBER_LINE_SAMPLE_TEXTS = {
  'fx-nl-guided': 'Put the marker on 20.',
  'fx-nl-100': 'Put the marker on 300.',
  'fx-nl-10': 'Put the marker on 70.',
  'fx-nl-50': 'Put the marker on 350.',
  'fx-nl-estimate': 'Put the marker where 340 goes.',
  'fx-nl-list': 'Put the marker on 700.',
  'fx-nl-reason': 'Put the marker on 40.',
  bugs: { 'ticks-not-gaps': 'Count the jumps between the marks, not the marks.' },
} as const;
