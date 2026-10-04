// Build-time expansion of `generate:` entries into ordinary exercise YAML items (docs/subjects/math/plan.md G1-G4): seeded,
// deduplicated, checked by the template's independent solver. Runs before the normal compile and every verify rule.
import { seededRandom } from '@learn/platform-core/domain/random';
import type { z } from 'zod';
import type { Locales } from '../load.ts';
import { KEY_PATTERN } from '../schema.ts';
import type { ExerciseYamlBase } from '../subject.ts';
import { resolveText } from '../text-resolve.ts';
import { errorMessage, formatZodIssue } from '../yaml-file.ts';
import {
  isGenerateEntry,
  type AnyExerciseTemplate,
  type ExerciseEntryYaml,
  type GenerateContext,
  type GenerateEntryYaml,
  type TextVars,
} from './template.ts';
import {
  GENERATED_TEXT_ROOT,
  addGeneratedText,
  addMissingTemplateKey,
  commitGeneratedTexts,
  createGeneratedTexts,
  type GeneratedTexts,
} from './texts.ts';

/** What the expander reads and writes: the subject's templates and exercise schema, the authored locales (template texts), the
 * texts sink and the shared issues list. */
export interface ExpandEnv {
  readonly templates: Readonly<Record<string, AnyExerciseTemplate>>;
  readonly exerciseSchema: z.ZodType<ExerciseYamlBase>;
  /** The sink: every accepted item's texts, for `mergeGeneratedTexts`. */
  readonly texts: GeneratedTexts;
  /** Authored locales: template texts are read from `lessons` of every language. */
  readonly locales: Locales;
  readonly issues: string[];
}

/** Draws per item before giving up on finding one distinct from the entry's earlier items. */
const MAX_DRAWS_PER_ITEM = 100;

const PLACEHOLDER = /\{\{\w+\}\}/;

/** Authored items pass through unchanged; a generate entry becomes `count` parsed items. `where` = `<relPath>: <fieldPath>`. */
export function expandEntries(
  entries: readonly ExerciseEntryYaml[],
  where: string,
  env: ExpandEnv,
): readonly ExerciseYamlBase[] {
  const items: ExerciseYamlBase[] = [];
  for (const [index, entry] of entries.entries()) {
    if (isGenerateEntry(entry)) {
      items.push(...expandEntry(entry, `${where}[${String(index)}]`, env));
    } else {
      items.push(entry);
    }
  }
  return items;
}

/** The context of one draw: its `text` registers into `buffer` (committed when the draw is accepted, dropped otherwise). */
function makeContext(
  id: string,
  index: number,
  random: GenerateContext['random'],
  buffer: GeneratedTexts,
  locales: Locales,
): GenerateContext {
  const names = new Set<string>();
  return {
    id,
    index,
    random,
    text(name: string, templateKey: string, vars: TextVars = {}): string {
      if (!KEY_PATTERN.test(name)) {
        throw new Error(`text name "${name}" must be lowercase kebab-case`);
      }
      if (names.has(name)) {
        throw new Error(`text "${name}" is registered twice`);
      }
      names.add(name);
      const ref = `${GENERATED_TEXT_ROOT}.${id}.${name}`;
      for (const [language, namespaces] of Object.entries(locales)) {
        const tree = namespaces.lessons;
        const text =
          tree === undefined
            ? undefined
            : resolveText(tree, templateKey, vars, { lang: language, formatNumbers: true });
        if (text === undefined) {
          addMissingTemplateKey(buffer, language, templateKey);
          continue;
        }
        const unresolved = PLACEHOLDER.exec(text);
        if (unresolved !== null) {
          throw new Error(`text "${templateKey}" (${language}) has no value for ${unresolved[0]}`);
        }
        addGeneratedText(buffer, language, ref, text);
      }
      return ref;
    },
  };
}

/** The draw without its `id`, every generated-text ref replaced by its English text: two draws with the same signature show the
 * kid the same exercise. */
function signature(draw: ExerciseYamlBase, buffer: GeneratedTexts): string {
  const english = buffer.texts.get('en');
  const rest = Object.fromEntries(Object.entries(draw).filter(([key]) => key !== 'id'));
  return JSON.stringify(rest, (_key, value: unknown) =>
    typeof value === 'string' ? (english?.get(value) ?? value) : value,
  );
}

function expandEntry(
  entry: GenerateEntryYaml,
  at: string,
  env: ExpandEnv,
): readonly ExerciseYamlBase[] {
  const { template: templateId, count, seed } = entry.generate;
  const template = env.templates[templateId];
  if (template === undefined) {
    env.issues.push(`${at}: generate.template: unknown template "${templateId}"`);
    return [];
  }
  const parsedParams = template.params.safeParse(entry.generate.params);
  if (!parsedParams.success) {
    for (const issue of parsedParams.error.issues) {
      env.issues.push(
        ...formatZodIssue(at, { ...issue, path: ['generate', 'params', ...issue.path] }),
      );
    }
    return [];
  }
  const params = parsedParams.data;
  const random = seededRandom(seed);
  const seen = new Set<string>();
  const items: ExerciseYamlBase[] = [];

  for (let index = 0; index < count; index++) {
    const id = `${entry.id}-${String(index + 1)}`;
    const itemAt = `${at} (generated ${id})`;
    let accepted: { readonly draw: ExerciseYamlBase; readonly buffer: GeneratedTexts } | undefined;

    for (let attempt = 0; attempt < MAX_DRAWS_PER_ITEM && accepted === undefined; attempt++) {
      const buffer = createGeneratedTexts();
      let draw: ExerciseYamlBase;
      try {
        draw = template.generate(params, makeContext(id, index, random, buffer, env.locales));
      } catch (error) {
        env.issues.push(`${itemAt}: ${errorMessage(error)}`);
        return items;
      }
      const drawSignature = signature(draw, buffer);
      if (!seen.has(drawSignature)) {
        seen.add(drawSignature);
        accepted = { draw, buffer };
      }
    }
    if (accepted === undefined) {
      env.issues.push(`${at}: could not generate ${String(count)} distinct items`);
      return items;
    }

    commitGeneratedTexts(accepted.buffer, env.texts);
    const item: ExerciseYamlBase =
      entry.easier === undefined ? accepted.draw : { ...accepted.draw, easier: entry.easier };
    if (item.id !== id) {
      env.issues.push(`${itemAt}: the template must use the given id "${id}", not "${item.id}"`);
      continue;
    }
    const parsed = env.exerciseSchema.safeParse(item);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        env.issues.push(...formatZodIssue(itemAt, issue));
      }
      continue;
    }
    items.push(parsed.data);
    template.check(item, params, { where: itemAt, issues: env.issues });
  }
  return items;
}
