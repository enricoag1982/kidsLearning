// The coding content rules: what a lesson file may say and what the build refuses, over a scratch lesson. Every verify rule has a
// failing fixture here.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { stringify } from 'yaml';
import { loadContent } from '@learn/platform-content/lesson-load';
import { ContentError, loadLocales, mergeLocales } from '@learn/platform-content/load';
import { PLATFORM_LOCALES_DIR } from '@learn/platform-content/paths';
import type { CompiledContent, Lesson } from '@learn/platform-core';
import type { CardDemo } from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { parseLevel } from '../core/level.ts';
import type { CodingExerciseDef, FindBugDef, PredictDef, ProgramDef } from '../core/types.ts';
import { codingContent } from './coding-content.ts';
import { findBug } from './find-bug.ts';
import { predict } from './predict.ts';
import { program } from './program.ts';

interface CodingBundle extends CompiledContent {
  readonly lessons: readonly Lesson<CodingExerciseDef, CardDemo>[];
}

const realLocalesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'content',
  'locales',
);
/** The scratch lessons name their exercises `arrows-01` ... and read their texts from the exercise ids: these stand-ins keep the real
 * `lessons.yaml` free of fixture texts. */
const scratchTexts = {
  en: { lessons: { 'arrows-01': 'A', 'arrows-02': 'B', 'arrows-03': 'C' } },
};
const locales = mergeLocales(
  mergeLocales(loadLocales(PLATFORM_LOCALES_DIR), loadLocales(realLocalesDir)),
  scratchTexts,
);

let dir = '';

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'coding-content-'));
  mkdirSync(join(dir, 'minigames'), { recursive: true });
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const MAP = ['S..*', '.#..', '...F'];

/** Text keys come from `scratchTexts` above: the exercise ids used here (`arrows-01` ...) have texts. */
function programYaml(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'arrows-01',
    type: 'program',
    map: MAP,
    tray: ['up', 'down', 'left', 'right'],
    cap: 6,
    solution: ['right', 'right', 'right', 'down', 'down'],
    ...overrides,
  };
}

function predictYaml(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'arrows-01',
    type: 'predict',
    map: MAP,
    program: ['right', 'right', 'down'],
    ...overrides,
  };
}

function bugYaml(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'arrows-01',
    type: 'find-bug',
    map: MAP,
    program: ['right', 'right', 'right', 'up', 'down'],
    bug: [3],
    fix: 'down',
    ...overrides,
  };
}

function load(exercise: Record<string, unknown>): CodingBundle {
  const lessonPath = join(dir, 'lessons', 'meadow-steps', 'seq-arrows.yaml');
  mkdirSync(dirname(lessonPath), { recursive: true });
  writeFileSync(
    lessonPath,
    stringify({
      id: 'seq-arrows',
      order: 1,
      concept: 'seq-arrows',
      character: 'owl',
      demo: {},
      guided: [],
      exercises: [exercise],
    }),
    'utf8',
  );
  return loadContent<CodingBundle>(
    join(dir, 'lessons'),
    join(dir, 'minigames'),
    locales,
    codingContent,
  );
}

function defOf(exercise: Record<string, unknown>): CodingExerciseDef {
  const [lesson] = load(exercise).lessons;
  const [def] = lesson?.exercises ?? [];
  if (def === undefined) throw new Error('no exercise compiled');
  return def;
}

function issuesOf(exercise: Record<string, unknown>): string {
  try {
    load(exercise);
    return '';
  } catch (error) {
    if (error instanceof ContentError) return error.issues.join('\n');
    throw error;
  }
}

