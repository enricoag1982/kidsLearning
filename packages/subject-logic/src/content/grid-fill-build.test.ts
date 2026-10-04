// A lesson with `grid-fill` exercises, through the whole build (the shipped logic content has none yet: World 3 is m14.11): the kind
// registered in the content registry, every exercise played through its own kind, the voice notes it adds, and a verify issue failing
// the build.
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { compileAll } from '@learn/platform-content/compile-all';
import type { LogicContent, LogicExerciseDef } from '../core/types.ts';
import { playSolution, playWrongThenSolve, starsFor } from '../testing/play.ts';
import { LOGIC_KIND_CONTENT, logicContent } from './logic-content.ts';
import { gridFill } from './grid-fill.ts';

const realRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content');
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** A copy of logic's content with one more lesson (`lessonYaml`) and its texts appended to `lessons.yaml`. */
function rootWith(lessonYaml: string, texts: string): string {
  const root = mkdtempSync(join(tmpdir(), 'logic-grid-'));
  roots.push(root);
  cpSync(realRoot, root, { recursive: true });
  writeFileSync(join(root, 'lessons', 'pattern-pond', 'grid-fix.yaml'), lessonYaml);
  const lessonTexts = join(root, 'locales', 'en', 'lessons.yaml');
  writeFileSync(lessonTexts, `${readFileSync(lessonTexts, 'utf8')}${texts}`);
  return root;
}

const TEXTS = `grid-fix:
  title: Grid fixtures
  story: Pip fills grids. Each step has one clear answer.
  demo: Pip finds the one number that fits.
gx-where: Which number goes in the marked cell?
`;

const LESSON = `id: grid-fix
order: 2
concept: grid-fix
character: panda
demo:
  prompt: { emoji: 🧩 }
guided:
  - id: gx-g1
    type: grid-fill
    sudoku: ['3412', '12.3', '.32.', '2..4']
    focus: last-cell
    targets: [[1, 2]]
  - id: gx-g2
    type: grid-fill
    sudoku: ['.231', '3124', '24..', '.3..']
    focus: hidden-single
    targets: [[0, 0]]
    text: gx-where
exercises:
  - id: gx-01
    type: grid-fill
    sudoku: ['...4', '241.', '1.42', '...1']
    focus: naked-single
    easier: gx-easy
  - id: gx-02
    type: grid-fill
    sudoku: ['246.13', '351...', '1.5624', '6...35', '4..3.1', '5.3462']
    focus: naked-single
  - id: gx-03
    type: grid-fill
    picture: ['.#.#.', '#####', '#####', '.###.', '..#..']
    maxLevel: 3
    reveal: 🐱
variants:
  - id: gx-easy
    type: grid-fill
    sudoku: ['3412', '12.3', '.32.', '2..4']
    focus: last-cell
`;

