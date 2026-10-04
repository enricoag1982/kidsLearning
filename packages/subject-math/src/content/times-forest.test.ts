// World 3, Times-Table Forest, as shipped (m13.14): the six lessons and Race to 20 as the world boss, every exercise generated from the W3
// templates. The stored seeds and ids are frozen here (a stored star is attached to an id: never reseed or recount a released lesson),
// the curriculum table of docs/subjects/math/curriculum.md is held by the kinds per lesson, the CPA order, the easier variants, the bugs
// each lesson can speak, the tables each lesson drills and the wording; the "exactly one reading" content review is re-derived from the
// compiled cards (not from the templates' own checks).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { compileAll } from '@learn/platform-content/compile-all';
import { resolveText } from '@learn/platform-content/text-resolve';
import type { DuelGameDef } from '@learn/platform-core';
import type { MathContent, MathExerciseDef, MathLesson } from '../core/types.ts';
import { playSolution, playWrongThenSolve, starsFor } from '../testing/play.ts';
import { mathContent } from './math-content.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content');
const compiled = compileAll<MathContent>(mathContent, root);
const { content, locales } = compiled;
const lessons = locales.en?.lessons ?? {};

/** The English sentence of a `lessons:` text ref. */
function english(ref: string): string {
  const text = resolveText(lessons, ref.replace(/^lessons:/, ''));
  if (text === undefined) throw new Error(`no text for ${ref}`);
  return text;
}

function lessonOf(id: string): MathLesson {
  const found = content.lessons.find((lesson) => lesson.id === id);
  if (found === undefined) throw new Error(`no lesson ${id}`);
  return found;
}

const LESSON_IDS = [
  'mt-groups',
  'mt-arrays',
  'mt-2-5-10',
  'mt-4-8',
  'mt-3-6-9',
  'mt-7-mixed',
] as const;
type LessonId = (typeof LESSON_IDS)[number];

const everyOf = (lesson: MathLesson): readonly MathExerciseDef[] => [
  ...lesson.guided,
  ...lesson.exercises,
  ...(lesson.variants ?? []),
];

/** Each file's `generate:` entries as `<stem> <template>×<count> @<seed> <params>` per slot: the frozen spec of the content. */
interface Spec {
  readonly guided: readonly string[];
  readonly exercises: readonly string[];
  readonly variants: readonly string[];
}

