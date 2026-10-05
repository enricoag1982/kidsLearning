// World 3, Grid Puzzles, as shipped (m14.11): the four sudoku lessons and the picture-cross lesson, and the Sudoku Sprint boss. The stored
// seeds, ids and drawings are frozen here (a stored star is attached to an id: never reseed or redraw a released item), the curriculum
// table of docs/subjects/logic/curriculum.md §2 is held per lesson, the cross-lesson guard (no repeated grid), and the "exactly one
// reading" content review (curriculum §6) is re-derived from the compiled puzzles with the counter and the solvers, not from the
// templates' own checks.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compileAll } from '@learn/platform-content/compile-all';
import { resolveText } from '@learn/platform-content/text-resolve';
import { readYaml } from '@learn/platform-content/yaml-file';
import {
  CROSS_LEVEL,
  LESSON_TECHNIQUES,
  humanSolveCross,
  humanSolveSudoku,
  nextSudokuStep,
  type SudokuFocus,
  type SudokuGrid,
} from '../core/puzzles/index.ts';
import type {
  LogicContent,
  LogicExerciseDef,
  LogicLesson,
  LogicSeriesGame,
} from '../core/types.ts';
import type { GridFillDef } from '../kinds/grid-fill/def.ts';
import { playSolution, playWrongThenSolve, starsFor } from '../testing/index.ts';
import { logicContent, LOGIC_TEMPLATES } from './logic-content.ts';
import { countCrossSolutions } from './puzzles/cross-count.ts';
import { countSudokuSolutions, findSudokuSolution } from './puzzles/sudoku-count.ts';
import { SUDOKU_SETS } from './templates/sudoku-sets.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content');
const compiled = compileAll<LogicContent>(logicContent, root);
const { content, locales } = compiled;
const lessons = locales.en?.lessons ?? {};

/** The English sentence of a `lessons:` / `common:` text ref. */
function english(ref: string): string {
  const [namespace, key] = ref.includes(':') ? ref.split(':') : ['lessons', ref];
  const tree = locales.en?.[namespace ?? 'lessons'] ?? lessons;
  const text = resolveText(tree, key ?? ref);
  if (text === undefined) throw new Error(`no text for ${ref}`);
  return text;
}

const SUDOKU_LESSONS = ['grd-last', 'grd-only-place', 'grd-only-number', 'grd-six'] as const;
const LESSON_IDS = [...SUDOKU_LESSONS, 'grd-pixels'] as const;

function lessonOf(id: string): LogicLesson {
  const found = content.lessons.find((lesson) => lesson.id === id);
  if (found === undefined) throw new Error(`no lesson ${id}`);
  return found;
}

const boss = ((): LogicSeriesGame => {
  const found = content.minigames.find((game) => game.id === 'sudoku-sprint');
  if (found?.mode !== 'series') throw new Error('no sudoku-sprint series');
  return found;
})();

const itemsOf = (lesson: LogicLesson): readonly LogicExerciseDef[] => [
  ...lesson.guided,
  ...lesson.exercises,
  ...(lesson.variants ?? []),
];

const gridOf = (def: LogicExerciseDef): GridFillDef => {
  if (def.type !== 'grid-fill') throw new Error(`${def.id} is not a grid-fill`);
  return def;
};

/** Every exercise of the world: the lessons' guided, scored and variant items, then the boss rounds. */
const ALL: readonly { readonly where: string; readonly def: GridFillDef }[] = [
  ...LESSON_IDS.flatMap((id) =>
    itemsOf(lessonOf(id)).map((def) => ({ where: `${id}/${def.id}`, def: gridOf(def) })),
  ),
  ...boss.rounds.map((def) => ({ where: `sudoku-sprint/${def.id}`, def: gridOf(def) })),
];

interface SudokuItem {
  readonly where: string;
  readonly lesson: string;
  readonly def: GridFillDef;
  readonly size: 4 | 6;
  readonly givens: SudokuGrid;
  readonly focus: SudokuFocus;
}

const SUDOKUS: readonly SudokuItem[] = ALL.flatMap(({ where, def }): SudokuItem[] => {
  const { puzzle } = def;
  return puzzle.rules === 'sudoku'
    ? [
        {
          where,
          lesson: where.split('/')[0] ?? '',
          def,
          size: puzzle.size,
          givens: puzzle.givens,
          focus: puzzle.focus,
        },
      ]
    : [];
});

// ---------------------------------------------------------------------------------------------------------------------
// The frozen spec

/** Each file's `generate:` entries as `<stem> <template>×<count> @<seed> <params>` per slot: the frozen spec of the content. */
interface Spec {
  readonly guided: readonly string[];
  readonly exercises: readonly string[];
  readonly variants: readonly string[];
}