describe('program: compile', () => {
  it('compiles the map into a level and the tiles into tile objects', () => {
    expect(defOf(programYaml())).toEqual({
      id: 'arrows-01',
      concept: 'seq-arrows',
      textKey: 'lessons:arrows-01',
      type: 'program',
      level: parseLevel(MAP),
      tray: ['up', 'down', 'left', 'right'],
      cap: 6,
      solution: [
        { kind: 'right' },
        { kind: 'right' },
        { kind: 'right' },
        { kind: 'down' },
        { kind: 'down' },
      ],
    });
  });

  it('reads the heading, a repeat, prefilled slots (null = empty), locked slots and must-loop', () => {
    const def = defOf(
      programYaml({
        map: ['S....F'],
        heading: 'right',
        tray: ['forward', 'turn-right', 'repeat'],
        cap: 4,
        solution: [{ repeat: 5, do: ['forward'] }, 'turn-right'],
        prefilled: [{ repeat: 5, do: ['forward'] }, null],
        locked: [0],
        'must-loop': true,
      }),
    ) as ProgramDef;
    expect(def.level.heading).toBe('right');
    expect(def.solution).toEqual([
      { kind: 'repeat', times: 5, body: [{ kind: 'forward' }] },
      { kind: 'turn-right' },
    ]);
    expect(def.prefilled).toEqual([
      { kind: 'repeat', times: 5, body: [{ kind: 'forward' }] },
      null,
    ]);
    expect(def.locked).toEqual([0]);
    expect(def.mustLoop).toBe(true);
  });

  it('a different heading starts the animal facing it', () => {
    const def = defOf(
      programYaml({
        map: ['S', '.', 'F'],
        heading: 'down',
        tray: ['forward'],
        cap: 2,
        solution: ['forward', 'forward'],
      }),
    );
    expect(def).toMatchObject({ level: { heading: 'down' } });
  });

  it('carries the card prompt into the def', () => {
    expect(defOf(programYaml({ prompt: { emoji: '🦊' } }))).toMatchObject({
      prompt: { emoji: '🦊' },
    });
  });
});

describe('program: schema', () => {
  it.each([
    ['an unknown tile', { solution: ['right', 'sideways'] }, 'solution'],
    ['a repeat that runs once', { solution: [{ repeat: 1, do: ['right'] }] }, 'repeat'],
    ['a repeat that runs 10 times', { solution: [{ repeat: 10, do: ['right'] }] }, 'repeat'],
    ['an empty repeat body', { solution: [{ repeat: 3, do: [] }] }, 'do'],
    [
      'a repeat body of 5 tiles',
      { solution: [{ repeat: 3, do: ['up', 'up', 'up', 'up', 'up'] }] },
      'do',
    ],
    [
      'a repeat inside a repeat',
      { solution: [{ repeat: 2, do: [{ repeat: 2, do: ['right'] }] }] },
      'no repeat inside a repeat',
    ],
    ['an empty tray', { tray: [] }, 'tray'],
    ['a tray listing a tile twice', { tray: ['up', 'up'] }, 'tray lists a tile twice'],
    [
      'a tray of 9 tiles',
      {
        tray: [
          'up',
          'down',
          'left',
          'right',
          'forward',
          'turn-left',
          'turn-right',
          'jump',
          'repeat',
        ],
      },
      'tray',
    ],
    ['a tray with an unknown tile', { tray: ['up', 'fly'] }, 'tray'],
    ['a cap of 0', { cap: 0 }, 'cap'],
    ['a cap over 12', { cap: 13 }, 'cap'],
    ['an empty solution', { solution: [] }, 'solution'],
    ['an unknown field', { speed: 3 }, 'speed'],
    ['must-loop that is not a boolean', { 'must-loop': 'yes' }, 'must-loop'],
    ['a negative locked index', { locked: [-1] }, 'locked'],
    ['an unknown heading', { heading: 'sideways' }, 'heading'],
  ])('rejects %s', (_name, overrides, expected) => {
    expect(issuesOf(programYaml(overrides))).toContain(expected);
  });

  it.each([
    ['no start', ['.*'], 'exactly one start'],
    ['two starts', ['S*S'], 'exactly one start'],
    ['two flags', ['SFF'], 'at most one flag'],
    ['no star or flag', ['S.#'], 'at least one star'],
    ['an unknown char', ['Sx*'], 'unknown "x"'],
    ['ragged rows', ['S*', '.'], 'Ragged'],
  ])('rejects a map with %s', (_name, map, expected) => {
    const issues = issuesOf(programYaml({ map }));
    expect(issues).toContain('map');
    expect(issues).toContain(expected);
  });
});

