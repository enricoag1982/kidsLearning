// The scaffold end to end, in a temp directory holding only what it touches (the starter subject and the app's three
// registration files, copied from this repository): the real repository is never written.
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { nextSteps, scaffold } from './new-subject.ts';

const repoRoot = join(import.meta.dirname, '..', '..');
const APP_FILES = [
  'apps/kids-learning/package.json',
  'apps/kids-learning/src/main.tsx',
  'apps/kids-learning/src/index.css',
] as const;

let root = '';

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'new-subject-'));
  cpSync(
    join(repoRoot, 'packages', 'subject-template'),
    join(root, 'packages', 'subject-template'),
    {
      recursive: true,
      filter: (source) => !/[\\/](node_modules|dist|__snapshots__)([\\/]|$)/.test(source),
    },
  );
  for (const file of APP_FILES) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    copyFileSync(join(repoRoot, file), join(root, file));
  }
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function read(file: string): string {
  return readFileSync(join(root, file), 'utf8');
}

/** Every file under `dir` (paths relative to `dir`). */
function listFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).replaceAll('\\', '/'));
}

/** The lines `after` has beyond `before`, which it must contain in order (an insert-only change). */
function addedLines(before: string, after: string): string[] {
  const old = before.split('\n');
  const added: string[] = [];
  let seen = 0;
  for (const line of after.split('\n')) {
    if (line === old[seen]) seen += 1;
    else added.push(line);
  }
  expect(seen, 'every old line is still there, in order').toBe(old.length);
  return added;
}

