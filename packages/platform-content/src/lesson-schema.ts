// A subject's lesson / mini-game YAML schemas, built from its own registries (kinds, modes, demo,
// stimulus): the platform owns the file shapes, the subject only supplies the parts that vary.
import { z } from 'zod';
import type { GenerateEntryYaml } from './generate/template.ts';
import { keySchema, textRefSchema } from './schema.ts';
import type { ExerciseYamlBase, StimulusContent, SubjectContent } from './subject.ts';

function nonEmpty<T>(items: readonly T[]): [T, ...T[]] {
  const [first, ...rest] = items;
  if (first === undefined) {
    throw new Error('a subject needs at least one exercise kind');
  }
  return [first, ...rest];
}

/** One exercise (`guided` / `exercises` entry or a `series` round) discriminated by `type`: kind schemas, then stimulus and
 * kind cross-field checks. */
export function createExerciseSchema(
  kinds: SubjectContent['kinds'],
  stimulus?: Pick<StimulusContent, 'refine'>,
) {
  return z
    .discriminatedUnion('type', nonEmpty(Object.values(kinds).map((kind) => kind.schema)))
    .superRefine((raw, ctx) => {
      stimulus?.refine?.(raw, ctx);
      kinds[raw.type]?.refine?.(raw, ctx);
    });
}

/** `{ id: <stem>, easier?, generate: { template, count, seed, params? } }`: `template` must be one of `templateIds`, `count` 1–20,
 * `seed` a non-negative integer (stored with the content, `docs/subjects/math/plan.md` G1–G4). */
export function generateEntrySchema(templateIds: readonly string[]) {
  return z
    .object({
      id: keySchema,
      easier: keySchema.optional(),
      generate: z
        .object({
          template: z.string().superRefine((value, ctx) => {
            if (!templateIds.includes(value)) {
              ctx.addIssue({ code: 'custom', message: `unknown template "${value}"` });
            }
          }),
          count: z.number().int().min(1).max(20),
          seed: z.number().int().min(0),
          params: z.unknown().optional(),
        })
        .strict(),
    })
    .strict();
}

/** A lesson `guided` / `exercises` / `variants` entry or a series round: an object with `generate` is parsed ONLY by
 * {@link generateEntrySchema}, anything else ONLY by `exerciseSchema` (a bad authored item keeps its kind's own issue paths,
 * no union noise). */
export function createExerciseEntrySchema<S extends z.ZodType<ExerciseYamlBase>>(
  exerciseSchema: S,
  templateIds: readonly string[],
): z.ZodType<z.output<S> | GenerateEntryYaml> {
  const generateSchema = generateEntrySchema(templateIds);
  return z.unknown().transform((raw, ctx): z.output<S> | GenerateEntryYaml => {
    const result = (hasGenerate(raw) ? generateSchema : exerciseSchema).safeParse(raw);
    if (result.success) {
      return result.data;
    }
    // Re-raised unchanged (path, message, union branches): the branch schema's issues are the entry's issues.
    ctx.issues.push(
      ...result.error.issues.map((issue) => ({ ...issue, input: raw }) as z.core.$ZodRawIssue),
    );
    return z.NEVER;
  });
}

function hasGenerate(raw: unknown): boolean {
  return typeof raw === 'object' && raw !== null && 'generate' in raw;
}

/** The lesson (`lessons/<world>/<lesson-id>.yaml`) and mini-game (`minigames/<id>.yaml`, one union
 * member per mode) file schemas of `subject`. */
export function createLessonSchemas(subject: SubjectContent) {
  const exerciseSchema = createExerciseSchema(subject.kinds, subject.stimulus);
  const entrySchema = createExerciseEntrySchema(
    exerciseSchema,
    Object.keys(subject.templates ?? {}),
  );
  const lessonSchema = z
    .object({
      id: keySchema,
      /** Defaults to the lesson's own folder name when absent. */
      world: keySchema.optional(),
      order: z.number().int().positive(),
      concept: keySchema,
      character: keySchema,
      /** Defaults to `<id>.title` when absent. */
      title: textRefSchema.optional(),
      /** Defaults to `<id>.story` when absent. */
      story: textRefSchema.optional(),
      demo: subject.demo.schema,
      guided: z.array(entrySchema),
      exercises: z.array(entrySchema).min(1),
      variants: z.array(entrySchema).optional(),
      boss: keySchema.optional(),
    })
    .strict();
  const miniGameSchema = z.union(Object.values(subject.modes).map((mode) => mode.schema));
  return { exerciseSchema, lessonSchema, miniGameSchema };
}