describe('program: verify', () => {
  it('accepts a good program', () => {
    expect(issuesOf(programYaml())).toBe('');
  });

  it('rejects a map over 6 × 6', () => {
    expect(
      issuesOf(
        programYaml({
          map: ['S......F'],
          tray: ['right'],
          cap: 12,
          solution: Array<string>(7).fill('right'),
        }),
      ),
    ).toContain('map is 8 × 1, over 6 × 6');
    expect(
      issuesOf(
        programYaml({
          map: ['S', '.', '.', '.', '.', '.', 'F'],
          tray: ['down'],
          cap: 12,
          solution: Array<string>(6).fill('down'),
        }),
      ),
    ).toContain('map is 1 × 7, over 6 × 6');
    expect(
      issuesOf(
        programYaml({
          map: ['S....F', '......', '......', '......', '......', '......'],
          tray: ['right'],
          cap: 5,
          solution: Array<string>(5).fill('right'),
        }),
      ),
    ).toBe('');
  });

  it('rejects a solution over the cap, counting a repeat as 1 + its body', () => {
    expect(issuesOf(programYaml({ cap: 4 }))).toContain(
      'solution shows 5 tiles, over the cap of 4',
    );
    expect(
      issuesOf(
        programYaml({
          map: ['S....F'],
          tray: ['right', 'repeat'],
          cap: 1,
          solution: [{ repeat: 5, do: ['right'] }],
        }),
      ),
    ).toContain('solution shows 2 tiles, over the cap of 1');
  });

  it('rejects a solution that uses a tile outside the tray, also inside a repeat or a repeat the tray lacks', () => {
    expect(issuesOf(programYaml({ tray: ['up', 'down', 'left'] }))).toContain(
      'solution uses "right", which is not in the tray',
    );
    expect(
      issuesOf(
        programYaml({
          map: ['S....F'],
          tray: ['right'],
          cap: 3,
          solution: [{ repeat: 5, do: ['right'] }],
        }),
      ),
    ).toContain('solution uses "repeat", which is not in the tray');
    expect(
      issuesOf(
        programYaml({
          map: ['S....F'],
          tray: ['jump', 'repeat'],
          cap: 3,
          solution: [{ repeat: 5, do: ['right'] }],
        }),
      ),
    ).toContain('solution uses "right", which is not in the tray');
  });

  it('rejects a solution that does not reach the goal: unfinished, bumped, a star left', () => {
    expect(issuesOf(programYaml({ solution: ['right', 'right'] }))).toContain(
      'solution does not reach the goal (unfinished)',
    );
    expect(issuesOf(programYaml({ solution: ['right', 'down'] }))).toContain(
      'solution does not reach the goal (bumped)',
    );
    expect(
      issuesOf(programYaml({ solution: ['down', 'down', 'right', 'right', 'right'] })),
    ).toContain('solution does not reach the goal (unfinished)');
  });

  it('rejects an exercise where no wrong try can be made: the tray holds only the solution tile and nothing can be swapped', () => {
    expect(
      issuesOf(programYaml({ map: ['SF'], tray: ['right'], cap: 2, solution: ['right'] })),
    ).toContain('no runnable program fails');
    // A second tile in the tray gives the wrong try; so does an open slot next to a locked one.
    expect(
      issuesOf(programYaml({ map: ['SF'], tray: ['right', 'up'], cap: 2, solution: ['right'] })),
    ).toBe('');
    expect(
      issuesOf(
        programYaml({
          map: ['S.F'],
          tray: ['right'],
          cap: 3,
          solution: ['right', 'right'],
        }),
      ),
    ).toBe('');
  });

  it('rejects a prefilled strip longer than the cap', () => {
    expect(
      issuesOf(programYaml({ cap: 5, prefilled: ['right', null, null, null, null, null] })),
    ).toContain('prefilled has 6 slots, over the cap of 5');
  });

  it('rejects a locked slot that is not the solution tile there, has no prefilled tile, or has no prefilled at all', () => {
    expect(issuesOf(programYaml({ prefilled: ['right', 'up'], locked: [1] }))).toContain(
      "locked slot 1 is not the solution's tile there",
    );
    expect(issuesOf(programYaml({ prefilled: ['right', null], locked: [1] }))).toContain(
      'locked slot 1 has no prefilled tile',
    );
    expect(issuesOf(programYaml({ prefilled: ['right'], locked: [3] }))).toContain(
      'locked slot 3 has no prefilled tile',
    );
    expect(issuesOf(programYaml({ locked: [0] }))).toContain('"locked" needs "prefilled"');
  });

  it('accepts a prefilled slot that differs from the solution when it is not locked', () => {
    expect(issuesOf(programYaml({ prefilled: ['right', 'up', null, null, null] }))).toBe('');
    expect(
      issuesOf(programYaml({ prefilled: ['right', null, null, null, 'down'], locked: [0, 4] })),
    ).toBe('');
  });

  it('must-loop: accepts a loop the cap forces, rejects no repeat in the solution and a loop-free program that fits', () => {
    const loop = {
      map: ['S....F'],
      tray: ['right', 'repeat'],
      cap: 3,
      solution: [{ repeat: 5, do: ['right'] }],
      'must-loop': true,
    };
    expect(issuesOf(programYaml(loop))).toBe('');
    expect(
      issuesOf(
        programYaml({ ...loop, tray: ['right'], solution: Array<string>(5).fill('right'), cap: 5 }),
      ),
    ).toContain('must-loop but the solution has no repeat');
    // 5 tiles do the job and the cap is 5: no loop needed.
    expect(issuesOf(programYaml({ ...loop, cap: 6 }))).toContain(
      'must-loop but a program without a repeat reaches the goal in 6 tiles or fewer',
    );
    expect(issuesOf(programYaml({ ...loop, cap: 5 }))).toContain(
      'must-loop but a program without a repeat reaches the goal in 5 tiles or fewer',
    );
    // 4 tiles cannot do it without a loop: a corridor of 5 steps.
    expect(issuesOf(programYaml({ ...loop, cap: 4 }))).toBe('');
  });

  it('without must-loop a loop-free program may fit', () => {
    expect(
      issuesOf(
        programYaml({
          map: ['S....F'],
          tray: ['right', 'repeat'],
          cap: 6,
          solution: [{ repeat: 5, do: ['right'] }],
        }),
      ),
    ).toBe('');
  });

  it('turns the solver guard into an issue: a must-loop level with more than 6 stars', () => {
    const def = defOf(programYaml()) as ProgramDef;
    const crowded: ProgramDef = {
      ...def,
      level: parseLevel(['S*****', '**....']),
      mustLoop: true,
      solution: [{ kind: 'repeat', times: 2, body: [{ kind: 'right' }] }],
      tray: ['right', 'repeat'],
    };
    const issues: string[] = [];
    program.verify?.(crowded, 'where', issues);
    expect(issues.join('\n')).toContain('7 stars is over 6');
  });

  it('refuses a solution that is not a valid program (a repeat inside a repeat, built by hand)', () => {
    const def = defOf(programYaml()) as ProgramDef;
    const nested: ProgramDef = {
      ...def,
      solution: [
        {
          kind: 'repeat',
          times: 2,
          body: [{ kind: 'repeat', times: 2, body: [{ kind: 'right' }] }],
        },
      ],
    };
    const issues: string[] = [];
    program.verify?.(nested, 'where', issues);
    expect(issues).toEqual(['where: solution is not a valid program']);
  });
});

