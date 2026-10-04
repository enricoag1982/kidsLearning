// World 2, Mental Math Mountain, as shipped (m13.11): the five mental-strategy lessons and the Market Orders boss, every exercise generated
// from the W2 templates. The stored seeds and ids are frozen here (a stored star is attached to an id: never reseed or recount a released
// lesson), the curriculum table of docs/subjects/math/curriculum.md is held by the kinds per lesson, the easier variants, the bugs each
// lesson can speak and the wording; the "exactly one reading" content review is re-derived from the compiled cards and the English
// sentences (not from the templates' own checks).
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
  const found = content.minigames.find((game) => game.id === 'market-orders');
  if (found?.mode !== 'series') throw new Error('no market-orders series');
  return found;
})();

const LESSON_IDS = ['mm-bonds', 'mm-doubles', 'mm-bridge', 'mm-tens', 'mm-problems'] as const;

/** Each file's `generate:` entries as `<stem> <template>×<count> @<seed> <params>` per slot: the frozen spec of the content. */
interface Spec {
  readonly guided: readonly string[];
  readonly exercises: readonly string[];
  readonly variants: readonly string[];
}

const FROZEN: Readonly<Record<(typeof LESSON_IDS)[number], Spec>> = {
  'mm-bonds': {
    guided: [
      'bonds-g-ten bond-missing×1 @1 {"total":10}',
      'bonds-g-twenty bond-missing×1 @1 {"total":20}',
    ],
    exercises: [
      'bonds-ten bond-missing×1 @0 {"total":10}',
      'bonds-twenty bond-missing×1 @0 {"total":20}',
      'bonds-hundred bond-missing×1 @2 {"total":100} easier bonds-easy-1',
      'bonds-rest bond-missing×1 @5 {"total":100}',
      'bonds-pair bond-pairs×1 @9 {"total":100}',
      'bonds-gap equals-balance×1 @11 {"max":20}',
    ],
    variants: ['bonds-easy bond-missing×1 @1 {"total":100,"tensOnly":true}'],
  },
  'mm-doubles': {
    guided: ['dbl-g double×1 @6 {"max":20}', 'near-g near-double×1 @1 {"max":20}'],
    exercises: [
      'dbl-big double×1 @1 {"max":50} easier dbl-easy-1',
      'dbl-more double×1 @0 {"max":50}',
      'near near-double×2 @2 {"max":50}',
      'half halve×2 @3 {"max":100}',
    ],
    variants: ['dbl-easy double×1 @13 {"max":20}'],
  },
  'mm-bridge': {
    guided: ['bridge-g bridge-add×2 @1 {"onesSum":[11,13],"max":100}'],
    exercises: [
      'bridge bridge-add×3 @2 {"onesSum":[11,16],"max":100}',
      'bridge-hard bridge-add×1 @5 {"onesSum":[16,18],"max":100} easier bridge-easy-1',
      'count count-up×2 @4 {"maxDiff":12}',
    ],
    variants: ['bridge-easy bridge-add×1 @5 {"onesSum":[11,12],"max":100}'],
  },
  'mm-tens': {
    guided: [
      'tens-g tens-hundreds×1 @5 {"step":10,"op":"+"}',
      'comp-g compensate×1 @6 {"near":9,"op":"+"}',
    ],
    exercises: [
      'tens-ten tens-hundreds×1 @4 {"step":10,"op":"-"}',
      'tens-hundred tens-hundreds×1 @2 {"step":100,"op":"+"}',
      'comp-nine compensate×1 @2 {"near":9,"op":"-"}',
      'comp-ninety compensate×1 @5 {"near":99,"op":"+"}',
      'comp-minus compensate×1 @2 {"near":99,"op":"-"} easier comp-easy-1',
      'tens-gap equals-balance×1 @15 {"max":20}',
    ],
    variants: ['comp-easy compensate×1 @3 {"near":9,"op":"+"}'],
  },
  'mm-problems': {
    guided: [
      'story-g-parts story×1 @8 {"frame":"part-whole","max":100}',
      'story-g-change story×1 @15 {"frame":"change-add","max":100}',
    ],
    exercises: [
      'story-part story×1 @5 {"frame":"part-whole","max":100} easier story-easy-1',
      'story-parts story×1 @12 {"frame":"part-whole","max":100}',
      'story-gets story×1 @9 {"frame":"change-add","max":100}',
      'story-gives story×1 @11 {"frame":"change-take","max":100}',
      'story-more story×1 @5 {"frame":"compare","max":100}',
      'story-fewer story×1 @15 {"frame":"compare","max":100}',
    ],
    variants: ['story-easy story×1 @15 {"frame":"part-whole","max":20}'],
  },
};

