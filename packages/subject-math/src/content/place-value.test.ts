// The place-value kind's content: the YAML shape, what compiles from it, every verify rule with a failing fixture, and the whole
// pipeline (lesson file → def → text keys → voice inventory) over a copy of the math content with a place-value lesson added.
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { compileAll } from '@learn/platform-content/compile-all';
import { ContentError } from '@learn/platform-content/load';
import { makeCompileContext } from '@learn/platform-content/kinds/kind-content';
import { cardStimulus } from '@learn/platform-content/kinds/cards/stimulus';
import type { ExerciseDefBase } from '@learn/platform-core';
import { mathExerciseSchema, MATH_KIND_CONTENT, mathContent } from './math-content.ts';
import { placeValue } from './place-value.ts';
import type { MathContent } from '../core/types.ts';
import type { PlaceValueDef } from '../kinds/place-value/def.ts';
import { playSolution, playWrongThenSolve, starsFor } from '../testing/play.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content');

/** Every issue one raw exercise yields: schema, then compile, then the kind's verify. */
function issuesOf(raw: Record<string, unknown>): readonly string[] {
  const parsed = mathExerciseSchema.safeParse(raw);
  if (!parsed.success) return parsed.error.issues.map((issue) => issue.message);
  const issues: string[] = [];
  const def = compile(raw, issues);
  if (def !== null) placeValue.verify?.(def as PlaceValueDef, 'where', issues);
  return issues;
}

function compile(raw: Record<string, unknown>, issues: string[] = []): ExerciseDefBase | null {
  const parsed = mathExerciseSchema.parse(raw);
  const stimulus = cardStimulus.compile(parsed, { where: 'where', issues });
  if (stimulus === null) return null;
  const ctx = makeCompileContext(
    'lesson.yaml',
    'exercises[0]',
    issues,
    { id: parsed.id, concept: 'pv-fx', textKey: `lessons:${parsed.text ?? parsed.id}` },
    parsed.easier,
    stimulus,
  );
  return mathContent.kinds[parsed.type]?.compile(parsed, ctx) ?? null;
}

const pv = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'pv-01',
  type: 'place-value',
  target: 305,
  columns: 3,
  ...overrides,
});
const reasons = (...values: readonly number[]): Record<string, unknown> => ({
  reasons: values.map((value) => ({ value, text: `bugs.why-${String(value)}` })),
});

describe('place-value is a math kind', () => {
  it('is registered in the math content registry, once, as the content module', () => {
    expect(MATH_KIND_CONTENT['place-value']).toBe(placeValue);
    expect(mathContent.kinds['place-value']).toBe(placeValue);
    expect(placeValue.type).toBe('place-value');
  });
});