describe('predict', () => {
  it('compiles the answer: the cell the program ends on', () => {
    expect(defOf(predictYaml())).toEqual({
      id: 'arrows-01',
      concept: 'seq-arrows',
      textKey: 'lessons:arrows-01',
      type: 'predict',
      level: parseLevel(MAP),
      program: [{ kind: 'right' }, { kind: 'right' }, { kind: 'down' }],
      answer: { x: 2, y: 1 },
    });
  });

  it('the answer follows turns, jumps and repeats', () => {
    const def = defOf(
      predictYaml({
        map: ['S..*', '.#..', '...F'],
        heading: 'down',
        program: ['jump', 'turn-left', { repeat: 2, do: ['forward'] }],
      }),
    ) as PredictDef;
    // down 2 -> (0,2); facing right after turn-left from down? down -> turn-left = right; forward x2 -> (2,2).
    expect(def.answer).toEqual({ x: 2, y: 2 });
  });

  it('accepts a program that does not reach the goal', () => {
    expect(issuesOf(predictYaml({ program: ['right'] }))).toBe('');
  });

  it('rejects a program that bumps', () => {
    expect(issuesOf(predictYaml({ program: ['right', 'down'] }))).toContain(
      'program bumps (a prediction needs a program that runs to its end)',
    );
    expect(issuesOf(predictYaml({ program: ['up'] }))).toContain('program bumps');
  });

  it('rejects an empty program, an unknown tile, a repeat inside a repeat, and a map over 6 × 6', () => {
    expect(issuesOf(predictYaml({ program: [] }))).toContain('program');
    expect(issuesOf(predictYaml({ program: ['right', 'fly'] }))).toContain('program');
    expect(
      issuesOf(predictYaml({ program: [{ repeat: 2, do: [{ repeat: 2, do: ['up'] }] }] })),
    ).toContain('program');
    expect(issuesOf(predictYaml({ map: ['S......*'], program: ['right'] }))).toContain(
      'over 6 × 6',
    );
  });

  it('rejects a stored answer that is not where the program ends (built by hand)', () => {
    const def = defOf(predictYaml()) as PredictDef;
    const issues: string[] = [];
    predict.verify?.({ ...def, answer: { x: 0, y: 0 } }, 'where', issues);
    expect(issues).toEqual(['where: answer (0, 0) is not where the program ends (2, 1)']);
    const clean: string[] = [];
    predict.verify?.(def, 'where', clean);
    expect(clean).toEqual([]);
  });

  it('refuses a program that is not a valid program (built by hand)', () => {
    const def = defOf(predictYaml()) as PredictDef;
    const issues: string[] = [];
    predict.verify?.(
      { ...def, program: [{ kind: 'repeat', times: 1, body: [{ kind: 'right' }] }] },
      'where',
      issues,
    );
    expect(issues).toEqual(['where: program is not a valid program']);
  });
});