const FROZEN_BOSS = [
  'order-parts story×1 @2 {"frame":"part-whole","max":100}',
  'order-left story×1 @13 {"frame":"change-take","max":100}',
  'order-more story×1 @4 {"frame":"compare","max":100}',
  'order-gets story×1 @13 {"frame":"change-add","max":100}',
  'order-gives story×1 @10 {"frame":"change-take","max":100}',
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
    readFileSync(join(root, 'lessons', 'mental-mountain', `${id}.yaml`), 'utf8'),
  ) as Record<'guided' | 'exercises' | 'variants', readonly RawEntry[]>;
}

const MINUS = '−';
const idsOf = (defs: readonly MathExerciseDef[] | undefined): readonly string[] =>
  (defs ?? []).map((def) => def.id);
const everyOf = (lesson: MathLesson): readonly MathExerciseDef[] => [
  ...lesson.guided,
  ...lesson.exercises,
  ...(lesson.variants ?? []),
];

// The authored stories, as patterns that identify a generated sentence and its frame again (from the sentence alone).
const storyTree = lessons.stories;
const FRAMES = ['part-whole', 'change-add', 'change-take', 'compare'] as const;
type Frame = (typeof FRAMES)[number];
const SKELETONS = FRAMES.flatMap((frame) =>
  [1, 2, 3, 4].map((n) => {
    const text = typeof storyTree === 'object' ? storyTree[`${frame}-${String(n)}`] : undefined;
    if (typeof text !== 'string') throw new Error(`no story ${frame}-${String(n)}`);
    const pattern = text
      .replace(/[.?]/g, '\\$&')
      .replace(/\{\{a\}\}/g, '(?<a>\\d+)')
      .replace(/\{\{b\}\}/g, '(?<b>\\d+)');
    return { frame, regex: new RegExp(`^${pattern}$`) };
  }),
);

/** The frame of a generated story sentence and its two numbers (in the sentence's own order: `a` is the larger of a comparison). */
function readStory(
  text: string,
): { readonly frame: Frame; readonly a: number; readonly b: number } | null {
  for (const { frame, regex } of SKELETONS) {
    const found = regex.exec(text);
    if (found?.groups !== undefined) {
      return { frame, a: Number(found.groups.a), b: Number(found.groups.b) };
    }
  }
  return null;
}

/** The number words of a card as they stand, in the order of the sentence (two numbers per story). */
const numbersIn = (text: string): readonly number[] =>
  [...text.matchAll(/\d+/g)].map(([n]) => Number(n));

