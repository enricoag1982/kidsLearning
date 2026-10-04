// World 1, Number Meadow, as shipped (m13.10): the five place-value lessons and the Number Train boss, every exercise generated from the
// W1 templates. The stored seeds and ids are frozen here (a stored star is attached to an id: never reseed or recount a released lesson),
// the curriculum table of docs/subjects/math/curriculum.md is held by the kinds per lesson, the CPA order, the easier variants, the bugs
// each lesson can speak and the wording; the "exactly one reading" content review is re-derived from the compiled cards (not from the
// templates' own checks).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { compileAll } from '@learn/platform-content/compile-all';
import { resolveText } from '@learn/platform-content/text-resolve';
import type { MathContent, MathExerciseDef, MathLesson, MathSeriesGame } from '../core/types.ts';
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

const boss = ((): MathSeriesGame => {
  const found = content.minigames.find((game) => game.id === 'number-train');
  if (found?.mode !== 'series') throw new Error('no number-train series');
  return found;
})();

const LESSON_IDS = ['pv-hto', 'pv-compare', 'pv-line', 'pv-thousands', 'pv-round'] as const;

/** Each file's `generate:` entries as `<stem> <template>×<count> @<seed> <params>` per slot: the frozen spec of the content. */
interface Spec {
  readonly guided: readonly string[];
  readonly exercises: readonly string[];
  readonly variants: readonly string[];
}

const FROZEN: Readonly<Record<(typeof LESSON_IDS)[number], Spec>> = {
  'pv-hto': {
    guided: ['hto-g pv-build×2 @101 {"digits":3,"values":[243,305]}'],
    exercises: [
      'hto-build pv-build×1 @4 {"digits":3,"zeroIn":"none"}',
      'hto-zero pv-build×1 @26 {"digits":3,"zeroIn":"tens"} easier hto-easy-1',
      'hto-read pv-read×1 @16 {"digits":3,"zeroIn":"none"}',
      'hto-read-zero pv-read×1 @20 {"digits":3,"zeroIn":"tens"}',
      'hto-which pv-which×1 @8 {"digits":3,"zeroIn":"none"}',
      'hto-which-zero pv-which×1 @13 {"digits":3,"zeroIn":"tens"}',
    ],
    variants: ['hto-easy pv-build×1 @18 {"digits":3,"zeroIn":"none"}'],
  },
  'pv-compare': {
    guided: ['cmp-g cmp-sign×2 @9 {"digits":3,"shared":1}'],
    exercises: [
      'cmp-sign cmp-sign×2 @12 {"digits":3,"shared":1}',
      'cmp-close cmp-sign×1 @8 {"digits":3,"shared":2} easier cmp-easy-1',
      'cmp-order cmp-order×2 @3 {"digits":3,"shared":1}',
      'cmp-true cmp-tf×1 @8 {"digits":3,"shared":1}',
    ],
    variants: ['cmp-easy cmp-sign×1 @0 {"digits":3,"shared":0}'],
  },
  'pv-line': {
    guided: [
      'line-g-hundreds nl-place×1 @2 {"from":0,"to":1000,"step":100,"labels":[0,500,1000]}',
      'line-g-tens nl-place×1 @1 {"from":0,"to":100,"step":10,"labels":[0,50,100]}',
    ],
    exercises: [
      'line-tens nl-place×1 @2 {"from":0,"to":100,"step":10,"labels":"ends"}',
      'line-hundreds nl-place×1 @18 {"from":0,"to":1000,"step":100,"labels":"ends"}',
      'line-fifties nl-place×1 @2 {"from":0,"to":500,"step":50,"labels":"ends"} easier line-easy-1',
      'line-guess-big nl-estimate×1 @1 {"from":0,"to":1000,"step":100,"labels":[0,500,1000]}',
      'line-guess-small nl-estimate×1 @18 {"from":0,"to":100,"step":10,"labels":"ends"}',
      'line-half nl-half×1 @308 {"unit":100}',
    ],
    variants: [
      'line-easy nl-place×1 @6 {"from":0,"to":1000,"step":100,"labels":[0,200,400,600,800,1000]}',
    ],
  },
  'pv-thousands': {
    guided: ['th-g pv-build×2 @20 {"digits":4,"zeroIn":"none"}'],
    exercises: [
      'th-build pv-build×1 @4 {"digits":4,"zeroIn":"none"}',
      'th-zero pv-build×1 @9 {"digits":4,"zeroIn":"tens"} easier th-easy-1',
      'th-expanded pv-expanded×2 @8 {"digits":4}',
      'th-sign cmp-sign×1 @8 {"digits":4,"shared":0}',
      'th-order cmp-order×1 @2 {"digits":4,"shared":1}',
    ],
    variants: ['th-easy pv-build×1 @19 {"digits":4,"zeroIn":"none"}'],
  },
  'pv-round': {
    guided: ['round-g round-ten×2 @2 {"max":100,"five":false}'],
    exercises: [
      'round-ten round-ten×1 @9 {"max":100,"five":false}',
      'round-half round-ten×1 @18 {"max":100,"five":true} easier round-easy-1',
      'round-big round-ten×1 @5 {"max":1000,"five":false}',
      'round-hundred round-hundred×2 @2 {"max":1000,"five":false}',
      'round-true round-tf×1 @10 {"to":100,"max":1000}',
    ],
    variants: ['round-easy round-ten×1 @0 {"max":100,"five":false}'],
  },
};

