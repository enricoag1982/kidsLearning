// Minimal i18next-alike resolver over the locale tree of ONE language: dot path, `_one` / `_other`-style pluralisation on a
// `count` var, `{{var}}` interpolation. Covers exactly what the content's locale texts use; shared by the voice inventory (English
// only) and the generated texts (every language).
import type { LocaleTree } from './schema.ts';

export type ResolveVars = Readonly<Record<string, string | number>>;

/** The node at `dotPath` (a text or a subtree), `undefined` when any segment is missing. */
export function resolveTree(tree: LocaleTree, dotPath: string): string | LocaleTree | undefined {
  let node: LocaleTree | string = tree;
  for (const segment of dotPath.split('.')) {
    if (typeof node === 'string') return undefined;
    const child: LocaleTree | string | undefined = node[segment];
    if (child === undefined) return undefined;
    node = child;
  }
  return node;
}

/** `n` as the language writes it: grouped from 10 000 up (`1234`, `10,000` in English), so a child never reads a four-digit
 * year-like number split in two. */
export function formatNumber(n: number, lang: string): string {
  return new Intl.NumberFormat(lang, { useGrouping: Math.abs(n) >= 10_000 }).format(n);
}

export interface ResolveOptions {
  /** The tree's language: picks the plural category of `count` and the number format. Default `en`. */
  readonly lang?: string;
  /** Interpolate numbers with {@link formatNumber} instead of `String(n)`. */
  readonly formatNumbers?: boolean;
}

/** `{{name}}` → the var's text (a number via `String`, or `formatNumber` for the options' language); an unknown var stays as is. */
export function interpolate(
  template: string,
  vars: ResolveVars,
  options: ResolveOptions = {},
): string {
  const { lang = 'en', formatNumbers = false } = options;
  return template.replace(/\{\{(\w+)\}\}/g, (whole, name: string) => {
    const value = vars[name];
    if (value === undefined) return whole;
    return typeof value === 'number' && formatNumbers ? formatNumber(value, lang) : String(value);
  });
}

/** The plural suffix of `count` (`_one`, `_other`, …) in `lang`; none when there is no numeric `count`. */
function pluralSuffix(vars: ResolveVars, lang: string): string | undefined {
  const count = vars.count;
  if (typeof count !== 'number') return undefined;
  return `_${new Intl.PluralRules(lang).select(count)}`;
}

/** The text at `dotPath` (the plural form of a numeric `count` first, else the plain key) interpolated with `vars`;
 * `undefined` when it does not resolve to a text. */
export function resolveText(
  tree: LocaleTree,
  dotPath: string,
  vars: ResolveVars = {},
  options: ResolveOptions = {},
): string | undefined {
  const suffix = pluralSuffix(vars, options.lang ?? 'en');
  const node =
    (suffix !== undefined ? resolveTree(tree, dotPath + suffix) : undefined) ??
    resolveTree(tree, dotPath);
  return typeof node === 'string' ? interpolate(node, vars, options) : undefined;
}
