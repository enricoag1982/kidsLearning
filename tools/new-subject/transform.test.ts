import { describe, expect, it } from 'vitest';
import {
  camelCase,
  entryName,
  isTextFile,
  registerDependency,
  registerEntry,
  registerSource,
  replaceTokens,
  transformPath,
  upperSnake,
  validateId,
  validateName,
} from './transform.ts';

const TOKENS = { id: 'music-notes', name: 'Music Notes' } as const;

describe('validateId', () => {
  it.each(['music', 'music-notes', 'logic2', 'a'])('accepts %s', (id) => {
    expect(() => {
      validateId(id);
    }).not.toThrow();
  });

  it.each(['', 'Music', '2music', 'music_notes', 'music notes', '-music', 'música'])(
    'rejects "%s"',
    (id) => {
      expect(() => {
        validateId(id);
      }).toThrow(/must match/);
    },
  );
});

describe('validateName', () => {
  it.each(['Music', 'Music Notes', 'Logic 2', 'Self-defence', 'Música'])('accepts %s', (name) => {
    expect(() => {
      validateName(name);
    }).not.toThrow();
  });

  it.each([
    '',
    ' Music',
    'Music ',
    '2 Music',
    "Kid's Music",
    'Music: notes',
    'Music # 1',
    'Music "Notes"',
    'a'.repeat(25),
    'true',
    'Null',
  ])('rejects "%s"', (name) => {
    expect(() => {
      validateName(name);
    }).toThrow(/must be 1-24/);
  });
});

describe('identifier forms of an id', () => {
  it('camel-cases a dashed id and leaves a plain one alone', () => {
    expect(camelCase('music-notes')).toBe('musicNotes');
    expect(camelCase('logic')).toBe('logic');
    expect(camelCase('a-b-c')).toBe('aBC');
    expect(camelCase('music-2')).toBe('music2');
  });

  it('upper-snakes an id', () => {
    expect(upperSnake('music-notes')).toBe('MUSIC_NOTES');
    expect(upperSnake('logic')).toBe('LOGIC');
  });

  it('names the entry', () => {
    expect(entryName('music-notes')).toBe('musicNotesEntry');
    expect(entryName('logic')).toBe('logicEntry');
  });
});

describe('replaceTokens', () => {
  it('turns an identifier into the camel-cased id', () => {
    expect(replaceTokens('export const templateCore = createCardCore();', TOKENS)).toBe(
      'export const musicNotesCore = createCardCore();',
    );
    expect(replaceTokens('templateEntry, templateLoaded, templateWeb', TOKENS)).toBe(
      'musicNotesEntry, musicNotesLoaded, musicNotesWeb',
    );
    expect(replaceTokens('templateCore', { id: 'logic', name: 'Logic' })).toBe('logicCore');
  });

  it('turns a path segment, a package name and a string id into the id as written', () => {
    expect(replaceTokens('@learn/subject-template/entry', TOKENS)).toBe(
      '@learn/subject-music-notes/entry',
    );
    expect(replaceTokens("id: 'template',", TOKENS)).toBe("id: 'music-notes',");
    expect(replaceTokens('./web/template-pack.ts', TOKENS)).toBe('./web/music-notes-pack.ts');
    expect(replaceTokens('template.ts', TOKENS)).toBe('music-notes.ts');
  });

  it('turns Template into the display name and TEMPLATE into the upper snake id', () => {
    expect(replaceTokens('title: Template', TOKENS)).toBe('title: Music Notes');
    expect(replaceTokens("'Template opens at {{time}}.'", TOKENS)).toBe(
      "'Music Notes opens at {{time}}.'",
    );
    expect(replaceTokens('export const TEMPLATE_CHARACTERS = {};', TOKENS)).toBe(
      'export const MUSIC_NOTES_CHARACTERS = {};',
    );
  });

  it('replaces in one pass: a replacement is never scanned again', () => {
    expect(replaceTokens('Template / template', { id: 'my-template', name: 'The template' })).toBe(
      'The template / my-template',
    );
    expect(replaceTokens('templateCore', { id: 'my-template', name: 'My Template' })).toBe(
      'myTemplateCore',
    );
  });

  it('leaves text without a token alone', () => {
    expect(replaceTokens('nothing to see', TOKENS)).toBe('nothing to see');
    expect(replaceTokens('', TOKENS)).toBe('');
  });
});

describe('transformPath', () => {
  it('replaces the tokens in every segment', () => {
    expect(transformPath('src/web/template-pack.ts', TOKENS)).toBe('src/web/music-notes-pack.ts');
    expect(transformPath('content/tracks.yaml', TOKENS)).toBe('content/tracks.yaml');
  });
});

