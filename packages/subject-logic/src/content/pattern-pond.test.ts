// World 1, Pattern Pond, as shipped (m14.9): the four pattern lessons and the Pattern Train boss, every exercise generated from the W1
// templates. The stored seeds and ids are frozen here (a stored star is attached to an id: never reseed or recount a released
// lesson), the curriculum table of docs/subjects/logic/curriculum.md is held by the kinds per lesson, the easier variants, the bugs
// each lesson can speak and the wording; the "exactly one reading" content review (curriculum §6) is re-derived from the compiled
// cards, not from the templates' own checks.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compileAll } from '@learn/platform-content/compile-all';
import { resolveText } from '@learn/platform-content/text-resolve';
import { readYaml } from '@learn/platform-content/yaml-file';
import type { CardShape } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import type {
  LogicContent,
  LogicExerciseDef,
  LogicLesson,
  LogicSeriesGame,
} from '../core/types.ts';
import { playSolution, playWrongThenSolve, starsFor } from '../testing/index.ts';
import { logicContent, LOGIC_TEMPLATES } from './logic-content.ts';
import {
  FAR_SETS,
  GROW_SETS,
  PATTERN_SETS,
  STEP_NEXT_SETS,
  STEP_RULE_SETS,
} from './templates/solvers.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content');
const compiled = compileAll<LogicContent>(logicContent, root);
const { content, locales } = compiled;
const lessons = locales.en?.lessons ?? {};

/** The English sentence of a `lessons:` text ref. */
function english(ref: string): string {
  const text = resolveText(lessons, ref.replace(/^lessons:/, ''));
  if (text === undefined) throw new Error(`no text for ${ref}`);
  return text;
}

const LESSON_IDS = ['pat-repeat', 'pat-steps', 'pat-grow', 'pat-far'] as const;

function lessonOf(id: string): LogicLesson {
  const found = content.lessons.find((lesson) => lesson.id === id);
  if (found === undefined) throw new Error(`no lesson ${id}`);
  return found;
}

const boss = ((): LogicSeriesGame => {
  const found = content.minigames.find((game) => game.id === 'pattern-train');
  if (found?.mode !== 'series') throw new Error('no pattern-train series');
  return found;
})();

const itemsOf = (lesson: LogicLesson): readonly LogicExerciseDef[] => [
  ...lesson.guided,
  ...lesson.exercises,
  ...(lesson.variants ?? []),
];

/** Every exercise of the world: the lessons' guided, scored and variant items, then the boss rounds. */
const ALL: readonly { readonly where: string; readonly def: LogicExerciseDef }[] = [
  ...LESSON_IDS.flatMap((id) =>
    itemsOf(lessonOf(id)).map((def) => ({ where: `${id}/${def.id}`, def })),
  ),
  ...boss.rounds.map((def) => ({ where: `pattern-train/${def.id}`, def })),
];

// ---------------------------------------------------------------------------------------------------------------------
// The frozen spec

/** Each file's `generate:` entries as `<stem> <template>×<count> @<seed> <params>` per slot: the frozen spec of the content. */
interface Spec {
  readonly guided: readonly string[];
  readonly exercises: readonly string[];
  readonly variants: readonly string[];
}

const FROZEN: Readonly<Record<(typeof LESSON_IDS)[number], Spec>> = {
  'pat-repeat': {
    guided: [
      'rep-g-colour pat-next×1 @5 {"unit":"AB","attr":"colour"}',
      'rep-g-kind pat-next×1 @2 {"unit":"AB","attr":"kind","units":3}',
    ],
    exercises: [
      'rep-aab pat-next×1 @6 {"unit":"AAB","attr":"colour"}',
      'rep-abb pat-next×1 @5 {"unit":"ABB","attr":"kind"}',
      'rep-gap-ab pat-gap×1 @8 {"unit":"AB","attr":"size","units":3}',
      'rep-gap-abc pat-gap×1 @2 {"unit":"ABC","attr":"colour"}',
      'rep-abc pat-next×1 @2 {"unit":"ABC","attr":"kind"}',
      'rep-two pat-next×1 @5 {"unit":"ABC","attr":"kind+colour"} easier rep-easy-1',
    ],
    variants: ['rep-easy pat-next×1 @14 {"unit":"AB","attr":"colour","units":3}'],
  },
  'pat-steps': {
    guided: [
      'steps-g3 step-next×1 @1 {"family":"up","step":[3,3]}',
      'steps-g4 step-next×1 @2 {"family":"up","step":[4,4]}',
    ],
    exercises: [
      'steps-up step-next×1 @3 {"family":"up","step":[6,9]}',
      'steps-down step-next×1 @1 {"family":"down"}',
      'steps-double step-next×1 @1 {"family":"double"}',
      'steps-alt step-next×1 @1 {"family":"alternate"}',
      'steps-grow step-next×1 @2 {"family":"grow"} easier steps-easy-1',
      'steps-rule step-rule×1 @2 {"family":"alternate"}',
    ],
    variants: ['steps-easy step-next×1 @4 {"family":"up","step":[2,2],"easy":true}'],
  },
  'pat-grow': {
    guided: [
      'grow-g1 grow-next×1 @1 {"mode":"choice","step":1}',
      'grow-g2 grow-next×1 @5 {"mode":"choice","step":2}',
    ],
    exercises: [
      'grow-plus1 grow-next×2 @2 {"mode":"choice","step":1}',
      'grow-plus2 grow-next×1 @7 {"mode":"choice","step":2}',
      'grow-e1 grow-next×1 @3 {"mode":"entry","step":1,"ahead":1}',
      'grow-e2 grow-next×1 @8 {"mode":"entry","step":1,"ahead":2}',
      'grow-e3 grow-next×1 @9 {"mode":"entry","step":2,"ahead":3} easier grow-easy-1',
    ],
    variants: ['grow-easy grow-next×1 @10 {"mode":"entry","step":1,"ahead":1}'],
  },
  'pat-far': {
    guided: [
      'far-g8 far-term×1 @4 {"unit":"AB","attr":"colour","position":[8,8]}',
      'far-g10 far-term×1 @1 {"unit":"AB","attr":"colour","position":[10,10]}',
    ],
    exercises: [
      'far-ab-1 far-term×1 @2 {"unit":"AB","attr":"colour","position":[9,12]}',
      'far-ab-2 far-term×1 @3 {"unit":"AB","attr":"kind","position":[13,16]}',
      'far-ab-3 far-term×1 @1 {"unit":"AB","attr":"kind+colour","position":[17,20]}',
      'far-abc-1 far-term×1 @10 {"unit":"ABC","attr":"colour","position":[7,9]}',
      'far-abc-2 far-term×1 @3 {"unit":"ABC","attr":"kind","position":[10,12]}',
      'far-abc-3 far-term×1 @2 {"unit":"ABC","attr":"kind+colour","position":[13,15]} easier far-easy-1',
    ],
    variants: ['far-easy far-term×1 @5 {"unit":"AB","attr":"colour","position":[6,6]}'],
  },
};