const FROZEN: Readonly<Record<(typeof SUDOKU_LESSONS)[number], Spec>> = {
  'grd-last': {
    guided: [
      'last-g-row sdk-last×1 @1 {"empty":3,"guided":true}',
      'last-g-box sdk-last×1 @50 {"empty":6,"guided":true}',
    ],
    exercises: [
      'last-4 sdk-last×1 @2 {"empty":4}',
      'last-5 sdk-last×1 @3 {"empty":5}',
      'last-6a sdk-last×1 @4 {"empty":6}',
      'last-6b sdk-last×1 @5 {"empty":6} easier last-easy-1',
    ],
    variants: ['last-easy sdk-last×1 @6 {"empty":3}'],
  },
  'grd-only-place': {
    guided: [
      'place-g1 sdk-place×1 @1 {"empty":5,"guided":true}',
      'place-g2 sdk-place×1 @1 {"empty":6,"guided":true}',
    ],
    exercises: [
      'place-6 sdk-place×1 @2 {"empty":6}',
      'place-7 sdk-place×1 @3 {"empty":7}',
      'place-8a sdk-place×1 @4 {"empty":8}',
      'place-8b sdk-place×1 @7 {"empty":8} easier place-easy-1',
    ],
    variants: ['place-easy sdk-place×1 @3 {"empty":5}'],
  },
  'grd-only-number': {
    guided: [
      'num-g1 sdk-number×1 @4 {"empty":7,"guided":true}',
      'num-g2 sdk-number×1 @8 {"empty":8,"guided":true}',
    ],
    exercises: [
      'num-8 sdk-number×1 @9 {"empty":8}',
      'num-9 sdk-number×1 @10 {"empty":9}',
      'num-10a sdk-number×1 @11 {"empty":10}',
      'num-10b sdk-number×1 @12 {"empty":10} easier num-easy-1',
    ],
    variants: ['num-easy sdk-number×1 @5 {"empty":7}'],
  },
  'grd-six': {
    guided: [
      'six-g1 sdk-six×1 @1 {"empty":6,"guided":true,"maxTries":400}',
      'six-g2 sdk-six×1 @1 {"empty":8,"guided":true}',
    ],
    exercises: [
      'six-10 sdk-six×1 @1 {"empty":10}',
      'six-12 sdk-six×1 @1 {"empty":12}',
      'six-14 sdk-six×1 @2 {"empty":14}',
      'six-16 sdk-six×1 @3 {"empty":16} easier six-easy-1',
    ],
    variants: ['six-easy sdk-six×1 @2 {"empty":8}'],
  },
};

const FROZEN_BOSS = [
  'sprint-last sdk-last×1 @13 {"empty":5}',
  'sprint-place sdk-place×1 @6 {"empty":7}',
  'sprint-number sdk-number×1 @14 {"empty":9}',
  'sprint-six8 sdk-six×1 @3 {"empty":8}',
  'sprint-six10 sdk-six×1 @2 {"empty":10}',
];

/** The seven drawings of `grd-pixels`: id, rows, `maxLevel`, `reveal`. Never redraw a released picture. */
const FROZEN_PICTURES = [
  ['pix-snake', '#####/....#/#####/#..../#####', 1, '🐍'],
  ['pix-rabbit', '.#.#./.#.#./#####/#.#.#/.###.', 2, '🐰'],
  ['pix-frog', '##.##/#####/#####/.###./#...#', 2, '🐸'],
  ['pix-owl', '#...#/#####/#.#.#/##.##/##.##', 2, '🦉'],
  ['pix-turtle', '...../.###./#####/#####/.#.#.', 3, '🐢'],
  ['pix-cat', '#...#/##.##/#####/#.#.#/.###.', 3, '🐱'],
  ['pix-mouse', '##.##/#####/#.#.#/#####/.###.', 2, '🐭'],
] as const;

interface RawEntry {
  readonly id: string;
  readonly easier?: string;
  readonly generate: {
    readonly template: string;
    readonly count: number;
    readonly seed: number;
    readonly params?: unknown;
  };
}

function specOf(entries: readonly RawEntry[]): readonly string[] {
  return entries.map(
    ({ id, easier, generate: { template, count, seed, params } }) =>
      `${id} ${template}×${String(count)} @${String(seed)} ${JSON.stringify(params)}${easier === undefined ? '' : ` easier ${easier}`}`,
  );
}

/** The authored YAML of a file under `content/`, as parsed (the generate entries, before any expansion). */
function yamlOf(...segments: readonly string[]): unknown {
  const path = join(root, ...segments);
  const read = readYaml(path, path);
  if ('issues' in read) throw new Error(read.issues.join('; '));
  return read.data;
}