describe('isTextFile', () => {
  it('is true for the starter subject text files and false for anything else', () => {
    for (const file of ['a.ts', 'a.tsx', 'package.json', 'tracks.yaml', 'icon.svg', 'a.css']) {
      expect(isTextFile(file), file).toBe(true);
    }
    for (const file of ['hedgehog.webp', 'a.png', 'a.mp3', 'LICENSE']) {
      expect(isTextFile(file), file).toBe(false);
    }
  });
});

const PACKAGE_JSON = `{
  "dependencies": {
    "@learn/platform-web": "workspace:*",
    "@learn/subject-chess": "workspace:*",
    "@learn/subject-math": "workspace:*",
    "@fontsource-variable/fredoka": "^5.3.0"
  }
}
`;

describe('registerDependency', () => {
  it('adds one line after the last subject dependency, at its indentation', () => {
    const next = registerDependency(PACKAGE_JSON, 'music-notes');

    expect(next.split('\n')).toEqual([
      '{',
      '  "dependencies": {',
      '    "@learn/platform-web": "workspace:*",',
      '    "@learn/subject-chess": "workspace:*",',
      '    "@learn/subject-math": "workspace:*",',
      '    "@learn/subject-music-notes": "workspace:*",',
      '    "@fontsource-variable/fredoka": "^5.3.0"',
      '  }',
      '}',
      '',
    ]);
    expect(JSON.parse(next)).toBeTruthy();
  });

  it('keeps the JSON valid when the last subject dependency has no trailing comma', () => {
    const text = '{\n  "dependencies": {\n    "@learn/subject-math": "workspace:*"\n  }\n}\n';

    const next = registerDependency(text, 'logic');

    expect(JSON.parse(next)).toEqual({
      dependencies: { '@learn/subject-math': 'workspace:*', '@learn/subject-logic': 'workspace:*' },
    });
  });

  it('is an error, not a duplicate, the second time', () => {
    const once = registerDependency(PACKAGE_JSON, 'music-notes');

    expect(() => registerDependency(once, 'music-notes')).toThrow(/already a dependency/);
  });

  it('is an error when there is no subject dependency to insert after', () => {
    expect(() => registerDependency('{ "dependencies": {} }\n', 'logic')).toThrow(
      /no "@learn\/subject-\*" dependency/,
    );
  });
});

const MAIN = `import { mountApp } from '@learn/platform-web/mount.tsx';
import { chessEntry } from '@learn/subject-chess/entry';
import { mathEntry } from '@learn/subject-math/entry';
// new-subject:import
import { KIDS_APP_CONFIG } from './app-config.ts';

void mountApp({
  subjects: [
    chessEntry,
    mathEntry,
    // new-subject:entry
  ],
  app: KIDS_APP_CONFIG,
});
`;

describe('registerEntry', () => {
  it('adds the import and the entry above their markers, keeping the markers', () => {
    const next = registerEntry(MAIN, 'music-notes');

    expect(next).toContain(
      "import { mathEntry } from '@learn/subject-math/entry';\n" +
        "import { musicNotesEntry } from '@learn/subject-music-notes/entry';\n" +
        '// new-subject:import\n',
    );
    expect(next).toContain('    mathEntry,\n    musicNotesEntry,\n    // new-subject:entry\n');
    expect(next.split('\n')).toHaveLength(MAIN.split('\n').length + 2);
  });

  it('can register a second subject after the first', () => {
    const next = registerEntry(registerEntry(MAIN, 'music-notes'), 'logic');

    expect(next).toContain('    musicNotesEntry,\n    logicEntry,\n    // new-subject:entry\n');
  });

  it('is an error, not a duplicate, the second time', () => {
    const once = registerEntry(MAIN, 'music-notes');

    expect(() => registerEntry(once, 'music-notes')).toThrow(/musicNotesEntry is already/);
  });

  it('is an error when a marker is missing', () => {
    expect(() => registerEntry(MAIN.replace('// new-subject:entry\n', ''), 'logic')).toThrow(
      /marker "\/\/ new-subject:entry" not found/,
    );
    expect(() => registerEntry(MAIN.replace('// new-subject:import\n', ''), 'logic')).toThrow(
      /marker "\/\/ new-subject:import" not found/,
    );
  });
});

const CSS = `@import 'tailwindcss';
@source '../../../packages/subject-chess/src';
@source '../../../packages/subject-math/src';
/* new-subject:source */
`;

describe('registerSource', () => {
  it('adds one @source line above the marker', () => {
    const next = registerSource(CSS, 'music-notes');

    expect(next).toBe(
      `@import 'tailwindcss';
@source '../../../packages/subject-chess/src';
@source '../../../packages/subject-math/src';
@source '../../../packages/subject-music-notes/src';
/* new-subject:source */
`,
    );
  });

  it('is an error, not a duplicate, the second time', () => {
    expect(() => registerSource(registerSource(CSS, 'logic'), 'logic')).toThrow(/already a source/);
  });

  it('is an error when the marker is missing', () => {
    expect(() => registerSource('@import "tailwindcss";\n', 'logic')).toThrow(/not found/);
  });
});
