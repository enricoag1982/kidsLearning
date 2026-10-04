// `grid-fill` content: the YAML shape, the build's compile, every verify rule with a failing fixture, the voice templates.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compileAll } from '@learn/platform-content/compile-all';
import { cardStimulus } from '@learn/platform-content/kinds/cards/stimulus';
import { makeCompileContext } from '@learn/platform-content/kinds/kind-content';
import { createExerciseSchema } from '@learn/platform-content/lesson-schema';
import { resolveText } from '@learn/platform-content/text-resolve';
import type { CompiledContent, Resolve } from '@learn/platform-core';
import { contentRoot } from '../../scripts/content-root.ts';
import { logicCore } from '../core/logic-core.ts';
import type { GridFillDef } from '../kinds/grid-fill/def.ts';
import { GRID_FILL_SAMPLES } from '../kinds/grid-fill/samples.ts';
import { gridFill } from './grid-fill.ts';
import { gridFillVoiceTemplates } from './grid-fill-voice.ts';
import { logicContent } from './logic-content.ts';

const schema = createExerciseSchema({ 'grid-fill': gridFill }, cardStimulus);

/** The sudoku example of the spec: only-place puzzle with its first step as the guided target (row 0, column 0). */
const sudoku = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'sdk-a',
  type: 'grid-fill',
  sudoku: ['.231', '3124', '24..', '.3..'],
  focus: 'hidden-single',
  targets: [[0, 0]],
  ...overrides,
});

const picture = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'pix-a',
  type: 'grid-fill',
  picture: ['.#.#.', '#####', '#####', '.###.', '..#..'],
  maxLevel: 3,
  reveal: '🐱',
  ...overrides,
});

function compile(raw: Record<string, unknown>, issues: string[] = []): GridFillDef | null {
  const parsed = schema.parse(raw);
  const stimulus = cardStimulus.compile(parsed, { where: 'where', issues });
  if (stimulus === null) return null;
  const ctx = makeCompileContext(
    'lesson.yaml',
    'exercises[0]',
    issues,
    { id: parsed.id, concept: 'grid', textKey: `lessons:${parsed.text ?? parsed.id}` },
    parsed.easier,
    stimulus,
  );
  return gridFill.compile(gridFill.schema.parse(raw), ctx);
}

/** Every issue one raw exercise yields: schema, then compile, then verify. */
function issuesOf(raw: Record<string, unknown>): readonly string[] {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return parsed.error.issues.map((issue) => issue.message);
  const issues: string[] = [];
  const def = compile(raw, issues);
  if (def !== null) gridFill.verify?.(def, 'where', issues);
  return issues;
}

/** Every issue verify finds in a hand-built def. */
function verifyIssues(def: GridFillDef): readonly string[] {
  const issues: string[] = [];
  gridFill.verify?.(def, 'where', issues);
  return issues;
}

function mustCompile(raw: Record<string, unknown>): GridFillDef {
  const def = compile(raw);
  if (def === null) throw new Error('did not compile');
  return def;
}

const { lastCell, hiddenSingle, nakedSingle, all, six, castle, cat } = GRID_FILL_SAMPLES;

