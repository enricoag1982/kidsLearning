// `array` content: the YAML shape, the build's compile, every verify rule with a failing fixture, and the kind through a whole lesson
// build (rows fixed or free, reasons, an easier variant).
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { compileAll } from '@learn/platform-content/compile-all';
import { cardStimulus } from '@learn/platform-content/kinds/cards/stimulus';
import { makeCompileContext } from '@learn/platform-content/kinds/kind-content';
import type { ExerciseDefBase } from '@learn/platform-core';
import type { MathContent, MathExerciseDef } from '../core/types.ts';
import type { ArrayDef } from '../kinds/array/def.ts';
import { ARRAY_SAMPLES } from '../kinds/array/samples.ts';
import { playSolution, playWrongThenSolve, starsFor } from '../testing/play.ts';
import { array } from './array.ts';
import { mathContent, mathExerciseSchema } from './math-content.ts';

/** The spec's example, as the YAML parses to. */
const yaml = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'ar-1',
  type: 'array',
  rows: 3,
  cols: 4,
  'fixed-rows': true,
  prompt: { big: '3 × 4' },
  reasons: [{ rows: 3, cols: 3, text: 'array-up.neighbour' }],
  ...overrides,
});

function compile(raw: Record<string, unknown>, issues: string[] = []): ArrayDef | null {
  const parsed = mathExerciseSchema.parse(raw);
  const stimulus = cardStimulus.compile(parsed, { where: 'where', issues });
  if (stimulus === null) return null;
  const ctx = makeCompileContext(
    'lesson.yaml',
    'exercises[0]',
    issues,
    { id: parsed.id, concept: 'arrays', textKey: `lessons:${parsed.text ?? parsed.id}` },
    parsed.easier,
    stimulus,
  );
  return array.compile(array.schema.parse(raw), ctx);
}

/** Every issue one raw exercise yields: schema, then compile, then verify. */
function issuesOf(raw: Record<string, unknown>): readonly string[] {
  const parsed = mathExerciseSchema.safeParse(raw);
  if (!parsed.success) return parsed.error.issues.map((issue) => issue.message);
  const issues: string[] = [];
  const def = compile(raw, issues);
  if (def !== null) array.verify?.(def, 'where', issues);
  return issues;
}

/** Every issue verify finds in a hand-built def. */
function verifyIssues(overrides: Partial<ArrayDef>): readonly string[] {
  const issues: string[] = [];
  array.verify?.({ ...ARRAY_SAMPLES.fixed, ...overrides }, 'where', issues);
  return issues;
}