const FROZEN_BOSS = [
  'train-next pat-next×1 @1 {"unit":"ABC","attr":"colour"}',
  'train-gap pat-gap×1 @14 {"unit":"AAB","attr":"kind"}',
  'train-steps step-next×1 @5 {"family":"up"}',
  'train-grow grow-next×1 @11 {"mode":"choice","step":1}',
  'train-far far-term×1 @3 {"unit":"AB","attr":"colour","position":[9,20]}',
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

/** The authored YAML of a file under `content/`, as parsed (the generate entries, before any expansion). */
function yamlOf(...segments: readonly string[]): unknown {
  const path = join(root, ...segments);
  const read = readYaml(path, path);
  if ('issues' in read) throw new Error(read.issues.join('; '));
  return read.data;
}

function rawLesson(id: string): Record<'guided' | 'exercises' | 'variants', readonly RawEntry[]> {
  return yamlOf('lessons', 'pattern-pond', `${id}.yaml`) as Record<
    'guided' | 'exercises' | 'variants',
    readonly RawEntry[]
  >;
}

const rawBoss = (
  yamlOf('minigames', 'pattern-train.yaml') as { readonly rounds: readonly RawEntry[] }
).rounds;

const idsOf = (defs: readonly LogicExerciseDef[] | undefined): readonly string[] =>
  (defs ?? []).map((def) => def.id);

// ---------------------------------------------------------------------------------------------------------------------
// Reading the compiled cards (independent of the templates)

const shapesOf = (def: LogicExerciseDef): readonly (CardShape | 'gap')[] =>
  def.prompt?.shapes ?? [];
const tokensOf = (def: LogicExerciseDef): readonly CardShape[] =>
  shapesOf(def).filter((token): token is CardShape => token !== 'gap');
const keyOf = (shape: CardShape): string =>
  [shape.kind, shape.colour, shape.size ?? 'big', shape.count ?? 1].join('/');
const optionsOf = (def: LogicExerciseDef) => (def.type === 'choice' ? def.options : []);
const termsOf = (def: LogicExerciseDef): readonly number[] =>
  (def.prompt?.big ?? '').replace(/ \?$/, '').split(' ').map(Number);

/** The reasons an exercise can speak, by bug id. */
function bugsOf(def: LogicExerciseDef): readonly string[] {
  const keys =
    def.type === 'choice'
      ? def.options.flatMap((option) => (option.reasonKey === undefined ? [] : [option.reasonKey]))
      : def.type === 'number-entry'
        ? (def.reasons ?? []).map((reason) => reason.reasonKey)
        : [];
  return keys.map((key) => key.replace('lessons:bugs.', ''));
}

/** Whether the row repeats with some period of at most half its length. */
function repeats(keys: readonly string[]): boolean {
  for (let period = 1; period <= Math.floor(keys.length / 2); period += 1) {
    if (keys.every((key, index) => index + period >= keys.length || key === keys[index + period])) {
      return true;
    }
  }
  return false;
}

const isPattern = (def: LogicExerciseDef): boolean =>
  ['What comes next?', 'What is missing?'].includes(english(def.textKey));

// ---------------------------------------------------------------------------------------------------------------------

describe('the 4 lessons of World 1', () => {
  it('are the curriculum’s, in order, all taught by Pip the Panda: 2 guided, 6 scored, 1 easier variant each', () => {
    const worldOne = content.lessons.filter((lesson) => lesson.world === 'pattern-pond');
    expect(worldOne).toHaveLength(4);
    const byOrder = [...worldOne].sort((a, b) => a.order - b.order);
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
      ['pat-repeat', 'pat-repeat', 'pattern-pond', 1, 'panda', 2, 6, 1],
      ['pat-steps', 'pat-steps', 'pattern-pond', 2, 'panda', 2, 6, 1],
      ['pat-grow', 'pat-grow', 'pattern-pond', 3, 'panda', 2, 6, 1],
      ['pat-far', 'pat-far', 'pattern-pond', 4, 'panda', 2, 6, 1],
    ]);
    expect(byOrder.map((lesson) => english(lesson.titleKey))).toEqual([
      'Repeat',
      'Number steps',
      'Growing',
      'Far ahead',
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
      for (const def of itemsOf(lesson))
        expect(def.textKey, def.id).toBe(`lessons:gen.${def.id}.text`);
    },
  );

  it('use the kinds of the curriculum table', () => {
    const kinds = (defs: readonly LogicExerciseDef[]): readonly string[] =>
      defs.map((def) => def.type);
    expect(kinds(lessonOf('pat-repeat').guided)).toEqual(['choice', 'choice']);
    expect(kinds(lessonOf('pat-repeat').exercises)).toEqual(Array<string>(6).fill('choice'));
    expect(kinds(lessonOf('pat-steps').guided)).toEqual(['number-entry', 'number-entry']);
    expect(kinds(lessonOf('pat-steps').exercises)).toEqual([
      'number-entry',
      'number-entry',
      'number-entry',
      'number-entry',
      'number-entry',
      'choice',
    ]);
    expect(kinds(lessonOf('pat-grow').guided)).toEqual(['choice', 'choice']);
    expect(kinds(lessonOf('pat-grow').exercises)).toEqual([
      'choice',
      'choice',
      'choice',
      'number-entry',
      'number-entry',
      'number-entry',
    ]);
    expect(kinds(lessonOf('pat-far').guided)).toEqual(['choice', 'choice']);
    expect(kinds(lessonOf('pat-far').exercises)).toEqual(Array<string>(6).fill('choice'));
  });

  it('use only parameter sets that the template tests run (200 seeds fast, 1 000 slow), the boss included', () => {
    const tested: Readonly<Record<string, readonly object[]>> = {
      'pat-next': PATTERN_SETS,
      'pat-gap': PATTERN_SETS,
      'step-next': STEP_NEXT_SETS,
      'step-rule': STEP_RULE_SETS,
      'grow-next': GROW_SETS,
      'far-term': FAR_SETS,
    };
    // The set as the template reads it (defaults filled in), so `units` left out equals `units: 2`.
    const normal = (template: string, params: unknown): string =>
      JSON.stringify(
        Object.entries(LOGIC_TEMPLATES[template]?.params.parse(params) as object).sort(),
      );
    const entries = [
      ...LESSON_IDS.flatMap((id) => {
        const raw = rawLesson(id);
        return [...raw.guided, ...raw.exercises, ...raw.variants];
      }),
      ...rawBoss,
    ];
    expect(entries).toHaveLength(9 + 9 + 8 + 9 + 5);
    for (const { id, generate } of entries) {
      const sets = new Set(
        (tested[generate.template] ?? []).map((set) => normal(generate.template, set)),
      );
      expect(sets.has(normal(generate.template, generate.params)), id).toBe(true);
    }
  });

  it('have exactly one easier variant, for the hardest scored item, of the kind the curriculum names; no guided item has one', () => {
    const easierOf = (id: string): readonly (readonly [string, string])[] =>
      lessonOf(id).exercises.flatMap((def) =>
        def.easier === undefined ? [] : [[def.id, def.easier] as const],
      );
    expect(easierOf('pat-repeat')).toEqual([['rep-two-1', 'rep-easy-1']]);
    expect(easierOf('pat-steps')).toEqual([['steps-grow-1', 'steps-easy-1']]);
    expect(easierOf('pat-grow')).toEqual([['grow-e3-1', 'grow-easy-1']]);
    expect(easierOf('pat-far')).toEqual([['far-abc-3-1', 'far-easy-1']]);
    for (const id of LESSON_IDS) {
      expect(lessonOf(id).guided.filter((def) => def.easier !== undefined)).toEqual([]);
    }
  });

  it('give each easier variant the property the curriculum names', () => {
    const only = (id: string): LogicExerciseDef => {
      const [variant] = lessonOf(id).variants ?? [];
      if (variant === undefined) throw new Error(`${id} has no variant`);
      return variant;
    };
    // pat-repeat: the AB pattern (two tokens, one attribute, 3 units shown) for the two-attribute ABC item.
    const rep = only('pat-repeat');
    expect(new Set(tokensOf(rep).map(keyOf)).size).toBe(2);
    expect(new Set(tokensOf(rep).map((token) => token.kind)).size).toBe(1);
    expect(tokensOf(rep).length).toBeGreaterThanOrEqual(6);
    // pat-steps: counting up by 2, a plain step.
    const steps = only('pat-steps');
    expect(
      termsOf(steps)
        .map((term, index, all) => term - (all[index - 1] ?? term))
        .slice(1),
    ).toEqual([2, 2, 2]);
    // pat-grow: the entry one step on (step 4), growing by 1.
    const grow = only('pat-grow');
    expect(grow.type).toBe('number-entry');
    expect(english(grow.textKey)).toBe('How many in step 4?');
    expect(tokensOf(grow).map((token) => token.count)).toEqual([2, 3, 4]);
    // pat-far: the 6th of an AB pattern, the closest place that is not shown.
    const far = only('pat-far');
    expect(english(far.textKey)).toBe('Which shape is number 6?');
    expect(optionsOf(far)).toHaveLength(2);
  });

  it('have no two alike items in a lesson (same card and same options, whatever the id)', () => {
    for (const id of LESSON_IDS) {
      const defs = itemsOf(lessonOf(id));
      const seen = defs.map((def) =>
        JSON.stringify({
          prompt: def.prompt,
          options: optionsOf(def).map((option) => option.shape),
          answer: def.type === 'number-entry' ? def.answer : undefined,
          text: english(def.textKey),
        }),
      );
      expect(new Set(seen).size, id).toBe(defs.length);
    }
  });

  it('say 2-3 short sentences in the story that name the strategy, a worked demo with its card, and every instruction in at most 14 words', () => {
    const strategy: Readonly<Record<(typeof LESSON_IDS)[number], RegExp>> = {
      'pat-repeat': /Find the part that repeats/,
      'pat-steps': /Check every jump/,
      'pat-grow': /Count how many more there are each time/,
      'pat-far': /Count in whole parts that repeat/,
    };
    for (const id of LESSON_IDS) {
      const lesson = lessonOf(id);
      const story = english(lesson.storyKey);
      const sentences = story.split(/(?<=[.!?])\s+/);
      expect(sentences.length, `${id} story`).toBeGreaterThanOrEqual(2);
      expect(sentences.length, `${id} story`).toBeLessThanOrEqual(3);
      expect(story, id).toMatch(strategy[id]);
      expect(english(lesson.demo.textKey).length, `${id} demo`).toBeGreaterThan(20);
      expect(lesson.demo.prompt?.shapes ?? lesson.demo.prompt?.big, `${id} demo card`).toBeTruthy();
      for (const def of itemsOf(lesson)) {
        const words = english(def.textKey).split(/\s+/);
        expect(words.length, `${def.id}: "${words.join(' ')}"`).toBeLessThanOrEqual(14);
      }
    }
    expect(english(lessonOf('pat-repeat').storyKey)).toBe(
      'Pip loves patterns. A pattern has a part that repeats, again and again. Find the part that repeats, then say what comes next!',
    );
  });

  it('can speak the bugs of their lesson: the reasons a wrong answer matches', () => {
    const bugsOfLesson = (id: string): readonly string[] =>
      [...new Set(itemsOf(lessonOf(id)).flatMap(bugsOf))].sort();
    expect(bugsOfLesson('pat-repeat')).toEqual(['unit-break']);
    expect(bugsOfLesson('pat-steps')).toEqual(['first-jump']);
    expect(bugsOfLesson('pat-grow')).toEqual(['grow-off']);
    expect(bugsOfLesson('pat-far')).toEqual(['far-off']);
  });

  it('every exercise plays through its own kind with 3 stars, and a wrong try costs exactly one error', () => {
    for (const { where, def } of ALL) {
      expect(playSolution(def), where).toMatchObject({ solved: true, errors: 0 });
      expect(starsFor(playSolution(def)), where).toBe(3);
      expect(playWrongThenSolve(def), where).toMatchObject({ solved: true, errors: 1 });
    }
  });

  it('narrates everything a child hears: story, demo, every instruction, every reason and the boss goal are in the voice inventory', () => {
    const listed = new Set(compiled.voiceTexts.entries.map((entry) => entry.text));
    for (const id of LESSON_IDS) {
      const lesson = lessonOf(id);
      expect(listed.has(english(lesson.storyKey)), `${id} story`).toBe(true);
      expect(listed.has(english(lesson.demo.textKey)), `${id} demo`).toBe(true);
    }
    for (const { where, def } of ALL) expect(listed.has(english(def.textKey)), where).toBe(true);
    for (const bug of ['unit-break', 'first-jump', 'grow-off', 'far-off']) {
      expect(listed.has(english(`lessons:bugs.${bug}`)), bug).toBe(true);
    }
    expect(listed.has('Every carriage follows the pattern. Which one comes next?')).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------

describe('the content review of World 1: exactly one reading leads to the answer (from the compiled cards)', () => {
  it('W1.1 pattern rows ("What comes next?" / "What is missing?"): one gap, last or inside; exactly one of 3 different cards completes the row as a repeating pattern, and it is the answer', () => {
    const patterns = ALL.filter(({ def }) => isPattern(def));
    // pat-repeat: 2 guided + 6 scored + 1 variant; Pattern Train: 2 rounds.
    expect(patterns).toHaveLength(11);
    for (const { where, def } of patterns) {
      const row = shapesOf(def);
      const gap = row.indexOf('gap');
      expect(
        row.filter((token) => token === 'gap'),
        where,
      ).toHaveLength(1);
      if (english(def.textKey) === 'What comes next?') expect(gap, where).toBe(row.length - 1);
      else {
        expect(gap, where).toBeGreaterThan(1);
        expect(gap, where).toBeLessThan(row.length - 1);
      }
      expect(row.length, where).toBeLessThanOrEqual(8);
      const options = optionsOf(def);
      expect(new Set(options.map((option) => keyOf(option.shape as CardShape))).size, where).toBe(
        3,
      );
      const completing = options.filter((option) =>
        repeats(row.map((token) => keyOf(token === 'gap' ? (option.shape as CardShape) : token))),
      );
      expect(
        completing.map((option) => option.id),
        where,
      ).toEqual([def.type === 'choice' ? def.answer : '']);
    }
  });

  it('W1.2 no distractor shapes: a pattern changes one attribute (kind and colour together in rep-two), one option at most is outside the pattern and changes the same', () => {
    for (const { where, def } of ALL.filter(({ def: one }) => isPattern(one))) {
      const row = tokensOf(def);
      const all = [...row, ...optionsOf(def).map((option) => option.shape as CardShape)];
      const varying = (['kind', 'colour', 'size'] as const).filter(
        (attribute) => new Set(all.map((token) => token[attribute] ?? 'big')).size > 1,
      );
      expect(varying, where).toEqual(
        where.endsWith('rep-two-1') ? ['kind', 'colour'] : [expect.stringMatching(/./)],
      );
      expect(
        all.every((token) => token.count === undefined),
        where,
      ).toBe(true);
      const inRow = new Set(row.map(keyOf));
      expect(
        optionsOf(def).filter((option) => !inRow.has(keyOf(option.shape as CardShape))).length,
        where,
      ).toBeLessThanOrEqual(1);
      // Sizes are the three that can be told apart at a glance.
      for (const token of all)
        expect(['tiny', 'medium', 'huge', undefined], where).toContain(token.size);
    }
  });

  it('W1.3 number rows ("What number comes next?"): 4 terms (5 for two steps taking turns or growing steps) of 0-99, exactly one rule family makes them, and it makes the answer', () => {
    const rows = ALL.filter(({ def }) => english(def.textKey) === 'What number comes next?');
    // pat-steps: 2 guided + 5 scored + 1 variant; Pattern Train: 1 round.
    expect(rows).toHaveLength(9);
    for (const { where, def } of rows) {
      if (def.type !== 'number-entry') throw new Error(`${where} is not a number entry`);
      const terms = termsOf(def);
      expect(terms.length, where).toBeGreaterThanOrEqual(4);
      expect(terms.length, where).toBeLessThanOrEqual(5);
      expect(Math.max(...terms), where).toBeLessThanOrEqual(99);
      expect(def.prompt?.big, where).toBe(`${terms.join(' ')} ?`);
      const fits = nextTerms(terms);
      expect(fits, where).toHaveLength(1);
      expect(fits[0], where).toBe(def.answer);
      expect(def.answer, where).toBeLessThanOrEqual(100);
      expect(String(def.answer).length, where).toBeLessThanOrEqual(def.maxDigits);
      // The slip `first-jump` is a wrong number.
      for (const reason of def.reasons ?? []) expect(reason.value, where).not.toBe(def.answer);
    }
  });

  it('W1.4 rule cards ("Which rule makes these numbers?"): exactly one of the 3 rules makes every number and it is the answer, the others make the first two only, each card says what its id says', () => {
    const found = ALL.find(
      ({ def: one }) => english(one.textKey) === 'Which rule makes these numbers?',
    );
    if (found === undefined) throw new Error('no rule card');
    const { where, def } = found;
    if (def.type !== 'choice') throw new Error(`${where} is not a choice`);
    const terms = termsOf(def);
    expect(def.options).toHaveLength(3);
    const makes = (id: string): readonly number[] => ruleTerms(id, terms[0] ?? 0, terms.length);
    expect(
      def.options.filter((option) => makes(option.id).join() === terms.join()).map((o) => o.id),
    ).toEqual([def.answer]);
    for (const option of def.options.filter((one) => one.id !== def.answer)) {
      const made = makes(option.id);
      expect(made[1], option.id).toBe(terms[1]);
      expect(made[2], option.id).not.toBe(terms[2]);
    }
    for (const option of def.options) {
      expect(english(option.textKey ?? ''), option.id).toBe(ruleWords(option.id));
    }
    expect(new Set(def.options.map((option) => english(option.textKey ?? ''))).size).toBe(3);
  });

  it('W1.5 growing pictures: 3 clusters of one shape growing by a constant step (counts 1-9); the next picture is one of 3 counts right ± step, a later step is asked for by its number, and the answer is that step’s count', () => {
    const grows = ALL.filter(({ def }) =>
      /^(Which picture comes next\?|How many in step \d\?)$/.test(english(def.textKey)),
    );
    // pat-grow: 2 guided + 6 scored + 1 variant; Pattern Train: 1 round.
    expect(grows).toHaveLength(10);
    for (const { where, def } of grows) {
      const row = tokensOf(def);
      const counts = row.map((token) => token.count ?? 1);
      expect(row, where).toHaveLength(3);
      expect(
        new Set(row.map((token) => `${token.kind}/${token.colour}/${String(token.size)}`)).size,
        where,
      ).toBe(1);
      const step = (counts[1] ?? 0) - (counts[0] ?? 0);
      expect([1, 2], where).toContain(step);
      expect((counts[2] ?? 0) - (counts[1] ?? 0), where).toBe(step);
      expect(Math.max(...counts), where).toBeLessThanOrEqual(9);
      const last = counts[2] ?? 0;
      if (def.type === 'choice') {
        expect(shapesOf(def).at(-1), where).toBe('gap');
        const offered = optionsOf(def).map((option) => option.shape?.count ?? 1);
        expect(
          [...offered].sort((a, b) => a - b),
          where,
        ).toEqual([last, last + step, last + 2 * step].map((n) => n));
        expect(
          offered.every((count) => count >= 1 && count <= 9),
          where,
        ).toBe(true);
        expect(optionsOf(def).find((option) => option.id === def.answer)?.shape?.count, where).toBe(
          last + step,
        );
        expect(shapesOf(def), where).toHaveLength(4);
      } else if (def.type === 'number-entry') {
        const asked = Number(/(\d)\?$/.exec(english(def.textKey))?.[1]);
        expect(asked, where).toBeGreaterThanOrEqual(4);
        expect(shapesOf(def), where).toHaveLength(3);
        expect(def.answer, where).toBe(last + (asked - 3) * step);
        expect(def.answer, where).toBeLessThanOrEqual(30);
        expect(
          (def.reasons ?? []).map((reason) => reason.value).sort((a, b) => a - b),
          where,
        ).toEqual([def.answer - step, def.answer + step]);
      } else throw new Error(`${where}: unexpected kind`);
    }
  });

  it('W1.6 far places ("Which shape is number 12?"): the row is 2 whole parts, the place is beyond it, the cards are the part’s tokens, and counting in whole parts gives the answer', () => {
    const fars = ALL.filter(({ def }) =>
      /^Which shape is number \d+\?$/.test(english(def.textKey)),
    );
    // pat-far: 2 guided + 6 scored + 1 variant; Pattern Train: 1 round.
    expect(fars).toHaveLength(10);
    for (const { where, def } of fars) {
      const row = tokensOf(def);
      const n = Number(/(\d+)\?$/.exec(english(def.textKey))?.[1]);
      const unit = row.length / 2;
      expect([2, 3], where).toContain(unit);
      expect(shapesOf(def), where).toHaveLength(row.length);
      expect(n, where).toBeGreaterThan(row.length);
      expect(row.slice(0, unit).map(keyOf), where).toEqual(row.slice(unit).map(keyOf));
      expect(new Set(row.slice(0, unit).map(keyOf)).size, where).toBe(unit);
      expect(
        optionsOf(def)
          .map((option) => keyOf(option.shape as CardShape))
          .sort(),
        where,
      ).toEqual(row.slice(0, unit).map(keyOf).sort());
      // Counting in whole parts: the part holds `unit` places, the answer is the (n mod unit)-th token (the last when it divides).
      const counted = row[(n - 1) % unit];
      expect(
        optionsOf(def).find((option) => option.id === ('answer' in def ? def.answer : undefined))
          ?.shape,
        where,
      ).toEqual(counted);
      // The slip `far-off` is the token a place before or after, a wrong card.
      const slips = [row[(n - 2 + unit) % unit], row[n % unit]].map((token) =>
        keyOf(token as CardShape),
      );
      for (const option of optionsOf(def)) {
        const slip =
          keyOf(option.shape as CardShape) !== keyOf(counted as CardShape) &&
          slips.includes(keyOf(option.shape as CardShape));
        expect(option.reasonKey !== undefined, `${where} ${option.id}`).toBe(slip);
      }
    }
  });

  it('W1.7 the four demos agree with their cards', () => {
    const demo = (id: string) => ({
      text: english(lessonOf(id).demo.textKey),
      prompt: lessonOf(id).demo.prompt,
    });
    // pat-repeat: red circle, blue square, again and again: next comes a blue square.
    const repeat = demo('pat-repeat');
    expect(repeat.prompt?.shapes).toEqual([
      { kind: 'circle', colour: 'red' },
      { kind: 'square', colour: 'blue' },
      { kind: 'circle', colour: 'red' },
      { kind: 'square', colour: 'blue' },
      { kind: 'circle', colour: 'red' },
      'gap',
    ]);
    expect(repeat.text).toBe('Red circle, blue square, again and again. Next comes a blue square.');
    // pat-steps: every jump is plus 4, 15 plus 4 is 19.
    const steps = demo('pat-steps');
    expect(steps.prompt?.big).toBe('3 7 11 15 ?');
    expect(nextTerms([3, 7, 11, 15])).toEqual([19]);
    expect(steps.text).toBe('Every jump is plus 4. 15 plus 4 is 19.');
    // pat-grow: 1, 3, 5 stars, 2 more each step, 7 next.
    const grow = demo('pat-grow');
    expect(grow.prompt?.shapes).toEqual([
      { kind: 'star', colour: 'yellow', count: 1 },
      { kind: 'star', colour: 'yellow', count: 3 },
      { kind: 'star', colour: 'yellow', count: 5 },
      'gap',
    ]);
    expect(grow.text).toBe('Each step has 2 more stars. 5 and 2 more make 7.');
    // pat-far: red, blue, red, blue; the even numbers are blue, so number 10 is blue.
    const far = demo('pat-far');
    expect(
      tokensOf({ prompt: far.prompt } as LogicExerciseDef).map((token) => token.colour),
    ).toEqual(['red', 'blue', 'red', 'blue']);
    expect(far.text).toBe(
      'Count in twos: numbers 2, 4, 6, 8 and 10 are all blue. Number 10 is blue.',
    );
  });

  it('W1.8 look-alikes: no two tokens of one exercise (row and cards) differ only in a confusable colour (red-green, green-orange, blue-purple), and no square sits with a diamond', () => {
    const confusable = new Set(['red|green', 'green|orange', 'blue|purple']);
    const withShapes = ALL.filter(({ def }) => shapesOf(def).length > 0);
    // 11 pattern + 10 growing + 10 far items.
    expect(withShapes).toHaveLength(31);
    for (const { where, def } of withShapes) {
      const all = [...tokensOf(def), ...optionsOf(def).map((option) => option.shape as CardShape)];
      for (const [index, a] of all.entries()) {
        for (const b of all.slice(index + 1)) {
          const sameBut =
            a.kind === b.kind &&
            (a.size ?? 'big') === (b.size ?? 'big') &&
            (a.count ?? 1) === (b.count ?? 1);
          const pair = `${a.colour}|${b.colour}`;
          const reverse = `${b.colour}|${a.colour}`;
          expect(sameBut && (confusable.has(pair) || confusable.has(reverse)), where).toBe(false);
        }
      }
      const kinds = new Set(all.map((token) => token.kind));
      expect(kinds.has('square') && kinds.has('diamond'), where).toBe(false);
    }
  });

  it('W1.9 the answer is not always the same card: among the choices of 3 cards, each place holds the answer at least 3 times (of 21)', () => {
    const picks = ALL.flatMap(({ def }) =>
      def.type === 'choice' && def.options.length === 3
        ? [def.options.findIndex((option) => option.id === def.answer)]
        : [],
    );
    expect(picks).toHaveLength(21);
    for (const spot of [0, 1, 2]) {
      expect(picks.filter((pick) => pick === spot).length, String(spot)).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('the Pattern Train world boss', () => {
  it('is a series of 5 carriages: the next token, the missing one, the next number, the next picture, a far place; 3 stars with no mistake, 2 up to 2', () => {
    expect(boss).toMatchObject({
      id: 'pattern-train',
      mode: 'series',
      concept: 'pat-far',
      unlockAfter: 'pat-far',
      errors3: 0,
      errors2: 2,
    });
    expect(boss.rounds.map((round) => round.id)).toEqual([
      'train-next-1',
      'train-gap-1',
      'train-steps-1',
      'train-grow-1',
      'train-far-1',
    ]);
    expect(boss.rounds.map((round) => [round.type, english(round.textKey)])).toEqual([
      ['choice', 'What comes next?'],
      ['choice', 'What is missing?'],
      ['number-entry', 'What number comes next?'],
      ['choice', 'Which picture comes next?'],
      ['choice', expect.stringMatching(/^Which shape is number \d+\?$/)],
    ]);
    expect(english(boss.titleKey)).toBe('Pattern Train');
    expect(english(boss.goalKey)).toBe('Every carriage follows the pattern. Which one comes next?');
  });

  it('is the boss of the world (tracks.yaml), opened by the last lesson, in the YAML spec that is frozen', () => {
    expect(specOf(rawBoss)).toEqual(FROZEN_BOSS);
    expect(compiled.tracks.tracks[0]?.worlds[0]?.boss).toBe('pattern-train');
    expect(lessonOf('pat-far').order).toBe(
      Math.max(
        ...content.lessons
          .filter((lesson) => lesson.world === 'pattern-pond')
          .map((lesson) => lesson.order),
      ),
    );
  });

  it('plays: every round is solved by its own kind with 3 stars', () => {
    for (const round of boss.rounds) {
      expect(playSolution(round), round.id).toMatchObject({ solved: true, errors: 0 });
      expect(playWrongThenSolve(round), round.id).toMatchObject({ solved: true, errors: 1 });
    }
  });
});

describe('the world, its rank and its badge', () => {
  it('is Pattern Pond on the river, with Pattern Train as its boss, the thinker rank at the start and the spotter rank after it', () => {
    const [main] = compiled.tracks.tracks;
    expect(compiled.tracks.tracks).toHaveLength(1);
    expect(main).toMatchObject({ id: 'puzzles', kind: 'main' });
    expect(main?.worlds[0]).toEqual(
      expect.objectContaining({
        id: 'pattern-pond',
        order: 1,
        habitat: 'river',
        boss: 'pattern-train',
      }),
    );
    expect(compiled.tracks.ranks.slice(0, 2)).toEqual([
      { id: 'thinker', after: 'start' },
      { id: 'spotter', after: 'world:pattern-pond' },
    ]);
    const en = locales.en as Record<string, Record<string, unknown>> | undefined;
    expect(en?.journey).toMatchObject({
      tracks: { puzzles: 'Puzzle Paths' },
      worlds: { 'pattern-pond': 'Pattern Pond' },
      ranks: { thinker: 'Thinker', spotter: 'Pattern Spotter' },
    });
  });

  it('has the Pattern Spotter badge (master the world and beat the train) and the star badge', () => {
    expect(
      compiled.badges
        .filter((badge) => badge.id !== 'shore-sorter')
        .map((badge) => [badge.id, badge.condition]),
    ).toEqual([
      ['pattern-spotter', { type: 'mastered', scope: 'world:pattern-pond', thresholds: [1] }],
      ['star-collector', { type: 'stars-total', thresholds: [10, 30] }],
    ]);
    const en = locales.en as Record<string, Record<string, unknown>> | undefined;
    expect(en?.rewards?.badges).toMatchObject({
      'pattern-spotter': {
        name: 'Pattern Spotter',
        condition: 'Master Pattern Pond and beat Pattern Train',
      },
    });
  });
});

describe('the review’s own solvers (they reject a bad card)', () => {
  it('nextTerms finds every rule family that makes the numbers: 1 2 4 has three readings, 3 7 11 15 one', () => {
    expect(nextTerms([3, 7, 11, 15])).toEqual([19]);
    expect(nextTerms([1, 2, 4])).toEqual([8, 5, 7]);
    expect(nextTerms([2, 5, 3, 9])).toEqual([]);
    expect(nextTerms([5, 5, 5, 5])).toEqual([]);
  });

  it('repeats accepts a row that repeats with a period up to half its length, and nothing else', () => {
    expect(repeats(['a', 'b', 'a', 'b', 'a'])).toBe(true);
    expect(repeats(['a', 'a', 'b', 'a', 'a', 'b', 'a'])).toBe(true);
    expect(repeats(['a', 'b', 'a', 'c', 'a'])).toBe(false);
    expect(repeats(['a', 'b', 'c', 'a', 'b', 'd'])).toBe(false);
  });

  it('ruleTerms and ruleWords read a rule card id back', () => {
    expect(ruleTerms('step-4', 3, 5)).toEqual([3, 7, 11, 15, 19]);
    expect(ruleTerms('double', 3, 4)).toEqual([3, 6, 12, 24]);
    expect(ruleTerms('alt-5-2', 9, 5)).toEqual([9, 14, 16, 21, 23]);
    expect(ruleTerms('grow-3', 5, 5)).toEqual([5, 8, 12, 17, 23]);
    expect(ruleWords('alt-5-2')).toBe('+5, then +2, again and again');
    expect(ruleWords('grow-3')).toBe('+3, +4, +5 …');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Independent solvers over the shown numbers

/** The next term of every rule family that makes `terms`: constant step, constant whole ratio, two steps taking turns, steps growing. */
function nextTerms(terms: readonly number[]): readonly number[] {
  const jumps = terms.slice(1).map((term, index) => term - (terms[index] ?? 0));
  const [j0 = 0, j1 = 0] = jumps;
  const last = terms.at(-1) ?? 0;
  const found: number[] = [];
  if (j0 !== 0 && jumps.every((jump) => jump === j0)) found.push(last + j0);
  const ratio = (terms[1] ?? 0) / (terms[0] ?? 1);
  if (
    Number.isInteger(ratio) &&
    ratio >= 2 &&
    terms.every((term, index) => term === (terms[0] ?? 0) * ratio ** index)
  ) {
    found.push(last * ratio);
  }
  if (j0 !== j1 && jumps.every((jump, index) => jump === (index % 2 === 0 ? j0 : j1))) {
    found.push(last + (jumps.length % 2 === 0 ? j0 : j1));
  }
  const growth = j1 - j0;
  if (growth !== 0 && jumps.every((jump, index) => jump === j0 + index * growth)) {
    found.push(last + j0 + jumps.length * growth);
  }
  return found;
}

/** The terms the rule card `id` (`step-4`, `double`, `alt-5-2`, `grow-3`) makes from `start`. */
function ruleTerms(id: string, start: number, count: number): readonly number[] {
  const [kind = '', one = '0', two = '0'] = id.split('-');
  const terms = [start];
  for (let index = 0; index < count - 1; index += 1) {
    const before = terms[index] ?? 0;
    if (kind === 'double') terms.push(before * 2);
    else if (kind === 'step') terms.push(before + Number(one));
    else if (kind === 'alt') terms.push(before + Number(index % 2 === 0 ? one : two));
    else terms.push(before + Number(one) + index);
  }
  return terms;
}

/** The English words of the rule card `id`. */
function ruleWords(id: string): string {
  const [kind = '', one = '', two = ''] = id.split('-');
  if (kind === 'double') return '× 2 each time';
  if (kind === 'step') return `+${one} each time`;
  if (kind === 'alt') return `+${one}, then +${two}, again and again`;
  return `+${one}, +${String(Number(one) + 1)}, +${String(Number(one) + 2)} …`;
}
