// `number-line` content: the YAML shape, the build's compile, every verify rule with a failing fixture, and the kind through a whole
// lesson build (reasons, an easier variant, the voice inventory it adds).
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
import type { NumberLineDef } from '../kinds/number-line/def.ts';
import { NUMBER_LINE_SAMPLES } from '../kinds/number-line/samples.ts';
import { playSolution, playWrongThenSolve, starsFor } from '../testing/play.ts';
import { mathContent, mathExerciseSchema } from './math-content.ts';
import { numberLine } from './number-line.ts';

/** The spec's example, as the YAML parses to. */
const yaml = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'nl-1',
  type: 'number-line',
  from: 0,
  to: 1000,
  step: 100,
  labels: 'ends',
  target: 300,
  prompt: { big: '300' },
  reasons: [{ value: 3, text: 'bugs.ticks-not-gaps' }],
  ...overrides,
});

function compile(raw: Record<string, unknown>, issues: string[] = []): NumberLineDef | null {
  const parsed = mathExerciseSchema.parse(raw);
  const stimulus = cardStimulus.compile(parsed, { where: 'where', issues });
  if (stimulus === null) return null;
  const ctx = makeCompileContext(
    'lesson.yaml',
    'exercises[0]',
    issues,
    { id: parsed.id, concept: 'line', textKey: `lessons:${parsed.text ?? parsed.id}` },
    parsed.easier,
    stimulus,
  );
  return numberLine.compile(numberLine.schema.parse(raw), ctx);
}

/** Every issue one raw exercise yields: schema, then compile, then verify. */
function issuesOf(raw: Record<string, unknown>): readonly string[] {
  const parsed = mathExerciseSchema.safeParse(raw);
  if (!parsed.success) return parsed.error.issues.map((issue) => issue.message);
  const issues: string[] = [];
  const def = compile(raw, issues);
  if (def !== null) numberLine.verify?.(def, 'where', issues);
  return issues;
}

/** Every issue verify finds in a hand-built def. */
function verifyIssues(overrides: Partial<NumberLineDef>): readonly string[] {
  const issues: string[] = [];
  numberLine.verify?.({ ...NUMBER_LINE_SAMPLES.exact100, ...overrides }, 'where', issues);
  return issues;
}