describe('scaffold', () => {
  it('copies the starter subject with its tokens replaced in file names and contents', () => {
    const { created } = scaffold({ root, id: 'music-notes', name: 'Music Notes' });
    const pkg = 'packages/subject-music-notes';

    expect(JSON.parse(read(`${pkg}/package.json`))).toMatchObject({
      name: '@learn/subject-music-notes',
    });
    expect(read(`${pkg}/src/core.ts`)).toContain("id: 'music-notes',");
    expect(read(`${pkg}/src/core.ts`)).toContain('export const musicNotesCore');
    expect(read(`${pkg}/src/core.ts`)).toContain('MUSIC_NOTES_CHARACTERS');
    expect(read(`${pkg}/src/content.ts`)).toContain('musicNotesContent');
    expect(read(`${pkg}/src/entry.ts`)).toContain('export const musicNotesEntry');
    expect(read(`${pkg}/src/entry.ts`)).toContain("names: { en: 'Music Notes' }");
    expect(read(`${pkg}/src/entry.ts`)).toContain("import('./web/music-notes-loaded.ts')");
    expect(read(`${pkg}/src/web/music-notes-pack.ts`)).toContain('musicNotesWeb');
    expect(read(`${pkg}/src/web/music-notes-loaded.ts`)).toContain('musicNotesLoaded');
    expect(read(`${pkg}/content/locales/en/common.yaml`)).toContain('title: Music Notes');
    expect(read(`${pkg}/scripts/build-content.ts`)).toContain('musicNotesContent');
    expect(existsSync(join(root, pkg, 'src', 'web', 'art', 'subject-icon.svg'))).toBe(true);
    expect(created).toContain(`${pkg}/src/web/music-notes-pack.ts`);
    expect(created.length).toBe(listFiles(join(root, pkg)).length);
  });

  it('leaves no token behind, in a file name or a file', () => {
    scaffold({ root, id: 'music-notes', name: 'Music Notes' });
    const dir = join(root, 'packages', 'subject-music-notes');

    for (const file of listFiles(dir)) {
      expect(file.toLowerCase(), file).not.toContain('template');
      if (/\.(ts|tsx|json|yaml|svg)$/.test(file)) {
        expect(readFileSync(join(dir, file), 'utf8').toLowerCase(), file).not.toContain('template');
      }
    }
  });

  it('does not copy installs, build output or the starter snapshots', () => {
    const template = join(root, 'packages', 'subject-template');
    for (const dir of ['node_modules/x', 'dist', 'src/__snapshots__/content']) {
      mkdirSync(join(template, dir), { recursive: true });
      writeFileSync(join(template, dir, 'file.json'), '{}');
    }

    scaffold({ root, id: 'logic', name: 'Logic' });

    const files = listFiles(join(root, 'packages', 'subject-logic'));
    expect(files.filter((file) => /node_modules|dist|__snapshots__/.test(file))).toEqual([]);
    expect(files).toContain('src/content.test.ts');
  });

  it('registers the subject in the app: one dependency line, one @source line, an import and an entry', () => {
    const before = APP_FILES.map(read);

    const { registered } = scaffold({ root, id: 'music-notes', name: 'Music Notes' });

    expect(registered).toEqual([...APP_FILES]);
    const [pkg, main, css] = APP_FILES.map(read);
    expect(addedLines(before[0] ?? '', pkg ?? '')).toEqual([
      '    "@learn/subject-music-notes": "workspace:*",',
    ]);
    expect(JSON.parse(pkg ?? '')).toMatchObject({
      dependencies: { '@learn/subject-music-notes': 'workspace:*' },
    });
    expect(addedLines(before[1] ?? '', main ?? '')).toEqual([
      "import { musicNotesEntry } from '@learn/subject-music-notes/entry';",
      '    musicNotesEntry,',
    ]);
    expect(addedLines(before[2] ?? '', css ?? '')).toEqual([
      "@source '../../../packages/subject-music-notes/src';",
    ]);
  });

  it('is an error the second time, and changes nothing', () => {
    scaffold({ root, id: 'music-notes', name: 'Music Notes' });
    const after = APP_FILES.map(read);

    expect(() => scaffold({ root, id: 'music-notes', name: 'Music Notes' })).toThrow(
      /packages\/subject-music-notes already exists/,
    );
    expect(APP_FILES.map(read)).toEqual(after);
  });

  it('is an error when the app has the subject registered but the package is gone', () => {
    scaffold({ root, id: 'music-notes', name: 'Music Notes' });
    rmSync(join(root, 'packages', 'subject-music-notes'), { recursive: true });
    const after = APP_FILES.map(read);

    expect(() => scaffold({ root, id: 'music-notes', name: 'Music Notes' })).toThrow(
      /already (a dependency|registered|a source)/,
    );
    expect(APP_FILES.map(read)).toEqual(after);
    expect(existsSync(join(root, 'packages', 'subject-music-notes'))).toBe(false);
  });

  it.each([
    ['Music', 'Music', /must match/],
    ['music_notes', 'Music Notes', /must match/],
    ['music', "Kid's Music", /must be 1-24/],
    ['template', 'Template', /already exists/],
  ])('refuses id "%s" with name "%s" and writes nothing', (id, name, message) => {
    const before = APP_FILES.map(read);
    const packages = readdirSync(join(root, 'packages'));

    expect(() => scaffold({ root, id, name })).toThrow(message);

    expect(APP_FILES.map(read)).toEqual(before);
    expect(readdirSync(join(root, 'packages'))).toEqual(packages);
  });

  it('writes nothing when an app marker is missing', () => {
    const main = join(root, 'apps/kids-learning/src/main.tsx');
    writeFileSync(
      main,
      read('apps/kids-learning/src/main.tsx').replace('// new-subject:entry', ''),
    );
    const before = APP_FILES.map(read);

    expect(() => scaffold({ root, id: 'logic', name: 'Logic' })).toThrow(
      /marker "\/\/ new-subject:entry" not found/,
    );

    expect(APP_FILES.map(read)).toEqual(before);
    expect(existsSync(join(root, 'packages', 'subject-logic'))).toBe(false);
  });

  it('never touches this repository', () => {
    scaffold({ root, id: 'music-notes', name: 'Music Notes' });

    expect(existsSync(join(repoRoot, 'packages', 'subject-music-notes'))).toBe(false);
    expect(readFileSync(join(repoRoot, 'apps/kids-learning/src/main.tsx'), 'utf8')).not.toContain(
      'musicNotesEntry',
    );
  });
});

describe('the real app files', () => {
  it('carry the three markers the scaffold inserts at', () => {
    expect(read('apps/kids-learning/src/main.tsx')).toContain('// new-subject:import');
    expect(read('apps/kids-learning/src/main.tsx')).toContain('// new-subject:entry');
    expect(read('apps/kids-learning/src/index.css')).toContain('/* new-subject:source */');
  });
});

describe('nextSteps', () => {
  it('lists the commands for the new subject', () => {
    const steps = nextSteps('music-notes');

    expect(steps).toContain('pnpm install');
    expect(steps).toContain('pnpm --filter @learn/subject-music-notes build');
    expect(steps).toContain('packages/subject-music-notes/content/');
    expect(steps).toContain('pnpm dev');
    expect(steps).toContain('pnpm voice:generate');
  });
});
