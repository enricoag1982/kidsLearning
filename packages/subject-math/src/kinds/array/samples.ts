// Hand-built `array` defs for tests and the dev playground (`/#math`): no shipped lesson uses the kind yet (the first ones come with
// the World 3 content). They cover what the kind and its UI must handle: rows fixed by the text, rows free (cols x rows also right),
// the whole grid, a single row and a reason. The text keys are `lessons:fx-ar-*`; `ARRAY_SAMPLE_TEXTS` holds their English (the
// `lessons` namespace), which a test or the playground adds to i18next. Never imported by app code (the playground is a dev-only
// chunk).
import type { ArrayDef } from './def.ts';

const base = (id: string) => ({
  id,
  concept: 'array',
  textKey: `lessons:${id}`,
});

/** A guided try: 2 rows of 3, the rows fixed by the text. */
const guided: ArrayDef = {
  ...base('fx-ar-guided'),
  prompt: { big: '2 × 3' },
  type: 'array',
  rows: 2,
  cols: 3,
  fixedRows: true,
};

/** 3 rows of 4: only that shape counts (4 rows of 3 is the same number of dots, but not the same array). */
const fixed: ArrayDef = {
  ...base('fx-ar-fixed'),
  prompt: { big: '3 × 4' },
  type: 'array',
  rows: 3,
  cols: 4,
  fixedRows: true,
};

/** 4 × 3 with the rows free: 4 rows of 3 and 3 rows of 4 both count. */
const free: ArrayDef = {
  ...base('fx-ar-free'),
  prompt: { big: '4 × 3' },
  type: 'array',
  rows: 4,
  cols: 3,
  fixedRows: false,
};

/** The whole grid. */
const full: ArrayDef = {
  ...base('fx-ar-full'),
  prompt: { big: '6 × 6' },
  type: 'array',
  rows: 6,
  cols: 6,
  fixedRows: true,
};

/** A single row. */
const single: ArrayDef = {
  ...base('fx-ar-single'),
  prompt: { big: '1 × 5' },
  type: 'array',
  rows: 1,
  cols: 5,
  fixedRows: true,
};

/** One dot short in each row speaks a reason. */
const withReason: ArrayDef = {
  ...base('fx-ar-reason'),
  prompt: { big: '2 × 5' },
  type: 'array',
  rows: 2,
  cols: 5,
  fixedRows: true,
  reasons: [{ rows: 2, cols: 4, reasonKey: 'lessons:bugs.array-short' }],
};

export const ARRAY_SAMPLES = {
  guided,
  fixed,
  free,
  full,
  single,
  withReason,
} as const satisfies Readonly<Record<string, ArrayDef>>;

/** The samples' English: instructions and the reason, in the `lessons` namespace. */
export const ARRAY_SAMPLE_TEXTS = {
  'fx-ar-guided': 'Make 2 rows of 3 dots. Tap the bottom-right dot.',
  'fx-ar-fixed': 'Make 3 rows of 4 dots. Tap the bottom-right dot.',
  'fx-ar-free': 'Make an array for 4 × 3. Tap the bottom-right dot.',
  'fx-ar-full': 'Make 6 rows of 6 dots. Tap the bottom-right dot.',
  'fx-ar-single': 'Make 1 row of 5 dots. Tap the bottom-right dot.',
  'fx-ar-reason': 'Make 2 rows of 5 dots. Tap the bottom-right dot.',
  bugs: { 'array-short': 'Each row needs 5 dots. Count along one row.' },
} as const;