describe('number-line YAML', () => {
  it('compiles the spec example: the head, the line, an exact tolerance and the reason key in the lessons namespace', () => {
    const def = compile(yaml());
    expect(def).toEqual({
      id: 'nl-1',
      concept: 'line',
      textKey: 'lessons:nl-1',
      prompt: { big: '300' },
      type: 'number-line',
      from: 0,
      to: 1000,
      step: 100,
      labels: 'ends',
      target: 300,
      tolerance: 0,
      reasons: [{ value: 3, reasonKey: 'lessons:bugs.ticks-not-gaps' }],
    });
    expect(Object.keys(def ?? {})).toEqual([
      'id',
      'concept',
      'textKey',
      'prompt',
      'type',
      'from',
      'to',
      'step',
      'labels',
      'target',
      'tolerance',
      'reasons',
    ]);
    expect(issuesOf(yaml())).toEqual([]);
  });

  it('takes a card prompt or none, and `text` for the instruction key', () => {
    expect(issuesOf(yaml({ prompt: undefined }))).toEqual([]);
    expect(compile(yaml({ prompt: undefined, text: 'put-300' }))?.textKey).toBe('lessons:put-300');
    expect(
      Object.keys(compile(yaml({ prompt: undefined, reasons: undefined })) ?? {}),
    ).not.toContain('prompt');
  });

  it('`estimate: true` makes the tolerance half a step; absent or false leaves it exact', () => {
    expect(compile(yaml({ target: 340, estimate: true }))?.tolerance).toBe(50);
    expect(compile(yaml({ estimate: false }))?.tolerance).toBe(0);
    expect(compile(yaml())?.tolerance).toBe(0);
    expect(
      compile(yaml({ from: 0, to: 50, step: 5, target: 17, estimate: true, reasons: undefined }))
        ?.tolerance,
    ).toBe(2.5);
  });

  it('takes labels as ends, all, or a list (copied)', () => {
    expect(compile(yaml({ labels: 'all' }))?.labels).toBe('all');
    expect(compile(yaml({ labels: [0, 500, 1000] }))?.labels).toEqual([0, 500, 1000]);
    expect(issuesOf(yaml({ labels: [0, 500, 1000] }))).toEqual([]);
  });

  it('rejects a missing or unknown labels value, a non-whole number, a zero step, an extra field and a bad flag', () => {
    expect(issuesOf(yaml({ labels: undefined })).length).toBeGreaterThan(0);
    expect(issuesOf(yaml({ labels: 'some' })).length).toBeGreaterThan(0);
    expect(issuesOf(yaml({ labels: [] })).length).toBeGreaterThan(0);
    expect(issuesOf(yaml({ labels: [0, 2.5] })).length).toBeGreaterThan(0);
    expect(issuesOf(yaml({ from: 0.5 })).length).toBeGreaterThan(0);
    expect(issuesOf(yaml({ to: 1000.5 })).length).toBeGreaterThan(0);
    expect(issuesOf(yaml({ target: 300.5 })).length).toBeGreaterThan(0);
    expect(issuesOf(yaml({ from: -100 })).length).toBeGreaterThan(0);
    expect(issuesOf(yaml({ step: 0 })).length).toBeGreaterThan(0);
    expect(issuesOf(yaml({ step: 12.5 })).length).toBeGreaterThan(0);
    expect(issuesOf(yaml({ speed: 3 })).length).toBeGreaterThan(0);
    expect(issuesOf(yaml({ estimate: 'yes' })).length).toBeGreaterThan(0);
    expect(issuesOf(yaml({ reasons: [] })).length).toBeGreaterThan(0);
    expect(issuesOf(yaml({ reasons: [{ value: 3 }] })).length).toBeGreaterThan(0);
    expect(issuesOf(yaml({ reasons: [{ value: 3, text: 'Not A Key' }] })).length).toBeGreaterThan(
      0,
    );
  });

  it('lists the reason texts as keys the build resolves', () => {
    const def = compile(
      yaml({
        reasons: [
          { value: 3, text: 'bugs.a' },
          { value: 4, text: 'bugs.b' },
        ],
      }),
    );
    expect(numberLine.textKeys?.(def as NumberLineDef)).toEqual([
      { key: 'lessons:bugs.a', label: 'reason for 3' },
      { key: 'lessons:bugs.b', label: 'reason for 4' },
    ]);
    expect(numberLine.textKeys?.(NUMBER_LINE_SAMPLES.exact100)).toEqual([]);
  });
});