const FROZEN_BOSS = [
  'train-hundreds nl-place×1 @1 {"from":0,"to":1000,"step":100,"labels":"ends"}',
  'train-fifties nl-place×1 @6 {"from":0,"to":500,"step":50,"labels":"ends"}',
  'train-tens nl-place×1 @18 {"from":0,"to":100,"step":10,"labels":"ends"}',
  'train-guess nl-estimate×2 @3 {"from":0,"to":1000,"step":100,"labels":[0,500,1000]}',
];

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
  return parse(
    readFileSync(join(root, 'lessons', 'number-meadow', `${id}.yaml`), 'utf8'),
  ) as Record<'guided' | 'exercises' | 'variants', readonly RawEntry[]>;
}

const idsOf = (defs: readonly MathExerciseDef[] | undefined): readonly string[] =>
  (defs ?? []).map((def) => def.id);

describe('the 5 lessons of World 1', () => {
  it('are the curriculum’s, in order, all taught by the Hedgehog: 2 guided, 6 scored, 1 easier variant each', () => {
    const byOrder = [...content.lessons].sort((a, b) => a.order - b.order);
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
      ['pv-hto', 'pv-hto', 'number-meadow', 1, 'hedgehog', 2, 6, 1],
      ['pv-compare', 'pv-compare', 'number-meadow', 2, 'hedgehog', 2, 6, 1],
      ['pv-line', 'pv-line', 'number-meadow', 3, 'hedgehog', 2, 6, 1],
      ['pv-thousands', 'pv-thousands', 'number-meadow', 4, 'hedgehog', 2, 6, 1],
      ['pv-round', 'pv-round', 'number-meadow', 5, 'hedgehog', 2, 6, 1],
    ]);
    expect(content.lessons).toHaveLength(5);
    expect(byOrder.map((lesson) => english(lesson.titleKey))).toEqual([
      'Hundreds, tens, ones',
      'Bigger or smaller?',
      'The number line',
      'Thousands',
      'Rounding',
    ]);
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
      for (const def of [...lesson.guided, ...lesson.exercises, ...(lesson.variants ?? [])]) {
        expect(def.textKey, def.id).toBe(`lessons:gen.${def.id}.text`);
      }
    },
  );

  it('use the kinds of the curriculum table, in the order that puts the symbols last (CPA)', () => {
    const kinds = (defs: readonly MathExerciseDef[]): readonly string[] =>
      defs.map((def) => def.type);
    expect(kinds(lessonOf('pv-hto').guided)).toEqual(['place-value', 'place-value']);
    expect(kinds(lessonOf('pv-hto').exercises)).toEqual([
      'place-value',
      'place-value',
      'number-entry',
      'number-entry',
      'choice',
      'choice',
    ]);
    expect(kinds(lessonOf('pv-compare').guided)).toEqual(['choice', 'choice']);
    expect(kinds(lessonOf('pv-compare').exercises)).toEqual([
      'choice',
      'choice',
      'choice',
      'order',
      'order',
      'true-false',
    ]);
    expect(kinds(lessonOf('pv-line').guided)).toEqual(['number-line', 'number-line']);
    expect(kinds(lessonOf('pv-line').exercises)).toEqual([
      'number-line',
      'number-line',
      'number-line',
      'number-line',
      'number-line',
      'number-entry',
    ]);
    expect(kinds(lessonOf('pv-thousands').guided)).toEqual(['place-value', 'place-value']);
    expect(kinds(lessonOf('pv-thousands').exercises)).toEqual([
      'place-value',
      'place-value',
      'number-entry',
      'number-entry',
      'choice',
      'order',
    ]);
    expect(kinds(lessonOf('pv-round').guided)).toEqual(['choice', 'choice']);
    expect(kinds(lessonOf('pv-round').exercises)).toEqual([
      'choice',
      'choice',
      'choice',
      'number-entry',
      'number-entry',
      'true-false',
    ]);
  });

  it('keep the CPA rule: the last 2 scored items are symbols only (no blocks, no line picture); pv-line has one symbol item (nl-half) in the curriculum table', () => {
    const pictured = new Set(['place-value', 'number-line', 'array']);
    for (const id of LESSON_IDS) {
      const scored = lessonOf(id).exercises;
      const lastTwo = scored.slice(-2).map((def) => def.type);
      if (id === 'pv-line') {
        // The table has 3 nl-place, 2 nl-estimate and 1 nl-half: only the last item can be symbols.
        expect(lastTwo, id).toEqual(['number-line', 'number-entry']);
      } else {
        expect(
          lastTwo.filter((type) => pictured.has(type)),
          id,
        ).toEqual([]);
      }
    }
    // Place-value builds come first in the two lessons that have them.
    for (const id of ['pv-hto', 'pv-thousands'] as const) {
      const types = lessonOf(id).exercises.map((def) => def.type);
      expect(types.indexOf('place-value'), id).toBe(0);
      expect(types.lastIndexOf('place-value'), id).toBeLessThan(2);
    }
  });

  it('have exactly one easier variant, for the hardest scored item, of the kind the curriculum names', () => {
    const easierOf = (id: string): readonly (readonly [string, string])[] =>
      lessonOf(id).exercises.flatMap((def) =>
        def.easier === undefined ? [] : [[def.id, def.easier] as const],
      );
    expect(easierOf('pv-hto')).toEqual([['hto-zero-1', 'hto-easy-1']]);
    expect(easierOf('pv-compare')).toEqual([['cmp-close-1', 'cmp-easy-1']]);
    expect(easierOf('pv-line')).toEqual([['line-fifties-1', 'line-easy-1']]);
    expect(easierOf('pv-thousands')).toEqual([['th-zero-1', 'th-easy-1']]);
    expect(easierOf('pv-round')).toEqual([['round-half-1', 'round-easy-1']]);
    for (const id of LESSON_IDS) {
      expect(lessonOf(id).guided.filter((def) => def.easier !== undefined)).toEqual([]);
    }
  });

  it('give each easier variant the property the curriculum names', () => {
    const only = (id: string): MathExerciseDef => {
      const [variant] = lessonOf(id).variants ?? [];
      if (variant === undefined) throw new Error(`${id} has no variant`);
      return variant;
    };
    // pv-hto / pv-thousands: a build without a zero place.
    for (const [id, columns] of [
      ['pv-hto', 3],
      ['pv-thousands', 4],
    ] as const) {
      const variant = only(id);
      expect(variant.type).toBe('place-value');
      if (variant.type !== 'place-value') continue;
      expect(variant.columns).toBe(columns);
      expect(String(variant.target), id).not.toContain('0');
    }
    // pv-compare: different hundreds.
    const compare = only('pv-compare');
    expect(compare.type).toBe('choice');
    const [a, b] = (compare.prompt?.big ?? '').split(' ? ');
    expect(a?.[0]).not.toBe(b?.[0]);
    expect(a).toHaveLength(3);
    // pv-line: a line with step 100 whose labels help (every other tick).
    const line = only('pv-line');
    expect(line).toMatchObject({
      type: 'number-line',
      step: 100,
      labels: [0, 200, 400, 600, 800, 1000],
    });
    // pv-round: a number far from the middle (ones 1, 2, 8 or 9) to round to the nearest ten.
    const round = only('pv-round');
    expect(round.type).toBe('choice');
    expect([1, 2, 8, 9]).toContain(Number(round.prompt?.big) % 10);
  });

  it('have no two alike items in a lesson (same card and same options, whatever the id)', () => {
    for (const id of LESSON_IDS) {
      const lesson = lessonOf(id);
      const defs = [...lesson.guided, ...lesson.exercises, ...(lesson.variants ?? [])];
      const seen = defs.map((def) =>
        JSON.stringify({
          ...def,
          id: undefined,
          textKey: undefined,
          easier: undefined,
          options: def.type === 'choice' ? def.options.map((option) => option.big) : undefined,
          reasons: undefined,
          reasonKey: undefined,
        }),
      );
      // The sign choices of two items are alike only when their numerals are: the prompt tells them apart.
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
      for (const def of [...lesson.guided, ...lesson.exercises, ...(lesson.variants ?? [])]) {
        const words = english(def.textKey).split(/\s+/);
        expect(words.length, `${def.id}: "${words.join(' ')}"`).toBeLessThanOrEqual(14);
      }
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
          [...lessonOf(id).guided, ...lessonOf(id).exercises, ...(lessonOf(id).variants ?? [])]
            .flatMap(reasonKeys)
            .map((key) => key.replace('lessons:bugs.', '')),
        ),
      ].sort();
    expect(bugsOf('pv-hto')).toEqual(['append', 'swap']);
    expect(bugsOf('pv-compare')).toEqual(['ones-first']);
    expect(bugsOf('pv-line')).toEqual(['ticks-not-gaps']);
    expect(bugsOf('pv-thousands')).toEqual(['drop-zero', 'ones-first', 'swap']);
    expect(bugsOf('pv-round')).toEqual(['five-down', 'truncate']);
  });

  it('every exercise plays through its own kind with 3 stars, and a wrong try costs exactly one error', () => {
    for (const id of LESSON_IDS) {
      const lesson = lessonOf(id);
      for (const def of [...lesson.guided, ...lesson.exercises, ...(lesson.variants ?? [])]) {
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
      for (const def of [...lesson.guided, ...lesson.exercises, ...(lesson.variants ?? [])]) {
        expect(listed.has(english(def.textKey)), def.id).toBe(true);
      }
    }
    expect(listed.has('Put every carriage number where it belongs on the line!')).toBe(true);
    for (const round of boss.rounds)
      expect(listed.has(english(round.textKey)), round.id).toBe(true);
  });
});

