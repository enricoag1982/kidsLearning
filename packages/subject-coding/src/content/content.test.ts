// The authored content (World 1, "Meadow Steps"): it builds, every exercise plays through its own kind, and the pieces fit together
// the way `docs/subjects/coding/curriculum.md` says (counts, kinds, caps, unique answers, wording).
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compileAll } from '@learn/platform-content/compile-all';
import { cellKey } from '@learn/platform-core/domain/grid';
import { CODING_CHARACTERS, codingCore } from '../core/coding-core.ts';
import type { Level } from '../core/level.ts';
import { run } from '../core/simulator.ts';
import { shortestStraightLength } from '../core/solver.ts';
import { tileCount } from '../core/tiles.ts';
import type { PrimitiveKind, Tile } from '../core/tiles.ts';
import type { CodingExerciseDef, FindBugDef, PredictDef, ProgramDef } from '../core/types.ts';
import { playSolution, playWrongThenSolve, starsFor } from '../testing/index.ts';
import { allCodingExercises, codingLessons, codingSeries } from './all-exercises.ts';
import type { CodingLesson } from './all-exercises.ts';
import { codingContent } from './coding-content.ts';
import { maxSteps } from './voice-templates.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content');
const compiled = compileAll(codingContent, root);
const { content, tracks, badges, locales } = compiled;
const lessons = [...codingLessons(content.lessons)].sort((a, b) => a.order - b.order);
const [boss] = codingSeries(content.minigames);

const ARROWS: readonly PrimitiveKind[] = ['up', 'down', 'left', 'right'];

const lessonById = (id: string): CodingLesson => {
  const lesson = lessons.find((entry) => entry.id === id);
  if (lesson === undefined) throw new Error(`no lesson "${id}"`);
  return lesson;
};

const inLesson = (lesson: CodingLesson): readonly CodingExerciseDef[] => [
  ...lesson.guided,
  ...lesson.exercises,
  ...(lesson.variants ?? []),
];

/** Every exercise a child can meet, with where it is. */
function everyExercise(): readonly {
  readonly where: string;
  readonly exercise: CodingExerciseDef;
}[] {
  return [
    ...lessons.flatMap((lesson) =>
      inLesson(lesson).map((exercise) => ({ where: `${lesson.id}/${exercise.id}`, exercise })),
    ),
    ...codingSeries(content.minigames).flatMap((game) =>
      game.rounds.map((exercise) => ({ where: `${game.id}/${exercise.id}`, exercise })),
    ),
  ];
}

const lessonTexts = locales.en?.lessons as Record<string, unknown> | undefined;

/** The English text an exercise shows as its instruction. */
function instructionOf(exercise: CodingExerciseDef): string {
  const text = lessonTexts?.[exercise.textKey.replace('lessons:', '')];
  if (typeof text !== 'string') throw new Error(`no text for ${exercise.id}`);
  return text;
}

const wordCount = (text: string): number => text.split(/\s+/).filter(Boolean).length;

const typesOf = (list: readonly CodingExerciseDef[]): readonly string[] =>
  list.map((exercise) => exercise.type);

const programsOf = (list: readonly CodingExerciseDef[]): readonly ProgramDef[] =>
  list.filter((exercise): exercise is ProgramDef => exercise.type === 'program');

const predictsOf = (list: readonly CodingExerciseDef[]): readonly PredictDef[] =>
  list.filter((exercise): exercise is PredictDef => exercise.type === 'predict');

const bugsOf = (list: readonly CodingExerciseDef[]): readonly FindBugDef[] =>
  list.filter((exercise): exercise is FindBugDef => exercise.type === 'find-bug');

/** How many programs of exactly `length` arrows reach the goal of `level` (4^length runs, `length` ≤ 6). */
function successfulPrograms(level: Level, length: number): number {
  let found = 0;
  const visit = (program: Tile[]): void => {
    if (program.length === length) {
      if (run(level, program).outcome === 'success') found += 1;
      return;
    }
    for (const kind of ARROWS) {
      visit([...program, { kind }]);
    }
  };
  visit([]);
  return found;
}

describe.each(everyExercise())('$where ($exercise.type)', ({ exercise }) => {
  it('the kind solution solves it cleanly from a fresh state, with 3 stars', () => {
    const solved = playSolution(exercise);
    expect(solved.solved).toBe(true);
    expect(solved.errors).toBe(0);
    expect(starsFor(solved)).toBe(3);
  });

  it('a wrong try costs exactly 1 error and does not block solving', () => {
    const wrong = playWrongThenSolve(exercise);
    expect(wrong.errors).toBe(1);
    expect(wrong.solved).toBe(true);
  });
});