const FROZEN: Readonly<Record<LessonId, Spec>> = {
  'mt-groups': {
    guided: [
      'gr-g groups×1 @1 {"maxGroups":3,"maxSize":3}',
      'gr-gc groups-choice×1 @7 {"maxGroups":3,"maxSize":3}',
    ],
    exercises: [
      'gr-total groups×2 @32 {"maxGroups":4,"maxSize":4}',
      'gr-big groups×1 @5 {"maxGroups":5,"maxSize":5} easier gr-easy-1',
      'gr-sum groups-choice×2 @1 {"maxGroups":4,"maxSize":4}',
      'gr-times fact×1 @6 {"tables":[2],"b":[3,10]}',
    ],
    variants: ['gr-easy groups×1 @7 {"maxGroups":3,"maxSize":3}'],
  },
  'mt-arrays': {
    guided: ['ar-g array-build×2 @2 {"maxRows":3,"maxCols":3}'],
    exercises: [
      'ar-build array-build×1 @5 {"maxRows":4,"maxCols":5}',
      'ar-free array-build×1 @2 {"maxRows":5,"maxCols":5,"fixedRows":false}',
      'ar-big array-build×1 @31 {"maxRows":6,"maxCols":6} easier ar-easy-1',
      'ar-commute array-commute×2 @1 {"max":6}',
      'ar-fact fact×1 @4 {"tables":[3,4],"b":[3,6]}',
    ],
    variants: ['ar-easy array-build×1 @5 {"maxRows":3,"maxCols":4}'],
  },
  'mt-2-5-10': {
    guided: [
      't2-g2 fact×1 @6 {"tables":[2],"b":[3,9]}',
      't2-g10 fact×1 @1 {"tables":[10],"b":[3,9]}',
    ],
    exercises: [
      't2-fact fact×3 @3 {"tables":[2,5,10],"b":[2,10]}',
      't2-five fact×1 @1 {"tables":[5],"b":[6,9]} easier t2-easy-1',
      't2-missing fact-missing×1 @1 {"tables":[2,5,10],"b":[2,10]}',
      't2-true fact-tf×1 @5 {"tables":[2,5,10],"b":[4,10]}',
    ],
    variants: ['t2-easy fact×1 @4 {"tables":[10],"b":[2,9]}'],
  },
  'mt-4-8': {
    guided: ['t4-g fact×2 @1 {"tables":[4],"b":[2,6]}'],
    exercises: [
      't4-fact fact×3 @2 {"tables":[4,8],"b":[2,10]}',
      't4-hard fact×1 @1 {"tables":[8],"b":[6,9]} easier t4-easy-1',
      't4-missing fact-missing×1 @1 {"tables":[4,8],"b":[2,10]}',
      't4-choice fact-choice×1 @3 {"tables":[4,8],"b":[2,10]}',
    ],
    variants: ['t4-easy fact×1 @1 {"tables":[4],"b":[2,5]}'],
  },
  'mt-3-6-9': {
    guided: [
      't3-g3 fact×1 @1 {"tables":[3],"b":[3,9]}',
      't3-g9 fact×1 @1 {"tables":[9],"b":[3,9]}',
    ],
    exercises: [
      't3-fact fact×3 @3 {"tables":[3,6,9],"b":[2,10]}',
      't3-hard fact×1 @4 {"tables":[6,9],"b":[6,9]} easier t3-easy-1',
      't3-missing fact-missing×1 @1 {"tables":[3,6,9],"b":[2,10]}',
      't3-true fact-tf×1 @4 {"tables":[3,6,9],"b":[2,10]}',
    ],
    variants: ['t3-easy fact×1 @1 {"tables":[3],"b":[2,5]}'],
  },
  'mt-7-mixed': {
    guided: [
      't7-g7 fact×1 @1 {"tables":[7],"b":[3,9]}',
      't7-g01 fact×1 @7 {"tables":[0,1],"b":[3,9]}',
    ],
    exercises: [
      't7-seven fact×1 @2 {"tables":[7],"b":[3,9]}',
      't7-zero fact×1 @2 {"tables":[7,0,1],"b":[2,10]}',
      't7-mixed fact×1 @3 {"tables":[2,3,4,5,6,7,8,9,10],"b":[2,10]}',
      't7-hard fact×1 @1 {"tables":[6,7,9],"b":[6,9]} easier t7-easy-1',
      't7-missing fact-missing×1 @8 {"tables":[2,3,4,5,6,7,8,9,10],"b":[2,10]}',
      't7-choice fact-choice×1 @6 {"tables":[2,3,4,5,6,7,8,9,10],"b":[2,10]}',
    ],
    variants: ['t7-easy fact×1 @1 {"tables":[7],"b":[2,5]}'],
  },
};

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

function rawLesson(id: string): Record<'guided' | 'exercises' | 'variants', readonly RawEntry[]> {
  return parse(readFileSync(join(root, 'lessons', 'times-forest', `${id}.yaml`), 'utf8')) as Record<
    'guided' | 'exercises' | 'variants',
    readonly RawEntry[]
  >;
}

const idsOf = (defs: readonly MathExerciseDef[] | undefined): readonly string[] =>
  (defs ?? []).map((def) => def.id);

/** The factors of a card "7 × 6", "6 × ? = 42" or "7 × 6 = 42" (the missing one is read from the product), else `null`. */
function factorsOf(def: MathExerciseDef): readonly [number, number] | null {
  const found = /^(\d+) × (\d+|\?)(?: = (\d+))?$/.exec(def.prompt?.big ?? '');
  if (found === null || def.type === 'array') return null;
  const a = Number(found[1]);
  return [a, found[2] === '?' ? Number(found[3]) / a : Number(found[2])];
}

const groupsOf = (def: MathExerciseDef): readonly [number, number] | null => {
  const found = /^(\d+) groups of (\d+)$/.exec(def.prompt?.big ?? '');
  return found === null ? null : [Number(found[1]), Number(found[2])];
};