describe('array YAML', () => {
  it('compiles the spec example: the head, the shape, the rows fixed and the reason key in the lessons namespace', () => {
    const def = compile(yaml());
    expect(def).toEqual({
      id: 'ar-1',
      concept: 'arrays',
      textKey: 'lessons:ar-1',
      prompt: { big: '3 × 4' },
      type: 'array',
      rows: 3,
      cols: 4,
      fixedRows: true,
      reasons: [{ rows: 3, cols: 3, reasonKey: 'lessons:array-up.neighbour' }],
    });
    expect(Object.keys(def ?? {})).toEqual([
      'id',
      'concept',
      'textKey',
      'prompt',
      'type',
      'rows',
      'cols',
      'fixedRows',
      'reasons',
    ]);
    expect(issuesOf(yaml())).toEqual([]);
  });

  it('`fixed-rows` defaults to true; false lets columns x rows count', () => {
    expect(compile(yaml({ 'fixed-rows': undefined }))?.fixedRows).toBe(true);
    expect(compile(yaml({ 'fixed-rows': true }))?.fixedRows).toBe(true);
    expect(compile(yaml({ 'fixed-rows': false }))?.fixedRows).toBe(false);
    expect(issuesOf(yaml({ 'fixed-rows': false, reasons: undefined }))).toEqual([]);
  });

  it('takes a card prompt or none, and `text` for the instruction key', () => {
    expect(issuesOf(yaml({ prompt: undefined }))).toEqual([]);
    expect(compile(yaml({ prompt: undefined, text: 'make-3-4' }))?.textKey).toBe(
      'lessons:make-3-4',
    );
    expect(
      Object.keys(compile(yaml({ prompt: undefined, reasons: undefined })) ?? {}),
    ).not.toContain('prompt');
    expect(Object.keys(compile(yaml({ reasons: undefined })) ?? {})).not.toContain('reasons');
  });

  it('rejects a missing, non-whole or off-grid side, an extra field, a bad flag and a bad reason', () => {
    expect(issuesOf(yaml({ rows: undefined })).length).toBeGreaterThan(0);
    expect(issuesOf(yaml({ cols: undefined })).length).toBeGreaterThan(0);
    expect(issuesOf(yaml({ rows: 2.5 })).length).toBeGreaterThan(0);
    expect(issuesOf(yaml({ cols: 3.5 })).length).toBeGreaterThan(0);
    expect(issuesOf(yaml({ rows: 0 })).length).toBeGreaterThan(0);
    expect(issuesOf(yaml({ cols: 7 })).length).toBeGreaterThan(0);
    expect(issuesOf(yaml({ rows: -1 })).length).toBeGreaterThan(0);
    expect(issuesOf(yaml({ speed: 3 })).length).toBeGreaterThan(0);
    expect(issuesOf(yaml({ 'fixed-rows': 'yes' })).length).toBeGreaterThan(0);
    expect(issuesOf(yaml({ fixedRows: true })).length).toBeGreaterThan(0);
    expect(issuesOf(yaml({ reasons: [] })).length).toBeGreaterThan(0);
    expect(issuesOf(yaml({ reasons: [{ rows: 3, cols: 3 }] })).length).toBeGreaterThan(0);
    expect(issuesOf(yaml({ reasons: [{ rows: 3, text: 'bugs.a' }] })).length).toBeGreaterThan(0);
    expect(
      issuesOf(yaml({ reasons: [{ rows: 3, cols: 7, text: 'bugs.a' }] })).length,
    ).toBeGreaterThan(0);
    expect(
      issuesOf(yaml({ reasons: [{ rows: 3, cols: 3, text: 'Not A Key' }] })).length,
    ).toBeGreaterThan(0);
  });

  it('lists the reason texts as keys the build resolves', () => {
    const def = compile(
      yaml({
        reasons: [
          { rows: 3, cols: 3, text: 'bugs.a' },
          { rows: 4, cols: 3, text: 'bugs.b' },
        ],
      }),
    );
    expect(array.textKeys?.(def as ArrayDef)).toEqual([
      { key: 'lessons:bugs.a', label: 'reason for 3 x 3' },
      { key: 'lessons:bugs.b', label: 'reason for 4 x 3' },
    ]);
    expect(array.textKeys?.(ARRAY_SAMPLES.fixed)).toEqual([]);
  });
});