describe('place-value YAML', () => {
  it('accepts 3 and 4 columns, a start, a prompt, an easier link and reasons', () => {
    expect(issuesOf(pv())).toEqual([]);
    expect(issuesOf(pv({ target: 4072, columns: 4 }))).toEqual([]);
    expect(issuesOf(pv({ start: [0, 0, 0] }))).toEqual([]);
    expect(issuesOf(pv({ start: [2, 5, 9], target: 128 }))).toEqual([]);
    expect(issuesOf(pv({ prompt: { big: '305' } }))).toEqual([]);
    expect(issuesOf(pv({ easier: 'pv-easy' }))).toEqual([]);
    expect(issuesOf(pv(reasons(350)))).toEqual([]);
    // The extremes of the range: 1 and 9999.
    expect(issuesOf(pv({ target: 1 }))).toEqual([]);
    expect(issuesOf(pv({ target: 999 }))).toEqual([]);
    expect(issuesOf(pv({ target: 9999, columns: 4 }))).toEqual([]);
  });

  it('compiles into the def: head, prompt, type, target, columns, then start and reasons (reason keys in the lessons namespace)', () => {
    const def = compile(
      pv({ prompt: { big: 305 }, start: [1, 0, 0], ...reasons(350, 35), easier: 'pv-easy' }),
    );
    expect(Object.keys(def ?? {})).toEqual([
      'id',
      'concept',
      'textKey',
      'prompt',
      'type',
      'target',
      'columns',
      'start',
      'reasons',
      'easier',
    ]);
    expect(def).toMatchObject({
      id: 'pv-01',
      textKey: 'lessons:pv-01',
      prompt: { big: '305' },
      type: 'place-value',
      target: 305,
      columns: 3,
      start: [1, 0, 0],
      reasons: [
        { value: 350, reasonKey: 'lessons:bugs.why-350' },
        { value: 35, reasonKey: 'lessons:bugs.why-35' },
      ],
      easier: 'pv-easy',
    });
    expect(Object.keys(compile(pv()) ?? {})).toEqual([
      'id',
      'concept',
      'textKey',
      'type',
      'target',
      'columns',
    ]);
  });

  it('lists every reason text among the text keys (checked to exist), none without reasons', () => {
    expect(placeValue.textKeys?.(compile(pv(reasons(350, 35))) as PlaceValueDef)).toEqual([
      { key: 'lessons:bugs.why-350', label: 'reason for 350' },
      { key: 'lessons:bugs.why-35', label: 'reason for 35' },
    ]);
    expect(placeValue.textKeys?.(compile(pv()) as PlaceValueDef)).toEqual([]);
  });

  it('rejects a missing or non-whole target, columns other than 3 / 4, an unknown field and a bad shape', () => {
    expect(issuesOf(pv({ target: undefined }))).toHaveLength(1);
    expect(issuesOf(pv({ target: 30.5 }))).toHaveLength(1);
    expect(issuesOf(pv({ target: '305' }))).toHaveLength(1);
    for (const columns of [2, 5, '3', 0]) {
      expect(issuesOf(pv({ columns })), String(columns)).toHaveLength(1);
    }
    expect(issuesOf(pv({ colour: 'red' }))).toHaveLength(1);
    expect(issuesOf(pv({ start: 'none' }))).toHaveLength(1);
    expect(issuesOf(pv({ start: [0, 1.5, 0] }))).toHaveLength(1);
    expect(issuesOf(pv({ prompt: {} }))).toEqual(['prompt needs "emoji", "big" or "image"']);
  });

  it('rejects an empty reasons list, a bad text ref, a non-whole value and an unknown reason field', () => {
    expect(issuesOf(pv({ reasons: [] }))).toHaveLength(1);
    expect(issuesOf(pv({ reasons: [{ value: 350, text: 'Not A Ref' }] }))).toHaveLength(1);
    expect(issuesOf(pv({ reasons: [{ value: 35.5, text: 'why' }] }))).toHaveLength(1);
    expect(issuesOf(pv({ reasons: [{ value: 350, text: 'why', other: 1 }] }))).toHaveLength(1);
    expect(issuesOf(pv({ reasons: [{ value: 350 }] }))).toHaveLength(1);
  });
});

