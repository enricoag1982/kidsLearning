// Test kit of the W1 template tests (never imported by shipped code): runs a template through the same path the build takes
// (the expander with the math exercise schema and the template's `check`, then the kind's compile and verify, then the text-key
// checks over the authored locales plus the generated texts) and hands back the drawn items with their English sentences.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expandEntries } from '@learn/platform-content/generate/expand';
import { createGeneratedTexts, mergeGeneratedTexts } from '@learn/platform-content/generate/texts';
import { compileExercise, type CompileEnv } from '@learn/platform-content/kinds/compile-exercise';
import { checkTextKey, loadLocales } from '@learn/platform-content/load';
import type { ExerciseYamlBase } from '@learn/platform-content/subject';
import { mathContent, mathExerciseSchema } from '../math-content.ts';
import { MATH_TEMPLATES } from './index.ts';

const CONTENT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'content');

/** The shipped authored locales (the template texts and the bug sentences live in `lessons.yaml`). */
export const AUTHORED_LOCALES = loadLocales(join(CONTENT_ROOT, 'locales'));

/** Seeds every template is run over (curriculum §4: 1 000 seeds). */
export const SEEDS = 1000;

export interface Drawn<I extends ExerciseYamlBase> {
  /** The item as the YAML would spell it (ids, text refs and all). */
  readonly item: I;
  /** The item's instruction as the child hears it (English, numbers formatted). */
  readonly text: string;
}

export interface Draw<I extends ExerciseYamlBase> {
  readonly drawn: readonly Drawn<I>[];
  /** Every issue of the build path: expander (params, schema, `check`), compile, verify, text keys. */
  readonly issues: readonly string[];
}

/** `count` items of `template` from `seed`, through the build path. */
export function draw<I extends ExerciseYamlBase = ExerciseYamlBase>(
  template: string,
  params: unknown,
  seed: number,
  count = 1,
): Draw<I> {
  const issues: string[] = [];
  const texts = createGeneratedTexts();
  const env: CompileEnv = {
    stimulus: mathContent.stimulus,
    kinds: mathContent.kinds,
    templates: MATH_TEMPLATES,
    exerciseSchema: mathExerciseSchema,
    texts,
    locales: AUTHORED_LOCALES,
    issues,
  };
  const at = `${template}@${String(seed)}`;
  const items = expandEntries(
    [{ id: 'dr', generate: { template, count, seed, params } }],
    `${at}: exercises`,
    env,
  );
  const locales = mergeGeneratedTexts(AUTHORED_LOCALES, texts, issues);
  const drawn = items.map((item, index): Drawn<I> => {
    const where = `${at}: ${item.id}`;
    const def = compileExercise(at, `exercises[${String(index)}]`, item, 'test', env);
    if (def !== null) {
      const kind = mathContent.kinds[def.type];
      checkTextKey(def.textKey, locales, where, issues);
      kind?.verify?.(def, where, issues);
      for (const ref of kind?.textKeys?.(def) ?? []) {
        checkTextKey(ref.key, locales, `${where}: ${ref.label}`, issues);
      }
    }
    return { item: item as I, text: texts.texts.get('en')?.get(item.text ?? '') ?? '' };
  });
  return { drawn, issues };
}

/** What the template's own `check` says about `item` (the params are parsed like the expander does). */
export function checkIssues(template: string, params: unknown, item: object): string[] {
  const found = MATH_TEMPLATES[template];
  if (found === undefined) throw new Error(`no template "${template}"`);
  const issues: string[] = [];
  // A hand-broken item is any object: the check reads only what it needs and reports what it cannot.
  found.check(item as ExerciseYamlBase, found.params.parse(params), { where: 'broken', issues });
  return issues;
}

/** The first good item of `template` (from seed 1 up) that `accept`s, for a test that breaks it by hand. */
export function sample<I extends ExerciseYamlBase>(
  template: string,
  params: unknown,
  accept: (item: I) => boolean = () => true,
): I {
  for (let seed = 1; seed <= SEEDS; seed += 1) {
    const { drawn, issues } = draw<I>(template, params, seed);
    const first = drawn[0];
    if (first === undefined || issues.length > 0) {
      throw new Error(`no good sample of ${template}: ${issues.join('; ')}`);
    }
    if (accept(first.item)) return first.item;
  }
  throw new Error(`no sample of ${template} that fits the test`);
}

/** The instruction rules of every generated card (curriculum §4): at most 14 words, every `{{var}}` filled, a `big` of at most 16
 * characters. */
export function wordingProblems(item: ExerciseYamlBase, text: string): string[] {
  const problems: string[] = [];
  if (text === '' || text.includes('{{'))
    problems.push(`${item.id}: text "${text}" is empty or unfilled`);
  const words = text.split(/\s+/).filter((word) => word !== '');
  if (words.length > 14) problems.push(`${item.id}: "${text}" has ${String(words.length)} words`);
  const bigs = JSON.stringify(item).matchAll(/"big":"([^"]*)"/g);
  for (const [, big] of bigs) {
    if ((big ?? '').length > 16) problems.push(`${item.id}: big "${big ?? ''}" is longer than 16`);
  }
  return problems;
}

/** Runs `solve` over seeds 0 … `SEEDS - 1` (one item each) and gathers every problem it and the build path report. */
export function overSeeds<I extends ExerciseYamlBase>(
  template: string,
  params: unknown,
  solve: (drawn: Drawn<I>, seed: number) => readonly string[],
): { readonly problems: readonly string[]; readonly items: readonly Drawn<I>[] } {
  const problems: string[] = [];
  const items: Drawn<I>[] = [];
  for (let seed = 0; seed < SEEDS; seed += 1) {
    const { drawn, issues } = draw<I>(template, params, seed);
    problems.push(...issues);
    for (const one of drawn) {
      items.push(one);
      problems.push(...wordingProblems(one.item, one.text), ...solve(one, seed));
    }
  }
  return { problems: problems.slice(0, 10), items };
}
