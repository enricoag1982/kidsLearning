// `pnpm new-subject <id> "<Name>"`: copies the starter subject (`packages/subject-template`) to `packages/subject-<id>`, replacing
// its tokens, and registers the new subject in the Kids Learning app (`docs/adding-a-subject.md`).
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isTextFile,
  registerDependency,
  registerEntry,
  registerSource,
  replaceTokens,
  transformPath,
  validateId,
  validateName,
} from './transform.ts';
import type { Tokens } from './transform.ts';

/** What is never copied from the starter subject: installs, build output and the starter's own content snapshots (a new
 * subject writes its own on its first test run). */
const SKIPPED = new Set(['node_modules', 'dist', '__snapshots__']);

const APP_FILES = {
  packageJson: 'apps/kids-learning/package.json',
  main: 'apps/kids-learning/src/main.tsx',
  css: 'apps/kids-learning/src/index.css',
} as const;

export interface ScaffoldResult {
  /** The new package's files, relative to `root`. */
  readonly created: readonly string[];
  /** The app files that gained lines, relative to `root`. */
  readonly registered: readonly string[];
}

/** Every file under `dir` (relative paths, `/`-separated), skipping {@link SKIPPED} directories. */
function listFiles(dir: string, base = dir): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIPPED.has(entry.name)) return [];
    const full = join(dir, entry.name);
    return entry.isDirectory()
      ? listFiles(full, base)
      : [relative(base, full).replaceAll('\\', '/')];
  });
}

/** Scaffolds subject `id` under `root` (the repository root): nothing is written unless every check and every insertion
 * succeeds, so a failed run leaves the repository as it was. */
export function scaffold({ root, id, name }: { root: string } & Tokens): ScaffoldResult {
  validateId(id);
  validateName(name);
  const tokens: Tokens = { id, name };

  const source = join(root, 'packages', 'subject-template');
  const target = join(root, 'packages', `subject-${id}`);
  if (!existsSync(source)) {
    throw new Error('packages/subject-template not found: run this from the repository root');
  }
  if (existsSync(target)) {
    throw new Error(`packages/subject-${id} already exists`);
  }

  const read = (file: string): string => readFileSync(join(root, file), 'utf8');
  const appFiles = [
    [APP_FILES.packageJson, registerDependency(read(APP_FILES.packageJson), id)],
    [APP_FILES.main, registerEntry(read(APP_FILES.main), id)],
    [APP_FILES.css, registerSource(read(APP_FILES.css), id)],
  ] as const;

  const created: string[] = [];
  for (const file of listFiles(source)) {
    const from = join(source, file);
    const to = join(target, transformPath(file, tokens));
    mkdirSync(dirname(to), { recursive: true });
    if (isTextFile(file)) {
      writeFileSync(to, replaceTokens(readFileSync(from, 'utf8'), tokens));
    } else {
      copyFileSync(from, to);
    }
    created.push(relative(root, to).replaceAll('\\', '/'));
  }
  for (const [file, text] of appFiles) {
    writeFileSync(join(root, file), text);
  }
  return { created, registered: appFiles.map(([file]) => file) };
}

/** The steps left after a scaffold, printed by the CLI. */
export function nextSteps(id: string): string {
  return [
    'Next:',
    '  1. pnpm install',
    `  2. pnpm --filter @learn/subject-${id} build`,
    `  3. edit packages/subject-${id}/content/ (YAML: docs/adding-a-subject.md §3)`,
    '  4. pnpm dev',
    '  5. pnpm voice:generate (generates audio for its new texts; voice:check then covers it)',
  ].join('\n');
}

function main(argv: readonly string[]): number {
  const [id, name, ...extra] = argv;
  if (id === undefined || name === undefined || extra.length > 0) {
    console.error(
      'usage: pnpm new-subject <id> "<Name>"   (e.g. pnpm new-subject music-notes "Music Notes")',
    );
    return 2;
  }
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  try {
    const { created, registered } = scaffold({ root, id, name });
    console.log(
      `Created packages/subject-${id} (${String(created.length)} files); registered in ${registered.join(', ')}.`,
    );
    console.log(nextSteps(id));
    return 0;
  } catch (error) {
    console.error(`new-subject: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

// Runs only as the entry point (`node tools/new-subject/new-subject.ts`), not when a test imports `scaffold`.
if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.exitCode = main(process.argv.slice(2));
}