describe('the 5 lessons of World 2', () => {
  const worldTwo = content.lessons.filter((lesson) => lesson.world === 'mental-mountain');

  it('are the curriculum’s, in order, all taught by the Hedgehog: 2 guided, 6 scored, 1 easier variant each', () => {
    const byOrder = [...worldTwo].sort((a, b) => a.order - b.order);
    expect(
      byOrder.map((lesson) => [
        lesson.id,
        lesson.concept,
        lesson.order,
        lesson.character,
        lesson.guided.length,
        lesson.exercises.length,
        lesson.variants?.length,
      ]),
    ).toEqual([
      ['mm-bonds', 'mm-bonds', 1, 'hedgehog', 2, 6, 1],
      ['mm-doubles', 'mm-doubles', 2, 'hedgehog', 2, 6, 1],
      ['mm-bridge', 'mm-bridge', 3, 'hedgehog', 2, 6, 1],
      ['mm-tens', 'mm-tens', 4, 'hedgehog', 2, 6, 1],
      ['mm-problems', 'mm-problems', 5, 'hedgehog', 2, 6, 1],
    ]);
    expect(worldTwo).toHaveLength(5);
    expect(content.lessons).toHaveLength(10);
    expect(byOrder.map((lesson) => english(lesson.titleKey))).toEqual([
      'Number bonds',
      'Doubles and halves',
      'Bridge through ten',
      'Tens, hundreds, nearly',
      'Story problems',
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
      for (const def of everyOf(lesson))
        expect(def.textKey, def.id).toBe(`lessons:gen.${def.id}.text`);
    },
  );

  it('use the kinds of the curriculum table: number pad everywhere, one pair choice in Number bonds; every item is symbols or text, so the CPA rule (last 2 scored without pictures) holds', () => {
    const kinds = (defs: readonly MathExerciseDef[]): readonly string[] =>
      defs.map((def) => def.type);
    const pad = (count: number): readonly string[] =>
      Array.from({ length: count }, () => 'number-entry');
    for (const id of LESSON_IDS) expect(kinds(lessonOf(id).guided), id).toEqual(pad(2));
    expect(kinds(lessonOf('mm-bonds').exercises)).toEqual([
      'number-entry',
      'number-entry',
      'number-entry',
      'number-entry',
      'choice',
      'number-entry',
    ]);
    for (const id of ['mm-doubles', 'mm-bridge', 'mm-tens', 'mm-problems'] as const) {
      expect(kinds(lessonOf(id).exercises), id).toEqual(pad(6));
    }
    const pictured = new Set(['place-value', 'number-line', 'array']);
    for (const id of LESSON_IDS) {
      for (const def of everyOf(lessonOf(id))) expect(pictured.has(def.type), def.id).toBe(false);
    }
  });

  it('have the curriculum’s mix of templates per lesson (read from the generated sentences and cards)', () => {
    const shape = (def: MathExerciseDef): string => {
      const text = english(def.textKey);
      if (readStory(text) !== null) return `story-${readStory(text)?.frame ?? ''}`;
      if (text.startsWith('Which two numbers')) return 'bond-pairs';
      if (text.startsWith('What number makes'))
        return `bond-missing-${(def.prompt?.big ?? '').split(' = ')[1] ?? ''}`;
      if (text.startsWith('Both sides')) return 'equals-balance';
      if (text.startsWith('Double')) return 'double';
      if (text.startsWith('Use a double')) return 'near-double';
      if (text.startsWith('What is half')) return 'halve';
      if (text.startsWith('Make a ten')) return 'bridge-add';
      if (text.startsWith('Count up')) return 'count-up';
      if (text === 'What is the answer?') return 'tens-hundreds';
      if (/^(Add|Take away) /.test(text)) return 'compensate';
      return `? ${text}`;
    };
    const shapes = (id: string, slot: 'guided' | 'exercises'): readonly string[] =>
      lessonOf(id)[slot].map(shape);
    expect(shapes('mm-bonds', 'guided')).toEqual(['bond-missing-10', 'bond-missing-20']);
    expect(shapes('mm-bonds', 'exercises')).toEqual([
      'bond-missing-10',
      'bond-missing-20',
      'bond-missing-100',
      'bond-missing-100',
      'bond-pairs',
      'equals-balance',
    ]);
    expect(shapes('mm-doubles', 'guided')).toEqual(['double', 'near-double']);
    expect(shapes('mm-doubles', 'exercises')).toEqual([
      'double',
      'double',
      'near-double',
      'near-double',
      'halve',
      'halve',
    ]);
    expect(shapes('mm-bridge', 'guided')).toEqual(['bridge-add', 'bridge-add']);
    expect(shapes('mm-bridge', 'exercises')).toEqual([
      'bridge-add',
      'bridge-add',
      'bridge-add',
      'bridge-add',
      'count-up',
      'count-up',
    ]);
    expect(shapes('mm-tens', 'guided')).toEqual(['tens-hundreds', 'compensate']);
    expect(shapes('mm-tens', 'exercises')).toEqual([
      'tens-hundreds',
      'tens-hundreds',
      'compensate',
      'compensate',
      'compensate',
      'equals-balance',
    ]);
    expect(shapes('mm-problems', 'guided')).toEqual(['story-part-whole', 'story-change-add']);
    expect(shapes('mm-problems', 'exercises')).toEqual([
      'story-part-whole',
      'story-part-whole',
      'story-change-add',
      'story-change-take',
      'story-compare',
      'story-compare',
    ]);
  });

  it('have exactly one easier variant, for the hardest scored item, of the kind the curriculum names', () => {
    const easierOf = (id: string): readonly (readonly [string, string])[] =>
      lessonOf(id).exercises.flatMap((def) =>
        def.easier === undefined ? [] : [[def.id, def.easier] as const],
      );
    expect(easierOf('mm-bonds')).toEqual([['bonds-hundred-1', 'bonds-easy-1']]);
    expect(easierOf('mm-doubles')).toEqual([['dbl-big-1', 'dbl-easy-1']]);
    expect(easierOf('mm-bridge')).toEqual([['bridge-hard-1', 'bridge-easy-1']]);
    expect(easierOf('mm-tens')).toEqual([['comp-minus-1', 'comp-easy-1']]);
    expect(easierOf('mm-problems')).toEqual([['story-part-1', 'story-easy-1']]);
    for (const id of LESSON_IDS) {
      expect(lessonOf(id).guided.filter((def) => def.easier !== undefined)).toEqual([]);
    }
  });

  it('give each easier variant the property the curriculum names, and make it easier than the item it stands for', () => {
    const only = (id: string): MathExerciseDef => {
      const [variant] = lessonOf(id).variants ?? [];
      if (variant === undefined) throw new Error(`${id} has no variant`);
      return variant;
    };
    const scored = (lesson: string, id: string): MathExerciseDef => {
      const found = lessonOf(lesson).exercises.find((def) => def.id === id);
      if (found === undefined) throw new Error(`no ${id}`);
      return found;
    };
    // mm-bonds: the bond to 100 in whole tens (no tens-and-ones partner), for a bond with ones.
    const tens = (only('mm-bonds').prompt?.big ?? '').match(/^(\d+) \+ \? = 100$/);
    expect(Number(tens?.[1]) % 10).toBe(0);
    const tensOnly = only('mm-bonds');
    expect(tensOnly.type === 'number-entry' ? tensOnly.reasons : undefined).toBeUndefined();
    expect(
      Number((scored('mm-bonds', 'bonds-hundred-1').prompt?.big ?? '').split(' ')[0]) % 10,
    ).not.toBe(0);
    // mm-doubles: a double up to 20, for a double up to 50.
    const small = (only('mm-doubles').prompt?.big ?? '').split(' + ').map(Number);
    const large = (scored('mm-doubles', 'dbl-big-1').prompt?.big ?? '').split(' + ').map(Number);
    expect(Math.max(...small)).toBeLessThanOrEqual(20);
    expect(Math.max(...large)).toBeGreaterThan(20);
    // mm-bridge: the ones add to 11-12, for ones adding to 16-18.
    const ones = (id: string, slot: 'variants' | 'exercises'): number => {
      const def = (lessonOf('mm-bridge')[slot] ?? []).find((d) => d.id === id);
      const [a, b] = (def?.prompt?.big ?? '').split(' + ').map(Number);
      return ((a ?? 0) % 10) + (b ?? 0);
    };
    expect(ones('bridge-easy-1', 'variants')).toBeLessThanOrEqual(12);
    expect(ones('bridge-hard-1', 'exercises')).toBeGreaterThanOrEqual(16);
    // mm-tens: an addition of 9, for a take-away of 99.
    expect(only('mm-tens').prompt?.big).toMatch(/^\d+ \+ 9$/);
    expect(scored('mm-tens', 'comp-minus-1').prompt?.big).toMatch(new RegExp(`^\\d+ ${MINUS} 99$`));
    // mm-problems: a part-whole story up to 20, for a part-whole story up to 100.
    const easy = only('mm-problems');
    expect(readStory(english(easy.textKey))?.frame).toBe('part-whole');
    expect(easy.type === 'number-entry' && easy.answer).toBeLessThanOrEqual(20);
    const hard = scored('mm-problems', 'story-part-1');
    expect(hard.type === 'number-entry' && hard.answer).toBeGreaterThan(20);
  });

  it('have no two alike items in a lesson (same sentence, card and options, whatever the id)', () => {
    for (const id of LESSON_IDS) {
      const defs = everyOf(lessonOf(id));
      const seen = defs.map((def) =>
        JSON.stringify({
          text: english(def.textKey),
          prompt: def.prompt,
          options: def.type === 'choice' ? def.options.map((option) => option.big) : undefined,
        }),
      );
      expect(new Set(seen).size, id).toBe(defs.length);
    }
  });

  it('say 2-3 short sentences in the story (Owl and Hedgie), a worked demo with its card, and every instruction in at most 14 words (a story problem 20)', () => {
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
        const text = english(def.textKey);
        const limit = readStory(text) === null ? 14 : 20;
        expect(text.split(/\s+/).length, `${def.id}: "${text}"`).toBeLessThanOrEqual(limit);
        expect(text, def.id).not.toMatch(/\{\{/);
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
          everyOf(lessonOf(id))
            .flatMap(reasonKeys)
            .map((key) => key.replace('lessons:bugs.', '')),
        ),
      ].sort();
    expect(bugsOf('mm-bonds')).toEqual(['answer-next', 'digit-tens']);
    expect(bugsOf('mm-doubles')).toEqual(['halve-tens-only', 'off-by-one', 'tens-only']);
    expect(bugsOf('mm-bridge')).toEqual(['off-by-one', 'off-by-ten']);
    expect(bugsOf('mm-tens')).toEqual(['answer-next', 'forgot-adjust', 'wrong-place']);
    expect(bugsOf('mm-problems')).toEqual(['wrong-op']);
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
        for (const reason of def.type === 'number-entry' ? (def.reasons ?? []) : []) {
          expect(listed.has(english(reason.reasonKey)), `${def.id} ${reason.reasonKey}`).toBe(true);
        }
      }
    }
    expect(listed.has('Help the market animals with their orders!')).toBe(true);
    for (const round of boss.rounds)
      expect(listed.has(english(round.textKey)), round.id).toBe(true);
  });
});