describe('number-line verify', () => {
  it('passes every sample and the compiled spec example (exact and estimate)', () => {
    for (const def of Object.values(NUMBER_LINE_SAMPLES)) {
      expect(verifyIssues(def), def.id).toEqual([]);
    }
    expect(issuesOf(yaml({ target: 340, estimate: true }))).toEqual([]);
    expect(
      issuesOf(yaml({ from: 100, to: 200, step: 10, target: 150, reasons: undefined })),
    ).toEqual([]);
    expect(
      issuesOf(yaml({ from: 0, to: 1000, step: 500, target: 500, reasons: undefined })),
    ).toEqual([]);
    expect(
      issuesOf(yaml({ from: 0, to: 10, step: 1, target: 7, labels: 'all', reasons: undefined })),
    ).toEqual([]);
  });

  it('rejects numbers that are not whole', () => {
    expect(verifyIssues({ from: 0.5 })).toEqual([
      'where: from 0.5 is not a whole number from 0 up',
    ]);
    expect(verifyIssues({ to: 99.5 })).toEqual(['where: to 99.5 is not a whole number from 0 up']);
    expect(verifyIssues({ target: 300.5 })).toEqual([
      'where: target 300.5 is not a whole number from 0 up',
    ]);
    expect(verifyIssues({ step: 12.5 })).toEqual([
      'where: step 12.5 is not a whole number from 1 up',
    ]);
    expect(verifyIssues({ step: 0 })).toEqual(['where: step 0 is not a whole number from 1 up']);
    expect(verifyIssues({ from: -100 })).toEqual([
      'where: from -100 is not a whole number from 0 up',
    ]);
  });

  it('rejects a line that does not run left to right', () => {
    expect(verifyIssues({ from: 1000 })).toEqual(['where: from 1000 is not left of to 1000']);
    expect(verifyIssues({ from: 1100 })).toEqual(['where: from 1100 is not left of to 1000']);
  });

  it('rejects a line that is not a whole number of steps', () => {
    expect(verifyIssues({ step: 300 })).toEqual([
      'where: the line from 0 to 1000 is not a whole number of steps of 300',
    ]);
  });

  it('rejects fewer than 2 or more than 10 gaps', () => {
    expect(verifyIssues({ step: 1000, target: 0 })).toEqual([
      'where: the line has 1 gaps, but 2-10 fit the screen',
    ]);
    expect(verifyIssues({ step: 50, target: 300 })).toEqual([
      'where: the line has 20 gaps, but 2-10 fit the screen',
    ]);
    expect(verifyIssues({ step: 91 })).toHaveLength(1);
    expect(verifyIssues({ to: 1100, step: 100, target: 300 })).toEqual([
      'where: the line has 11 gaps, but 2-10 fit the screen',
    ]);
  });

  it('rejects a label that is not on a tick of the line', () => {
    expect(verifyIssues({ labels: [0, 450] })).toEqual([
      'where: label 450 is not a tick on the line',
    ]);
    expect(verifyIssues({ labels: [0, 1100] })).toEqual([
      'where: label 1100 is not a tick on the line',
    ]);
    expect(verifyIssues({ labels: [-100, 500] })).toEqual([
      'where: label -100 is not a tick on the line',
    ]);
    expect(verifyIssues({ labels: [0, 500, 1000] })).toEqual([]);
  });

  it('rejects a target off the line', () => {
    expect(verifyIssues({ target: 1100 })).toEqual([
      'where: target 1100 is not on the line (0-1000)',
    ]);
    expect(verifyIssues({ target: 1100, tolerance: 50 })).toEqual([
      'where: target 1100 is not on the line (0-1000)',
    ]);
    expect(verifyIssues({ from: 100, target: 0 })).toEqual([
      'where: target 0 is not on the line (100-1000)',
    ]);
  });

  it('rejects an exact target that is not on a tick', () => {
    expect(verifyIssues({ target: 340 })).toEqual([
      'where: target 340 is not on a tick (an exact item needs one; use estimate: true for a target between ticks)',
    ]);
    expect(issuesOf(yaml({ target: 340, reasons: undefined }))).toEqual([
      'where: target 340 is not on a tick (an exact item needs one; use estimate: true for a target between ticks)',
    ]);
  });

  it('rejects an estimate whose target is on a tick, and a tolerance that is not half a step', () => {
    expect(verifyIssues({ target: 300, tolerance: 50 })).toEqual([
      'where: target 300 is on a tick (an estimate needs a target between ticks)',
    ]);
    expect(issuesOf(yaml({ estimate: true, reasons: undefined }))).toEqual([
      'where: target 300 is on a tick (an estimate needs a target between ticks)',
    ]);
    expect(verifyIssues({ target: 340, tolerance: 40 })).toEqual([
      'where: tolerance 40 is neither 0 (exact) nor half a step (50, an estimate)',
    ]);
    expect(verifyIssues({ target: 300, tolerance: -50 })).toEqual([
      'where: tolerance -50 is neither 0 (exact) nor half a step (50, an estimate)',
    ]);
  });

  it('rejects a reason that is the target, given twice, off the line, or accepted by Check', () => {
    const reasons = (...values: number[]): NumberLineDef['reasons'] =>
      values.map((value) => ({ value, reasonKey: `lessons:bugs.v${String(value)}` }));
    expect(verifyIssues({ reasons: reasons(3, 500) })).toEqual([]);
    expect(verifyIssues({ reasons: reasons(300) })).toEqual([
      'where: reason for 300 is the target: a reason is for a wrong value',
    ]);
    expect(verifyIssues({ reasons: reasons(3, 3) })).toEqual([
      'where: reason for 3 is given twice',
    ]);
    expect(verifyIssues({ reasons: reasons(2000) })).toEqual([
      'where: reason for 2000 is not on the line (0-1000)',
    ]);
    expect(verifyIssues({ reasons: reasons(-1) })).toEqual([
      'where: reason for -1 is not on the line (0-1000)',
    ]);
    expect(verifyIssues({ reasons: [{ value: 3.5, reasonKey: 'lessons:bugs.x' }] })).toEqual([
      'where: reason for 3.5 is not on the line (0-1000)',
    ]);
    // An estimate accepts a whole band: a reason inside it can never be spoken.
    const estimate = { target: 340, tolerance: 50 };
    expect(verifyIssues({ ...estimate, reasons: reasons(290) })).toEqual([
      'where: reason for 290 is within 50 of the target 340, so Check accepts it: a reason is for a wrong value',
    ]);
    expect(verifyIssues({ ...estimate, reasons: reasons(390) })).toHaveLength(1);
    expect(verifyIssues({ ...estimate, reasons: reasons(340) })).toEqual([
      'where: reason for 340 is the target: a reason is for a wrong value',
    ]);
    expect(verifyIssues({ ...estimate, reasons: reasons(289, 391) })).toEqual([]);
  });

  it('every fixture the checks pass plays: the solution solves with 3 stars, a wrong try costs exactly 1 error', () => {
    const defs = [
      compile(yaml()),
      compile(yaml({ target: 340, estimate: true, reasons: undefined })),
      compile(
        yaml({ from: 100, to: 600, step: 50, target: 600, labels: 'all', reasons: undefined }),
      ),
    ].filter((def): def is NumberLineDef => def !== null);
    expect(defs).toHaveLength(3);
    for (const def of defs) {
      expect(starsFor(playSolution(def))).toBe(3);
      expect(playWrongThenSolve(def)).toMatchObject({ errors: 1, solved: true });
    }
  });
});