describe('array verify', () => {
  it('passes every sample and the compiled spec example (rows fixed and free)', () => {
    for (const def of Object.values(ARRAY_SAMPLES)) {
      expect(verifyIssues(def), def.id).toEqual([]);
    }
    expect(issuesOf(yaml())).toEqual([]);
    expect(issuesOf(yaml({ rows: 1, cols: 1, reasons: undefined }))).toEqual([]);
    expect(issuesOf(yaml({ rows: 6, cols: 6, reasons: undefined }))).toEqual([]);
    expect(
      issuesOf(
        yaml({
          rows: 4,
          cols: 3,
          'fixed-rows': false,
          reasons: [{ rows: 4, cols: 4, text: 'bugs.a' }],
        }),
      ),
    ).toEqual([]);
  });

  it('rejects a side that is not a whole number from 1 to 6', () => {
    expect(verifyIssues({ rows: 0 })).toEqual([
      'where: rows 0 is not a whole number from 1 to 6 (the grid is 6 x 6)',
    ]);
    expect(verifyIssues({ rows: 7 })).toEqual([
      'where: rows 7 is not a whole number from 1 to 6 (the grid is 6 x 6)',
    ]);
    expect(verifyIssues({ cols: 0 })).toEqual([
      'where: cols 0 is not a whole number from 1 to 6 (the grid is 6 x 6)',
    ]);
    expect(verifyIssues({ cols: 7 })).toEqual([
      'where: cols 7 is not a whole number from 1 to 6 (the grid is 6 x 6)',
    ]);
    expect(verifyIssues({ rows: 2.5 })).toEqual([
      'where: rows 2.5 is not a whole number from 1 to 6 (the grid is 6 x 6)',
    ]);
    expect(verifyIssues({ cols: -3 })).toEqual([
      'where: cols -3 is not a whole number from 1 to 6 (the grid is 6 x 6)',
    ]);
    expect(verifyIssues({ rows: 9, cols: 0 })).toHaveLength(2);
  });

  it('rejects a reason shape that is off the grid', () => {
    const reasons = (...shapes: readonly (readonly [number, number])[]): ArrayDef['reasons'] =>
      shapes.map(([rows, cols]) => ({
        rows,
        cols,
        reasonKey: `lessons:bugs.r${String(rows)}${String(cols)}`,
      }));
    expect(verifyIssues({ reasons: reasons([3, 3], [2, 5]) })).toEqual([]);
    expect(verifyIssues({ reasons: reasons([3, 7]) })).toEqual([
      'where: reason for 3 x 7 is not on the grid (1-6 rows and columns)',
    ]);
    expect(verifyIssues({ reasons: reasons([0, 3]) })).toEqual([
      'where: reason for 0 x 3 is not on the grid (1-6 rows and columns)',
    ]);
    expect(verifyIssues({ reasons: reasons([2.5, 3]) })).toEqual([
      'where: reason for 2.5 x 3 is not on the grid (1-6 rows and columns)',
    ]);
  });

  it('rejects a reason shape that is the answer, or (rows free) the answer turned round', () => {
    const reasons = (...shapes: readonly (readonly [number, number])[]): ArrayDef['reasons'] =>
      shapes.map(([rows, cols]) => ({
        rows,
        cols,
        reasonKey: `lessons:bugs.r${String(rows)}${String(cols)}`,
      }));
    expect(verifyIssues({ reasons: reasons([3, 4]) })).toEqual([
      'where: reason for 3 x 4 is an answer Check accepts: a reason is for a wrong shape',
    ]);
    // Rows fixed: the swapped shape is a wrong answer, so it may have a reason (the swap note is the default for it).
    expect(verifyIssues({ reasons: reasons([4, 3]) })).toEqual([]);
    // Rows free: it is accepted, so its reason could never be spoken.
    expect(verifyIssues({ fixedRows: false, reasons: reasons([4, 3]) })).toEqual([
      'where: reason for 4 x 3 is an answer Check accepts: a reason is for a wrong shape',
    ]);
    expect(verifyIssues({ fixedRows: false, reasons: reasons([3, 4]) })).toEqual([
      'where: reason for 3 x 4 is an answer Check accepts: a reason is for a wrong shape',
    ]);
    expect(verifyIssues({ fixedRows: false, reasons: reasons([3, 3], [4, 4]) })).toEqual([]);
    // Through the YAML as well.
    expect(
      issuesOf(yaml({ 'fixed-rows': false, reasons: [{ rows: 4, cols: 3, text: 'bugs.a' }] })),
    ).toEqual([
      'where: reason for 4 x 3 is an answer Check accepts: a reason is for a wrong shape',
    ]);
  });

  it('rejects a reason given twice', () => {
    const twice: ArrayDef['reasons'] = [
      { rows: 3, cols: 3, reasonKey: 'lessons:bugs.a' },
      { rows: 3, cols: 3, reasonKey: 'lessons:bugs.b' },
    ];
    expect(verifyIssues({ reasons: twice })).toEqual(['where: reason for 3 x 3 is given twice']);
    // 3 x 3 and 3 x 3 only: 3 x 4 and 4 x 3 are two different wrong shapes (rows fixed).
    expect(
      verifyIssues({
        reasons: [
          { rows: 3, cols: 5, reasonKey: 'lessons:bugs.a' },
          { rows: 5, cols: 3, reasonKey: 'lessons:bugs.b' },
        ],
      }),
    ).toEqual([]);
  });

  it('every fixture the checks pass plays: the solution solves with 3 stars, a wrong try costs exactly 1 error', () => {
    const defs = [
      compile(yaml()),
      compile(yaml({ rows: 4, cols: 3, 'fixed-rows': false, reasons: undefined })),
      compile(yaml({ rows: 6, cols: 6, reasons: undefined })),
      compile(yaml({ rows: 1, cols: 6, reasons: undefined })),
    ].filter((def): def is ArrayDef => def !== null);
    expect(defs).toHaveLength(4);
    for (const def of defs) {
      expect(starsFor(playSolution(def))).toBe(3);
      expect(playWrongThenSolve(def)).toMatchObject({ errors: 1, solved: true });
    }
  });
});