function rawLesson(id: string): Record<'guided' | 'exercises' | 'variants', readonly RawEntry[]> {
  return yamlOf('lessons', 'grid-puzzles', `${id}.yaml`) as Record<
    'guided' | 'exercises' | 'variants',
    readonly RawEntry[]
  >;
}

const rawBoss = (
  yamlOf('minigames', 'sudoku-sprint.yaml') as { readonly rounds: readonly RawEntry[] }
).rounds;

const idsOf = (defs: readonly LogicExerciseDef[] | undefined): readonly string[] =>
  (defs ?? []).map((def) => def.id);

// ---------------------------------------------------------------------------------------------------------------------
// Reading the compiled puzzles (independent of the templates)

const emptyCount = (grid: SudokuGrid): number => grid.filter((value) => value === 0).length;

/** The `[kind]` of the first step of a lesson's technique, as the hints and the guided target find it. */
function firstStep(item: SudokuItem): ReturnType<typeof nextSudokuStep> {
  const prefer = item.focus === 'all' ? undefined : item.focus;
  return nextSudokuStep(item.size, item.givens, LESSON_TECHNIQUES[item.focus], prefer);
}

const picturesOf = (lesson: LogicLesson): readonly GridFillDef[] => itemsOf(lesson).map(gridOf);

// ---------------------------------------------------------------------------------------------------------------------

