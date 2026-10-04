import type { TFunction } from 'i18next';

/** A text-key resolver: the key and, for a plural or a template, its values (`ChoiceLook.label`, the card labels, the e2e kit's
 * `contentText`). */
export type ContentText = (key: string, options?: Readonly<Record<string, unknown>>) => string;

/** Translates a key loaded from content (dynamic YAML/JSON, not a TS literal): the one boundary where `t()`'s literal-key typo-safety is relaxed. */
export function tContent(
  t: TFunction,
  key: string,
  options?: Readonly<Record<string, unknown>>,
): string {
  const dynamic = t as unknown as (k: string, opts?: Readonly<Record<string, unknown>>) => string;
  return dynamic(key, options);
}

export function characterName(t: TFunction, character: string): string {
  return tContent(t, `characters:${character}.name`);
}

export function avatarName(t: TFunction, avatar: string): string {
  return tContent(t, `avatar.${avatar}`);
}