describe('the content review of World 2: exactly one reading leads to the answer (from the compiled cards and sentences)', () => {
  const all = LESSON_IDS.flatMap((id) =>
    everyOf(lessonOf(id)).map((def) => ({ where: `${id}/${def.id}`, def })),
  );
  const withBoss = [
    ...all,
    ...boss.rounds.map((def) => ({ where: `market-orders/${def.id}`, def })),
  ];
  const entries = (
    def: MathExerciseDef,
  ): { answer: number; reasons: readonly (readonly [number, string])[] } => {
    if (def.type !== 'number-entry') throw new Error(`${def.id} is not a number-entry`);
    return {
      answer: def.answer,
      reasons: (def.reasons ?? []).map((reason) => [
        reason.value,
        reason.reasonKey.replace('lessons:bugs.', ''),
      ]),
    };
  };
  const withText = (prefix: RegExp): typeof withBoss =>
    withBoss.filter(({ def }) => prefix.test(english(def.textKey)));

  it('check 21: "What number makes 100?" (64 + ? = 100): the card repeats the total, the answer completes it; for a bond to 100 the wrong number with each digit taken to 10 speaks digit-tens, a bond in whole tens has no such wrong number', () => {
    const bonds = withText(/^What number makes \d+\?$/);
    // 2 guided + 2 scored (10, 20) + 2 (100) + 1 easier variant, in Number bonds only.
    expect(bonds).toHaveLength(2 + 2 + 2 + 1);
    for (const { where, def } of bonds) {
      const total = Number(/(\d+)\?$/.exec(english(def.textKey))?.[1]);
      const card = /^(\d+) \+ \? = (\d+)$/.exec(def.prompt?.big ?? '');
      const [a, shown] = [Number(card?.[1]), Number(card?.[2])];
      const { answer, reasons } = entries(def);
      expect(card, where).not.toBeNull();
      expect(shown, where).toBe(total);
      expect(a + answer, where).toBe(total);
      if (total === 100 && a % 10 !== 0) {
        const [tensDigit, onesDigit] = [Math.floor(a / 10), a % 10];
        const wrong = Number(`${String(10 - tensDigit)}${String(10 - onesDigit)}`);
        expect(reasons, where).toEqual([[wrong, 'digit-tens']]);
        expect(wrong, where).not.toBe(answer);
      } else {
        expect(reasons, where).toEqual([]);
      }
    }
  });

  it('check 22: "Which two numbers make 100?": 3 pairs with the same first number, exactly one adds to 100 and it is the answer, the pair 10 too many speaks digit-tens, the pair 10 too few has no reason', () => {
    const pairs = withText(/^Which two numbers make \d+\?$/);
    expect(pairs).toHaveLength(1);
    for (const { where, def } of pairs) {
      if (def.type !== 'choice') throw new Error(`${where} is not a choice`);
      const sums = def.options.map((option) => {
        const [x, y] = (option.big ?? '').split(' + ').map(Number);
        return { id: option.id, x: x ?? 0, y: y ?? 0, reason: option.reasonKey };
      });
      expect(new Set(sums.map(({ x }) => x)).size, where).toBe(1);
      expect(
        sums.map(({ x, y }) => x + y).sort((p, q) => p - q),
        where,
      ).toEqual([90, 100, 110]);
      expect(
        sums.filter(({ x, y }) => x + y === 100).map(({ id }) => id),
        where,
      ).toEqual([def.answer]);
      expect(
        sums
          .filter(({ reason }) => reason !== undefined)
          .map(({ x, y, reason }) => [x + y, reason]),
        where,
      ).toEqual([[110, 'lessons:bugs.digit-tens']]);
    }
  });

  it('check 23: "7 + 5 = 6 + ?": both sides make the same, the gap is never an addend, writing the left sum speaks answer-next', () => {
    const gaps = withText(/^Both sides must be the same/);
    expect(gaps).toHaveLength(2);
    for (const { where, def } of gaps) {
      const card = /^(\d+) \+ (\d+) = (\d+) \+ \?$/.exec(def.prompt?.big ?? '');
      const [a, b, c] = [Number(card?.[1]), Number(card?.[2]), Number(card?.[3])];
      const { answer, reasons } = entries(def);
      expect(card, where).not.toBeNull();
      expect(c + answer, where).toBe(a + b);
      expect([a, b], where).not.toContain(answer);
      expect(reasons, where).toEqual([[a + b, 'answer-next']]);
    }
  });

  it('check 24: "Double 36." (36 + 36), "Use a double to help" (35 + 36), "What is half of 76?": the card and the sentence agree, one answer; tens-only / halve-tens-only only where the ones digit is used, the plain double of a near double is off-by-one', () => {
    for (const { where, def } of withText(/^Double \d+\.$/)) {
      const n = Number(/(\d+)\.$/.exec(english(def.textKey))?.[1]);
      const { answer, reasons } = entries(def);
      expect(def.prompt?.big, where).toBe(`${String(n)} + ${String(n)}`);
      expect(answer, where).toBe(2 * n);
      const wrong = Number(`${String(2 * Math.floor(n / 10))}${String(n % 10)}`);
      expect(reasons, where).toEqual(n % 10 === 0 || n < 10 ? [] : [[wrong, 'tens-only']]);
    }
    for (const { where, def } of withText(/^Use a double to help/)) {
      const [a, b] = (def.prompt?.big ?? '').split(' + ').map(Number);
      const { answer, reasons } = entries(def);
      expect(b, where).toBe((a ?? 0) + 1);
      expect(answer, where).toBe((a ?? 0) + (b ?? 0));
      expect(reasons, where).toEqual([[2 * (a ?? 0), 'off-by-one']]);
    }
    for (const { where, def } of withText(/^What is half of \d+\?$/)) {
      const n = Number(/(\d+)\?$/.exec(english(def.textKey))?.[1]);
      const { answer, reasons } = entries(def);
      expect(def.prompt?.big, where).toBe(String(n));
      expect(n % 2, where).toBe(0);
      expect(answer * 2, where).toBe(n);
      const wrong = 5 * Math.floor(n / 10) + (n % 10);
      expect(reasons, where).toEqual(n % 10 === 0 ? [] : [[wrong, 'halve-tens-only']]);
    }
    // 1 + 1 guided, 2 + 1 (+ 1 easier) scored doubles, 2 near doubles, 2 halves.
    expect(withText(/^Double \d+\.$/)).toHaveLength(1 + 2 + 1);
    expect(withText(/^Use a double to help/)).toHaveLength(1 + 2);
    expect(withText(/^What is half of/)).toHaveLength(2);
  });

  it('check 25: "Make a ten first" (38 + 7) and "Count up from the smaller number" (82 − 76): the ones cross a ten, one answer; one jump / one ten short are off-by-one / off-by-ten', () => {
    const bridges = withText(/^Make a ten first/);
    // 2 guided + 3 + 1 scored + 1 easier variant.
    expect(bridges).toHaveLength(2 + 3 + 1 + 1);
    for (const { where, def } of bridges) {
      const [a, b] = (def.prompt?.big ?? '').split(' + ').map(Number);
      const { answer, reasons } = entries(def);
      expect(answer, where).toBe((a ?? 0) + (b ?? 0));
      expect(((a ?? 0) % 10) + (b ?? 0), where).toBeGreaterThanOrEqual(11);
      expect(reasons.map(([, bug]) => bug).sort(), where).toEqual(['off-by-one', 'off-by-ten']);
      expect(reasons.find(([, bug]) => bug === 'off-by-one')?.[0], where).toBe(answer - 1);
      expect(reasons.find(([, bug]) => bug === 'off-by-ten')?.[0], where).toBe(answer - 10);
    }
    const counts = withText(/^Count up from/);
    expect(counts).toHaveLength(2);
    for (const { where, def } of counts) {
      const [large, small] = (def.prompt?.big ?? '').split(` ${MINUS} `).map(Number);
      const { answer, reasons } = entries(def);
      expect(answer, where).toBe((large ?? 0) - (small ?? 0));
      expect(Math.floor((large ?? 0) / 10), where).toBe(Math.floor((small ?? 0) / 10) + 1);
      expect(answer, where).toBeLessThanOrEqual(12);
      expect(reasons, where).toEqual([[answer + 10, 'off-by-ten']]);
    }
  });

  it('check 26: "What is the answer?" (347 + 10) changes one digit, "Add 100, then take 1 away" (46 + 99) names the round number of the card and the operation; the next place down is wrong-place, the round number alone is forgot-adjust', () => {
    const tens = withText(/^What is the answer\?$/);
    expect(tens).toHaveLength(1 + 2);
    for (const { where, def } of tens) {
      const card = new RegExp(`^(\\d{3}) ([+${MINUS}]) (10|100)$`).exec(def.prompt?.big ?? '');
      const [n, sign, step] = [Number(card?.[1]), card?.[2], Number(card?.[3])];
      const { answer, reasons } = entries(def);
      expect(card, where).not.toBeNull();
      expect(answer, where).toBe(sign === '+' ? n + step : n - step);
      // One digit changes: the numbers differ in exactly one digit, by one.
      const [x, y] = [String(n), String(answer)];
      expect(x, where).toHaveLength(y.length);
      expect(
        x.split('').filter((digit, i) => digit !== y[i]),
        where,
      ).toHaveLength(1);
      expect(reasons, where).toEqual([
        [sign === '+' ? n + step / 10 : n - step / 10, 'wrong-place'],
      ]);
    }
    const compensates = withText(
      /^(Add|Take away) \d+, then (take 1 away|add 1 back)\. What is it\?$/,
    );
    // 1 guided + 3 scored + 1 easier variant.
    expect(compensates).toHaveLength(1 + 3 + 1);
    for (const { where, def } of compensates) {
      const text = english(def.textKey);
      const round = Number(/(\d+),/.exec(text)?.[1]);
      const card = new RegExp(`^(\\d+) ([+${MINUS}]) (\\d+)$`).exec(def.prompt?.big ?? '');
      const [n, sign, near] = [Number(card?.[1]), card?.[2], Number(card?.[3])];
      const { answer, reasons } = entries(def);
      expect(near + 1, where).toBe(round);
      expect(text.startsWith(sign === '+' ? 'Add' : 'Take away'), where).toBe(true);
      expect(text.includes(sign === '+' ? 'take 1 away' : 'add 1 back'), where).toBe(true);
      expect(answer, where).toBe(sign === '+' ? n + near : n - near);
      expect(reasons, where).toEqual([[sign === '+' ? n + round : n - round, 'forgot-adjust']]);
    }
  });

  it('check 27: every story has two numbers and one operation: the frame (read back from the sentence) says add or subtract, a comparison asks "how many more" of the animal with the larger number, the other operation is wrong-op, no sentence has a keyword for the other operation', () => {
    const stories = withBoss.filter(({ def }) => readStory(english(def.textKey)) !== null);
    // 2 + 2 guided / scored part-whole & change-add..., 9 in the lesson (2 guided + 6 + 1 easier) and 5 boss rounds.
    expect(stories).toHaveLength(9 + 5);
    for (const { where, def } of stories) {
      const text = english(def.textKey);
      const story = readStory(text);
      if (story === null) throw new Error(where);
      const { answer, reasons } = entries(def);
      expect(numbersIn(text), where).toHaveLength(2);
      const adds = story.frame === 'part-whole' || story.frame === 'change-add';
      if (adds) {
        expect(answer, where).toBe(story.a + story.b);
        expect(reasons, where).toEqual([[Math.abs(story.a - story.b), 'wrong-op']]);
        expect(story.a, where).not.toBe(story.b);
        expect(text.toLowerCase(), where).not.toMatch(
          /\b(left|fewer|less|remain|away)\b|how many more/,
        );
      } else {
        expect(answer, where).toBe(story.a - story.b);
        expect(reasons, where).toEqual([[story.a + story.b, 'wrong-op']]);
        expect(story.a - story.b, where).toBeGreaterThanOrEqual(2);
      }
      if (story.frame === 'change-take') {
        expect(text.toLowerCase(), where).toMatch(/\bleft\b/);
        expect(text.toLowerCase(), where).not.toMatch(
          /\b(in all|together|altogether|total|more|now|both)\b/,
        );
      }
      if (story.frame === 'compare') {
        // "How many more shells did Fox find than Frog?": the animal asked about has the larger number, a.
        const asked = /more \w+ (?:does|did) (\w+) (?:have|find) than (\w+)\?$/.exec(text);
        const holds = (name: string | undefined): number =>
          Number(new RegExp(`${name ?? ''} (?:has|found) (\\d+)`).exec(text)?.[1]);
        expect(asked, where).not.toBeNull();
        expect(holds(asked?.[1]), where).toBe(story.a);
        expect(holds(asked?.[2]), where).toBe(story.b);
        expect(story.a, where).toBeGreaterThan(story.b);
      }
    }
  });

  it('check 28: the lessons and the boss mix the frames: 2 part-whole, 1 change-add, 1 change-take and 2 comparisons in Story problems; the 5 orders are a part-whole, a take-away, a comparison, an add and a take-away, each for another animal', () => {
    const framesOf = (defs: readonly MathExerciseDef[]): readonly (string | undefined)[] =>
      defs.map((def) => readStory(english(def.textKey))?.frame);
    expect(framesOf(lessonOf('mm-problems').guided)).toEqual(['part-whole', 'change-add']);
    expect(framesOf(lessonOf('mm-problems').exercises)).toEqual([
      'part-whole',
      'part-whole',
      'change-add',
      'change-take',
      'compare',
      'compare',
    ]);
    expect(framesOf(boss.rounds)).toEqual([
      'part-whole',
      'change-take',
      'compare',
      'change-add',
      'change-take',
    ]);
    const customers = boss.rounds.map((round) => /^\w+/.exec(english(round.textKey))?.[0]);
    expect(new Set(customers).size).toBe(5);
    // Six different stories among the six scored items.
    const scored = lessonOf('mm-problems').exercises.map((def) =>
      english(def.textKey).replace(/\d+/g, '#'),
    );
    expect(new Set(scored).size).toBe(6);
  });
});