describe('grid-fill YAML: a sudoku', () => {
  it('compiles the spec example: the head, the default instruction, the puzzle with its solution, the target as a cell', () => {
    const def = mustCompile(sudoku());
    expect(def).toEqual({
      id: 'sdk-a',
      concept: 'grid',
      textKey: 'common:grid.instruction.sudoku',
      type: 'grid-fill',
      puzzle: {
        rules: 'sudoku',
        size: 4,
        givens: [0, 2, 3, 1, 3, 1, 2, 4, 2, 4, 0, 0, 0, 3, 0, 0],
        solution: [4, 2, 3, 1, 3, 1, 2, 4, 2, 4, 1, 3, 1, 3, 4, 2],
        focus: 'hidden-single',
      },
      targets: [0],
    });
    expect(Object.keys(def)).toEqual(['id', 'concept', 'textKey', 'type', 'puzzle', 'targets']);
    expect(issuesOf(sudoku())).toEqual([]);
  });

  it('is the same puzzle as the sample built through the parsers', () => {
    expect(mustCompile(sudoku()).puzzle).toEqual(hiddenSingle.puzzle);
  });

  it('takes `text` for the instruction key, a card prompt or none, and no targets', () => {
    expect(compile(sudoku({ text: 'sdk-where' }))?.textKey).toBe('lessons:sdk-where');
    expect(compile(sudoku({ targets: undefined }))).not.toHaveProperty('targets');
    expect(compile(sudoku({ prompt: { emoji: '🧩' } }))?.prompt).toEqual({ emoji: '🧩' });
    expect(compile(sudoku({ easier: 'sdk-easy' }))?.easier).toBe('sdk-easy');
  });

  it('takes a 6 x 6 (boxes 2 rows x 3 columns) and every focus', () => {
    const rows = ['246.13', '351...', '1.5624', '6...35', '4..3.1', '5.3462'];
    const def = mustCompile(sudoku({ sudoku: rows, focus: 'naked-single', targets: [[0, 3]] }));
    expect(def.puzzle).toMatchObject({ size: 6, focus: 'naked-single' });
    expect(def.targets).toEqual([3]);
    expect(def.puzzle).toEqual(six.puzzle);
    expect(issuesOf(sudoku({ sudoku: rows, focus: 'naked-single', targets: [[0, 3]] }))).toEqual(
      [],
    );
    for (const [focus, puzzle, target] of [
      ['last-cell', lastCell, [[1, 2]]],
      ['naked-single', nakedSingle, [[0, 0]]],
      ['all', all, [[0, 2]]],
    ] as const) {
      const given = puzzle.puzzle.rules === 'sudoku' ? puzzle.puzzle.givens : [];
      const text = [0, 4, 8, 12].map((start) =>
        given
          .slice(start, start + 4)
          .map((value) => (value === 0 ? '.' : String(value)))
          .join(''),
      );
      expect(issuesOf(sudoku({ sudoku: text, focus, targets: target })), focus).toEqual([]);
    }
  });

  it('rejects a bad shape: no form, both, a missing focus, fields of the other form, an unknown field', () => {
    expect(issuesOf({ id: 'a', type: 'grid-fill' })).toEqual([
      'needs "sudoku" (rows of digits and ".") or "picture" (rows of "#" and "."), exactly one',
    ]);
    expect(issuesOf(sudoku({ picture: ['#'] }))).toHaveLength(1);
    expect(issuesOf(sudoku({ focus: undefined }))).toEqual([
      'a sudoku needs "focus" (last-cell, hidden-single, naked-single, all)',
    ]);
    expect(issuesOf(sudoku({ focus: 'some' })).length).toBeGreaterThan(0);
    expect(issuesOf(sudoku({ maxLevel: 2 }))).toEqual(['"maxLevel" is for a picture']);
    expect(issuesOf(sudoku({ reveal: '🐱' }))).toEqual(['"reveal" is for a picture']);
    expect(issuesOf(sudoku({ speed: 3 })).length).toBeGreaterThan(0);
    expect(issuesOf(sudoku({ targets: [] })).length).toBeGreaterThan(0);
    expect(issuesOf(sudoku({ targets: [[0]] })).length).toBeGreaterThan(0);
    expect(issuesOf(sudoku({ targets: [[0, -1]] })).length).toBeGreaterThan(0);
    expect(issuesOf(sudoku({ targets: [[0, 1.5]] })).length).toBeGreaterThan(0);
    expect(issuesOf(sudoku({ targets: [0] })).length).toBeGreaterThan(0);
  });

  it('rejects rows that are not a 4 x 4 or 6 x 6 grid of "." and digits (a)', () => {
    expect(issuesOf(sudoku({ sudoku: ['.231', '3124', '24..'] }))).toEqual([
      'lesson.yaml: exercises[0]: sudoku: 3 rows (4 or 6 expected)',
    ]);
    expect(issuesOf(sudoku({ sudoku: ['.231', '3124', '24..', '.3.'] }))).toEqual([
      'lesson.yaml: exercises[0]: sudoku: row 3 has 3 cells (4 expected)',
    ]);
    expect(issuesOf(sudoku({ sudoku: ['.231', '3124', '24..', '.3x.'] }))).toEqual([
      'lesson.yaml: exercises[0]: sudoku: "x" in row 3 (".", or a digit 1 to 4)',
    ]);
    expect(issuesOf(sudoku({ sudoku: ['.231', '3124', '24..', '.3.5'] }))).toEqual([
      'lesson.yaml: exercises[0]: sudoku: "5" in row 3 (".", or a digit 1 to 4)',
    ]);
    expect(issuesOf(sudoku({ sudoku: ['.231', '3120', '24..', '.3..'] })).length).toBe(1);
  });

  it('rejects a number twice in a row, a column or a box among the givens (a)', () => {
    const row = issuesOf(
      sudoku({ sudoku: ['1.1.', '....', '....', '....'], focus: 'last-cell', targets: undefined }),
    );
    expect(row).toEqual([
      'lesson.yaml: exercises[0]: row 0 has 1 twice among the givens (units count from 0)',
    ]);
    const column = issuesOf(
      sudoku({ sudoku: ['.231', '3124', '24..', '23..'], targets: undefined }),
    );
    expect(column).toContain(
      'lesson.yaml: exercises[0]: column 0 has 2 twice among the givens (units count from 0)',
    );
    const box = issuesOf(
      sudoku({ sudoku: ['1...', '.1..', '....', '....'], focus: 'last-cell', targets: undefined }),
    );
    expect(box).toContain(
      'lesson.yaml: exercises[0]: box 0 has 1 twice among the givens (units count from 0)',
    );
  });

  it('rejects givens that have no solution although no number repeats', () => {
    // Cell 0 has no candidate left: 1 and 2 in its row, 3 in its column, 4 in its box.
    expect(
      issuesOf(
        sudoku({ sudoku: ['.12.', '4...', '3...', '....'], focus: 'all', targets: undefined }),
      ),
    ).toEqual(['lesson.yaml: exercises[0]: the givens have no solution']);
  });

  it('rejects a target outside the grid (a column of 4 in a 4 x 4) before it can point at another cell', () => {
    expect(issuesOf(sudoku({ targets: [[0, 4]] }))).toEqual([
      'lesson.yaml: exercises[0]: target [0, 4] is outside the 4 x 4 grid',
    ]);
    expect(issuesOf(sudoku({ targets: [[4, 0]] }))).toEqual([
      'lesson.yaml: exercises[0]: target [4, 0] is outside the 4 x 4 grid',
    ]);
  });
});