describe('a lesson with number-line exercises, through the whole build', () => {
  const realRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content');
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  /** A copy of math's content with one more lesson (`lessonYaml`) and its texts appended to `lessons.yaml`. */
  function rootWith(lessonYaml: string, texts: string): string {
    const root = mkdtempSync(join(tmpdir(), 'math-line-'));
    roots.push(root);
    cpSync(realRoot, root, { recursive: true });
    writeFileSync(join(root, 'lessons', 'adding', 'line-up.yaml'), lessonYaml);
    const lessonTexts = join(root, 'locales', 'en', 'lessons.yaml');
    writeFileSync(lessonTexts, `${readFileSync(lessonTexts, 'utf8')}${texts}`);
    return root;
  }

  const TEXTS = `line-up:
  title: The number line
  story: Marks on a line are numbers in order. Find where each one goes.
  demo: The marker sits on 300, the third mark after 0.
nl-g1: Put the marker on 300.
nl-01: Put the marker on 40.
nl-02: Put the marker where 340 goes.
nl-easy: Put the marker on 400.
`;

  const LESSON = `id: line-up
order: 4
concept: line-up
character: owl
demo:
  prompt: { big: 300 }
guided:
  - id: nl-g1
    type: number-line
    from: 0
    to: 1000
    step: 100
    labels: ends
    target: 300
    prompt: { big: 300 }
exercises:
  - id: nl-01
    type: number-line
    from: 0
    to: 100
    step: 10
    labels: ends
    target: 40
    prompt: { big: 40 }
    reasons: [{ value: 50, text: bugs.ticks-not-gaps }]
    easier: nl-easy
  - id: nl-02
    type: number-line
    from: 0
    to: 1000
    step: 100
    labels: [0, 500, 1000]
    target: 340
    estimate: true
    prompt: { big: 340 }
variants:
  - id: nl-easy
    type: number-line
    from: 0
    to: 1000
    step: 100
    labels: all
    target: 400
    prompt: { big: 400 }
`;

  it('builds, plays every exercise, and adds the number-line notes to the voice inventory (once, however many exercises)', () => {
    const compiled = compileAll<MathContent>(mathContent, rootWith(LESSON, TEXTS));
    const lesson = compiled.content.lessons.find((entry) => entry.id === 'line-up');
    const defs = [
      ...(lesson?.guided ?? []),
      ...(lesson?.exercises ?? []),
      ...(lesson?.variants ?? []),
    ];
    expect(defs.map((def) => [def.id, def.type])).toEqual([
      ['nl-g1', 'number-line'],
      ['nl-01', 'number-line'],
      ['nl-02', 'number-line'],
      ['nl-easy', 'number-line'],
    ]);
    for (const def of defs as readonly MathExerciseDef[]) {
      expect(playSolution(def), def.id).toMatchObject({ solved: true, errors: 0 });
      expect(playWrongThenSolve(def), def.id).toMatchObject({ solved: true, errors: 1 });
    }

    const texts = (source: string): string[] =>
      compiled.voiceTexts.entries
        .filter((entry) => entry.source === source)
        .map((entry) => entry.text);
    const plain = texts('exercise-note');
    for (const text of [
      'Not there yet. Look at the numbers on the line.',
      // The middle tick of each line the content has: 0-1000 and 0-100.
      'Find the middle: 500.',
      'Find the middle: 50.',
      'Read the numbers on every mark.',
      'Here is the answer.',
      'Count the jumps between the marks, not the marks.',
    ]) {
      expect(plain, text).toContain(text);
    }
    expect(plain.filter((text) => text.startsWith('Find the middle'))).toHaveLength(2);
    expect(plain.filter((text) => text === 'Read the numbers on every mark.')).toHaveLength(1);
    // The reason is joined with the easier offer only for the exercise that has an easier variant (nl-01); the default wrong note
    // always is.
    expect(texts('exercise-note-easier-offer')).toEqual(
      expect.arrayContaining([
        'Not there yet. Look at the numbers on the line. This one is tricky. Want an easier one?',
        'Count the jumps between the marks, not the marks. This one is tricky. Want an easier one?',
      ]),
    );
    expect(
      compiled.voiceTexts.entries.filter((entry) => entry.text.startsWith('Find the middle')),
    ).toHaveLength(2);
  });

  it('adds nothing to the voice inventory of a build without a number-line exercise (the shipped content today)', () => {
    const shipped = compileAll<MathContent>(mathContent, realRoot);
    const spoken = shipped.voiceTexts.entries.map((entry) => entry.text);
    for (const text of [
      'Not there yet. Look at the numbers on the line.',
      'Read the numbers on every mark.',
    ]) {
      expect(spoken, text).not.toContain(text);
    }
    expect(spoken.some((text) => text.startsWith('Find the middle'))).toBe(false);
  });

  it('fails the build on a verify issue, on a reason text that does not exist and on a bad shape', () => {
    const expectIssue = (lesson: string, texts: string, message: RegExp): void => {
      expect(() => compileAll<MathContent>(mathContent, rootWith(lesson, texts))).toThrow(message);
    };
    expectIssue(
      LESSON.replace('target: 340\n    estimate: true', 'target: 340'),
      TEXTS,
      /nl-02.*target 340 is not on a tick/s,
    );
    expectIssue(
      LESSON.replace('reasons: [{ value: 50,', 'reasons: [{ value: 40,'),
      TEXTS,
      /reason for 40 is the target/,
    );
    expectIssue(
      LESSON.replace('text: bugs.ticks-not-gaps', 'text: bugs.missing'),
      TEXTS,
      /reason for 50/,
    );
    expectIssue(
      LESSON.replace('step: 10\n', 'step: 7\n'),
      TEXTS,
      /not a whole number of steps of 7/,
    );
    expectIssue(
      LESSON.replace('labels: ends\n    target: 40', 'labels: sometimes\n    target: 40'),
      TEXTS,
      /expected one of "ends"\|"all"/,
    );
  });

  it('is a plain `ExerciseDefBase` to the platform: id, concept, text key', () => {
    const compiled = compileAll<MathContent>(mathContent, rootWith(LESSON, TEXTS));
    const lesson = compiled.content.lessons.find((entry) => entry.id === 'line-up');
    const first: ExerciseDefBase | undefined = lesson?.guided[0];
    expect(first).toMatchObject({ id: 'nl-g1', concept: 'line-up', textKey: 'lessons:nl-g1' });
  });
});