describe('find-bug', () => {
  it('compiles the program, the bug path and the fix', () => {
    expect(defOf(bugYaml())).toEqual({
      id: 'arrows-01',
      concept: 'seq-arrows',
      textKey: 'lessons:arrows-01',
      type: 'find-bug',
      level: parseLevel(MAP),
      program: [
        { kind: 'right' },
        { kind: 'right' },
        { kind: 'right' },
        { kind: 'up' },
        { kind: 'down' },
      ],
      bug: [3],
      fix: { kind: 'down' },
    });
  });

  it('accepts a bug inside a repeat and a bug that is the repeat (its count)', () => {
    expect(
      issuesOf(
        bugYaml({
          map: ['S...', '....', '...F'],
          program: [{ repeat: 2, do: ['right', 'up'] }, 'right'],
          bug: [0, 1],
          fix: 'down',
        }),
      ),
    ).toBe('');
    expect(
      issuesOf(
        bugYaml({
          map: ['S..*', '.#..', '...F'],
          program: [{ repeat: 2, do: ['right'] }, 'down', 'down'],
          bug: [0],
          fix: { repeat: 3, do: ['right'] },
        }),
      ),
    ).toBe('');
    // more times than needed: the loop itself is the bug, found at the 4th iteration
    expect(
      issuesOf(
        bugYaml({
          map: ['S..*', '.#..', '...F'],
          program: [{ repeat: 4, do: ['right'] }, 'down', 'down'],
          bug: [0],
          fix: { repeat: 3, do: ['right'] },
        }),
      ),
    ).toBe('');
  });

  it('accepts a bug that looks right the first time round and goes wrong in a later iteration (still at the bug tile)', () => {
    // `forward` and `right` agree while facing right: the runs part at the second iteration, at the same tile.
    expect(
      issuesOf(
        bugYaml({
          map: ['S...', '....', '..F.'],
          program: [{ repeat: 2, do: ['forward', 'turn-right'] }, 'down', 'down'],
          bug: [0, 0],
          fix: 'right',
        }),
      ),
    ).toBe('');
  });

  it('rejects a program that already reaches the goal', () => {
    expect(
      issuesOf(
        bugYaml({ program: ['right', 'right', 'right', 'down', 'down'], bug: [3], fix: 'up' }),
      ),
    ).toContain('the program already reaches the goal (there is no bug)');
  });

  it('rejects a fix that does not make the program reach the goal', () => {
    expect(issuesOf(bugYaml({ fix: 'left' }))).toContain(
      'the program with the fix does not reach the goal (unfinished)',
    );
    expect(issuesOf(bugYaml({ fix: 'right' }))).toContain(
      'the program with the fix does not reach the goal (bumped)',
    );
  });

  it('rejects a second bug: fixing the named tile leaves the program failing', () => {
    expect(
      issuesOf(
        bugYaml({ program: ['right', 'left', 'right', 'up', 'down'], bug: [3], fix: 'down' }),
      ),
    ).toContain('the program with the fix does not reach the goal');
  });

  it('rejects a bug that is not a tile of the program', () => {
    expect(issuesOf(bugYaml({ bug: [9] }))).toContain('bug [9] is not a tile of the program');
    expect(issuesOf(bugYaml({ bug: [0, 0] }))).toContain('bug [0, 0] is not a tile of the program');
  });

  it('rejects a fix that is the tile it replaces', () => {
    expect(issuesOf(bugYaml({ fix: 'up' }))).toContain('fix is the tile it replaces');
  });

  it('rejects a bug path of the wrong shape, a missing fix, and a map over 6 × 6', () => {
    expect(issuesOf(bugYaml({ bug: [] }))).toContain('bug');
    expect(issuesOf(bugYaml({ bug: [0, 0, 0] }))).toContain('bug');
    expect(issuesOf(bugYaml({ fix: undefined }))).toContain('fix');
    expect(
      issuesOf(bugYaml({ map: ['S......*'], program: ['right', 'up'], bug: [1], fix: 'right' })),
    ).toContain('over 6 × 6');
  });

  it('refuses a program or fix that is not valid (built by hand)', () => {
    const def = defOf(bugYaml()) as FindBugDef;
    const issues: string[] = [];
    findBug.verify?.(
      { ...def, fix: { kind: 'repeat', times: 1, body: [{ kind: 'down' }] } },
      'where',
      issues,
    );
    expect(issues).toEqual(['where: program and fix must be valid tiles']);
  });
});

