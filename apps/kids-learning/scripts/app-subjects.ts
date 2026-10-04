// The subjects the app ships = its `@learn/subject-*` dependencies (`pnpm new-subject` adds one). The size check, the voice
// check and `tools/voice/generate.py` all read this one list, so a new subject needs no script edit.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SUBJECT_PACKAGE = '@learn/subject-';

/** Subject ids from `apps/kids-learning/package.json` `dependencies`, in file order. */
export function appSubjectIds(): readonly string[] {
  const pkg = JSON.parse(
    readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'),
  ) as { readonly dependencies?: Readonly<Record<string, string>> };
  return Object.keys(pkg.dependencies ?? {})
    .filter((name) => name.startsWith(SUBJECT_PACKAGE))
    .map((name) => name.slice(SUBJECT_PACKAGE.length));
}

/** `music-notes` → `musicNotes` (the scaffold's identifier rule). */
export function camelCase(id: string): string {
  return id.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}
