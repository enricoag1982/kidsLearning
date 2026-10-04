// The texts of generated items: every `ctx.text(...)` of a template draw lands in a `GeneratedTexts` sink (language → key →
// text, key = `gen.<id>.<name>`), and `mergeGeneratedTexts` adds them to the content's `lessons` namespace so the normal
// text-key checks, the voice inventory and `dist/locales/<lang>.json` see them like authored texts.
import type { Locales } from '../load.ts';
import { sortLocaleTree, type LocaleTree } from '../schema.ts';

/** Reserved top-level key of the `lessons` namespace: `lessons:gen.<item-id>.<name>`. */
export const GENERATED_TEXT_ROOT = 'gen';

export interface GeneratedTexts {
  /** Language → key (`gen.<id>.<name>`) → the template text interpolated for that language. */
  readonly texts: Map<string, Map<string, string>>;
  /** `lessons:` template keys a language does not have, once each (key: `<language> <templateKey>`). */
  readonly missing: Map<string, { readonly language: string; readonly templateKey: string }>;
}

export function createGeneratedTexts(): GeneratedTexts {
  return { texts: new Map(), missing: new Map() };
}

export function addGeneratedText(
  sink: GeneratedTexts,
  language: string,
  key: string,
  text: string,
): void {
  let byKey = sink.texts.get(language);
  if (byKey === undefined) {
    byKey = new Map();
    sink.texts.set(language, byKey);
  }
  byKey.set(key, text);
}

export function addMissingTemplateKey(
  sink: GeneratedTexts,
  language: string,
  templateKey: string,
): void {
  sink.missing.set(`${language} ${templateKey}`, { language, templateKey });
}

/** Moves everything of `from` (one accepted draw's buffer) into `into`. */
export function commitGeneratedTexts(from: GeneratedTexts, into: GeneratedTexts): void {
  for (const [language, byKey] of from.texts) {
    for (const [key, text] of byKey) {
      addGeneratedText(into, language, key, text);
    }
  }
  for (const [id, missing] of from.missing) {
    into.missing.set(id, missing);
  }
}

/** `locales` plus `lessons.gen.<id>.<name>` in every language; `locales` itself when nothing was generated. Issues: an authored
 * `lessons.gen`, and a template key a language lacks. */
export function mergeGeneratedTexts(
  locales: Locales,
  generated: GeneratedTexts,
  issues: string[],
): Locales {
  if (
    Object.values(locales).some((namespaces) => GENERATED_TEXT_ROOT in (namespaces.lessons ?? {}))
  ) {
    issues.push(`lessons: "${GENERATED_TEXT_ROOT}" is reserved for generated texts`);
    return locales;
  }
  for (const { language, templateKey } of generated.missing.values()) {
    issues.push(
      `${language}/lessons.yaml: missing text key "${templateKey}" (used by a generated exercise)`,
    );
  }
  if (generated.texts.size === 0) {
    return locales;
  }

  const merged: Locales = {};
  for (const [language, namespaces] of Object.entries(locales)) {
    const byKey = generated.texts.get(language);
    if (byKey === undefined || byKey.size === 0) {
      merged[language] = namespaces;
      continue;
    }
    const root: LocaleTree = {};
    for (const [key, text] of byKey) {
      setLeaf(root, key.split('.').slice(1), text);
    }
    merged[language] = {
      ...namespaces,
      lessons: sortLocaleTree({ ...namespaces.lessons, [GENERATED_TEXT_ROOT]: root }),
    };
  }
  return merged;
}

/** `tree.a.b = text` (creating `a`); the keys come from `gen.<kebab id>.<kebab name>`, never from authored text. */
function setLeaf(tree: LocaleTree, path: readonly string[], text: string): void {
  let node = tree;
  for (const segment of path.slice(0, -1)) {
    const child = node[segment];
    if (typeof child === 'object') {
      node = child;
    } else {
      const created: LocaleTree = {};
      node[segment] = created;
      node = created;
    }
  }
  const leaf = path[path.length - 1];
  if (leaf !== undefined) {
    node[leaf] = text;
  }
}