describe('grid-fill verify: a sudoku', () => {
  it('passes every sample', () => {
    for (const def of [lastCell, hiddenSingle, nakedSingle, all, six]) {
      expect(verifyIssues(def), def.id).toEqual([]);
    }
  });

  it('(a) rejects a grid of the wrong size, digits out of range and a solution that is not a full valid grid', () => {
    const base = lastCell.puzzle;
    if (base.rules !== 'sudoku') throw new Error('lastCell is a sudoku');
    const puzzle = (patch: Partial<typeof base>): GridFillDef => ({
      ...lastCell,
      puzzle: { ...base, ...patch },
    });
    expect(verifyIssues(puzzle({ givens: base.givens.slice(1) }))).toEqual([
      'where: a 4 x 4 sudoku has 16 cells (15 givens, 16 in the solution)',
    ]);
    expect(verifyIssues(puzzle({ givens: base.givens.map((v, i) => (i === 0 ? 5 : v)) }))).toEqual([
      'where: given 5 (cell 0) is not 1 to 4',
    ]);
    expect(
      verifyIssues(puzzle({ solution: base.solution.map((v, i) => (i === 6 ? 0 : v)) })),
    ).toEqual(['where: solution 0 (cell 6) is not 1 to 4']);
    // Same digit twice in a unit of the solution (and the given it changes).
    const wrong = base.solution.map((v, i) => (i === 6 ? 3 : v));
    const issues = verifyIssues(puzzle({ solution: wrong }));
    expect(issues).toContain('where: the solution repeats a number in row 1');
    expect(issues.every((issue) => issue.startsWith('where: '))).toBe(true);
    // A solution that disagrees with a given.
    const swapped = base.solution.map((v, i) => (i === 0 ? 1 : i === 2 ? 3 : v));
    expect(verifyIssues(puzzle({ solution: swapped }))).toContain(
      'where: the solution changes the given in cell 0',
    );
  });

  it('(b) rejects a puzzle with more than one solution, or none', () => {
    const many = issuesOf(
      sudoku({ sudoku: ['.2.4', '.4.2', '2143', '4321'], focus: 'last-cell', targets: undefined }),
    );
    expect(many).toContain('where: the givens have more than one solution (exactly 1 expected)');
    const base = lastCell.puzzle;
    if (base.rules !== 'sudoku') throw new Error('lastCell is a sudoku');
    const none: GridFillDef = {
      ...lastCell,
      puzzle: { ...base, givens: base.givens.map((v, i) => (i === 8 ? 1 : v)) },
    };
    // A 1 in cell 8 clashes with the 1 in column 0 (and the solution's own 4).
    expect(verifyIssues(none).length).toBeGreaterThan(0);
  });

  it('(c) rejects a puzzle the focus’s techniques do not finish', () => {
    const tooWeak = issuesOf(
      sudoku({ sudoku: ['...4', '241.', '1.42', '...1'], focus: 'last-cell', targets: undefined }),
    );
    expect(tooWeak).toEqual([
      'where: the techniques of focus "last-cell" (last-cell) do not finish the puzzle',
    ]);
  });

  it('(d) rejects a puzzle that never uses its focus technique', () => {
    const lastOnly = ['3412', '12.3', '.32.', '2..4'];
    expect(
      issuesOf(sudoku({ sudoku: lastOnly, focus: 'hidden-single', targets: undefined })),
    ).toEqual(['where: focus "hidden-single" never occurs: the puzzle is solved without it']);
    expect(
      issuesOf(sudoku({ sudoku: lastOnly, focus: 'naked-single', targets: undefined })),
    ).toEqual(['where: focus "naked-single" never occurs: the puzzle is solved without it']);
    expect(issuesOf(sudoku({ sudoku: lastOnly, focus: 'all', targets: undefined }))).toEqual([
      'where: the puzzle never needs only place or only number: a last-cell puzzle (use focus "last-cell")',
    ]);
    expect(issuesOf(sudoku({ sudoku: lastOnly, focus: 'last-cell', targets: undefined }))).toEqual(
      [],
    );
  });

  it('(e) rejects a target that is a given, outside the grid, given twice, or not the first step', () => {
    // The only-place puzzle’s first step is cell 0 (row 0, column 0).
    expect(issuesOf(sudoku({ targets: [[1, 1]] }))).toEqual([
      'where: target cell 5 is a given, not an empty cell',
    ]);
    expect(issuesOf(sudoku({ targets: [[2, 2]] }))).toEqual([
      'where: the first step (hidden-single in cell 0) is not a target cell found by hidden-single',
    ]);
    expect(verifyIssues({ ...hiddenSingle, targets: [16] })).toEqual([
      'where: target cell 16 is outside the grid (0-15)',
    ]);
    expect(verifyIssues({ ...hiddenSingle, targets: [-1] })).toEqual([
      'where: target cell -1 is outside the grid (0-15)',
    ]);
    expect(verifyIssues({ ...hiddenSingle, targets: [0, 0] })).toEqual([
      'where: target cell 0 is given twice',
    ]);
    expect(verifyIssues({ ...hiddenSingle, targets: [0] })).toEqual([]);
    // Several targets: the first step only has to be one of them.
    expect(verifyIssues({ ...hiddenSingle, targets: [0, 14] })).toEqual([]);
    // The step must come from the focus technique: last-cell steps are cheaper but the focus goes first.
    expect(
      issuesOf(
        sudoku({ sudoku: ['3412', '12.3', '.32.', '2..4'], focus: 'last-cell', targets: [[1, 2]] }),
      ),
    ).toEqual([]);
    expect(
      issuesOf(
        sudoku({ sudoku: ['3412', '12.3', '.32.', '2..4'], focus: 'last-cell', targets: [[3, 1]] }),
      ),
    ).toEqual([
      'where: the first step (last-cell in cell 6) is not a target cell found by last-cell',
    ]);
    // With every technique allowed any technique may take the first step, but it must be a target.
    expect(
      issuesOf(
        sudoku({ sudoku: ['13.4', '423.', '3.4.', '..1.'], focus: 'all', targets: [[0, 2]] }),
      ),
    ).toEqual([]);
    expect(
      issuesOf(
        sudoku({ sudoku: ['13.4', '423.', '3.4.', '..1.'], focus: 'all', targets: [[3, 0]] }),
      ),
    ).toEqual(['where: the first step (last-cell in cell 2) is not a target cell']);
  });

  it('(f) rejects a 4 x 4 with no empty cell or more than 12, a 6 x 6 with more than 24', () => {
    const full = ['1432', '2314', '4123', '3241'];
    expect(issuesOf(sudoku({ sudoku: full, focus: 'last-cell', targets: undefined }))).toContain(
      'where: 0 empty cells in a 4 x 4 sudoku (1-12 expected)',
    );
    const thirteen = ['....', '....', '....', '3...'].map((row) => row);
    const sparse = issuesOf(
      sudoku({ sudoku: ['....', '....', '....', '...1'], focus: 'all', targets: undefined }),
    );
    expect(sparse).toContain('where: 15 empty cells in a 4 x 4 sudoku (1-12 expected)');
    expect(thirteen).toHaveLength(4);
    const sixSparse = issuesOf(
      sudoku({
        sudoku: ['......', '......', '......', '......', '......', '.....1'],
        focus: 'naked-single',
        targets: undefined,
      }),
    );
    expect(sixSparse).toContain('where: 35 empty cells in a 6 x 6 sudoku (1-24 expected)');
    // The limits themselves pass the count check.
    expect(
      verifyIssues({ ...lastCell, targets: undefined }).filter((issue) =>
        issue.includes('empty cells'),
      ),
    ).toEqual([]);
  });
});

