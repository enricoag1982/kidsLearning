// The pure parts of `pnpm new-subject`: id / name checks, token replacement over the starter subject's files and the three
// idempotent insertions that register a subject in the app. No file system access here (`new-subject.ts` does that).
import { SUBJECT_ID_PATTERN } from '@learn/platform-core/domain/subjects';

/** Where each insertion lands: the app's own marker comments (`apps/kids-learning/src/main.tsx`, `src/index.css`). */
export const MARKERS = {
  import: '// new-subject:import',
  entry: '// new-subject:entry',
  source: '/* new-subject:source */',
} as const;

/** The files of the starter subject whose contents get tokens replaced; any other file is copied byte for byte. */
const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.json', '.yaml', '.yml', '.svg', '.css', '.html']);

/** A display name goes into YAML plain scalars and TypeScript string literals, so it is kept to letters, digits, spaces and
 * hyphens, starting with a letter. */
const NAME_PATTERN = /^\p{L}(?:[\p{L}\p{N} -]{0,22}[\p{L}\p{N}])?$/u;

/** A name YAML would read as something other than text. */
const YAML_WORDS = new Set(['true', 'false', 'null', 'yes', 'no', 'on', 'off']);

export function validateId(id: string): void {
  if (!SUBJECT_ID_PATTERN.test(id)) {
    throw new Error(`subject id "${id}" must match ${SUBJECT_ID_PATTERN.source}`);
  }
}

export function validateName(name: string): void {
  if (!NAME_PATTERN.test(name) || YAML_WORDS.has(name.toLowerCase())) {
    throw new Error(
      `subject name "${name}" must be 1-24 letters, digits, spaces or hyphens, starting with a letter`,
    );
  }
}

/** `music-notes` → `musicNotes`: the id as an identifier. */
export function camelCase(id: string): string {
  return id
    .split('-')
    .filter((part) => part !== '')
    .map((part, index) => (index === 0 ? part : `${part.charAt(0).toUpperCase()}${part.slice(1)}`))
    .join('');
}

/** `music-notes` → `MUSIC_NOTES`. */
export function upperSnake(id: string): string {
  return id
    .split('-')
    .filter((part) => part !== '')
    .join('_')
    .toUpperCase();
}

export interface Tokens {
  readonly id: string;
  readonly name: string;
}

/** `template` → the id (`template-pack.ts` → `music-notes-pack.ts`, `'template'` → `'music-notes'`), or camel-cased where it
 * starts an identifier (`templateCore` → `musicNotesCore`); `Template` → the display name; `TEMPLATE` → the upper snake id.
 * One pass, so a replacement is never scanned again. */
export function replaceTokens(text: string, { id, name }: Tokens): string {
  return text.replace(
    /(TEMPLATE)|(Template)|(template)(?=[A-Z])|(template)/g,
    (_match, upper?: string, display?: string, camel?: string) => {
      if (upper !== undefined) return upperSnake(id);
      if (display !== undefined) return name;
      return camel === undefined ? id : camelCase(id);
    },
  );
}

/** A path inside the starter subject with its tokens replaced, segment by segment. */
export function transformPath(relPath: string, tokens: Tokens): string {
  return replaceTokens(relPath, tokens);
}

/** Whether `fileName` is a text file whose contents take part in token replacement. */
export function isTextFile(fileName: string): boolean {
  const dot = fileName.lastIndexOf('.');
  return dot >= 0 && TEXT_EXTENSIONS.has(fileName.slice(dot));
}

/** The name the subject's entry is registered under in `main.tsx`: `music-notes` → `musicNotesEntry`. */
export function entryName(id: string): string {
  return `${camelCase(id)}Entry`;
}

/** `text` with `line` (at the marker's own indentation) inserted above the line holding exactly `marker`. */
function insertAboveMarker(text: string, marker: string, line: string, file: string): string {
  const lines = text.split('\n');
  const at = lines.findIndex((candidate) => candidate.trim() === marker);
  if (at < 0) {
    throw new Error(`${file}: marker "${marker}" not found`);
  }
  const indent = /^\s*/.exec(lines[at] ?? '')?.[0] ?? '';
  lines.splice(at, 0, `${indent}${line}`);
  return lines.join('\n');
}

/** `apps/kids-learning/package.json` with `"@learn/subject-<id>": "workspace:*"` added after the last subject dependency. */
export function registerDependency(text: string, id: string): string {
  const file = 'apps/kids-learning/package.json';
  if (text.includes(`"@learn/subject-${id}"`)) {
    throw new Error(`${file}: @learn/subject-${id} is already a dependency`);
  }
  const lines = text.split('\n');
  const last = lines.findLastIndex((line) =>
    /^\s*"@learn\/subject-[a-z0-9-]+": "workspace:\*",?\s*$/.test(line),
  );
  const anchor = lines[last];
  if (anchor === undefined) {
    throw new Error(`${file}: no "@learn/subject-*" dependency to insert after`);
  }
  const indent = /^\s*/.exec(anchor)?.[0] ?? '';
  const added = `${indent}"@learn/subject-${id}": "workspace:*"`;
  if (anchor.trimEnd().endsWith(',')) {
    lines.splice(last + 1, 0, `${added},`);
  } else {
    lines[last] = `${anchor.trimEnd()},`;
    lines.splice(last + 1, 0, added);
  }
  return lines.join('\n');
}

/** `apps/kids-learning/src/main.tsx` with the subject's entry imported and added to the `subjects` array. */
export function registerEntry(text: string, id: string): string {
  const file = 'apps/kids-learning/src/main.tsx';
  const name = entryName(id);
  const specifier = `@learn/subject-${id}/entry`;
  if (text.includes(`'${specifier}'`) || new RegExp(`\\b${name}\\b`).test(text)) {
    throw new Error(`${file}: ${name} is already registered`);
  }
  const withImport = insertAboveMarker(
    text,
    MARKERS.import,
    `import { ${name} } from '${specifier}';`,
    file,
  );
  return insertAboveMarker(withImport, MARKERS.entry, `${name},`, file);
}

/** `apps/kids-learning/src/index.css` with a Tailwind `@source` line for the subject's `src`. */
export function registerSource(text: string, id: string): string {
  const file = 'apps/kids-learning/src/index.css';
  const path = `packages/subject-${id}/src`;
  if (text.includes(path)) {
    throw new Error(`${file}: ${path} is already a source`);
  }
  return insertAboveMarker(text, MARKERS.source, `@source '../../../${path}';`, file);
}