describe('the Market Orders world boss', () => {
  it('is a series of 5 story rounds, one customer animal each; 3 stars with no mistake, 2 up to 2', () => {
    expect(boss).toMatchObject({
      id: 'market-orders',
      mode: 'series',
      concept: 'mm-problems',
      unlockAfter: 'mm-problems',
      errors3: 0,
      errors2: 2,
    });
    expect(boss.rounds.map((round) => round.id)).toEqual([
      'order-parts-1',
      'order-left-1',
      'order-more-1',
      'order-gets-1',
      'order-gives-1',
    ]);
    expect(boss.rounds.every((round) => round.type === 'number-entry')).toBe(true);
    expect(english(boss.titleKey)).toBe('Market Orders');
    expect(english(boss.goalKey)).toBe('Help the market animals with their orders!');
  });

  it('is the boss of World 2 (tracks.yaml), opened by its last lesson, in the YAML spec that is frozen', () => {
    const raw = parse(readFileSync(join(root, 'minigames', 'market-orders.yaml'), 'utf8')) as {
      readonly rounds: readonly RawEntry[];
    };
    expect(specOf(raw.rounds)).toEqual(FROZEN_BOSS);
    expect(compiled.tracks.tracks[0]?.worlds[1]).toMatchObject({
      id: 'mental-mountain',
      order: 2,
      habitat: 'mountains',
      boss: 'market-orders',
    });
    const worldTwo = content.lessons.filter((lesson) => lesson.world === 'mental-mountain');
    expect(lessonOf('mm-problems').order).toBe(Math.max(...worldTwo.map((lesson) => lesson.order)));
  });

  it('plays: every round is solved by its own kind with 3 stars, and a wrong try costs one error', () => {
    for (const round of boss.rounds) {
      expect(playSolution(round), round.id).toMatchObject({ solved: true, errors: 0 });
      expect(playWrongThenSolve(round), round.id).toMatchObject({ solved: true, errors: 1 });
    }
  });
});