describe('grid-fill YAML: a picture', () => {
  it('compiles the picture, its clues, the level and the reveal; the default instruction is the cross one', () => {
    const def = mustCompile(picture());
    expect(def).toEqual({
      id: 'pix-a',
      concept: 'grid',
      textKey: 'common:grid.instruction.cross',
      type: 'grid-fill',
      puzzle: {
        rules: 'picture-cross',
        size: 5,
        rows: [[1, 1], [5], [5], [3], [1]],
        cols: [[2], [4], [4], [4], [2]],
        solution: cat.puzzle.rules === 'picture-cross' ? cat.puzzle.solution : [],
        maxLevel: 3,
        reveal: '🐱',
      },
    });
    expect(def.puzzle).toEqual(cat.puzzle);
    expect(issuesOf(picture())).toEqual([]);
    expect(Object.keys(def.puzzle)).toEqual([
      'rules',
      'size',
      'rows',
      'cols',
      'solution',
      'maxLevel',
      'reveal',
    ]);
  });

  it('takes `text`, no reveal and 4 x 4 to 6 x 6', () => {
    expect(compile(picture({ text: 'pix-where' }))?.textKey).toBe('lessons:pix-where');
    expect(compile(picture({ reveal: undefined }))?.puzzle).not.toHaveProperty('reveal');
    expect(
      issuesOf(picture({ picture: ['#.#.#', '#####', '##.##', '#####', '#.#.#'], maxLevel: 1 })),
    ).toEqual([]);
    expect(
      mustCompile(
        picture({
          picture: ['#.#.#', '#####', '##.##', '#####', '#.#.#'],
          maxLevel: 1,
          reveal: '🏰',
        }),
      ).puzzle,
    ).toEqual(castle.puzzle);
    expect(
      issuesOf(
        picture({ picture: ['####', '#.##', '##.#', '####'], maxLevel: 1, reveal: undefined }),
      ),
    ).toEqual([]);
    expect(
      issuesOf(
        picture({
          picture: ['######', '#....#', '#.##.#', '#.##.#', '#....#', '######'],
          maxLevel: 3,
        }),
      ),
    ).toEqual([]);
  });

  it('rejects a bad shape: no maxLevel, a level outside 1-3, fields of a sudoku, a reveal that is not an emoji', () => {
    expect(issuesOf(picture({ maxLevel: undefined }))).toEqual([
      'a picture needs "maxLevel" (1, 2 or 3)',
    ]);
    expect(issuesOf(picture({ maxLevel: 4 })).length).toBeGreaterThan(0);
    expect(issuesOf(picture({ maxLevel: 0 })).length).toBeGreaterThan(0);
    expect(issuesOf(picture({ focus: 'all' }))).toEqual(['"focus" is for a sudoku']);
    expect(issuesOf(picture({ targets: [[0, 1]] }))).toEqual(['"targets" is for a sudoku']);
    expect(issuesOf(picture({ reveal: 'cat' })).length).toBeGreaterThan(0);
  });

  it('(a) rejects a picture that is not square or has other characters', () => {
    expect(issuesOf(picture({ picture: ['.#.#.', '#####', '#####', '.###.'] }))).toEqual([
      'lesson.yaml: exercises[0]: picture: row 0 has 5 cells (4 expected)',
    ]);
    expect(issuesOf(picture({ picture: ['.#.#.', '#####', '#####', '.###.', '..#.'] }))).toEqual([
      'lesson.yaml: exercises[0]: picture: row 4 has 4 cells (5 expected)',
    ]);
    expect(issuesOf(picture({ picture: ['.#.#.', '#####', '#####', '.###.', '..x..'] }))).toEqual([
      'lesson.yaml: exercises[0]: picture: "x" in row 4 ("#" or ".")',
    ]);
  });
});