describe('the content review of World 1: exactly one reading leads to the answer (from the compiled cards)', () => {
  const all = LESSON_IDS.flatMap((id) => {
    const lesson = lessonOf(id);
    return [...lesson.guided, ...lesson.exercises, ...(lesson.variants ?? [])].map((def) => ({
      where: `${id}/${def.id}`,
      def,
    }));
  });
  const withBoss = [
    ...all,
    ...boss.rounds.map((def) => ({ where: `number-train/${def.id}`, def })),
  ];
  const number = (text: string | undefined): number => Number((text ?? '').replace(/\s/g, ''));

  it('check 2: sign choices (a ? b): one of < = > is true and it is the answer, the sign cards are < = > in that order', () => {
    const signs = all.filter(
      ({ def }) => def.type === 'choice' && (def.prompt?.big ?? '').includes(' ? '),
    );
    // 2 guided + 2 scored + the close one + the easier variant (pv-compare), 1 in pv-thousands.
    expect(signs).toHaveLength(2 + 2 + 1 + 1 + 1);
    for (const { where, def } of signs) {
      if (def.type !== 'choice') continue;
      const [a, b] = (def.prompt?.big ?? '').split(' ? ').map(number);
      const truth = (sign: string): boolean =>
        sign === '<' ? (a ?? 0) < (b ?? 0) : sign === '>' ? (a ?? 0) > (b ?? 0) : a === b;
      expect(
        def.options.map((option) => option.big),
        where,
      ).toEqual(['<', '=', '>']);
      expect(
        def.options.filter((option) => truth(option.big ?? '')).map((option) => option.id),
        where,
      ).toEqual([def.answer]);
      expect(a, where).not.toBe(b);
    }
  });

  it('check 3: true / false statements (a < b, 591 → 500): the answer is the truth of the statement', () => {
    for (const { where, def } of withBoss) {
      if (def.type !== 'true-false') continue;
      const big = def.prompt?.big ?? '';
      if (big.includes(' → ')) {
        const [n, claim] = big.split(' → ').map(number);
        const lower = Math.floor((n ?? 0) / 100) * 100;
        const nearest = (n ?? 0) - lower >= 50 ? lower + 100 : lower;
        expect(def.answer, where).toBe(claim === nearest);
        expect(english(def.textKey), where).toBe('Is this the nearest hundred?');
      } else {
        const [a, sign, b] = big.split(' ');
        const truth = sign === '<' ? number(a) < number(b) : number(a) > number(b);
        expect(def.answer, where).toBe(truth);
      }
    }
  });

  it('check 4: "Round 28 to the nearest ten": two cards, the tens either side, one is nearest (half-way goes up) and is the answer', () => {
    const rounds = withBoss.filter(({ def }) =>
      english(def.textKey).endsWith('to the nearest ten.'),
    );
    // 2 guided + 3 scored + the easier variant (pv-round).
    expect(rounds).toHaveLength(2 + 3 + 1);
    for (const { where, def } of rounds) {
      if (def.type !== 'choice') throw new Error(`${where} is not a choice`);
      const n = number(def.prompt?.big);
      expect(english(def.textKey), where).toBe(`Round ${String(n)} to the nearest ten.`);
      const [low, high] = def.options.map((option) => number(option.big));
      expect((high ?? 0) - (low ?? 0), where).toBe(10);
      expect(n > (low ?? 0) && n < (high ?? 0), where).toBe(true);
      const nearest = n - (low ?? 0) >= 5 ? high : low;
      expect(
        def.options.filter((option) => number(option.big) === nearest).map((option) => option.id),
        where,
      ).toEqual([def.answer]);
    }
  });

  it('check 5: "Which number has 3 hundreds, 7 tens and 4 ones?": exactly one of the 3 numerals has those places, the card repeats them', () => {
    const picks = all.filter(({ def }) => english(def.textKey).startsWith('Which number has'));
    expect(picks).toHaveLength(2);
    for (const { where, def } of picks) {
      if (def.type !== 'choice') throw new Error(`${where} is not a choice`);
      const places = /^Which number has (\d) hundreds, (\d) tens and (\d) ones\?$/.exec(
        english(def.textKey),
      );
      const [, h, t, o] = places ?? [];
      expect(places, where).not.toBeNull();
      expect(def.prompt?.big, where).toBe(`${h ?? ''}H ${t ?? ''}T ${o ?? ''}O`);
      const wanted = Number(`${h ?? ''}${t ?? ''}${o ?? ''}`);
      expect(
        def.options.filter((option) => number(option.big) === wanted).map((option) => option.id),
        where,
      ).toEqual([def.answer]);
      expect(new Set(def.options.map((option) => option.big)).size, where).toBe(3);
    }
  });

  it('check 6: "N hundreds, 0 tens and M ones. What number is it?": the card and the sentence agree, the answer is the number, no "1 hundreds"', () => {
    const reads = all.filter(
      ({ def }) =>
        english(def.textKey).endsWith('What number is it?') &&
        def.type === 'number-entry' &&
        (def.prompt?.big ?? '').includes('H'),
    );
    expect(reads).toHaveLength(2);
    for (const { where, def } of reads) {
      if (def.type !== 'number-entry') continue;
      const places = /^(\d) hundreds, (\d) tens and (\d) ones\. What number is it\?$/.exec(
        english(def.textKey),
      );
      const [, h, t, o] = places ?? [];
      expect(places, where).not.toBeNull();
      expect(def.answer, where).toBe(Number(`${h ?? ''}${t ?? ''}${o ?? ''}`));
      expect(def.prompt?.big, where).toBe(`${h ?? ''}H ${t ?? ''}T ${o ?? ''}O`);
    }
    for (const { where, def } of withBoss) {
      expect(english(def.textKey), where).not.toMatch(/\b1 (hundreds|tens|ones|thousands)\b/);
    }
  });

  it('check 7: "Put 700 on the number line." / "About where is 625?": the card shows the target, it is on the line (an inner tick, or between two ticks), one line per exercise', () => {
    for (const { where, def } of withBoss) {
      if (def.type !== 'number-line') continue;
      expect(number(def.prompt?.big), where).toBe(def.target);
      expect(def.target, where).toBeGreaterThan(def.from);
      expect(def.target, where).toBeLessThan(def.to);
      const onTick = (def.target - def.from) % def.step === 0;
      expect(onTick, where).toBe(def.tolerance === 0);
      expect(english(def.textKey), where).toBe(
        def.tolerance === 0
          ? `Put ${String(def.target)} on the number line.`
          : `About where is ${String(def.target)}? Put it on the line.`,
      );
      expect((def.to - def.from) / def.step, where).toBeLessThanOrEqual(10);
    }
  });

  it('check 8: "What number is halfway between 800 and 900?" has the single answer 850; "Put the parts together" sums its parts', () => {
    for (const { where, def } of all) {
      if (def.type !== 'number-entry') continue;
      const text = english(def.textKey);
      const half = /^What number is halfway between (\d+) and (\d+)\?$/.exec(text);
      if (half !== null) {
        expect(def.answer, where).toBe((Number(half[1]) + Number(half[2])) / 2);
        expect(def.prompt?.big, where).toBe(`${half[1] ?? ''} … ${half[2] ?? ''}`);
      }
      if (text === 'Put the parts together. What number is it?') {
        const sum = (def.prompt?.big ?? '')
          .split(' + ')
          .reduce((total, part) => total + Number(part), 0);
        expect(def.answer, where).toBe(sum);
      }
      const round = /^Round (\d+) to the nearest hundred\.$/.exec(text);
      if (round !== null) {
        expect(def.answer, where).toBe(Math.round(Number(round[1]) / 100) * 100);
      }
    }
  });

  it('check 9: every build asks "Build N with blocks.", N is the card and the target, and the columns fit it', () => {
    for (const { where, def } of all) {
      if (def.type !== 'place-value') continue;
      expect(english(def.textKey), where).toBe(`Build ${String(def.target)} with blocks.`);
      expect(number(def.prompt?.big), where).toBe(def.target);
      expect(String(def.target), where).toHaveLength(def.columns);
    }
  });

  it('check 10: ordering cards: 4 distinct numerals, the answer is smallest first, not the order shown', () => {
    for (const { where, def } of all) {
      if (def.type !== 'order') continue;
      const shown = def.items.map((item) => number(item.big));
      expect(new Set(shown).size, where).toBe(4);
      const sorted = def.answer.map((id) => number(def.items.find((item) => item.id === id)?.big));
      expect(sorted, where).toEqual([...shown].sort((x, y) => x - y));
      expect(def.answer.join(), where).not.toBe(def.items.map((item) => item.id).join());
    }
  });
});