/** The tables a lesson drills (the `a` of every fact card), by lesson. The last lesson also mixes every table in its last items. */
const TABLES: Readonly<Record<'mt-2-5-10' | 'mt-4-8' | 'mt-3-6-9', readonly number[]>> = {
  'mt-2-5-10': [2, 5, 10],
  'mt-4-8': [4, 8],
  'mt-3-6-9': [3, 6, 9],
};

describe('the 6 lessons of World 3', () => {
  it('are the curriculum’s, in order, all taught by the Hedgehog: 2 guided, 6 scored, 1 easier variant each', () => {
    const forest = content.lessons.filter((lesson) => lesson.world === 'times-forest');
    const byOrder = [...forest].sort((a, b) => a.order - b.order);
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
      ['mt-groups', 'mt-groups', 'times-forest', 1, 'hedgehog', 2, 6, 1],
      ['mt-arrays', 'mt-arrays', 'times-forest', 2, 'hedgehog', 2, 6, 1],
      ['mt-2-5-10', 'mt-2-5-10', 'times-forest', 3, 'hedgehog', 2, 6, 1],
      ['mt-4-8', 'mt-4-8', 'times-forest', 4, 'hedgehog', 2, 6, 1],
      ['mt-3-6-9', 'mt-3-6-9', 'times-forest', 5, 'hedgehog', 2, 6, 1],
      ['mt-7-mixed', 'mt-7-mixed', 'times-forest', 6, 'hedgehog', 2, 6, 1],
    ]);
    expect(byOrder.map((lesson) => english(lesson.titleKey))).toEqual([
      'Equal groups',
      'Arrays',
      'Twos, fives, tens',
      'Fours and eights',
      'Threes, sixes, nines',
      'Sevens and mixed',
    ]);
    expect(byOrder.map((lesson) => lesson.id)).toEqual([...LESSON_IDS]);
  });

  it.each(LESSON_IDS)(
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
      for (const def of everyOf(lesson)) {
        expect(def.textKey, def.id).toBe(`lessons:gen.${def.id}.text`);
      }
    },
  );

  it('use the kinds of the curriculum table, in the order that puts the pictures first (CPA)', () => {
    const kinds = (defs: readonly MathExerciseDef[]): readonly string[] =>
      defs.map((def) => def.type);
    expect(kinds(lessonOf('mt-groups').guided)).toEqual(['number-entry', 'choice']);
    expect(kinds(lessonOf('mt-groups').exercises)).toEqual([
      'number-entry',
      'number-entry',
      'number-entry',
      'choice',
      'choice',
      'number-entry',
    ]);
    expect(kinds(lessonOf('mt-arrays').guided)).toEqual(['array', 'array']);
    expect(kinds(lessonOf('mt-arrays').exercises)).toEqual([
      'array',
      'array',
      'array',
      'true-false',
      'true-false',
      'number-entry',
    ]);
    expect(kinds(lessonOf('mt-2-5-10').guided)).toEqual(['number-entry', 'number-entry']);
    expect(kinds(lessonOf('mt-2-5-10').exercises)).toEqual([
      'number-entry',
      'number-entry',
      'number-entry',
      'number-entry',
      'number-entry',
      'true-false',
    ]);
    expect(kinds(lessonOf('mt-4-8').exercises)).toEqual([
      'number-entry',
      'number-entry',
      'number-entry',
      'number-entry',
      'number-entry',
      'choice',
    ]);
    expect(kinds(lessonOf('mt-3-6-9').exercises)).toEqual([
      'number-entry',
      'number-entry',
      'number-entry',
      'number-entry',
      'number-entry',
      'true-false',
    ]);
    expect(kinds(lessonOf('mt-7-mixed').exercises)).toEqual([
      'number-entry',
      'number-entry',
      'number-entry',
      'number-entry',
      'number-entry',
      'choice',
    ]);
    // The table's missing-number item is the second to last of the four fact lessons.
    for (const id of ['mt-2-5-10', 'mt-4-8', 'mt-3-6-9', 'mt-7-mixed'] as const) {
      expect(lessonOf(id).exercises[4]?.prompt?.big, id).toMatch(/^\d+ × \? = \d+$/);
    }
  });

  it('keep the CPA rule: pictures (groups, arrays) only among the first 4 scored items; the last 2 are symbols only', () => {
    const pictured = (def: MathExerciseDef): boolean =>
      def.type === 'array' || def.prompt?.emoji !== undefined;
    for (const id of LESSON_IDS) {
      const scored = lessonOf(id).exercises;
      expect(scored.slice(-2).filter(pictured), id).toEqual([]);
    }
    expect(lessonOf('mt-groups').exercises.slice(0, 3).filter(pictured)).toHaveLength(3);
    expect(lessonOf('mt-arrays').exercises.slice(0, 3).filter(pictured)).toHaveLength(3);
    for (const id of ['mt-2-5-10', 'mt-4-8', 'mt-3-6-9', 'mt-7-mixed'] as const) {
      expect(everyOf(lessonOf(id)).filter(pictured), id).toEqual([]);
    }
  });

  it('drill the tables of their title: every fact card is of the lesson’s tables (the last lesson also times 0 and 1, and mixes 2-10 in its last 3 items)', () => {
    for (const [id, tables] of Object.entries(TABLES)) {
      for (const def of everyOf(lessonOf(id))) {
        const factors = factorsOf(def);
        expect(factors, `${id}/${def.id}`).not.toBeNull();
        expect(tables, `${id}/${def.id}`).toContain(factors?.[0]);
      }
    }
    // The guided tries of the first tables lessons: one fact of each of the two tables (times 2 and times 10), 2 of times 4, one 3 and one 9.
    const guidedTables = (id: string): readonly (number | undefined)[] =>
      lessonOf(id).guided.map((def) => factorsOf(def)?.[0]);
    expect(guidedTables('mt-2-5-10')).toEqual([2, 10]);
    expect(guidedTables('mt-4-8')).toEqual([4, 4]);
    expect(guidedTables('mt-3-6-9')).toEqual([3, 9]);
    expect(guidedTables('mt-7-mixed')[0]).toBe(7);
    expect([0, 1]).toContain(guidedTables('mt-7-mixed')[1]);
    const seven = lessonOf('mt-7-mixed');
    const scoredTables = seven.exercises.map((def) => factorsOf(def)?.[0]);
    expect(scoredTables[0]).toBe(7);
    expect([0, 1]).toContain(scoredTables[1]);
    // The missing-number and choice items at the end mix the tables 2-10 (neither is a times-0 / times-1 fact).
    expect(scoredTables.slice(2).every((a) => a !== undefined && a >= 2 && a <= 10)).toBe(true);
    // Every fact of "fours and eights" has both tables in its scored items.
    const eight = lessonOf('mt-4-8').exercises.map((def) => factorsOf(def)?.[0]);
    expect(eight).toContain(4);
    expect(eight).toContain(8);
  });

  it('have exactly one easier variant, for the hardest scored item, and it is easier: smaller numbers, the property the curriculum names', () => {
    const easierOf = (id: string): readonly (readonly [string, string])[] =>
      lessonOf(id).exercises.flatMap((def) =>
        def.easier === undefined ? [] : [[def.id, def.easier] as const],
      );
    expect(easierOf('mt-groups')).toEqual([['gr-big-1', 'gr-easy-1']]);
    expect(easierOf('mt-arrays')).toEqual([['ar-big-1', 'ar-easy-1']]);
    expect(easierOf('mt-2-5-10')).toEqual([['t2-five-1', 't2-easy-1']]);
    expect(easierOf('mt-4-8')).toEqual([['t4-hard-1', 't4-easy-1']]);
    expect(easierOf('mt-3-6-9')).toEqual([['t3-hard-1', 't3-easy-1']]);
    expect(easierOf('mt-7-mixed')).toEqual([['t7-hard-1', 't7-easy-1']]);
    for (const id of LESSON_IDS) {
      expect(lessonOf(id).guided.filter((def) => def.easier !== undefined)).toEqual([]);
    }
    const only = (id: string): MathExerciseDef => {
      const [variant] = lessonOf(id).variants ?? [];
      if (variant === undefined) throw new Error(`${id} has no variant`);
      return variant;
    };
    const hardOf = (id: string): MathExerciseDef => {
      const hard = lessonOf(id).exercises.find((def) => def.easier !== undefined);
      if (hard === undefined) throw new Error(`${id} has no hardest item`);
      return hard;
    };
    // mt-groups: at most 3 groups of at most 3, fewer in all than the item it eases.
    const [gk, gn] = groupsOf(only('mt-groups')) ?? [0, 0];
    expect(Math.max(gk, gn)).toBeLessThanOrEqual(3);
    const [hk, hn] = groupsOf(hardOf('mt-groups')) ?? [0, 0];
    expect(gk * gn).toBeLessThan(hk * hn);
    // mt-arrays: an array of at most 3 rows of 4 (fixed rows), fewer dots than the item it eases.
    const easyArray = only('mt-arrays');
    const hardArray = hardOf('mt-arrays');
    if (easyArray.type !== 'array' || hardArray.type !== 'array') throw new Error('not arrays');
    expect(easyArray.rows).toBeLessThanOrEqual(3);
    expect(easyArray.cols).toBeLessThanOrEqual(4);
    expect(easyArray.fixedRows).toBe(true);
    expect(easyArray.rows * easyArray.cols).toBeLessThan(hardArray.rows * hardArray.cols);
    // The fact lessons: times 10 (the 2-5-10 lesson), times 4 / 3 / 7 up to 5, a smaller product than the item they ease.
    const tableOf = (id: string): readonly number[] => {
      const [a, b] = factorsOf(only(id)) ?? [0, 0];
      return [a, b];
    };
    expect(tableOf('mt-2-5-10')[0]).toBe(10);
    expect(tableOf('mt-4-8')[0]).toBe(4);
    expect(tableOf('mt-3-6-9')[0]).toBe(3);
    expect(tableOf('mt-7-mixed')[0]).toBe(7);
    for (const id of ['mt-4-8', 'mt-3-6-9', 'mt-7-mixed'] as const) {
      expect(tableOf(id)[1], id).toBeLessThanOrEqual(5);
    }
    // Times 10 is "add a zero": the easier item of the 2-5-10 lesson eases a times-5 fact with a big number, not by its size.
    expect(factorsOf(hardOf('mt-2-5-10'))?.[0]).toBe(5);
    expect(factorsOf(hardOf('mt-2-5-10'))?.[1]).toBeGreaterThanOrEqual(6);
    for (const id of ['mt-4-8', 'mt-3-6-9', 'mt-7-mixed'] as const) {
      const [ea, eb] = factorsOf(only(id)) ?? [0, 0];
      const [ha, hb] = factorsOf(hardOf(id)) ?? [0, 0];
      expect(ea * eb, id).toBeLessThan(ha * hb);
    }
  });

  it('have no two alike items in a lesson: no card twice, no fact twice (7 × 8 and 8 × 7 count as one), no groups-of numbers twice', () => {
    for (const id of LESSON_IDS) {
      const defs = everyOf(lessonOf(id));
      const seen = defs.map((def) => {
        const factors = factorsOf(def);
        if (factors !== null)
          return `fact ${String(Math.min(...factors))}x${String(Math.max(...factors))}`;
        const groups = groupsOf(def);
        if (groups !== null) return `groups ${groups.join(' of ')}`;
        return JSON.stringify({
          ...def,
          id: undefined,
          textKey: undefined,
          easier: undefined,
          options: def.type === 'choice' ? def.options.map((option) => option.big) : undefined,
          reasons: undefined,
          reasonKey: undefined,
        });
      });
      expect(new Set(seen).size, id).toBe(defs.length);
    }
  });

  it('say 2-3 short sentences in the story (Owl and Hedgie), a worked demo with its card, and every instruction in at most 14 words', () => {
    for (const id of LESSON_IDS) {
      const lesson = lessonOf(id);
      const story = english(lesson.storyKey);
      const sentences = story.split(/(?<=[.!?])\s+/);
      expect(sentences.length, `${id} story`).toBeGreaterThanOrEqual(2);
      expect(sentences.length, `${id} story`).toBeLessThanOrEqual(3);
      expect(story, id).toMatch(/^Owl says: /);
      expect(story, id).toContain('Hedgie');
      expect(english(lesson.demo.textKey).length, `${id} demo`).toBeGreaterThan(20);
      expect(lesson.demo.prompt?.big, `${id} demo card`).toBeTruthy();
      for (const def of everyOf(lesson)) {
        const words = english(def.textKey).split(/\s+/);
        expect(words.length, `${def.id}: "${words.join(' ')}"`).toBeLessThanOrEqual(14);
      }
    }
  });

  it('never speak the times sign: stories, demos, instructions and reasons say "times"; only the cards show ×', () => {
    for (const entry of compiled.voiceTexts.entries) {
      expect(entry.text, `${entry.source}: ${entry.text}`).not.toContain('×');
    }
    for (const id of LESSON_IDS) {
      const lesson = lessonOf(id);
      expect(english(lesson.storyKey), id).not.toContain('×');
      expect(english(lesson.demo.textKey), id).not.toContain('×');
      for (const def of everyOf(lesson)) expect(english(def.textKey), def.id).not.toContain('×');
    }
  });

  it('can speak the bugs of their lesson: the reasons a wrong answer matches', () => {
    const reasonKeys = (def: MathExerciseDef): readonly string[] => {
      switch (def.type) {
        case 'choice':
          return def.options.flatMap((option) =>
            option.reasonKey === undefined ? [] : [option.reasonKey],
          );
        case 'true-false':
          return def.reasonKey === undefined ? [] : [def.reasonKey];
        case 'order':
          return [];
        default:
          return (def.reasons ?? []).map((reason) => reason.reasonKey);
      }
    };
    const bugsOf = (id: string): readonly string[] =>
      [
        ...new Set(
          everyOf(lessonOf(id))
            .flatMap(reasonKeys)
            .map((key) => key.replace('lessons:bugs.', '')),
        ),
      ].sort();
    expect(bugsOf('mt-groups')).toEqual(['add-factors', 'digit-swap', 'neighbour']);
    expect(bugsOf('mt-arrays')).toEqual(['add-factors', 'digit-swap', 'neighbour']);
    for (const id of ['mt-2-5-10', 'mt-4-8', 'mt-3-6-9', 'mt-7-mixed']) {
      expect(bugsOf(id), id).toEqual(['add-factors', 'digit-swap', 'neighbour']);
    }
  });

  it('every exercise plays through its own kind with 3 stars, and a wrong try costs exactly one error', () => {
    for (const id of LESSON_IDS) {
      for (const def of everyOf(lessonOf(id))) {
        expect(playSolution(def), def.id).toMatchObject({ solved: true, errors: 0 });
        expect(starsFor(playSolution(def)), def.id).toBe(3);
        expect(playWrongThenSolve(def), def.id).toMatchObject({ solved: true, errors: 1 });
      }
    }
  });

  it('narrates everything a child hears: story, demo, every instruction and every reason is in the voice inventory', () => {
    const listed = new Set(compiled.voiceTexts.entries.map((entry) => entry.text));
    for (const id of LESSON_IDS) {
      const lesson = lessonOf(id);
      expect(listed.has(english(lesson.storyKey)), `${id} story`).toBe(true);
      expect(listed.has(english(lesson.demo.textKey)), `${id} demo`).toBe(true);
      for (const def of everyOf(lesson)) {
        expect(listed.has(english(def.textKey)), def.id).toBe(true);
      }
    }
    for (const bug of ['add-factors', 'neighbour', 'digit-swap']) {
      expect(listed.has(english(`lessons:bugs.${bug}`)), bug).toBe(true);
    }
  });
});