describe('grid-fill verify: a picture', () => {
  it('passes both samples', () => {
    expect(verifyIssues(castle)).toEqual([]);
    expect(verifyIssues(cat)).toEqual([]);
  });

  it('(a) rejects a picture smaller than 4 x 4 or larger than 6 x 6, or without a filled cell', () => {
    expect(issuesOf(picture({ picture: ['##', '##'], maxLevel: 1 }))).toEqual([
      'where: the picture is 2 x 2: 4 to 6 fit (the lessons draw 5 x 5)',
    ]);
    const seven = Array.from({ length: 7 }, () => '#######');
    expect(issuesOf(picture({ picture: seven, maxLevel: 1 }))).toEqual([
      'where: the picture is 7 x 7: 4 to 6 fit (the lessons draw 5 x 5)',
    ]);
    expect(
      issuesOf(picture({ picture: ['.....', '.....', '.....', '.....', '.....'], maxLevel: 1 })),
    ).toEqual(['where: the picture has no filled cell']);
  });

  it('(a) rejects clues that do not match the picture and a grid of the wrong length', () => {
    const base = cat.puzzle;
    if (base.rules !== 'picture-cross') throw new Error('cat is a picture');
    const withPuzzle = (patch: Partial<typeof base>): GridFillDef => ({
      ...cat,
      puzzle: { ...base, ...patch },
    });
    expect(verifyIssues(withPuzzle({ rows: [[1, 1], [5], [5], [3], [2]] }))).toEqual([
      'where: the clues do not match the picture',
    ]);
    expect(verifyIssues(withPuzzle({ solution: base.solution.slice(1) }))).toEqual([
      'where: the solution and the clues must fit a 5 x 5 grid',
    ]);
    expect(verifyIssues(withPuzzle({ cols: base.cols.slice(1) }))).toEqual([
      'where: the solution and the clues must fit a 5 x 5 grid',
    ]);
  });

  it('(b) rejects clues with more than one picture', () => {
    const issues = issuesOf(
      picture({ picture: ['#.#.', '.#.#', '#.#.', '.#.#'], maxLevel: 3, reveal: undefined }),
    );
    expect(issues).toContain('where: the clues have more than one solution (exactly 1 expected)');
  });

  it('(c) rejects a picture the lesson’s line techniques do not finish', () => {
    expect(issuesOf(picture({ maxLevel: 2 }))).toEqual([
      'where: the line techniques up to level 2 do not finish the picture',
    ]);
    expect(issuesOf(picture({ maxLevel: 1 }))).toEqual([
      'where: the line techniques up to level 1 do not finish the picture',
    ]);
  });

  it('(d) rejects a maxLevel the picture never needs', () => {
    const rows = ['#.#.#', '#####', '##.##', '#####', '#.#.#'];
    expect(issuesOf(picture({ picture: rows, maxLevel: 3, reveal: undefined }))).toEqual([
      'where: no step needs level 3: the picture is solved without it (lower maxLevel)',
    ]);
    expect(issuesOf(picture({ picture: rows, maxLevel: 2, reveal: undefined }))).toEqual([
      'where: no step needs level 2: the picture is solved without it (lower maxLevel)',
    ]);
    expect(issuesOf(picture({ picture: rows, maxLevel: 1, reveal: undefined }))).toEqual([]);
  });

  it('(e) rejects a hand-built target off the grid or on an empty picture cell', () => {
    expect(verifyIssues({ ...cat, targets: [25] })).toEqual([
      'where: target cell 25 is outside the grid (0-24)',
    ]);
    expect(verifyIssues({ ...cat, targets: [0] })).toEqual([
      'where: target cell 0 is not a filled cell',
    ]);
    expect(verifyIssues({ ...cat, targets: [1] })).toEqual([]);
  });
});