describe('a lesson with array exercises, through the whole build', () => {
  const realRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content');
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  /** A copy of math's content with one more lesson (`lessonYaml`) and its texts appended to `lessons.yaml`. */
  function rootWith(lessonYaml: string, texts: string): string {
    const root = mkdtempSync(join(tmpdir(), 'math-array-'));
    roots.push(root);
    cpSync(realRoot, root, { recursive: true });
    writeFileSync(join(root, 'lessons', 'adding', 'array-up.yaml'), lessonYaml);
    const lessonTexts = join(root, 'locales', 'en', 'lessons.yaml');
    writeFileSync(lessonTexts, `${readFileSync(lessonTexts, 'utf8')}${texts}`);
    return root;
  }

  const TEXTS = `array-up:
  title: Dot arrays
  story: Rows of dots make an array. Rows go across.
  demo: This array has 3 rows of 4 dots.
  neighbour: Each row needs 4 dots. Count along one row.
ar-g1: Make 2 rows of 3 dots. Tap the bottom-right dot.
ar-01: Make 3 rows of 4 dots. Tap the bottom-right dot.
ar-02: Make a dot array for 4 × 3. Tap the bottom-right dot.
ar-easy: Make 1 row of 4 dots. Tap the bottom-right dot.
`;

  const LESSON = `id: array-up
order: 4
concept: array-up
character: owl
demo:
  prompt: { big: 3 × 4 }
guided:
  - id: ar-g1
    type: array
    rows: 2
    cols: 3
    prompt: { big: 2 × 3 }
exercises:
  - id: ar-01
    type: array
    rows: 3
    cols: 4
    prompt: { big: 3 × 4 }
    reasons: [{ rows: 3, cols: 3, text: array-up.neighbour }]
    easier: ar-easy
  - id: ar-02
    type: array
    rows: 4
    cols: 3
    fixed-rows: false
    prompt: { big: 4 × 3 }
variants:
  - id: ar-easy
    type: array
    rows: 1
    cols: 4
    prompt: { big: 1 × 4 }
`;

  it('builds and plays every exercise (the rows fixed by default, free where the YAML says)', () => {
    const compiled = compileAll<MathContent>(mathContent, rootWith(LESSON, TEXTS));
    const lesson = compiled.content.lessons.find((entry) => entry.id === 'array-up');
    const defs = [
      ...(lesson?.guided ?? []),
      ...(lesson?.exercises ?? []),
      ...(lesson?.variants ?? []),
    ];
    expect(defs.map((def) => [def.id, def.type])).toEqual([
      ['ar-g1', 'array'],
      ['ar-01', 'array'],
      ['ar-02', 'array'],
      ['ar-easy', 'array'],
    ]);
    expect(defs.map((def) => (def as ArrayDef).fixedRows)).toEqual([true, true, false, true]);
    for (const def of defs as readonly MathExerciseDef[]) {
      expect(playSolution(def), def.id).toMatchObject({ solved: true, errors: 0 });
      expect(playWrongThenSolve(def), def.id).toMatchObject({ solved: true, errors: 1 });
    }
  });

  it('fails the build on a verify issue, on a reason text that does not exist and on a bad shape', () => {
    const expectIssue = (lesson: string, texts: string, message: RegExp): void => {
      expect(() => compileAll<MathContent>(mathContent, rootWith(lesson, texts))).toThrow(message);
    };
    // A reason that Check accepts: the answer turned round on an item whose rows are free.
    expectIssue(
      LESSON.replace(
        'fixed-rows: false\n',
        'fixed-rows: false\n    reasons: [{ rows: 3, cols: 4, text: array-up.neighbour }]\n',
      ),
      TEXTS,
      /ar-02.*reason for 3 x 4 is an answer Check accepts/s,
    );
    expectIssue(
      LESSON.replace('reasons: [{ rows: 3, cols: 3,', 'reasons: [{ rows: 3, cols: 4,'),
      TEXTS,
      /reason for 3 x 4 is an answer Check accepts/,
    );
    expectIssue(
      LESSON.replace('reasons: [{ rows: 3, cols: 3,', 'reasons: [{ rows: 3, cols: 7,'),
      TEXTS,
      /exercises\.0\.reasons\.0\.cols: Too big: expected number to be <=6/,
    );
    expectIssue(
      LESSON,
      TEXTS.replace(/ {2}neighbour: .*\n/, '  other-reason: Another one.\n'),
      /reason for 3 x 3/,
    );
    expectIssue(
      LESSON.replace('rows: 2\n', 'rows: 7\n'),
      TEXTS,
      /guided\.0\.rows: Too big: expected number to be <=6/,
    );
  });

  it('is a plain `ExerciseDefBase` to the platform: id, concept, text key', () => {
    const compiled = compileAll<MathContent>(mathContent, rootWith(LESSON, TEXTS));
    const lesson = compiled.content.lessons.find((entry) => entry.id === 'array-up');
    const first: ExerciseDefBase | undefined = lesson?.guided[0];
    expect(first).toMatchObject({ id: 'ar-g1', concept: 'array-up', textKey: 'lessons:ar-g1' });
  });
});