describe('a lesson with grid-fill exercises, through the whole build', () => {
  it('is registered in the content registry, and builds with the kind’s default instruction keys', () => {
    expect(LOGIC_KIND_CONTENT['grid-fill']).toBe(gridFill);
    expect(logicContent.kinds['grid-fill']).toBe(gridFill);
    const compiled = compileAll<LogicContent>(logicContent, rootWith(LESSON, TEXTS));
    const lesson = compiled.content.lessons.find((entry) => entry.id === 'grid-fix');
    const defs = [
      ...(lesson?.guided ?? []),
      ...(lesson?.exercises ?? []),
      ...(lesson?.variants ?? []),
    ];
    expect(defs.map((def) => [def.id, def.type, def.textKey])).toEqual([
      ['gx-g1', 'grid-fill', 'common:grid.instruction.sudoku'],
      ['gx-g2', 'grid-fill', 'lessons:gx-where'],
      ['gx-01', 'grid-fill', 'common:grid.instruction.sudoku'],
      ['gx-02', 'grid-fill', 'common:grid.instruction.sudoku'],
      ['gx-03', 'grid-fill', 'common:grid.instruction.cross'],
      ['gx-easy', 'grid-fill', 'common:grid.instruction.sudoku'],
    ]);
    // The guided tries fill one cell; the instruction resolves in the compiled English.
    expect(lesson?.guided.map((def) => (def as { targets?: number[] }).targets)).toEqual([
      [6],
      [0],
    ]);
    expect(compiled.locales.en?.common).toHaveProperty('grid.instruction.sudoku');
  });

  it('plays every exercise: the solution is solved with 3 stars, a wrong entry costs exactly 1 error', () => {
    const compiled = compileAll<LogicContent>(logicContent, rootWith(LESSON, TEXTS));
    const lesson = compiled.content.lessons.find((entry) => entry.id === 'grid-fix');
    const defs: readonly LogicExerciseDef[] = [
      ...(lesson?.guided ?? []),
      ...(lesson?.exercises ?? []),
      ...(lesson?.variants ?? []),
    ];
    expect(defs).toHaveLength(6);
    for (const def of defs) {
      expect(starsFor(playSolution(def)), def.id).toBe(3);
      expect(playWrongThenSolve(def), def.id).toMatchObject({ solved: true, errors: 1 });
    }
  });

  // 14 grid hints + the card kit's "Look closely." (no step left), which the shipped card lessons already voice since W1 (m14.9).
  it('adds the grid notes to the voice inventory, once however many grid exercises: 2 instructions, 1 pick-cell, 14 wrong, 14 hints', () => {
    const shipped = compileAll<LogicContent>(logicContent, realRoot);
    const built = compileAll<LogicContent>(logicContent, rootWith(LESSON, TEXTS));
    const before = new Set(shipped.voiceTexts.entries.map((entry) => entry.key));
    const added = built.voiceTexts.entries.filter((entry) => !before.has(entry.key));
    const bySource = (source: string): string[] =>
      added.filter((entry) => entry.source === source).map((entry) => entry.text);
    expect(bySource('exercise-instruction').sort()).toEqual(
      [
        'Fill the grid: each row, column and box has every number once.',
        'Fill the cells to match the clues. Find the picture!',
      ].sort(),
    );
    expect(bySource('exercise-note').filter((text) => text.startsWith('That number'))).toHaveLength(
      3,
    );
    expect(bySource('exercise-note-easier-offer')).toHaveLength(7);
    expect(bySource('exercise-note')).toContain('Tap a cell first.');
    expect(
      added.filter((entry) => entry.source.startsWith('exercise-')).map((entry) => entry.text),
    ).toHaveLength(2 + 1 + 7 + 7 + 14);
  });

  it('leaves the shipped content’s voice inventory without any grid text', () => {
    const shipped = compileAll<LogicContent>(logicContent, realRoot);
    const spoken = shipped.voiceTexts.entries.map((entry) => entry.text);
    expect(spoken.some((text) => text.startsWith('That number is already'))).toBe(false);
    expect(spoken).not.toContain('Watch: here it goes.');
    expect(spoken).not.toContain('Fill the grid: each row, column and box has every number once.');
  });

  it('fails the build on a verify issue, on a bad shape and on a missing instruction text', () => {
    const expectIssue = (lesson: string, texts: string, message: RegExp): void => {
      expect(() => compileAll<LogicContent>(logicContent, rootWith(lesson, texts))).toThrow(
        message,
      );
    };
    expectIssue(
      LESSON.replace('focus: naked-single\n    easier', 'focus: last-cell\n    easier'),
      TEXTS,
      /gx-01.*techniques of focus "last-cell".*do not finish/s,
    );
    expectIssue(
      LESSON.replace('targets: [[1, 2]]', 'targets: [[3, 1]]'),
      TEXTS,
      /gx-g1.*first step \(last-cell in cell 6\)/s,
    );
    expectIssue(
      LESSON.replace('maxLevel: 3', 'maxLevel: 2'),
      TEXTS,
      /gx-03.*level 2 do not finish/s,
    );
    expectIssue(
      LESSON.replace(
        "sudoku: ['...4', '241.', '1.42', '...1']",
        "sudoku: ['...4', '241.', '1.42']",
      ),
      TEXTS,
      /3 rows \(4 or 6 expected\)/,
    );
    expectIssue(LESSON.replace('text: gx-where', 'text: gx-missing'), TEXTS, /gx-missing/);
  });
});