describe('the card kit kinds stay available', () => {
  it('accepts an order and a choice beside the coding kinds', () => {
    const lessonPath = join(dir, 'lessons', 'meadow-steps', 'seq-arrows.yaml');
    mkdirSync(dirname(lessonPath), { recursive: true });
    writeFileSync(
      lessonPath,
      stringify({
        id: 'seq-arrows',
        order: 1,
        concept: 'seq-arrows',
        character: 'owl',
        demo: {},
        guided: [],
        exercises: [
          {
            id: 'arrows-01',
            type: 'order',
            items: [
              { id: 'b', big: 'B' },
              { id: 'a', big: 'A' },
            ],
            answer: ['a', 'b'],
          },
          {
            id: 'arrows-02',
            type: 'choice',
            options: [
              { id: 'x', big: 'X' },
              { id: 'y', big: 'Y' },
            ],
            answer: 'y',
          },
          programYaml({ id: 'arrows-03' }),
        ],
      }),
      'utf8',
    );
    const content = loadContent<CodingBundle>(
      join(dir, 'lessons'),
      join(dir, 'minigames'),
      locales,
      codingContent,
    );
    expect(content.lessons[0]?.exercises.map((exercise) => exercise.type)).toEqual([
      'order',
      'choice',
      'program',
    ]);
  });
});
