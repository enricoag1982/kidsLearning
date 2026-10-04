// Generated exercises (`docs/adding-a-subject.md` "Generated exercises"): a subject registers `ExerciseTemplate`s; a lesson /
// series entry `{ id: <stem>, generate: { template, count, seed, params } }` stands for `count` items the build expands into
// ordinary exercise YAML (`expand.ts`) before the normal compile and every verify rule.
import type { Random } from '@learn/platform-core/domain/random';
import type { z } from 'zod';
import type { ExerciseYamlBase, Where } from '../subject.ts';

/** Values a generated text interpolates into `{{name}}`; numbers are formatted per language (`formatNumber`). */
export type TextVars = Readonly<Record<string, string | number>>;

export interface GenerateSpec {
  readonly template: string;
  readonly count: number;
  readonly seed: number;
  /** Parsed by the template's `params` schema. */
  readonly params?: unknown;
}

/** A lesson / series entry that stands for `count` generated items `<id>-1 … <id>-<count>`. */
export interface GenerateEntryYaml {
  readonly id: string;
  readonly easier?: string;
  readonly generate: GenerateSpec;
}

/** One entry of a lesson's `guided` / `exercises` / `variants` or a series' `rounds`, as authored. */
export type ExerciseEntryYaml = ExerciseYamlBase | GenerateEntryYaml;

export function isGenerateEntry(entry: ExerciseEntryYaml): entry is GenerateEntryYaml {
  return 'generate' in entry;
}

export interface GenerateContext {
  /** This item's id (`<stem>-<n>`, n from 1). */
  readonly id: string;
  /** 0-based index within the entry. */
  readonly index: number;
  /** One `seededRandom(spec.seed)` stream per entry, shared by its draws in order. */
  readonly random: Random;
  /** Registers `lessons:gen.<id>.<name>` = the `lessons:` text `templateKey` interpolated with `vars` in every language of
   * the content (numbers via `formatNumber(n, lang)`); returns the ref `gen.<id>.<name>` to put in a YAML text field. */
  text(name: string, templateKey: string, vars?: TextVars): string;
}

/** One kind of generated item over its `params`: draws a candidate and re-checks it independently. `R` is the YAML item shape. */
export interface ExerciseTemplate<P, R extends ExerciseYamlBase = ExerciseYamlBase> {
  readonly params: z.ZodType<P>;
  /** One candidate item, written exactly as an author would write the YAML (`id: ctx.id`, `text: ctx.text('text', …)`). */
  generate(params: P, ctx: GenerateContext): R;
  /** Independent solver: re-derives the answer from what the kid sees (prompt / texts / options), pushes an issue on
   * `at` when the answer is not unique or wrong, or options repeat. */
  check(item: R, params: P, at: Where): void;
}

/** Widened to the base shapes (`SubjectContent.templates` entries); concrete templates widen to it (method syntax: bivariance). */
export type AnyExerciseTemplate = ExerciseTemplate<unknown>;