describe('the content review of World 3: exactly one reading leads to the answer (from the compiled cards)', () => {
  const all = LESSON_IDS.flatMap((id) =>
    everyOf(lessonOf(id)).map((def) => ({ where: `${id}/${def.id}`, def })),
  );
  const product = (a: number, b: number): number =>
    Array.from({ length: b }, () => a).reduce((sum, term) => sum + term, 0);

  it('check 21: "How many in all?" over "3 groups of 4": one picture of the thing, the answer is k × n, the added factors speak add-factors', () => {
    const picks = all.filter(({ def }) => groupsOf(def) !== null && def.type === 'number-entry');
    // 1 guided + 2 + 1 scored + the easier variant (mt-groups).
    expect(picks).toHaveLength(1 + 2 + 1 + 1);
    for (const { where, def } of picks) {
      if (def.type !== 'number-entry') continue;
      const [k, n] = groupsOf(def) ?? [0, 0];
      expect(english(def.textKey), where).toBe('How many in all?');
      expect(def.answer, where).toBe(product(n, k));
      expect(
        Array.from(new Intl.Segmenter('en').segment(def.prompt?.emoji ?? '')),
        where,
      ).toHaveLength(1);
      expect(
        (def.reasons ?? []).map((reason) => [reason.value, reason.reasonKey]),
        where,
      ).toEqual(k + n === k * n ? [] : [[k + n, 'lessons:bugs.add-factors']]);
    }
  });

  it('check 22: "Which sum shows 2 groups of 3?": exactly one of the 3 sums has k terms that are all n, and it is the answer; the added factors speak add-factors', () => {
    const picks = all.filter(({ def }) => groupsOf(def) !== null && def.type === 'choice');
    expect(picks).toHaveLength(1 + 2);
    for (const { where, def } of picks) {
      if (def.type !== 'choice') continue;
      const [k, n] = groupsOf(def) ?? [0, 0];
      expect(english(def.textKey), where).toBe(
        `Which sum shows ${String(k)} groups of ${String(n)}?`,
      );
      const terms = def.options.map((option) => (option.big ?? '').split(' + ').map(Number));
      const showing = def.options.filter((_option, index) => {
        const list = terms[index] ?? [];
        return list.length === k && list.every((term) => term === n);
      });
      expect(
        showing.map((option) => option.id),
        where,
      ).toEqual([def.answer]);
      expect(new Set(def.options.map((option) => option.big)).size, where).toBe(3);
      const added = def.options.find((option) => option.big === `${String(k)} + ${String(n)}`);
      expect(added?.reasonKey, where).toBe('lessons:bugs.add-factors');
    }
  });

  it('check 23: "Make 3 rows of 4 dots." / "Make an array for 4 times 3.": the card says rows × columns, the array is that shape; rows fixed unless the text says "an array for"', () => {
    const arrays = all.filter(({ def }) => def.type === 'array');
    // 2 guided + 3 scored + the easier variant (mt-arrays).
    expect(arrays).toHaveLength(2 + 3 + 1);
    for (const { where, def } of arrays) {
      if (def.type !== 'array') continue;
      const text = english(def.textKey);
      const fixed = /^Make (\d) rows of (\d) dots\. Tap the bottom-right dot\.$/.exec(text);
      const free = /^Make an array for (\d) times (\d)\. Tap the bottom-right dot\.$/.exec(text);
      const found = fixed ?? free;
      expect(found, where).not.toBeNull();
      expect([def.rows, def.cols], where).toEqual([Number(found?.[1]), Number(found?.[2])]);
      expect(def.prompt?.big, where).toBe(`${String(def.rows)} × ${String(def.cols)}`);
      expect(def.fixedRows, where).toBe(fixed !== null);
      expect(def.rows <= 6 && def.cols <= 6, where).toBe(true);
    }
    // One item takes the rows free (4 times 3 may be 3 rows of 4): the lesson says so in its text, once.
    expect(arrays.filter(({ def }) => def.type === 'array' && !def.fixedRows)).toHaveLength(1);
  });

  it('check 24: "Is this true?" over "6 × 5 = 5 × 6" / "5 × 2 = 5 + 2": the answer is the truth of the statement (worked out by adding up), the false sum speaks add-factors', () => {
    const statements = all.filter(
      ({ def }) =>
        def.type === 'true-false' && /^\d+ × \d+ = \d+ [×+] \d+$/.test(def.prompt?.big ?? ''),
    );
    expect(statements).toHaveLength(2);
    for (const { where, def } of statements) {
      if (def.type !== 'true-false') continue;
      const found = /^(\d+) × (\d+) = (\d+) ([×+]) (\d+)$/.exec(def.prompt?.big ?? '');
      const [a, b, c, d] = [found?.[1], found?.[2], found?.[3], found?.[5]].map(Number) as [
        number,
        number,
        number,
        number,
      ];
      const right = found?.[4] === '+' ? c + d : product(c, d);
      expect(english(def.textKey), where).toBe('Is this true?');
      expect(def.answer, where).toBe(product(a, b) === right);
      expect(def.reasonKey, where).toBe(def.answer ? undefined : 'lessons:bugs.add-factors');
    }
    // One true and one false: the pair does not teach "always true".
    expect(
      statements.map(({ def }) => (def.type === 'true-false' ? def.answer : null)).sort(),
    ).toEqual([false, true]);
  });

  it('check 25: "What is 7 times 6?" over "7 × 6", "What number is missing?" over "6 × ? = 42", "Which is the answer?" over "8 × 7", "Is this true?" over "4 × 8 = 32": one answer each, worked out by adding up', () => {
    let facts = 0;
    let missing = 0;
    let choices = 0;
    let claims = 0;
    for (const { where, def } of all) {
      const factors = factorsOf(def);
      if (factors === null) continue;
      const [a, b] = factors;
      const big = def.prompt?.big ?? '';
      const text = english(def.textKey);
      if (def.type === 'number-entry' && big.includes('?')) {
        missing += 1;
        expect(text, where).toBe('What number is missing?');
        expect(def.answer, where).toBe(b);
        expect(product(a, b), where).toBe(Number(big.split(' = ')[1]));
        expect(a, where).toBeGreaterThan(0);
      } else if (def.type === 'number-entry') {
        facts += 1;
        expect(text, where).toBe(`What is ${String(a)} times ${String(b)}?`);
        expect(def.answer, where).toBe(product(a, b));
        // The pad is wide enough for the answer and every wrong value a reason names.
        for (const reason of def.reasons ?? []) {
          expect(String(reason.value).length, where).toBeLessThanOrEqual(def.maxDigits);
        }
      } else if (def.type === 'choice') {
        choices += 1;
        expect(text, where).toBe('Which is the answer?');
        const right = def.options.filter((option) => Number(option.big) === product(a, b));
        expect(
          right.map((option) => option.id),
          where,
        ).toEqual([def.answer]);
        expect(new Set(def.options.map((option) => option.big)).size, where).toBe(3);
        expect(
          def.options.filter((option) => option.reasonKey === undefined),
          where,
        ).toHaveLength(1);
      } else if (def.type === 'true-false') {
        claims += 1;
        expect(text, where).toBe('Is this true?');
        const claim = Number(big.split(' = ')[1]);
        expect(def.answer, where).toBe(claim === product(a, b));
        expect(def.reasonKey, where).toBe(def.answer ? undefined : 'lessons:bugs.neighbour');
      }
    }
    // The curriculum table: 4 missing-number items (one per fact lesson), 2 choices (4-8, 7-mixed), 2 true / false facts (2-5-10,
    // 3-6-9); the typed facts are every other fact card (guided, scored and variants).
    expect(missing).toBe(4);
    expect(choices).toBe(2);
    expect(claims).toBe(2);
    // 1 in Equal groups, 1 in Arrays, 7 in each of the four fact lessons (2 guided, 4 scored, 1 easier variant).
    expect(facts).toBe(1 + 1 + 4 * 7);
  });
});