describe('place-value verify', () => {
  it('rejects a target outside 1-9999', () => {
    expect(issuesOf(pv({ target: 0 }))).toEqual(['where: target 0 is outside 1-9999']);
    expect(issuesOf(pv({ target: -5 }))).toEqual(['where: target -5 is outside 1-9999']);
    expect(issuesOf(pv({ target: 10000, columns: 4 }))).toEqual([
      'where: target 10000 is outside 1-9999',
    ]);
  });

  it('rejects a target that does not fit the columns', () => {
    expect(issuesOf(pv({ target: 1000, columns: 3 }))).toEqual([
      'where: target 1000 does not fit 3 columns (below 1000)',
    ]);
    expect(issuesOf(pv({ target: 4072, columns: 3 }))).toEqual([
      'where: target 4072 does not fit 3 columns (below 1000)',
    ]);
    expect(issuesOf(pv({ target: 999, columns: 3 }))).toEqual([]);
    expect(issuesOf(pv({ target: 1000, columns: 4 }))).toEqual([]);
  });

  it('rejects a start with the wrong number of counts, a count outside 0-9 or the target itself', () => {
    expect(issuesOf(pv({ start: [0, 0] }))).toEqual([
      'where: start has 2 counts but there are 3 columns',
    ]);
    expect(issuesOf(pv({ start: [0, 0, 0, 0] }))).toEqual([
      'where: start has 4 counts but there are 3 columns',
    ]);
    expect(issuesOf(pv({ start: [3, 0, 10] }))).toEqual(['where: start counts must be 0-9']);
    expect(issuesOf(pv({ start: [3, -1, 5] }))).toEqual(['where: start counts must be 0-9']);
    expect(issuesOf(pv({ start: [3, 0, 5] }))).toEqual([
      'where: start already builds the target 305',
    ]);
    // 4 columns: the same value in other columns is the same target.
    expect(issuesOf(pv({ target: 305, columns: 4, start: [0, 3, 0, 5] }))).toEqual([
      'where: start already builds the target 305',
    ]);
    expect(issuesOf(pv({ start: [3, 5, 0] }))).toEqual([]);
    expect(issuesOf(pv({ start: [9, 9, 9] }))).toEqual([]);
  });

  it('rejects a reason for the target, a repeated value and a value the columns cannot build', () => {
    expect(issuesOf(pv(reasons(305)))).toEqual([
      'where: reason for 305 is the target: a reason is for a wrong value',
    ]);
    expect(issuesOf(pv(reasons(350, 350)))).toEqual(['where: reason for 350 is given twice']);
    expect(issuesOf(pv(reasons(1000)))).toEqual([
      'where: reason for 1000 cannot be built in 3 columns (0-999)',
    ]);
    expect(issuesOf(pv({ reasons: [{ value: -1, text: 'bugs.negative' }] }))).toEqual([
      'where: reason for -1 cannot be built in 3 columns (0-999)',
    ]);
    expect(issuesOf(pv({ target: 4072, columns: 4, ...reasons(4027, 407) }))).toEqual([]);
    expect(issuesOf(pv({ target: 4072, columns: 4, ...reasons(10000) }))).toEqual([
      'where: reason for 10000 cannot be built in 4 columns (0-9999)',
    ]);
    expect(issuesOf(pv(reasons(350, 35, 0, 999)))).toEqual([]);
  });

  it('reports every problem of one exercise, not only the first', () => {
    expect(issuesOf(pv({ target: 1000, start: [0, 0], ...reasons(500, 2000) }))).toEqual([
      'where: target 1000 does not fit 3 columns (below 1000)',
      'where: start has 2 counts but there are 3 columns',
      'where: reason for 2000 cannot be built in 3 columns (0-999)',
    ]);
  });
});

describe('place-value defs of the content kit', () => {
  it('compiled defs play: the solution solves with 3 stars and the wrong action costs 1 error', () => {
    for (const raw of [
      pv(),
      pv({ target: 4072, columns: 4 }),
      pv({ start: [2, 5, 9], target: 128 }),
    ]) {
      const def = compile(raw) as PlaceValueDef;
      expect(playSolution(def)).toMatchObject({ solved: true, errors: 0 });
      expect(starsFor(playSolution(def))).toBe(3);
      expect(playWrongThenSolve(def)).toMatchObject({ solved: true, errors: 1 });
    }
  });
});

