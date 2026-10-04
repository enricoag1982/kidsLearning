import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import {
  createExerciseEntrySchema,
  createExerciseSchema,
  createLessonSchemas,
  generateEntrySchema,
} from './lesson-schema.ts';
import { isGenerateEntry } from './generate/template.ts';
import {
  fixtureKinds,
  fixtureSubject,
  validExercise,
  validLesson,
  validMiniGame,
} from './testing/fixture-subject.ts';

describe('createLessonSchemas', () => {
  const { exerciseSchema, lessonSchema, miniGameSchema } = createLessonSchemas(fixtureSubject);

  it('parses a lesson made of the subject kinds and demo', () => {
    expect(lessonSchema.safeParse(validLesson()).success).toBe(true);
  });

  it("takes the demo's shape from the subject", () => {
    const result = lessonSchema.safeParse(validLesson({ demo: { text: 'demo-demo' } }));

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['demo', 'label']);
  });

  it('is strict about lesson keys', () => {
    expect(lessonSchema.safeParse(validLesson({ notAField: 1 })).success).toBe(false);
  });

  it('needs at least one scored exercise', () => {
    expect(lessonSchema.safeParse(validLesson({ exercises: [] })).success).toBe(false);
  });

  it('discriminates exercises by their `type`', () => {
    expect(exerciseSchema.safeParse({ id: 'r-01', type: 'read' }).success).toBe(true);
    expect(exerciseSchema.safeParse(validExercise({ correct: undefined })).success).toBe(false);
    expect(exerciseSchema.safeParse(validExercise({ type: 'no-such-kind' })).success).toBe(false);
  });

  it('accepts a mini-game of any mode, `static` when `mode` is absent', () => {
    const rounds = { id: 'mg2', concept: 'c1', unlockAfter: 'demo-lesson', mode: 'rounds' };

    expect(miniGameSchema.safeParse(validMiniGame()).success).toBe(true);
    expect(miniGameSchema.safeParse({ ...rounds, rounds: [validExercise()] }).success).toBe(true);
    expect(miniGameSchema.safeParse({ ...rounds, mode: 'no-such-mode' }).success).toBe(false);
  });
});

describe('createExerciseSchema', () => {
  it("runs the stimulus' cross-field check before the kind's own", () => {
    const kinds = {
      answer: {
        ...fixtureKinds.answer,
        refine(_raw: unknown, ctx: z.RefinementCtx) {
          ctx.addIssue({ code: 'custom', message: 'kind' });
        },
      },
    };
    const schema = createExerciseSchema(kinds, {
      refine(_raw, ctx) {
        ctx.addIssue({ code: 'custom', message: 'stimulus' });
      },
    });

    const result = schema.safeParse(validExercise());

    expect(result.error?.issues.map((issue) => issue.message)).toEqual(['stimulus', 'kind']);
  });

  it('needs at least one kind', () => {
    expect(() => createExerciseSchema({})).toThrow('at least one exercise kind');
  });
});

describe('generateEntrySchema', () => {
  const schema = generateEntrySchema(['add', 'times']);
  const entry = (generate: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: 'sums',
    generate: { template: 'add', count: 3, seed: 7, ...generate },
  });
  const messages = (raw: unknown): string[] =>
    schema
      .safeParse(raw)
      .error?.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) ?? [];

  it('accepts an entry with a known template, count 1-20, a seed and optional params and easier', () => {
    expect(schema.safeParse(entry()).success).toBe(true);
    expect(schema.safeParse(entry({ count: 1 })).success).toBe(true);
    expect(schema.safeParse(entry({ count: 20, seed: 0 })).success).toBe(true);
    expect(schema.safeParse(entry({ params: { max: 10 } })).success).toBe(true);
    expect(schema.safeParse({ ...entry(), easier: 'sums-easy' }).success).toBe(true);
  });

  it('rejects an unknown template', () => {
    expect(messages(entry({ template: 'divide' }))).toEqual([
      'generate.template: unknown template "divide"',
    ]);
  });

  it('rejects a count outside 1-20, a negative or fractional seed, a bad id', () => {
    expect(messages(entry({ count: 0 }))).toHaveLength(1);
    expect(messages(entry({ count: 21 }))).toHaveLength(1);
    expect(messages(entry({ count: 2.5 }))).toHaveLength(1);
    expect(messages(entry({ seed: -1 }))).toHaveLength(1);
    expect(messages(entry({ seed: 1.5 }))).toHaveLength(1);
    expect(messages({ ...entry(), id: 'Not An Id' })).toEqual([expect.stringContaining('id:')]);
  });

  it('needs a template, a count and a seed', () => {
    expect(messages({ id: 'sums', generate: {} })).toHaveLength(3);
    expect(messages({ id: 'sums' })).toHaveLength(1);
  });

  it('rejects an extra key on the entry or on `generate`', () => {
    expect(schema.safeParse({ ...entry(), type: 'number-entry' }).success).toBe(false);
    expect(schema.safeParse(entry({ extra: 1 })).success).toBe(false);
  });
});

describe('createExerciseEntrySchema', () => {
  const { exerciseSchema } = createLessonSchemas(fixtureSubject);
  const schema = createExerciseEntrySchema(exerciseSchema, ['add']);
  const generate = { id: 'sums', generate: { template: 'add', count: 2, seed: 1 } };
  const issueLines = (raw: unknown): string[] =>
    schema
      .safeParse(raw)
      .error?.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) ?? [];

  it('parses an authored item with the exercise schema and a generate entry with the generate schema', () => {
    const authored = schema.safeParse(validExercise());
    expect(authored.success && authored.data).toEqual(validExercise());
    const generated = schema.safeParse(generate);
    expect(generated.success && generated.data).toEqual(generate);
    expect(isGenerateEntry(generate)).toBe(true);
    expect(isGenerateEntry({ id: 'a', type: 'read' })).toBe(false);
  });

  it("reports a bad authored item at the exercise kind's own path, with no generate-schema noise", () => {
    const bad = validExercise({ correct: 'one' });
    const direct = exerciseSchema.safeParse(bad).error?.issues;
    expect(direct).toBeDefined();
    expect(schema.safeParse(bad).error?.issues).toEqual(direct);
    expect(issueLines(bad)).toEqual(['correct: Invalid input: expected number, received string']);
    expect(issueLines(validExercise({ type: 'no-such-kind' }))).toEqual([
      expect.stringContaining('type'),
    ]);
  });

  it("reports a bad generate entry at the generate schema's own path", () => {
    expect(
      issueLines({ ...generate, generate: { ...generate.generate, template: 'nope' } }),
    ).toEqual(['generate.template: unknown template "nope"']);
    expect(issueLines({ ...generate, type: 'answer' })).toHaveLength(1);
  });

  it('nests: an issue inside a lesson array keeps the array index in its path', () => {
    const result = schema.array().safeParse([validExercise(), validExercise({ correct: 'one' })]);
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toEqual(['1.correct']);
  });
});