describe('Race to 20, the World 3 boss', () => {
  const duel = content.minigames.find((game): game is DuelGameDef => game.id === 'race-to-20');

  it('is a bot-first level-1 duel opened by the world’s last lesson, mt-7-mixed, on its concept, with the Hedgehog as its bot', () => {
    expect(duel).toMatchObject({
      mode: 'duel',
      id: 'race-to-20',
      concept: 'mt-7-mixed',
      unlockAfter: 'mt-7-mixed',
      game: 'race',
      level: 1,
      first: 'bot',
    });
    expect(lessonOf('mt-7-mixed').character).toBe('hedgehog');
  });

  it('is the boss of the world (tracks.yaml), listed after the last lesson, and the last lesson has the highest order of its world', () => {
    const worlds = compiled.tracks.tracks[0]?.worlds ?? [];
    expect(worlds.find((world) => world.id === 'times-forest')).toMatchObject({
      order: 3,
      habitat: 'forest',
      boss: 'race-to-20',
    });
    expect(lessonOf('mt-7-mixed').order).toBe(
      Math.max(
        ...content.lessons
          .filter((lesson) => lesson.world === 'times-forest')
          .map((lesson) => lesson.order),
      ),
    );
    expect(english(duel?.titleKey ?? '')).toBe('Race to 20');
  });
});