describe('the Number Train world boss', () => {
  it('is a series of 5 rounds on the line: steps 100, 50, 10, then 2 estimates; 3 stars with no mistake, 2 up to 2', () => {
    expect(boss).toMatchObject({
      id: 'number-train',
      mode: 'series',
      concept: 'pv-line',
      unlockAfter: 'pv-round',
      errors3: 0,
      errors2: 2,
    });
    expect(boss.rounds.map((round) => round.id)).toEqual([
      'train-hundreds-1',
      'train-fifties-1',
      'train-tens-1',
      'train-guess-1',
      'train-guess-2',
    ]);
    expect(
      boss.rounds.map((round) =>
        round.type === 'number-line'
          ? [round.step, round.tolerance === 0 ? 'place' : 'estimate']
          : round.type,
      ),
    ).toEqual([
      [100, 'place'],
      [50, 'place'],
      [10, 'place'],
      [100, 'estimate'],
      [100, 'estimate'],
    ]);
    expect(english(boss.titleKey)).toBe('Number Train');
    expect(english(boss.goalKey)).toBe('Put every carriage number where it belongs on the line!');
  });

  it('is the boss of the world (tracks.yaml), opened by the last lesson, in the YAML spec that is frozen', () => {
    const raw = parse(readFileSync(join(root, 'minigames', 'number-train.yaml'), 'utf8')) as {
      readonly rounds: readonly RawEntry[];
    };
    expect(specOf(raw.rounds)).toEqual(FROZEN_BOSS);
    expect(compiled.tracks.tracks[0]?.worlds[0]?.boss).toBe('number-train');
    expect(lessonOf('pv-round').order).toBe(
      Math.max(...content.lessons.map((lesson) => lesson.order)),
    );
  });

  it('plays: every round is solved by its own kind with 3 stars', () => {
    for (const round of boss.rounds) {
      expect(playSolution(round), round.id).toMatchObject({ solved: true, errors: 0 });
      expect(playWrongThenSolve(round), round.id).toMatchObject({ solved: true, errors: 1 });
    }
  });
});