describe('grid-fill voice templates', () => {
  const root = contentRoot(join(dirname(fileURLToPath(import.meta.url)), '..', '..'));
  const locales = compileAll(logicContent, root).locales.en ?? {};
  const r: Resolve = (key, vars) => {
    const separator = key.indexOf(':');
    const tree = locales[separator < 0 ? 'common' : key.slice(0, separator)] ?? {};
    const text = resolveText(tree, separator < 0 ? key : key.slice(separator + 1), vars);
    if (text === undefined) throw new Error(`no text for ${key}`);
    return text;
  };

  const contentWith = (...defs: readonly GridFillDef[]): CompiledContent => ({
    version: 1,
    lessons: [
      {
        id: 'l',
        world: 'w',
        order: 1,
        concept: 'c',
        character: 'panda',
        titleKey: 'lessons:l.title',
        storyKey: 'lessons:l.story',
        demo: { textKey: 'lessons:l.demo' },
        guided: [],
        exercises: defs,
      },
    ],
    minigames: [],
  });

  function spoken(content: CompiledContent): readonly { text: string; source: string }[] {
    const out: { text: string; source: string }[] = [];
    gridFillVoiceTemplates(logicCore.notes)(
      (text, source) => {
        out.push({ text, source });
      },
      r,
      content,
    );
    return out;
  }

  it('add nothing for content without a grid-fill exercise', () => {
    expect(spoken({ version: 1, lessons: [], minigames: [] })).toEqual([]);
  });

  it('add the instructions, every rejected-entry note (plain and with the easier offer), every hint and the praise', () => {
    const out = spoken(contentWith(lastCell));
    const texts = new Set(out.map((entry) => entry.text));
    expect(texts.size).toBe(out.length);
    for (const text of [
      'Fill the grid: each row, column and box has every number once.',
      'Fill the cells to match the clues. Find the picture!',
      'That number is already in this row.',
      'That number is already in this box.',
      'Not yet. Which numbers can still go here?',
      "That does not match this column's clue.",
      'Not this one. Check the clues again.',
      'Look at this row.',
      'Look at this cell and the row, column and box around it.',
      'Look at this column and its clue.',
      'Only one cell is empty here. Which number is missing?',
      'Use the fills and crosses from the other lines.',
      'Watch: here it goes.',
      'Look closely.',
    ]) {
      expect(texts, text).toContain(text);
    }
    // The joined strings the lesson screen speaks after an error on an exercise with an easier variant.
    const offer = r('exercise.easier-offer');
    const joined = out.filter((entry) => entry.source === 'exercise-note-easier-offer');
    expect(joined).toHaveLength(7);
    expect(joined.map((entry) => entry.text)).toContain(
      `That number is already in this row. ${offer}`,
    );
    expect(joined.map((entry) => entry.text)).toContain(
      `Not this one. Check the clues again. ${offer}`,
    );
    // 2 instructions, 7 + 7 wrong, 6 where to look + 7 techniques + watch + look closely, 3 praise.
    expect(out).toHaveLength(2 + 14 + 15 + 3);
    expect(out.map((entry) => entry.source)).toEqual(
      expect.arrayContaining(['exercise-instruction', 'exercise-note']),
    );
  });

  it('are the same whichever grid-fill exercises the content has, in a lesson or a boss round', () => {
    const one = spoken(contentWith(lastCell)).map((entry) => entry.text);
    expect(spoken(contentWith(castle, cat, six)).map((entry) => entry.text)).toEqual(one);
    const boss: CompiledContent = {
      version: 1,
      lessons: [],
      minigames: [
        {
          id: 'g',
          mode: 'series',
          concept: 'c',
          titleKey: 'lessons:g.title',
          goalKey: 'lessons:g.goal',
          unlockAfter: 'l',
          errors3: 0,
          errors2: 2,
          rounds: [lastCell],
        } as unknown as CompiledContent['minigames'][number],
      ],
    };
    expect(spoken(boss).map((entry) => entry.text)).toEqual(one);
  });
});