describe('the 5 lessons of World 3', () => {
  it('are the curriculum’s, in order, all taught by Pip the Panda: 2 guided, 4 scored, 1 easier variant each', () => {
    const worldThree = content.lessons.filter((lesson) => lesson.world === 'grid-puzzles');
    expect(worldThree).toHaveLength(5);
    const byOrder = [...worldThree].sort((a, b) => a.order - b.order);
    expect(
      byOrder.map((lesson) => [
        lesson.id,
        lesson.concept,
        lesson.world,
        lesson.order,
        lesson.character,
        lesson.guided.length,
        lesson.exercises.length,
        lesson.variants?.length,
      ]),
    ).toEqual([
      ['grd-last', 'grd-last', 'grid-puzzles', 1, 'panda', 2, 4, 1],
      ['grd-only-place', 'grd-only-place', 'grid-puzzles', 2, 'panda', 2, 4, 1],
      ['grd-only-number', 'grd-only-number', 'grid-puzzles', 3, 'panda', 2, 4, 1],
      ['grd-six', 'grd-six', 'grid-puzzles', 4, 'panda', 2, 4, 1],
      ['grd-pixels', 'grd-pixels', 'grid-puzzles', 5, 'panda', 2, 4, 1],
    ]);
    expect(byOrder.map((lesson) => english(lesson.titleKey))).toEqual([
      'Last empty cell',
      'Only place',
      'Only number',
      'Six by six',
      'Picture cross',
    ]);
    // 5 lessons x 7 items + 5 boss rounds = the 40 exercises of the curriculum.
    expect(ALL).toHaveLength(40);
  });

  it.each(SUDOKU_LESSONS)(
    '%s: the YAML (seeds, counts, params, order) is the frozen spec, and its ids are <stem>-<n>',
    (id) => {
      const raw = rawLesson(id);
      const frozen = FROZEN[id];
      expect(specOf(raw.guided)).toEqual(frozen.guided);
      expect(specOf(raw.exercises)).toEqual(frozen.exercises);
      expect(specOf(raw.variants)).toEqual(frozen.variants);
      const lesson = lessonOf(id);
      const expandIds = (entries: readonly RawEntry[]): readonly string[] =>
        entries.flatMap((entry) =>
          Array.from(
            { length: entry.generate.count },
            (_unused, i) => `${entry.id}-${String(i + 1)}`,
          ),
        );
      expect(idsOf(lesson.guided)).toEqual(expandIds(raw.guided));
      expect(idsOf(lesson.exercises)).toEqual(expandIds(raw.exercises));
      expect(idsOf(lesson.variants)).toEqual(expandIds(raw.variants));
      // Every exercise sentence is generated: no authored exercise text is left.
      for (const def of itemsOf(lesson))
        expect(def.textKey, def.id).toBe(`lessons:gen.${def.id}.text`);
    },
  );

  it('grd-pixels: the seven drawings, their levels and their reveals are frozen', () => {
    const lesson = lessonOf('grd-pixels');
    expect(
      itemsOf(lesson).map((def) => {
        const { puzzle } = gridOf(def);
        if (puzzle.rules !== 'picture-cross') throw new Error(`${def.id} is not a picture`);
        const rows = Array.from({ length: puzzle.size }, (_, r) =>
          puzzle.solution
            .slice(r * puzzle.size, (r + 1) * puzzle.size)
            .map((filled) => (filled ? '#' : '.'))
            .join(''),
        );
        return [def.id, rows.join('/'), puzzle.maxLevel, puzzle.reveal];
      }),
    ).toEqual(FROZEN_PICTURES);
    // The kit's own instruction, a guided try is a whole small picture (no targets).
    for (const def of itemsOf(lesson)) {
      expect(def.textKey, def.id).toBe('common:grid.instruction.cross');
      expect(gridOf(def).targets, def.id).toBeUndefined();
    }
  });

  it('use only parameter sets that the template tests run (200 seeds fast, 1 000 slow), the boss included', () => {
    const tested = new Set(
      SUDOKU_SETS.map((set) =>
        JSON.stringify([
          set.template,
          ...Object.entries(
            LOGIC_TEMPLATES[set.template]?.params.parse({
              empty: set.empty,
              guided: set.guided,
              ...(set.maxTries === undefined ? {} : { maxTries: set.maxTries }),
            }) as object,
          ).sort(),
        ]),
      ),
    );
    const entries = [
      ...SUDOKU_LESSONS.flatMap((id) => {
        const raw = rawLesson(id);
        return [...raw.guided, ...raw.exercises, ...raw.variants];
      }),
      ...rawBoss,
    ];
    expect(entries).toHaveLength(7 * 4 + 5);
    for (const { id, generate } of entries) {
      const parsed = LOGIC_TEMPLATES[generate.template]?.params.parse(generate.params) as object;
      expect(
        tested.has(JSON.stringify([generate.template, ...Object.entries(parsed).sort()])),
        id,
      ).toBe(true);
    }
  });

  it('have exactly one easier variant, for the hardest (last) scored item, of the same kind; no guided item has one', () => {
    const easierOf = (id: string): readonly (readonly [string, string])[] =>
      lessonOf(id).exercises.flatMap((def) =>
        def.easier === undefined ? [] : [[def.id, def.easier] as const],
      );
    expect(easierOf('grd-last')).toEqual([['last-6b-1', 'last-easy-1']]);
    expect(easierOf('grd-only-place')).toEqual([['place-8b-1', 'place-easy-1']]);
    expect(easierOf('grd-only-number')).toEqual([['num-10b-1', 'num-easy-1']]);
    expect(easierOf('grd-six')).toEqual([['six-16-1', 'six-easy-1']]);
    expect(easierOf('grd-pixels')).toEqual([['pix-cat', 'pix-mouse']]);
    for (const id of LESSON_IDS) {
      const lesson = lessonOf(id);
      expect(lesson.guided.filter((def) => def.easier !== undefined)).toEqual([]);
      const last = lesson.exercises.at(-1);
      expect(last?.easier, id).toBe(lesson.variants?.[0]?.id);
    }
  });

  it('give each easier variant fewer empty cells (a sudoku) or a lower level (the picture) than the item it eases', () => {
    for (const id of SUDOKU_LESSONS) {
      const lesson = lessonOf(id);
      const hardest = gridOf(lesson.exercises.at(-1) as LogicExerciseDef);
      const [variant] = (lesson.variants ?? []).map(gridOf);
      if (hardest.puzzle.rules !== 'sudoku' || variant?.puzzle.rules !== 'sudoku') {
        throw new Error(`${id} is not a sudoku lesson`);
      }
      expect(emptyCount(variant.puzzle.givens), id).toBeLessThan(emptyCount(hardest.puzzle.givens));
      expect(variant.puzzle.focus, id).toBe(hardest.puzzle.focus);
    }
    const [hardest, variant] = [
      lessonOf('grd-pixels').exercises.at(-1),
      lessonOf('grd-pixels').variants?.[0],
    ].map((def) => gridOf(def as LogicExerciseDef).puzzle);
    expect(hardest?.rules === 'picture-cross' && hardest.maxLevel).toBe(3);
    expect(variant?.rules === 'picture-cross' && variant.maxLevel).toBe(2);
  });

  it('count the empty cells of the curriculum table: guided, scored, variant, boss', () => {
    const empties = (defs: readonly LogicExerciseDef[]): readonly number[] =>
      defs.map((def) => {
        const { puzzle } = gridOf(def);
        return puzzle.rules === 'sudoku' ? emptyCount(puzzle.givens) : -1;
      });
    const table: Readonly<Record<string, readonly (readonly number[])[]>> = {
      'grd-last': [[3, 6], [4, 5, 6, 6], [3]],
      'grd-only-place': [[5, 6], [6, 7, 8, 8], [5]],
      'grd-only-number': [[7, 8], [8, 9, 10, 10], [7]],
      'grd-six': [[6, 8], [10, 12, 14, 16], [8]],
    };
    for (const [id, [guided, scored, variant]] of Object.entries(table)) {
      const lesson = lessonOf(id);
      expect(empties(lesson.guided), `${id} guided`).toEqual(guided);
      expect(empties(lesson.exercises), `${id} scored`).toEqual(scored);
      expect(empties(lesson.variants ?? []), `${id} variant`).toEqual(variant);
    }
    expect(empties(boss.rounds)).toEqual([5, 7, 9, 8, 10]);
  });

  it('have no repeated grid: no two sudoku items share the same givens, no 4 x 4 solution repeats inside one lesson (and none repeats anywhere in the world)', () => {
    const givens = SUDOKUS.map((item) => `${String(item.size)}:${item.givens.join('')}`);
    expect(new Set(givens).size).toBe(SUDOKUS.length);
    for (const lesson of [...SUDOKU_LESSONS, 'sudoku-sprint']) {
      const solutions = SUDOKUS.filter((item) => item.lesson === lesson && item.size === 4).map(
        (item) => (findSudokuSolution(item.size, item.givens) ?? []).join(''),
      );
      expect(new Set(solutions).size, lesson).toBe(solutions.length);
    }
    // Stricter than the guard: every solution grid (4 x 4 and 6 x 6) is its own in the whole world.
    const everySolution = SUDOKUS.map((item) =>
      (findSudokuSolution(item.size, item.givens) ?? []).join(''),
    );
    expect(new Set(everySolution).size).toBe(SUDOKUS.length);
    expect(SUDOKUS).toHaveLength(33);
  });

  it('draw seven different pictures', () => {
    const drawings = picturesOf(lessonOf('grd-pixels')).map((def) =>
      def.puzzle.rules === 'picture-cross' ? def.puzzle.solution.join('') : '',
    );
    expect(new Set(drawings).size).toBe(7);
    const reveals = picturesOf(lessonOf('grd-pixels')).map((def) =>
      def.puzzle.rules === 'picture-cross' ? def.puzzle.reveal : undefined,
    );
    expect(new Set(reveals).size).toBe(7);
  });

  it('use the kinds of the curriculum table: every item is a grid-fill, guided sudoku tries have one target, nothing else does', () => {
    for (const { where, def } of ALL) {
      expect(def.type, where).toBe('grid-fill');
      const guided = LESSON_IDS.some((id) => lessonOf(id).guided.includes(def));
      if (guided && def.puzzle.rules === 'sudoku') {
        expect(def.targets, where).toHaveLength(1);
      } else {
        expect(def.targets, where).toBeUndefined();
      }
    }
    for (const id of SUDOKU_LESSONS) {
      for (const def of lessonOf(id).guided) expect(def.type).toBe('grid-fill');
    }
  });

  it('say the strategy in the story and a worked step in the demo, and every instruction in at most 16 words', () => {
    const strategy: Readonly<Record<(typeof LESSON_IDS)[number], RegExp>> = {
      'grd-last': /If only one cell is empty/,
      'grd-only-place': /fits in only one place/,
      'grd-only-number': /The number left is the answer/,
      'grd-six': /The same tricks still work/,
      'grd-pixels': /Fill the cells you are sure of, cross out the empty ones/,
    };
    for (const id of LESSON_IDS) {
      const lesson = lessonOf(id);
      const story = english(lesson.storyKey);
      expect(story.split(/(?<=[.!?])\s+/).length, `${id} story`).toBeGreaterThanOrEqual(2);
      expect(story, id).toMatch(strategy[id]);
      expect(english(lesson.demo.textKey).length, `${id} demo`).toBeGreaterThan(20);
      expect(lesson.demo.prompt?.big ?? lesson.demo.prompt?.emoji, `${id} demo card`).toBeTruthy();
      for (const def of itemsOf(lesson)) {
        const words = english(def.textKey).split(/\s+/);
        expect(words.length, `${def.id}: "${words.join(' ')}"`).toBeLessThanOrEqual(16);
      }
    }
    expect(english(lessonOf('grd-last').storyKey)).toBe(
      'Pip has a number grid. The rule: each row, column and box has every number once. If only one cell is empty, which number is missing?',
    );
    expect(english(lessonOf('grd-pixels').demo.textKey)).toBe(
      'A 5 in a row of five: fill them all. A 0: cross them all out.',
    );
  });

  it('word every sudoku instruction as the curriculum does: the ringed cell for a guided try, one sentence per technique for a whole grid', () => {
    const sentence: Readonly<Record<string, string>> = {
      'grd-last': 'Fill the grid. Look for a row, column or box with one empty cell.',
      'grd-only-place': 'Fill the grid. For each number, find the only place it can go in a box.',
      'grd-only-number': 'Fill the grid. For each empty cell, find the only number left.',
      'grd-six': 'Fill the big grid: each row, column and box has 1 to 6 once.',
    };
    for (const id of SUDOKU_LESSONS) {
      const lesson = lessonOf(id);
      for (const def of lesson.guided) {
        expect(english(def.textKey), def.id).toBe('Which number goes in the ringed cell?');
      }
      for (const def of [...lesson.exercises, ...(lesson.variants ?? [])]) {
        expect(english(def.textKey), def.id).toBe(sentence[id]);
      }
    }
    for (const def of boss.rounds) {
      expect(
        ['sdk-last', 'sdk-place', 'sdk-number', 'sdk-six'].map((id) => english(`templates.${id}`)),
      ).toContain(english(def.textKey));
    }
  });

  it('can speak no card-kit reasons: a grid has no wrong-card bugs', () => {
    for (const { where, def } of ALL) expect(def, where).not.toHaveProperty('reasons');
  });

  it('narrates everything a child hears: story, demo, every instruction, the boss goal and the grid notes are in the voice inventory', () => {
    const listed = new Set(compiled.voiceTexts.entries.map((entry) => entry.text));
    for (const id of LESSON_IDS) {
      const lesson = lessonOf(id);
      expect(listed.has(english(lesson.storyKey)), `${id} story`).toBe(true);
      expect(listed.has(english(lesson.demo.textKey)), `${id} demo`).toBe(true);
    }
    for (const { where, def } of ALL) expect(listed.has(english(def.textKey)), where).toBe(true);
    expect(listed.has('Fill the grids, step by step!')).toBe(true);
    // The grid notes (a rejected number per unit, a hint per technique) come with the first grid lesson.
    for (const text of [
      'That number is already in this row.',
      'That number is already in this column.',
      'That number is already in this box.',
      'Tap a cell first.',
      'Only one cell is empty here. Which number is missing?',
      'Only one cell here can take the number. Find it!',
      'This cell has only one number left. Cross out the others.',
      'This clue fills the whole line.',
      'The run is long: the middle cells are filled wherever it starts.',
      'Use the fills and crosses from the other lines.',
    ]) {
      expect(listed.has(text), text).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------

describe('the content review of World 3: exactly one reading leads to the answer (from the compiled puzzles)', () => {
  it('W3.1 every sudoku has exactly one solution that the lesson’s allowed techniques reach, and its focus technique occurs', () => {
    for (const item of SUDOKUS) {
      expect(countSudokuSolutions(item.size, item.givens), item.where).toBe(1);
      const allowed = LESSON_TECHNIQUES[item.focus];
      const solved = humanSolveSudoku(item.size, item.givens, allowed);
      expect(solved.solved, item.where).toBe(true);
      expect(solved.grid, item.where).toEqual(findSudokuSolution(item.size, item.givens));
      if (item.focus !== 'all') expect(solved.counts[item.focus], item.where).toBeGreaterThan(0);
      // Never a technique outside the set.
      for (const [technique, count] of Object.entries(solved.counts)) {
        if (!(allowed as readonly string[]).includes(technique)) {
          expect(count, `${item.where} ${technique}`).toBe(0);
        }
      }
    }
  });

  it('W3.2 the grids match their lessons: 4 x 4 for the first three, 6 x 6 with boxes of 2 rows by 3 columns for the fourth and the boss’s last two rounds; the focus is the lesson’s technique', () => {
    const focusOf: Readonly<Record<string, SudokuFocus>> = {
      'grd-last': 'last-cell',
      'grd-only-place': 'hidden-single',
      'grd-only-number': 'naked-single',
      'grd-six': 'naked-single',
    };
    for (const item of SUDOKUS.filter((candidate) => candidate.lesson !== 'sudoku-sprint')) {
      expect(item.size, item.where).toBe(item.lesson === 'grd-six' ? 6 : 4);
      expect(item.focus, item.where).toBe(focusOf[item.lesson]);
    }
    expect(
      boss.rounds.map((round) => [
        round.id,
        gridOf(round).puzzle.rules === 'sudoku'
          ? (gridOf(round).puzzle as { size: number; focus: string }).size
          : 0,
      ]),
    ).toEqual([
      ['sprint-last-1', 4],
      ['sprint-place-1', 4],
      ['sprint-number-1', 4],
      ['sprint-six8-1', 6],
      ['sprint-six10-1', 6],
    ]);
  });

  it('W3.3 a guided try: the one ringed cell is empty, it is the cell of the first step with the lesson’s technique, and nothing else is asked', () => {
    for (const item of SUDOKUS.filter((candidate) => candidate.def.targets !== undefined)) {
      const [target, ...more] = item.def.targets ?? [];
      expect(more, item.where).toEqual([]);
      expect(item.givens[target ?? -1], item.where).toBe(0);
      const step = firstStep(item);
      expect(step?.technique, item.where).toBe(item.focus);
      expect(step?.cell, item.where).toBe(target);
      expect(english(item.def.textKey), item.where).toBe('Which number goes in the ringed cell?');
    }
    // The curriculum asks for a row and a box in the first lesson; only place always points at a box.
    const unitsOf = (lessonId: string): readonly (string | undefined)[] =>
      SUDOKUS.filter((item) => item.lesson === lessonId && item.def.targets !== undefined).map(
        (item) => firstStep(item)?.units[0]?.kind,
      );
    expect(unitsOf('grd-last')).toEqual(['row', 'box']);
    expect(unitsOf('grd-only-place')).toEqual(['box', 'box']);
    expect(unitsOf('grd-only-number')).toEqual(['row', 'row']);
    expect(unitsOf('grd-six')).toEqual(['row', 'row']);
  });

  it('W3.4 the whole-grid sentences name what is there to find: "last cell" grids start with a unit that has one empty cell, "only place" grids with a box that has an only place, "only number" grids with a cell that has one number left', () => {
    for (const item of SUDOKUS.filter((candidate) => candidate.def.targets === undefined)) {
      const step = firstStep(item);
      expect(step?.technique, item.where).toBe(item.focus);
      if (item.focus === 'hidden-single') expect(step?.units[0]?.kind, item.where).toBe('box');
      if (item.focus === 'naked-single') expect(step?.units, item.where).toHaveLength(3);
      if (item.focus === 'last-cell') expect(step?.units, item.where).toHaveLength(1);
    }
    // The 6 x 6 sentence promises 1 to 6 in every row, column and box: true of every 6 x 6 solution.
    for (const item of SUDOKUS.filter((candidate) => candidate.size === 6)) {
      const solution = findSudokuSolution(6, item.givens) ?? [];
      for (let row = 0; row < 6; row += 1) {
        expect(new Set(solution.slice(row * 6, row * 6 + 6)).size, item.where).toBe(6);
      }
    }
  });

  it('W3.5 pictures are 5 x 5 with a clue for every line, one solution, and the solver needs the level the YAML says (a step of exactly that level occurs)', () => {
    for (const def of picturesOf(lessonOf('grd-pixels'))) {
      const { puzzle } = def;
      if (puzzle.rules !== 'picture-cross') throw new Error(`${def.id} is not a picture`);
      expect(puzzle.size, def.id).toBe(5);
      expect(puzzle.rows, def.id).toHaveLength(5);
      expect(puzzle.cols, def.id).toHaveLength(5);
      expect(countCrossSolutions(5, puzzle.rows, puzzle.cols), def.id).toBe(1);
      const solved = humanSolveCross(5, puzzle.rows, puzzle.cols, puzzle.maxLevel);
      expect(solved.solved, def.id).toBe(true);
      expect(
        solved.steps.some((step) => CROSS_LEVEL[step.technique] === puzzle.maxLevel),
        def.id,
      ).toBe(true);
      // One level less is not enough (so `maxLevel` is the lowest that solves it).
      if (puzzle.maxLevel > 1) {
        expect(
          humanSolveCross(5, puzzle.rows, puzzle.cols, (puzzle.maxLevel - 1) as 1 | 2).solved,
          def.id,
        ).toBe(false);
      }
    }
  });

  it('W3.6 the picture lesson climbs as the curriculum says: full lines; overlap; two with cross-out; two that need combine; the easier picture has overlap and no combine', () => {
    const counts = (def: LogicExerciseDef): Record<string, number> => {
      const { puzzle } = gridOf(def);
      if (puzzle.rules !== 'picture-cross') throw new Error(`${def.id} is not a picture`);
      return { ...humanSolveCross(5, puzzle.rows, puzzle.cols, puzzle.maxLevel).counts };
    };
    const lesson = lessonOf('grd-pixels');
    const [snake, rabbit] = lesson.guided.map(counts);
    expect(snake).toEqual({ 'full-line': 8, overlap: 0, 'cross-out': 0, combine: 0 });
    expect(rabbit?.overlap).toBeGreaterThan(0);
    expect(rabbit?.combine).toBe(0);
    const [frog, owl, turtle, cat] = lesson.exercises.map(counts);
    for (const level2 of [frog, owl]) {
      expect(level2?.['cross-out']).toBeGreaterThan(0);
      expect(level2?.combine).toBe(0);
    }
    for (const level3 of [turtle, cat]) expect(level3?.combine).toBeGreaterThan(0);
    // The hardest picture needs the most combining.
    expect(cat?.combine).toBeGreaterThan(turtle?.combine ?? 0);
    const mouse = counts(lesson.variants?.[0] as LogicExerciseDef);
    expect(mouse.overlap).toBeGreaterThan(0);
    expect(mouse.combine).toBe(0);
  });

  it('W3.7 every exercise plays through its own kind with 3 stars, and a wrong try costs exactly one error', () => {
    for (const { where, def } of ALL) {
      expect(playSolution(def), where).toMatchObject({ solved: true, errors: 0 });
      expect(starsFor(playSolution(def)), where).toBe(3);
      expect(playWrongThenSolve(def), where).toMatchObject({ solved: true, errors: 1 });
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------

describe('the Sudoku Sprint', () => {
  it('is the boss of the world (tracks.yaml), 5 rounds in the YAML spec that is frozen: last cell, only place, only number, then two 6 x 6 grids', () => {
    expect(specOf(rawBoss)).toEqual(FROZEN_BOSS);
    expect(boss.rounds.map((round) => round.id)).toEqual([
      'sprint-last-1',
      'sprint-place-1',
      'sprint-number-1',
      'sprint-six8-1',
      'sprint-six10-1',
    ]);
    expect(boss).toMatchObject({
      id: 'sudoku-sprint',
      mode: 'series',
      concept: 'grd-six',
      unlockAfter: 'grd-pixels',
      errors3: 1,
      errors2: 3,
    });
    expect(english(boss.titleKey)).toBe('Sudoku Sprint');
    expect(english(boss.goalKey)).toBe('Fill the grids, step by step!');
    const main = compiled.tracks.tracks[0];
    expect(main?.worlds.find((world) => world.id === 'grid-puzzles')?.boss).toBe('sudoku-sprint');
    // Opened by the world's last lesson.
    expect(lessonOf('grd-pixels').order).toBe(
      Math.max(...content.lessons.filter((l) => l.world === 'grid-puzzles').map((l) => l.order)),
    );
  });

  it('has no guided target and no easier offer: each round is a whole grid of the lesson it follows', () => {
    for (const round of boss.rounds) {
      expect(gridOf(round).targets, round.id).toBeUndefined();
      expect(round.easier, round.id).toBeUndefined();
    }
  });

  it('plays: every round is solved by its own kind with 3 stars', () => {
    for (const round of boss.rounds) {
      expect(playSolution(round), round.id).toMatchObject({ solved: true, errors: 0 });
      expect(playWrongThenSolve(round), round.id).toMatchObject({ solved: true, errors: 1 });
    }
  });
});

describe('the world, its rank and its badge', () => {
  it('is Grid Puzzles in the jungle, third on the Puzzle Paths (the gap before it is Sort Shore, m14.10), with Sudoku Sprint as its boss and the solver rank after it', () => {
    const [main] = compiled.tracks.tracks;
    expect(main?.worlds.find((world) => world.id === 'grid-puzzles')).toEqual(
      expect.objectContaining({
        id: 'grid-puzzles',
        order: 3,
        habitat: 'jungle',
        boss: 'sudoku-sprint',
      }),
    );
    expect(compiled.tracks.ranks).toContainEqual({ id: 'solver', after: 'world:grid-puzzles' });
    const en = locales.en as Record<string, Record<string, unknown>> | undefined;
    expect(en?.journey).toMatchObject({
      worlds: { 'grid-puzzles': 'Grid Puzzles' },
      ranks: { solver: 'Puzzle Solver' },
    });
  });

  it('has the Puzzle Solver badge (master the world and beat the sprint)', () => {
    expect(compiled.badges.find((badge) => badge.id === 'puzzle-solver')?.condition).toEqual({
      type: 'mastered',
      scope: 'world:grid-puzzles',
      thresholds: [1],
    });
    const en = locales.en as Record<string, Record<string, unknown>> | undefined;
    expect(en?.rewards?.badges).toMatchObject({
      'puzzle-solver': {
        name: 'Puzzle Solver',
        condition: 'Master Grid Puzzles and beat Sudoku Sprint',
      },
    });
  });
});

describe('the review’s own checks (they reject a bad grid)', () => {
  it('firstStep reads the technique and the unit of the step a hint would point at', () => {
    const item: SudokuItem = {
      where: 'fixture',
      lesson: 'fixture',
      def: gridOf(lessonOf('grd-last').guided[0] as LogicExerciseDef),
      size: 4,
      givens: [3, 4, 1, 2, 1, 2, 0, 3, 0, 3, 2, 0, 2, 0, 0, 4],
      focus: 'last-cell',
    };
    expect(firstStep(item)).toMatchObject({ technique: 'last-cell', cell: 6, value: 4 });
    expect(firstStep({ ...item, givens: new Array<number>(16).fill(0) })).toBeUndefined();
  });

  it('the counter tells a unique grid from one with two solutions and one with none', () => {
    expect(countSudokuSolutions(4, [3, 4, 1, 2, 1, 2, 0, 3, 0, 3, 2, 0, 2, 0, 0, 4])).toBe(1);
    expect(countSudokuSolutions(4, new Array<number>(16).fill(0))).toBe(2);
    expect(countSudokuSolutions(4, [1, 1, ...new Array<number>(14).fill(0)])).toBe(0);
  });
});