describe('World 1, Meadow Steps: the four lessons', () => {
  const SHAPE = [
    {
      id: 'seq-order',
      order: 1,
      guided: ['order', 'order'],
      exercises: ['order', 'order', 'order', 'order', 'choice'],
    },
    {
      id: 'seq-arrows',
      order: 2,
      guided: ['program', 'predict'],
      exercises: ['program', 'program', 'program', 'program', 'predict', 'predict'],
    },
    {
      id: 'seq-collect',
      order: 3,
      guided: ['program', 'predict'],
      exercises: ['program', 'program', 'program', 'program', 'predict', 'predict'],
    },
    {
      id: 'seq-debug',
      order: 4,
      guided: ['find-bug', 'find-bug'],
      exercises: ['find-bug', 'find-bug', 'find-bug', 'find-bug', 'program', 'program'],
    },
  ] as const;

  it('has seq-order, seq-arrows, seq-collect and seq-debug, in this order, taught by the Fox', () => {
    expect(
      lessons.map((lesson) => [
        lesson.id,
        lesson.world,
        lesson.order,
        lesson.character,
        lesson.concept,
        typesOf(lesson.guided),
        typesOf(lesson.exercises),
      ]),
    ).toEqual(
      SHAPE.map((lesson) => [
        lesson.id,
        'meadow-steps',
        lesson.order,
        'fox',
        lesson.id,
        lesson.guided,
        lesson.exercises,
      ]),
    );
  });

  it('every exercise teaches its lesson concept (concept id = lesson id), and ids are unique', () => {
    for (const lesson of lessons) {
      for (const exercise of inLesson(lesson)) {
        expect(exercise.concept, exercise.id).toBe(lesson.id);
      }
    }
    const ids = everyExercise().map(({ exercise }) => exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives each lesson an easier variant for its hardest scored exercise: the same kind', () => {
    const hardest: Record<string, string> = {
      'seq-order': 'order-04',
      'seq-arrows': 'arrows-04',
      'seq-collect': 'collect-04',
      'seq-debug': 'debug-04',
    };
    for (const lesson of lessons) {
      const variants = lesson.variants ?? [];
      expect(variants.length, lesson.id).toBeGreaterThanOrEqual(1);
      const easier = lesson.exercises.filter(
        (exercise) => (exercise as { easier?: string }).easier !== undefined,
      );
      expect(
        easier.map((exercise) => exercise.id),
        lesson.id,
      ).toEqual([hardest[lesson.id]]);
      const target = (easier[0] as { easier?: string } | undefined)?.easier;
      expect(variants.find((entry) => entry.id === target)?.type, lesson.id).toBe(easier[0]?.type);
    }
  });

  it('has 40 exercises in all: 35 in the lessons (guided, scored, easier) and 5 boss rounds', () => {
    expect(everyExercise()).toHaveLength(40);
    expect(allCodingExercises(content.lessons, content.minigames)).toHaveLength(40);
  });

  it('keeps the worlds in order: Meadow Steps has the lessons, Looping Hills and Turning Woods are coming soon', () => {
    const [main] = tracks.tracks;
    expect(tracks.tracks).toHaveLength(1);
    expect(main).toMatchObject({ id: 'basics', kind: 'main' });
    expect(main?.worlds.map((world) => [world.id, world.order, world.habitat])).toEqual([
      ['meadow-steps', 1, 'meadow'],
      ['looping-hills', 2, 'river'],
      ['turning-woods', 3, 'forest'],
    ]);
    expect(lessons.every((lesson) => lesson.world === 'meadow-steps')).toBe(true);
    // No world boss: Bug Squash is an optional mini-game that opens after the debugging lesson.
    expect(main?.worlds.every((world) => world.boss === undefined)).toBe(true);
  });

  it('has the starter and stepper ranks and three badges built on generic conditions', () => {
    expect(tracks.ranks).toEqual([
      { id: 'starter', after: 'start' },
      { id: 'stepper', after: 'world:meadow-steps' },
    ]);
    expect(badges.map((badge) => [badge.id, badge.category, badge.condition])).toEqual([
      [
        'first-program',
        'milestone',
        { type: 'concept-correct', concept: 'seq-arrows', thresholds: [1] },
      ],
      ['bug-squasher', 'skill', { type: 'concept-correct', concept: 'seq-debug', thresholds: [5] }],
      [
        'meadow-walker',
        'milestone',
        { type: 'mastered', scope: 'world:meadow-steps', thresholds: [1] },
      ],
    ]);
  });
});

describe('seq-order: pictures in an order only one way makes sense', () => {
  const lesson = lessonById('seq-order');

  it('every order card and choice option has a picture and a label, and no two cards of one exercise look alike', () => {
    for (const exercise of inLesson(lesson)) {
      const cards = exercise.type === 'order' ? exercise.items : [];
      const options = exercise.type === 'choice' ? exercise.options : [];
      for (const card of [...cards, ...options]) {
        expect(card.emoji, `${exercise.id}/${card.id}`).toBeDefined();
        expect(card.textKey, `${exercise.id}/${card.id}`).toBeDefined();
      }
      const pictures = [...cards, ...options].map((card) => card.emoji);
      expect(new Set(pictures).size, exercise.id).toBe(pictures.length);
    }
  });

  it('the scored orders have 3-4 cards, the guided tries 3; the choice asks which step comes first', () => {
    const count = (exercise: CodingExerciseDef): number =>
      exercise.type === 'order' ? exercise.items.length : 0;
    expect(lesson.guided.map(count)).toEqual([3, 3]);
    expect(lesson.exercises.slice(0, 4).map(count)).toEqual([3, 4, 3, 4]);
    const choice = lesson.exercises.at(-1);
    expect(choice).toMatchObject({ type: 'choice', answer: 'ball' });
    expect(choice && instructionOf(choice)).toBe('Which step comes first?');
  });

  it('the easier variant of the 4-card order is the same plan in 3 cards', () => {
    const [variant] = lesson.variants ?? [];
    expect(variant).toMatchObject({ type: 'order', answer: ['mix', 'bake', 'eat'] });
    expect(variant?.type === 'order' && variant.items).toHaveLength(3);
  });
});

describe('seq-arrows: one arrow, one step', () => {
  const lesson = lessonById('seq-arrows');
  const scored = programsOf(lesson.exercises);

  it('uses the four arrows only: no rocks, no stars, a flag on every grid, 3 × 3 up to 5 × 5', () => {
    for (const exercise of [...programsOf(inLesson(lesson)), ...predictsOf(inLesson(lesson))]) {
      const { level } = exercise;
      expect(level.rocks, exercise.id).toHaveLength(0);
      expect(level.stars, exercise.id).toHaveLength(0);
      expect(level.goal, exercise.id).toBeDefined();
      expect(level.size.cols, exercise.id).toBeGreaterThanOrEqual(3);
      expect(level.size.cols, exercise.id).toBeLessThanOrEqual(5);
      expect(level.size.rows, exercise.id).toBeGreaterThanOrEqual(3);
      expect(level.size.rows, exercise.id).toBeLessThanOrEqual(5);
    }
    for (const exercise of programsOf(inLesson(lesson))) {
      expect(exercise.tray.every((kind) => (ARROWS as readonly string[]).includes(kind))).toBe(
        true,
      );
    }
  });

  it('every program has a solution of 2-5 tiles that is a shortest one, and a cap of that + 2', () => {
    for (const exercise of [...scored, ...programsOf(lesson.variants ?? [])]) {
      const shortest = shortestStraightLength(exercise.level, exercise.tray as PrimitiveKind[], 12);
      expect(exercise.solution.length, exercise.id).toBe(shortest);
      expect(shortest, exercise.id).toBeGreaterThanOrEqual(2);
      expect(shortest, exercise.id).toBeLessThanOrEqual(5);
      expect(exercise.cap, exercise.id).toBe((shortest ?? 0) + 2);
    }
    // The first guided try is 2 tiles on 3 × 3 (a 2-arrow tray), with the same cap rule.
    const [guided] = programsOf(lesson.guided);
    expect(guided?.solution).toHaveLength(2);
    expect(guided?.cap).toBe(4);
    expect(guided?.level.size).toEqual({ cols: 3, rows: 3 });
    expect(scored.map((exercise) => exercise.solution.length)).toEqual([3, 4, 5, 5]);
  });

  it('the guided prediction follows 2 arrows, the two scored ones 3 and 4; none bumps, one ends on the flag and the others do not', () => {
    expect(predictsOf(lesson.guided).map((exercise) => exercise.program.length)).toEqual([2]);
    const predicts = predictsOf(lesson.exercises);
    expect(predicts.map((exercise) => exercise.program.length)).toEqual([3, 4]);
    const onFlag = [...predictsOf(lesson.guided), ...predicts].map((exercise) => {
      const result = run(exercise.level, exercise.program);
      expect(result.outcome, exercise.id).not.toBe('bumped');
      return cellKey(result.final.cell) === cellKey(exercise.level.goal ?? { x: -1, y: -1 });
    });
    expect(onFlag).toEqual([false, false, true]);
  });

  it('the story says once which way up is: towards the top of the screen', () => {
    const story = (lessonTexts?.['seq-arrows'] as { story: string }).story;
    expect(story).toContain('Up goes towards the top of the screen');
    for (const other of ['seq-order', 'seq-collect', 'seq-debug']) {
      expect((lessonTexts?.[other] as { story: string }).story).not.toContain('top of the screen');
    }
  });
});

describe('seq-collect: rocks to plan around, stars to step on', () => {
  const lesson = lessonById('seq-collect');
  const scored = programsOf(lesson.exercises);
  const programs = [...programsOf(lesson.guided), ...scored, ...programsOf(lesson.variants ?? [])];

  it('the four programs have 1, 2, 2 and 3 stars with 1, 2, 3 and 4 rocks', () => {
    expect(
      scored.map((exercise) => [exercise.level.stars.length, exercise.level.rocks.length]),
    ).toEqual([
      [1, 1],
      [2, 2],
      [2, 3],
      [3, 4],
    ]);
  });

  it('every program has a flag, a solution of the solver shortest length, and a cap of that + 2 (at most 12)', () => {
    for (const exercise of programs) {
      expect(exercise.level.goal, exercise.id).toBeDefined();
      const shortest = shortestStraightLength(exercise.level, exercise.tray as PrimitiveKind[], 14);
      expect(exercise.solution.length, exercise.id).toBe(shortest);
      expect(exercise.cap, exercise.id).toBe((shortest ?? 0) + 2);
      expect(exercise.cap, exercise.id).toBeLessThanOrEqual(12);
    }
  });

  it('the solution picks up every star', () => {
    for (const exercise of programs) {
      const result = run(exercise.level, exercise.solution);
      expect(result.final.collected, exercise.id).toHaveLength(exercise.level.stars.length);
    }
  });

  it('the predictions run to their end without a bump and pick up a star on the way', () => {
    const predicts = [...predictsOf(lesson.guided), ...predictsOf(lesson.exercises)];
    expect(predicts).toHaveLength(3);
    for (const exercise of predicts) {
      const result = run(exercise.level, exercise.program);
      expect(result.outcome, exercise.id).not.toBe('bumped');
      expect(result.final.collected.length, exercise.id).toBeGreaterThanOrEqual(1);
    }
  });

  it('names what the board has: one star, "the star"; more, "the stars"', () => {
    for (const exercise of programs) {
      expect(instructionOf(exercise), exercise.id).toBe(
        exercise.level.stars.length === 1
          ? 'Collect the star, then go to the flag.'
          : 'Collect the stars, then go to the flag.',
      );
    }
  });
});

describe('seq-debug: one wrong step, found and fixed', () => {
  const lesson = lessonById('seq-debug');
  const everyBug = [...bugsOf(inLesson(lesson)), ...bugsOf(boss?.rounds ?? [])];

  it('every bug hunt has exactly one program of its length that reaches the flag, so one arrow is the bug; no stars', () => {
    expect(everyBug).toHaveLength(2 + 4 + 1 + 5);
    for (const exercise of everyBug) {
      expect(successfulPrograms(exercise.level, exercise.program.length), exercise.id).toBe(1);
      expect(exercise.level.stars, exercise.id).toHaveLength(0);
    }
  });

  it('the fix-it exercises have the same single way through', () => {
    for (const exercise of programsOf(lesson.exercises)) {
      expect(successfulPrograms(exercise.level, exercise.solution.length), exercise.id).toBe(1);
      expect(exercise.level.stars, exercise.id).toHaveLength(0);
    }
  });

  it('the four scored hunts have programs of 3-6 tiles with the bug first, last and in between', () => {
    const scored = bugsOf(lesson.exercises);
    expect(scored.map((exercise) => exercise.program.length)).toEqual([4, 4, 5, 6]);
    const positions = scored.map((exercise) => exercise.bug[0]);
    expect(positions).toEqual([3, 0, 2, 3]);
    expect(positions).toContain(0);
    expect(positions).toContain((scored[0]?.program.length ?? 0) - 1);
  });

  it('the two fix-it exercises start from the buggy program with every slot locked but the bug', () => {
    const fixes = programsOf(lesson.exercises);
    expect(fixes).toHaveLength(2);
    for (const exercise of fixes) {
      const prefilled = exercise.prefilled ?? [];
      expect(prefilled, exercise.id).toHaveLength(exercise.solution.length);
      expect(exercise.cap, exercise.id).toBe(exercise.solution.length);
      const open = prefilled
        .map((tile, index) => [tile, index] as const)
        .filter(([tile, index]) => tile?.kind !== exercise.solution[index]?.kind)
        .map(([, index]) => index);
      expect(open, exercise.id).toHaveLength(1);
      const locked = [...(exercise.locked ?? [])].sort((a, b) => a - b);
      expect(locked, exercise.id).toEqual(
        exercise.solution.map((_tile, index) => index).filter((index) => index !== open[0]),
      );
      const buggy = prefilled.filter((tile): tile is Tile => tile !== null);
      expect(run(exercise.level, buggy).outcome, exercise.id).not.toBe('success');
    }
  });

  it('Bug Squash: 5 bug hunts of rising length, opened by the debugging lesson, no world or lesson boss', () => {
    expect(boss).toMatchObject({
      id: 'bug-squash',
      mode: 'series',
      concept: 'seq-debug',
      unlockAfter: 'seq-debug',
      errors3: 0,
      errors2: 2,
    });
    expect(typesOf(boss?.rounds ?? [])).toEqual(Array<string>(5).fill('find-bug'));
    const lengths = bugsOf(boss?.rounds ?? []).map((round) => round.program.length);
    expect(lengths).toEqual([3, 4, 5, 6, 6]);
    expect(lessons.every((entry) => entry.boss === undefined)).toBe(true);
    expect(content.minigames).toHaveLength(1);
  });
});

describe('the words the child reads and hears', () => {
  it('every instruction is at most 12 words', () => {
    for (const { where, exercise } of everyExercise()) {
      expect(wordCount(instructionOf(exercise)), where).toBeLessThanOrEqual(12);
    }
  });

  it('every kind asks in its own words, and a program or a fix-it names its goal', () => {
    const wording: Record<string, readonly string[]> = {
      program: [
        'Help Fox reach the flag.',
        'Help Fox reach the flag. Tap the arrows, then press Run.',
        'Collect the star, then go to the flag.',
        'Collect the stars, then go to the flag.',
        'Swap the wrong arrow for the right one, then Run.',
      ],
      order: ['Put the pictures in order.', 'Put the pictures in order. Tap the first step first.'],
      choice: ['Which step comes first?'],
      predict: ['Where will Fox stop? Tap the square.'],
      'find-bug': ['One arrow is wrong. Tap it!', 'Press Watch. One arrow is wrong. Tap it!'],
    };
    for (const { where, exercise } of everyExercise()) {
      expect(wording[exercise.type], where).toContain(instructionOf(exercise));
    }
  });

  it('the guided tries explain the buttons they need, once per kind of try', () => {
    expect(lessons.flatMap((lesson) => lesson.guided).map(instructionOf)).toEqual([
      'Put the pictures in order. Tap the first step first.',
      'Put the pictures in order.',
      'Help Fox reach the flag. Tap the arrows, then press Run.',
      'Where will Fox stop? Tap the square.',
      'Collect the star, then go to the flag.',
      'Where will Fox stop? Tap the square.',
      'Press Watch. One arrow is wrong. Tap it!',
      'Press Watch. One arrow is wrong. Tap it!',
    ]);
  });
});

describe('the voice inventory covers every note', () => {
  const spoken = new Set(compiled.voiceTexts.entries.map((entry) => entry.text));
  const en = locales.en as Record<string, Record<string, unknown>> | undefined;
  const coding = en?.common?.coding as
    { notes: Record<string, string>; hint: Record<string, string> } | undefined;

  it('has every coding hint and every note of a run that could not start or did not solve', () => {
    expect(Object.keys(coding?.hint ?? {})).toHaveLength(8);
    for (const [key, text] of Object.entries(coding?.hint ?? {})) {
      expect(spoken.has(text), `coding.hint.${key}`).toBe(true);
    }
    for (const [key, text] of Object.entries(coding?.notes ?? {})) {
      if (key === 'bumped' || key === 'bumped-edge') continue;
      expect(spoken.has(text), `coding.notes.${key}`).toBe(true);
    }
  });

  it('has the bump note for every step count a program of the content can reach, rock and edge', () => {
    const programs = programsOf(allCodingExercises(content.lessons, content.minigames));
    const steps = Math.max(...programs.map(maxSteps));
    expect(steps).toBe(10);
    for (let step = 1; step <= steps; step += 1) {
      const n = String(step);
      expect(spoken.has(`Oops, bumped into a rock at step ${n}!`), `rock ${n}`).toBe(true);
      expect(spoken.has(`Oops, Fox hit the edge at step ${n}!`), `edge ${n}`).toBe(true);
    }
    expect(spoken.has(`Oops, bumped into a rock at step ${String(steps + 1)}!`)).toBe(false);
  });

  it('has the card kit notes of the kinds the content uses, with the easier-offer sentence on the mistakes only', () => {
    for (const text of [
      'Not quite! Try again.',
      'Not that one. Try another!',
      'Which one comes next?',
      'One choice is ruled out.',
      'Here is the answer.',
      'Amazing!',
      'Well done!',
      'Good try!',
      'Not that one. Try another! This one is tricky. Want an easier one?',
      'Not there yet — try again! This one is tricky. Want an easier one?',
    ]) {
      expect(spoken.has(text), text).toBe(true);
    }
    // A Run that did not start is no mistake, so it never offers an easier exercise; nor does a hint.
    const offers = [...spoken].filter((text) => text.includes('Want an easier one?'));
    expect(offers.some((text) => text.startsWith('Add some tiles first'))).toBe(false);
    expect(offers.some((text) => text.startsWith('Look closely'))).toBe(false);
  });

  it('a repeat lifts the bump bound: the most steps a strip of `cap` tiles can run', () => {
    expect(maxSteps({ cap: 6, tray: ['up', 'down'] })).toBe(6);
    // One repeat of 4 tiles (5 of 6 slots) run 9 times, and the sixth slot a single tile.
    expect(maxSteps({ cap: 6, tray: ['right', 'repeat'] })).toBe(37);
    expect(maxSteps({ cap: 3, tray: ['right', 'repeat'] })).toBe(18);
    expect(maxSteps({ cap: 2, tray: ['right', 'repeat'] })).toBe(9);
    expect(tileCount([{ kind: 'repeat', times: 9, body: [{ kind: 'right' }] }])).toBe(2);
  });
});

describe('texts and the core', () => {
  it('names the subject, the track, the worlds and the ranks in the English bundle, and gives every character a topic', () => {
    const en = locales.en as Record<string, Record<string, unknown>> | undefined;
    expect((en?.common?.app as { title?: string } | undefined)?.title).toBe('Coding');
    expect(en?.journey?.tracks).toEqual({ basics: 'Coding Basics' });
    expect(en?.journey?.worlds).toEqual({
      'meadow-steps': 'Meadow Steps',
      'looping-hills': 'Looping Hills',
      'turning-woods': 'Turning Woods',
    });
    expect(en?.journey?.ranks).toEqual({ starter: 'Starter', stepper: 'Stepper' });
    for (const character of Object.keys(CODING_CHARACTERS)) {
      expect(en?.characters?.[character], character).toBeDefined();
    }
    expect((en?.characters?.fox as { name?: string } | undefined)?.name).toBe('Fox');
    const topics = en?.common?.topic as Record<string, string> | undefined;
    expect(topics?.owl).toBe('Owl');
    expect(topics?.fox).toBe('Fox');
  });

  it('is a core under the subject id, with the same characters as the content and a kind for every exercise', () => {
    expect(codingCore.id).toBe('coding');
    expect(codingCore.characters).toBe(CODING_CHARACTERS);
    expect(codingContent.characters).toBe(CODING_CHARACTERS);
    for (const { exercise } of everyExercise()) {
      expect(codingCore.kinds[exercise.type], exercise.id).toBeDefined();
      expect(codingContent.kinds[exercise.type], exercise.id).toBeDefined();
    }
    expect(Object.keys(codingContent.kinds).sort()).toEqual(Object.keys(codingCore.kinds).sort());
  });
});