describe('a lesson of place-value exercises, through the whole pipeline', () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  const LESSON = `id: pv-fx
order: 4
concept: pv-fx
character: owl
demo:
  prompt: { big: 305 }
guided:
  - id: pvx-g1
    type: place-value
    prompt: { big: 243 }
    target: 243
    columns: 3
exercises:
  - id: pvx-01
    type: place-value
    prompt: { big: 305 }
    target: 305
    columns: 3
    reasons:
      - { value: 350, text: bugs.swap }
    easier: pvx-easy
  - id: pvx-02
    type: place-value
    prompt: { big: 4072 }
    target: 4072
    columns: 4
    start: [3, 0, 0, 0]
variants:
  - id: pvx-easy
    type: place-value
    target: 40
    columns: 3
`;
  const TEXTS = `
pv-fx:
  title: Blocks
  story: Build numbers with blocks.
  demo: Look at the blocks.
pvx-g1: Build 243.
pvx-01: Build 305.
pvx-02: Build 4072.
pvx-easy: Build 40.
bugs:
  swap: 'Look at the order: hundreds, then tens, then ones.'
`;

  /** A copy of the math content with the lesson above in a world of its own (`pv-fx`), `edit` applied to the lesson text first. */
  function compileWith(edit: (lesson: string) => string = (lesson) => lesson) {
    const dir = mkdtempSync(join(tmpdir(), 'math-pv-'));
    dirs.push(dir);
    cpSync(root, dir, { recursive: true });
    writeFileSync(join(dir, 'lessons', 'adding', 'pv-fx.yaml'), edit(LESSON));
    const lessons = join(dir, 'locales', 'en', 'lessons.yaml');
    writeFileSync(lessons, `${readFileSync(lessons, 'utf8')}${TEXTS}`);
    return compileAll<MathContent>(mathContent, dir);
  }

  it('compiles the three kinds of place: guided, scored with reason and easier variant, 4 columns with a start', () => {
    const compiled = compileWith();
    const lesson = compiled.content.lessons.find((entry) => entry.id === 'pv-fx');
    expect(lesson?.guided.map((def) => def.type)).toEqual(['place-value']);
    expect(lesson?.exercises).toMatchObject([
      {
        id: 'pvx-01',
        target: 305,
        columns: 3,
        prompt: { big: '305' },
        reasons: [{ value: 350, reasonKey: 'lessons:bugs.swap' }],
        easier: 'pvx-easy',
      },
      { id: 'pvx-02', target: 4072, columns: 4, start: [3, 0, 0, 0] },
    ]);
    expect(lesson?.variants).toMatchObject([{ id: 'pvx-easy', target: 40, columns: 3 }]);
    for (const def of [...(lesson?.guided ?? []), ...(lesson?.exercises ?? [])]) {
      expect(playSolution(def)).toMatchObject({ solved: true, errors: 0 });
    }
  });

  it('voices every note a place-value exercise can speak, and nothing the world does not use', () => {
    const spoken = (source: string): string[] =>
      compileWith()
        .voiceTexts.entries.filter((entry) => entry.source === source)
        .map((entry) => entry.text);
    const plain = spoken('exercise-note');
    for (const text of [
      'Count the blocks in each column again.',
      'Hundreds, tens and ones: count each column.',
      'The number beside the blocks shows what you built.',
      'Here are the hundreds. Now finish!',
      'Here are the thousands. Now finish!',
      'Look at the order: hundreds, then tens, then ones.',
      'Amazing!',
      'Well done!',
      'Good try!',
    ]) {
      expect(plain, text).toContain(text);
    }
    // The easier offer joins the default wrong note and the reason of the exercise that has an easier variant.
    const offered = spoken('exercise-note-easier-offer');
    expect(offered).toEqual(
      expect.arrayContaining([
        'Count the blocks in each column again. This one is tricky. Want an easier one?',
        'Look at the order: hundreds, then tens, then ones. This one is tricky. Want an easier one?',
      ]),
    );
    // No hint 3 text names a place no target starts in (the places are the targets' highest columns: hundreds, thousands, tens).
    expect(plain).not.toContain('Here are the ones. Now finish!');
  });

  it('names the place of hint 3 for each target: hundreds for 243, tens for 40', () => {
    const plain = compileWith()
      .voiceTexts.entries.filter((entry) => entry.source === 'exercise-note')
      .map((entry) => entry.text);
    expect(plain).toContain('Here are the hundreds. Now finish!');
    expect(plain).toContain('Here are the tens. Now finish!');
    expect(plain).toContain('Here are the thousands. Now finish!');
  });

  it('fails the build with the kind’s own message when an exercise breaks a rule (a start that is the target)', () => {
    let error: unknown;
    try {
      compileWith((lesson) => lesson.replace('start: [3, 0, 0, 0]', 'start: [4, 0, 7, 2]'));
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ContentError);
    expect((error as ContentError).issues.join('\n')).toMatch(
      /pvx-02.*start already builds the target 4072|start already builds the target 4072/,
    );
  });

  it('fails the build when a reason’s text does not exist', () => {
    expect(() =>
      compileWith((lesson) => lesson.replace('text: bugs.swap', 'text: bugs.missing')),
    ).toThrow(/reason for 350/);
  });
});
