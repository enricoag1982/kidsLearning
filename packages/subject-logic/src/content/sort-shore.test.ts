// World 2, Sort Shore, as shipped (m14.10): the five classification and seriation lessons and the Sorting Sprint boss, generated from the
// W2 templates (the four "taller than" items of Line up are authored). The stored seeds and ids are frozen here (a stored star is attached
// to an id: never reseed or recount a released lesson), the curriculum table of docs/subjects/logic/curriculum.md is held by the kinds
// per lesson, the easier variants and the wording; the "exactly one reading" content review (curriculum §6) is re-derived from the
// compiled cards, not from the templates' own checks.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compileAll } from '@learn/platform-content/compile-all';
import { resolveText } from '@learn/platform-content/text-resolve';
import { readYaml } from '@learn/platform-content/yaml-file';
import type { CardShape } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import type { GroupDef } from '@learn/platform-core/domain/exercise/kinds/group/def';
import type {
  LogicContent,
  LogicExerciseDef,
  LogicLesson,
  LogicSeriesGame,
} from '../core/types.ts';
import { playSolution, playWrongThenSolve, starsFor } from '../testing/index.ts';
import { logicContent, LOGIC_TEMPLATES } from './logic-content.ts';
import {
  CARROLL_SETS,
  LINE_UP_SETS,
  ODD_ONE_SETS,
  ODD_RULE_SETS,
  SORT_BOXES_SETS,
  VENN_SETS,
} from './templates/solvers-w2.ts';

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

const LESSON_IDS = ['cls-odd', 'cls-rule', 'cls-boxes', 'cls-circles', 'cls-line-up'] as const;

function lessonOf(id: string): LogicLesson {
  const found = content.lessons.find((lesson) => lesson.id === id);
  if (found === undefined) throw new Error(`no lesson ${id}`);
  return found;
}

const boss = ((): LogicSeriesGame => {
  const found = content.minigames.find((game) => game.id === 'sorting-sprint');
  if (found?.mode !== 'series') throw new Error('no sorting-sprint series');
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
  ...boss.rounds.map((def) => ({ where: `sorting-sprint/${def.id}`, def })),
];

// ---------------------------------------------------------------------------------------------------------------------
// The frozen spec

/** Each file's entries as `<stem> <template>×<count> @<seed> <params>` (a generated one) or `<id> authored <type>` per slot. */
interface Spec {
  readonly guided: readonly string[];
  readonly exercises: readonly string[];
  readonly variants: readonly string[];
}

const FROZEN: Readonly<Record<(typeof LESSON_IDS)[number], Spec>> = {
  'cls-odd': {
    guided: [
      'odd-g-colour odd-one×1 @7 {"attr":"colour","items":3}',
      'odd-g-kind odd-one×1 @2 {"attr":"kind","items":3}',
    ],
    exercises: [
      'odd-colour odd-one×1 @6 {"attr":"colour","items":4}',
      'odd-kind odd-one×1 @1 {"attr":"kind","items":4}',
      'odd-size odd-one×1 @8 {"attr":"size","items":4}',
      'odd-count odd-one×1 @4 {"attr":"count","items":4}',
      'odd-noise-a odd-one×1 @6 {"attr":"size","items":4,"noise":true}',
      'odd-noise-b odd-one×1 @3 {"attr":"colour","items":4,"noise":true} easier odd-easy-1',
    ],
    variants: ['odd-easy odd-one×1 @7 {"attr":"kind","items":3}'],
  },
  'cls-rule': {
    guided: [
      'rule-g-colour odd-rule×1 @7 {"attr":"colour","items":3}',
      'rule-g-kind odd-rule×1 @8 {"attr":"kind","items":3}',
    ],
    exercises: [
      'rule-colour odd-rule×1 @4 {"attr":"colour","items":4}',
      'rule-kind odd-rule×1 @7 {"attr":"kind","items":4}',
      'rule-size odd-rule×1 @2 {"attr":"size","items":4}',
      'rule-last odd-rule×1 @3 {"attr":"size","items":4} easier rule-easy-1',
      'rule-noise-a odd-one×1 @1 {"attr":"kind","items":4,"noise":true}',
      'rule-noise-b odd-one×1 @8 {"attr":"count","items":4,"noise":true}',
    ],
    variants: ['rule-easy odd-rule×1 @7 {"attr":"size","items":3}'],
  },
  'cls-boxes': {
    guided: [
      'box-g-colour sort-boxes×1 @7 {"attr":"colour","boxes":2,"items":4}',
      'box-g-kind sort-boxes×1 @4 {"attr":"kind","boxes":2,"items":4}',
    ],
    exercises: [
      'box-two sort-boxes×1 @4 {"attr":"size","boxes":2,"items":6}',
      'box-three sort-boxes×1 @4 {"attr":"kind","boxes":3,"items":5}',
      'car-colour-kind carroll×1 @4 {"axes":["colour","kind"],"items":5}',
      'car-size-kind carroll×1 @1 {"axes":["size","kind"],"items":6}',
      'car-colour-size carroll×1 @1 {"axes":["colour","size"],"items":6}',
      'car-kind-count carroll×1 @4 {"axes":["kind","count"],"items":7} easier box-easy-1',
    ],
    variants: ['box-easy sort-boxes×1 @3 {"attr":"size","boxes":2,"items":4}'],
  },
  'cls-circles': {
    guided: [
      'venn-g-a venn×1 @2 {"facts":"shapes","items":4,"outside":false}',
      'venn-g-b venn×1 @6 {"facts":"shapes","items":5,"outside":true}',
    ],
    exercises: [
      'venn-s1 venn×1 @7 {"facts":"shapes","items":5,"outside":false}',
      'venn-s2 venn×1 @5 {"facts":"shapes","items":6,"outside":true}',
      'venn-s3 venn×1 @1 {"facts":"shapes","items":7,"outside":false}',
      'venn-s4 venn×1 @3 {"facts":"shapes","items":7,"outside":true}',
      'venn-an-a venn×1 @8 {"facts":"animals","items":6,"outside":true}',
      'venn-an-b venn×1 @5 {"facts":"animals","items":7,"outside":true} easier venn-easy-1',
    ],
    variants: ['venn-easy venn×1 @3 {"facts":"shapes","items":4,"outside":false}'],
  },
  'cls-line-up': {
    guided: [
      'lu-g-size line-up×1 @4 {"by":"size","items":3}',
      'lu-g-count line-up×1 @4 {"by":"count","items":4}',
    ],
    exercises: [
      'lu-size-5 line-up×1 @4 {"by":"size","items":5}',
      'lu-count-5 line-up×1 @3 {"by":"count","items":5}',
      'lu-tallest authored choice',
      'lu-shortest authored choice',
      'lu-order authored order easier lu-easy-1',
      'lu-true authored true-false',
    ],
    variants: ['lu-easy line-up×1 @3 {"by":"size","items":3}'],
  },
};

const FROZEN_BOSS = [
  'sprint-odd odd-one×1 @4 {"attr":"colour","items":4,"noise":true}',
  'sprint-rule odd-rule×1 @6 {"attr":"kind","items":4}',
  'sprint-boxes sort-boxes×1 @7 {"attr":"colour","boxes":2,"items":5}',
  'sprint-carroll carroll×1 @1 {"axes":["colour","kind"],"items":6}',
  'sprint-venn venn×1 @8 {"facts":"shapes","items":6,"outside":true}',
];

interface RawEntry {
  readonly id: string;
  readonly type?: string;
  readonly easier?: string;
  readonly generate?: {
    readonly template: string;
    readonly count: number;
    readonly seed: number;
    readonly params?: unknown;
  };
}

function specOf(entries: readonly RawEntry[]): readonly string[] {
  return entries.map(({ id, type, easier, generate }) => {
    const tail = easier === undefined ? '' : ` easier ${easier}`;
    if (generate === undefined) return `${id} authored ${String(type)}${tail}`;
    const { template, count, seed, params } = generate;
    return `${id} ${template}×${String(count)} @${String(seed)} ${JSON.stringify(params)}${tail}`;
  });
}

/** The authored YAML of a file under `content/`, as parsed (the entries, before any expansion). */
function yamlOf(...segments: readonly string[]): unknown {
  const path = join(root, ...segments);
  const read = readYaml(path, path);
  if ('issues' in read) throw new Error(read.issues.join('; '));
  return read.data;
}

function rawLesson(id: string): Record<'guided' | 'exercises' | 'variants', readonly RawEntry[]> {
  return yamlOf('lessons', 'sort-shore', `${id}.yaml`) as Record<
    'guided' | 'exercises' | 'variants',
    readonly RawEntry[]
  >;
}

const rawBoss = (
  yamlOf('minigames', 'sorting-sprint.yaml') as { readonly rounds: readonly RawEntry[] }
).rounds;

const idsOf = (defs: readonly LogicExerciseDef[] | undefined): readonly string[] =>
  (defs ?? []).map((def) => def.id);

// ---------------------------------------------------------------------------------------------------------------------
// Reading the compiled cards (independent of the templates)

const ATTRS = ['colour', 'kind', 'size', 'count'] as const;
type Attr = (typeof ATTRS)[number];

/** A card's value of an attribute as the drawing shows it. */
function value(shape: CardShape, attr: Attr): string {
  if (attr === 'size') return shape.size ?? 'big';
  if (attr === 'count') return String(shape.count ?? 1);
  return shape[attr];
}

const keyOf = (shape: CardShape): string => ATTRS.map((attr) => value(shape, attr)).join('/');

const optionsOf = (def: LogicExerciseDef) => (def.type === 'choice' ? def.options : []);
const shapesOfOptions = (def: LogicExerciseDef): readonly CardShape[] =>
  optionsOf(def).flatMap((option) => (option.shape === undefined ? [] : [option.shape]));

const groupOf = (def: LogicExerciseDef): GroupDef => {
  if (def.type !== 'group') throw new Error(`${def.id} is not a group`);
  return def;
};

/** The card faces of an exercise: its prompt row, its option / group / order cards. */
function shapesOf(def: LogicExerciseDef): readonly CardShape[] {
  const row = (def.prompt?.shapes ?? []).filter((token): token is CardShape => token !== 'gap');
  const cards =
    def.type === 'group' || def.type === 'order'
      ? def.items.flatMap((item) => (item.shape === undefined ? [] : [item.shape]))
      : shapesOfOptions(def);
  return [...row, ...cards];
}

const isWorldTemplate = (def: LogicExerciseDef, text: string): boolean =>
  english(def.textKey) === text;

const oddOnes = ALL.filter(({ def }) => isWorldTemplate(def, 'Which one is different?'));
const oddRules = ALL.filter(({ def }) =>
  isWorldTemplate(def, 'What is the same about all of them?'),
);
const boxes = ALL.filter(({ def }) => isWorldTemplate(def, 'Put each card in its box.'));
const carrolls = ALL.filter(({ def }) =>
  isWorldTemplate(def, 'Look at both rules. Where does each card go?'),
);
const venns = ALL.filter(({ def }) =>
  isWorldTemplate(def, 'Where does each card go? The middle fits both.'),
);
/** The 16 animals of the curriculum table, an independent copy. */
const ANIMAL_FACTS: Readonly<Record<string, readonly string[]>> = {
  '🦆': ['can:fly', 'can:swim', 'farm'],
  '🐐': ['legs:4', 'farm'],
  '🐄': ['legs:4', 'farm'],
  '🐖': ['legs:4', 'farm'],
  '🐎': ['legs:4', 'farm'],
  '🐑': ['legs:4', 'farm'],
  '🐟': ['can:swim'],
  '🐋': ['can:swim'],
  '🦅': ['can:fly'],
  '🦉': ['can:fly'],
  '🐝': ['can:fly'],
  '🐸': ['can:swim', 'legs:4'],
  '🐕': ['legs:4'],
  '🦁': ['legs:4'],
  '🐧': ['can:swim'],
  '🦇': ['can:fly'],
};

/** The facts a group card states for the rules: a shape's four, or its animal's from the table. */
function factsOf(item: GroupDef['items'][number]): readonly string[] {
  if (item.shape !== undefined)
    return ATTRS.map((attr) => `${attr}:${value(item.shape as CardShape, attr)}`);
  return ANIMAL_FACTS[item.emoji ?? ''] ?? [];
}

const meets = (
  rule: { all?: readonly string[]; none?: readonly string[] },
  facts: readonly string[],
): boolean =>
  (rule.all ?? []).every((fact) => facts.includes(fact)) &&
  (rule.none ?? []).every((fact) => !facts.includes(fact));

// ---------------------------------------------------------------------------------------------------------------------

describe('the 5 lessons of World 2', () => {
  it('are the curriculum’s, in order, all taught by Pip the Panda: 2 guided, 6 scored, 1 easier variant each', () => {
    const worldTwo = content.lessons.filter((lesson) => lesson.world === 'sort-shore');
    expect(worldTwo).toHaveLength(5);
    const byOrder = [...worldTwo].sort((a, b) => a.order - b.order);
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
      ['cls-odd', 'cls-odd', 'sort-shore', 1, 'panda', 2, 6, 1],
      ['cls-rule', 'cls-rule', 'sort-shore', 2, 'panda', 2, 6, 1],
      ['cls-boxes', 'cls-boxes', 'sort-shore', 3, 'panda', 2, 6, 1],
      ['cls-circles', 'cls-circles', 'sort-shore', 4, 'panda', 2, 6, 1],
      ['cls-line-up', 'cls-line-up', 'sort-shore', 5, 'panda', 2, 6, 1],
    ]);
    expect(byOrder.map((lesson) => english(lesson.titleKey))).toEqual([
      'Odd one out',
      'Find the rule',
      'Two boxes',
      'Circles',
      'Line up',
    ]);
    // 10 guided + 30 scored + 5 variants + 5 boss rounds = 50 exercises.
    expect(ALL).toHaveLength(50);
  });

  it.each(LESSON_IDS)(
    '%s: the YAML (seeds, counts, params, order) is the frozen spec, and its ids are <stem>-<n> (authored items keep theirs)',
    (id) => {
      const raw = rawLesson(id);
      const frozen = FROZEN[id];
      expect(specOf(raw.guided)).toEqual(frozen.guided);
      expect(specOf(raw.exercises)).toEqual(frozen.exercises);
      expect(specOf(raw.variants)).toEqual(frozen.variants);
      const lesson = lessonOf(id);
      const expandIds = (entries: readonly RawEntry[]): readonly string[] =>
        entries.flatMap((entry) =>
          entry.generate === undefined
            ? [entry.id]
            : Array.from(
                { length: entry.generate.count },
                (_unused, i) => `${entry.id}-${String(i + 1)}`,
              ),
        );
      expect(idsOf(lesson.guided)).toEqual(expandIds(raw.guided));
      expect(idsOf(lesson.exercises)).toEqual(expandIds(raw.exercises));
      expect(idsOf(lesson.variants)).toEqual(expandIds(raw.variants));
      // Every exercise sentence is generated, but the four authored clue items.
      for (const def of itemsOf(lesson)) {
        expect(def.textKey, def.id).toBe(
          def.id.startsWith('lu-') && !/-\d+$/.test(def.id)
            ? `lessons:${def.id}`
            : `lessons:gen.${def.id}.text`,
        );
      }
    },
  );

  it('use the kinds of the curriculum table', () => {
    const kinds = (defs: readonly LogicExerciseDef[]): readonly string[] =>
      defs.map((def) => def.type);
    const fill = (type: string, n: number): readonly string[] => Array<string>(n).fill(type);
    expect(kinds(lessonOf('cls-odd').guided)).toEqual(fill('choice', 2));
    expect(kinds(lessonOf('cls-odd').exercises)).toEqual(fill('choice', 6));
    expect(kinds(lessonOf('cls-rule').guided)).toEqual(fill('choice', 2));
    expect(kinds(lessonOf('cls-rule').exercises)).toEqual(fill('choice', 6));
    expect(kinds(lessonOf('cls-boxes').guided)).toEqual(fill('group', 2));
    expect(kinds(lessonOf('cls-boxes').exercises)).toEqual(fill('group', 6));
    expect(kinds(lessonOf('cls-circles').guided)).toEqual(fill('group', 2));
    expect(kinds(lessonOf('cls-circles').exercises)).toEqual(fill('group', 6));
    expect(kinds(lessonOf('cls-line-up').guided)).toEqual(fill('order', 2));
    expect(kinds(lessonOf('cls-line-up').exercises)).toEqual([
      'order',
      'order',
      'choice',
      'choice',
      'order',
      'true-false',
    ]);
    // Layouts: cls-boxes is rows then Carroll tables, cls-circles Venns.
    expect(lessonOf('cls-boxes').guided.map((def) => groupOf(def).layout)).toEqual(['row', 'row']);
    expect(lessonOf('cls-boxes').exercises.map((def) => groupOf(def).layout)).toEqual([
      'row',
      'row',
      'carroll',
      'carroll',
      'carroll',
      'carroll',
    ]);
    expect(itemsOf(lessonOf('cls-circles')).map((def) => groupOf(def).layout)).toEqual(
      fill('venn', 9),
    );
    expect(boss.rounds.map((round) => round.type)).toEqual([
      'choice',
      'choice',
      'group',
      'group',
      'group',
    ]);
  });

  it('use only parameter sets that the template tests run (200 seeds fast, 1 000 slow), the boss included', () => {
    const tested: Readonly<Record<string, readonly object[]>> = {
      'odd-one': ODD_ONE_SETS,
      'odd-rule': ODD_RULE_SETS,
      'sort-boxes': SORT_BOXES_SETS,
      carroll: CARROLL_SETS,
      venn: VENN_SETS,
      'line-up': LINE_UP_SETS,
    };
    // The set as the template reads it (defaults filled in), so `noise` left out equals `noise: false`.
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
    ].filter((entry) => entry.generate !== undefined);
    // 50 exercises, 4 of them authored.
    expect(entries).toHaveLength(50 - 4);
    for (const { id, generate } of entries) {
      if (generate === undefined) continue;
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
    expect(easierOf('cls-odd')).toEqual([['odd-noise-b-1', 'odd-easy-1']]);
    expect(easierOf('cls-rule')).toEqual([['rule-last-1', 'rule-easy-1']]);
    expect(easierOf('cls-boxes')).toEqual([['car-kind-count-1', 'box-easy-1']]);
    expect(easierOf('cls-circles')).toEqual([['venn-an-b-1', 'venn-easy-1']]);
    expect(easierOf('cls-line-up')).toEqual([['lu-order', 'lu-easy-1']]);
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
    // cls-odd: an odd one out of 3 cards with no noise.
    expect(optionsOf(only('cls-odd'))).toHaveLength(3);
    // cls-rule: a row of 3 cards for the row of 4.
    expect(only('cls-rule').prompt?.shapes).toHaveLength(3);
    // cls-boxes: two boxes, 4 cards, for the Carroll table.
    expect(groupOf(only('cls-boxes'))).toMatchObject({ layout: 'row' });
    expect(groupOf(only('cls-boxes')).boxes).toHaveLength(2);
    expect(groupOf(only('cls-boxes')).items).toHaveLength(4);
    // cls-circles: a Venn of 4 cards with no outside.
    const venn = groupOf(only('cls-circles'));
    expect(venn.items).toHaveLength(4);
    expect(venn.allowEmpty).toBe(true);
    expect(venn.items.every((item) => item.shape !== undefined)).toBe(true);
    // cls-line-up: 3 shape cards by size, for the 3 animals.
    const lineUp = only('cls-line-up');
    expect(lineUp.type).toBe('order');
    expect(english(lineUp.textKey)).toBe('Put them in order, smallest first.');
    expect(lineUp.type === 'order' ? lineUp.items : []).toHaveLength(3);
  });

  it('have no two alike items in a lesson (same cards and same words, whatever the id)', () => {
    for (const id of LESSON_IDS) {
      const defs = itemsOf(lessonOf(id));
      const seen = defs.map((def) =>
        JSON.stringify({
          prompt: def.prompt,
          cards:
            def.type === 'choice'
              ? def.options.map((option) => [option.shape, option.emoji, option.textKey])
              : def.type === 'group' || def.type === 'order'
                ? def.items.map((item) => [item.shape, item.emoji])
                : undefined,
          rules: def.type === 'group' ? [def.boxes, def.axes] : undefined,
          text: english(def.textKey),
        }),
      );
      expect(new Set(seen).size, id).toBe(defs.length);
    }
  });

  it('say 2-3 short sentences in the story that name the strategy, a worked demo with its card, and every generated instruction in at most 14 words', () => {
    const strategy: Readonly<Record<(typeof LESSON_IDS)[number], RegExp>> = {
      'cls-odd': /Check the colour, the shape, the size and how many/,
      'cls-rule': /Check one thing at a time/,
      'cls-boxes': /Check the card against the rule/,
      'cls-circles': /A card that fits both goes in the middle/,
      'cls-line-up': /Compare two at a time/,
    };
    for (const id of LESSON_IDS) {
      const lesson = lessonOf(id);
      const story = english(lesson.storyKey);
      const sentences = story.split(/(?<=[.!?])\s+/);
      expect(sentences.length, `${id} story`).toBeGreaterThanOrEqual(2);
      expect(sentences.length, `${id} story`).toBeLessThanOrEqual(3);
      expect(story, id).toMatch(strategy[id]);
      expect(english(lesson.demo.textKey).length, `${id} demo`).toBeGreaterThan(20);
      expect(lesson.demo.prompt?.shapes, `${id} demo card`).toBeTruthy();
      for (const def of itemsOf(lesson).filter((one) => one.textKey.startsWith('lessons:gen.'))) {
        const words = english(def.textKey).split(/\s+/);
        expect(words.length, `${def.id}: "${words.join(' ')}"`).toBeLessThanOrEqual(14);
      }
    }
  });

  it('say the stories and demos of the curriculum', () => {
    expect(
      LESSON_IDS.map((id) => [english(lessonOf(id).storyKey), english(lessonOf(id).demo.textKey)]),
    ).toEqual([
      [
        'Pip found shells on the shore. They are all alike, except one! Check the colour, the shape, the size and how many.',
        'Three are circles. The square is the odd one out.',
      ],
      [
        'Now Pip asks: what do they all share? Check one thing at a time: colour, then shape, then size.',
        'Different shapes, different sizes, but all red. They are all red!',
      ],
      [
        'Pip sorts the shells into boxes. Each box has a rule. Check the card against the rule, then put it in.',
        'Is it red? Yes. Is it a circle? Yes. It goes where red meets circle.',
      ],
      [
        'Two circles, two rules. A card that fits both goes in the middle, where the circles meet. A card that fits neither stays outside.',
        'Blue? Yes. A circle? No. It goes in the blue circle only.',
      ],
      [
        'Pip lines the shells up from smallest to biggest. Compare two at a time. If the bear is taller than the fox, and the fox is taller than the rabbit, then the bear is taller than the rabbit!',
        'Smallest first: tiny, then medium, then huge.',
      ],
    ]);
  });

  it('every exercise plays through its own kind with 3 stars, and a wrong try costs exactly one error', () => {
    for (const { where, def } of ALL) {
      expect(playSolution(def), where).toMatchObject({ solved: true, errors: 0 });
      expect(starsFor(playSolution(def)), where).toBe(3);
      expect(playWrongThenSolve(def), where).toMatchObject({ solved: true, errors: 1 });
    }
  });

  it('narrates everything a child hears: story, demo, every instruction and the boss goal are in the voice inventory', () => {
    const listed = new Set(compiled.voiceTexts.entries.map((entry) => entry.text));
    for (const id of LESSON_IDS) {
      const lesson = lessonOf(id);
      expect(listed.has(english(lesson.storyKey)), `${id} story`).toBe(true);
      expect(listed.has(english(lesson.demo.textKey)), `${id} demo`).toBe(true);
    }
    for (const { where, def } of ALL) expect(listed.has(english(def.textKey)), where).toBe(true);
    expect(listed.has('Help Pip sort the shells!')).toBe(true);
    // The box and axis words, the rule sentences and the group notes the Owl speaks.
    expect(listed.has('Not this box. Check what the box wants.')).toBe(true);
    expect(listed.has('Right column! Now check the row.')).toBe(true);
    expect(listed.has('Does it fit both circles, or just one?')).toBe(true);
    expect(listed.has('Look at what each box wants.')).toBe(true);
    expect(listed.has('Red')).toBe(false);
    expect(listed.has('They are all red.')).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------------------------------

describe('the content review of World 2: exactly one reading leads to the answer (from the compiled cards)', () => {
  it('W2.1 odd one out ("Which one is different?"): 3-4 cards equal in every attribute but one, in which exactly the answer is unique; a noise attribute splits the 4 cards 2-2', () => {
    // cls-odd: 2 guided + 6 scored + 1 variant; cls-rule: 2 noise items; Sorting Sprint: 1 round.
    expect(oddOnes).toHaveLength(12);
    for (const { where, def } of oddOnes) {
      const cards = shapesOfOptions(def);
      expect(cards.length, where).toBe(optionsOf(def).length);
      expect([3, 4], where).toContain(cards.length);
      const uniqueIn = ATTRS.filter((attr) =>
        cards.some(
          (card) => cards.filter((other) => value(other, attr) === value(card, attr)).length === 1,
        ),
      );
      expect(uniqueIn.length, where).toBe(1);
      const attr = uniqueIn[0] as Attr;
      const unique = cards.filter(
        (card) => cards.filter((other) => value(other, attr) === value(card, attr)).length === 1,
      );
      expect(unique, where).toHaveLength(1);
      const answer = optionsOf(def).find(
        (option) => option.id === (def.type === 'choice' ? def.answer : ''),
      );
      expect(answer?.shape, where).toBe(unique[0]);
      // Every other attribute: all alike, or (noise, 4 cards) a 2-2 split.
      const splits = ATTRS.filter(
        (other) => other !== attr && new Set(cards.map((card) => value(card, other))).size > 1,
      );
      expect(splits.length, where).toBeLessThanOrEqual(1);
      for (const split of splits) {
        expect(cards.length, where).toBe(4);
        const values = [...new Set(cards.map((card) => value(card, split)))];
        expect(
          values.map((one) => cards.filter((card) => value(card, split) === one).length),
          where,
        ).toEqual([2, 2]);
      }
    }
    // The noise items: cls-odd noise-a / noise-b, cls-rule noise-a / noise-b, the Sprint's first round.
    const noisy = oddOnes.filter(({ def }) => {
      const cards = shapesOfOptions(def);
      return ATTRS.some(
        (attr) =>
          new Set(cards.map((card) => value(card, attr))).size > 1 &&
          cards.filter((c) => cards.filter((o) => value(o, attr) === value(c, attr)).length === 1)
            .length === 0,
      );
    });
    expect(noisy.map(({ def }) => def.id)).toEqual([
      'odd-noise-a-1',
      'odd-noise-b-1',
      'rule-noise-a-1',
      'rule-noise-b-1',
      'sprint-odd-1',
    ]);
  });

  it('W2.2 find the rule ("What is the same about all of them?"): a row of 3-4 cards, 3 sentences (colour, kind, size) of which exactly the answer is true of every card; the others name a value that some card has but not all', () => {
    // cls-rule: 2 guided + 4 scored + 1 variant; Sorting Sprint: 1 round.
    expect(oddRules).toHaveLength(8);
    const WORDS: Readonly<Record<string, readonly [Attr, string]>> = {
      red: ['colour', 'red'],
      blue: ['colour', 'blue'],
      yellow: ['colour', 'yellow'],
      green: ['colour', 'green'],
      purple: ['colour', 'purple'],
      orange: ['colour', 'orange'],
      circles: ['kind', 'circle'],
      squares: ['kind', 'square'],
      triangles: ['kind', 'triangle'],
      stars: ['kind', 'star'],
      hearts: ['kind', 'heart'],
      diamonds: ['kind', 'diamond'],
      tiny: ['size', 'tiny'],
      medium: ['size', 'medium'],
      huge: ['size', 'huge'],
    };
    for (const { where, def } of oddRules) {
      if (def.type !== 'choice') throw new Error(`${where} is not a choice`);
      const row = (def.prompt?.shapes ?? []).filter((token): token is CardShape => token !== 'gap');
      expect(row, where).toHaveLength(def.prompt?.shapes?.length ?? 0);
      expect([3, 4], where).toContain(row.length);
      expect(new Set(row.map(keyOf)).size, where).toBe(row.length);
      expect(
        row.every((card) => (card.count ?? 1) === 1),
        where,
      ).toBe(true);
      expect(def.options, where).toHaveLength(3);
      const said = def.options.map((option) => {
        const word = /^They are all (\w+)\.$/.exec(english(option.textKey ?? ''))?.[1] ?? '';
        const fact = WORDS[word];
        if (fact === undefined) throw new Error(`${where}: "${word}"`);
        return { option, fact };
      });
      expect(said.map(({ fact }) => fact[0]).sort(), where).toEqual(['colour', 'kind', 'size']);
      const truths = said.filter(({ fact }) =>
        row.every((card) => value(card, fact[0]) === fact[1]),
      );
      expect(
        truths.map(({ option }) => option.id),
        where,
      ).toEqual([def.answer]);
      for (const { option, fact } of said.filter(({ option: one }) => one.id !== def.answer)) {
        const holders = row.filter((card) => value(card, fact[0]) === fact[1]).length;
        expect(holders, `${where} ${option.id}`).toBeGreaterThanOrEqual(1);
        expect(holders, `${where} ${option.id}`).toBeLessThan(row.length);
      }
      // The attribute the answer names is the only one all share; the other two take 2-3 values.
      const shared = (['colour', 'kind', 'size'] as const).filter(
        (attr) => new Set(row.map((card) => value(card, attr))).size === 1,
      );
      expect(shared, where).toHaveLength(1);
    }
  });

  it('W2.3 boxes ("Put each card in its box."): the box rules put every card in exactly one box, it is the answer, every box holds a card, and the box words say the rule', () => {
    // cls-boxes: 2 guided + 2 scored + 1 variant; Sorting Sprint: 1 round.
    expect(boxes).toHaveLength(6);
    for (const { where, def } of boxes) {
      const group = groupOf(def);
      expect(group.layout, where).toBe('row');
      const list = group.boxes ?? [];
      expect([2, 3], where).toContain(list.length);
      for (const item of group.items) {
        const hits = list.filter((box) => box.rule !== undefined && meets(box.rule, factsOf(item)));
        expect(
          hits.map((box) => box.id),
          `${where} ${item.id}`,
        ).toEqual([group.answer[item.id]]);
      }
      for (const box of list) {
        expect(
          group.items.some((item) => group.answer[item.id] === box.id),
          `${where} ${box.id}`,
        ).toBe(true);
      }
      expect(new Set(group.items.map((item) => keyOf(item.shape as CardShape))).size, where).toBe(
        group.items.length,
      );
      // 2 boxes: "Red" / "Not red"; 3 boxes: one value each.
      const words = list.map((box) => english(box.textKey ?? ''));
      if (list.length === 2) {
        expect(words[1], where).toBe(`Not ${(words[0] ?? '').toLowerCase()}`);
      } else {
        expect(new Set(words).size, where).toBe(3);
      }
    }
    // The two guided tries and the Sprint round sort 4 and 5 cards; the lesson's 3 boxes are by kind.
    expect(
      groupOf(lessonOf('cls-boxes').exercises[1] as LogicExerciseDef).boxes?.map((box) =>
        english(box.textKey ?? ''),
      ),
    ).toEqual(['Hearts', 'Diamonds', 'Triangles']);
  });

  it('W2.4 Carroll tables ("Look at both rules. Where does each card go?"): the two rules put every card in exactly one of the 4 zones, it is the answer, every zone holds a card, and the words say the rules', () => {
    // cls-boxes: 4 scored; Sorting Sprint: 1 round.
    expect(carrolls).toHaveLength(5);
    const pairs: string[] = [];
    for (const { where, def } of carrolls) {
      const group = groupOf(def);
      expect(group.layout, where).toBe('carroll');
      const axes = group.axes ?? [];
      expect(axes, where).toHaveLength(2);
      pairs.push(axes.map((axis) => (axis.rule?.all?.[0] ?? '').split(':')[0]).join(' × '));
      for (const item of group.items) {
        const [a, b] = axes.map((axis) => meets(axis.rule ?? {}, factsOf(item)));
        const zone = `${a === true ? 'a' : 'not-a'}-${b === true ? 'b' : 'not-b'}`;
        expect(zone, `${where} ${item.id}`).toBe(group.answer[item.id]);
      }
      for (const zone of ['a-b', 'a-not-b', 'not-a-b', 'not-a-not-b']) {
        expect(
          group.items.some((item) => group.answer[item.id] === zone),
          `${where} ${zone}`,
        ).toBe(true);
      }
      expect(new Set(group.items.map((item) => keyOf(item.shape as CardShape))).size, where).toBe(
        group.items.length,
      );
      for (const axis of axes) {
        expect(english(axis.notTextKey), where).toBe(`Not ${english(axis.textKey).toLowerCase()}`);
      }
    }
    expect(pairs.slice(0, 4)).toEqual([
      'colour × kind',
      'size × kind',
      'colour × size',
      'kind × count',
    ]);
  });

  it('W2.5 Venn diagrams ("Where does each card go? The middle fits both."): the two rules put every card in its region (the answer); the middle and both circles hold a card, the outside holds one only when asked for; animals follow the curriculum table and a penguin never flies', () => {
    // cls-circles: 2 guided + 6 scored + 1 variant; Sorting Sprint: 1 round.
    expect(venns).toHaveLength(10);
    for (const { where, def } of venns) {
      const group = groupOf(def);
      expect(group.layout, where).toBe('venn');
      const axes = group.axes ?? [];
      for (const item of group.items) {
        const [a, b] = axes.map((axis) => meets(axis.rule ?? {}, factsOf(item)));
        const zone =
          a === true ? (b === true ? 'both' : 'only-a') : b === true ? 'only-b' : 'neither';
        expect(zone, `${where} ${item.id}`).toBe(group.answer[item.id]);
      }
      for (const zone of ['both', 'only-a', 'only-b']) {
        expect(
          group.items.some((item) => group.answer[item.id] === zone),
          `${where} ${zone}`,
        ).toBe(true);
      }
      const outside = group.items.filter((item) => group.answer[item.id] === 'neither');
      expect(outside.length > 0, where).toBe(group.allowEmpty !== true);
      if (group.items.some((item) => item.emoji !== undefined)) {
        expect(
          group.items.every((item) => item.shape === undefined),
          where,
        ).toBe(true);
        for (const item of group.items) {
          // The cards carry exactly the table's facts.
          expect(item.tags, `${where} ${item.id}`).toEqual(ANIMAL_FACTS[item.emoji ?? '']);
        }
        const facts = axes.map((axis) => axis.rule?.all?.[0]);
        expect(
          [
            ['can:fly', 'can:swim'],
            ['farm', 'legs:4'],
          ].some((pair) => pair.every((fact) => facts.includes(fact))),
          where,
        ).toBe(true);
        // A child could dispute these: a frog with four legs, a dog that swims or lives on a farm.
        expect(
          group.items.some((item) => item.emoji === '🐸') && facts.includes('legs:4'),
          where,
        ).toBe(false);
        expect(
          group.items.some((item) => item.emoji === '🐕') &&
            (facts.includes('can:swim') || facts.includes('farm')),
          where,
        ).toBe(false);
        if (facts.includes('can:fly')) {
          expect(group.answer['penguin'], where).toBeUndefined();
          expect(
            group.items.filter((item) => item.emoji === '🐧').map((item) => group.answer[item.id]),
            where,
          ).not.toContain('both');
        }
      } else {
        expect(new Set(group.items.map((item) => keyOf(item.shape as CardShape))).size, where).toBe(
          group.items.length,
        );
        expect(axes.map((axis) => (axis.rule?.all?.[0] ?? '').split(':')[0])).toHaveLength(2);
      }
    }
    // The two animal items sort by both table pairs (fly × swim, farm × legs:4).
    const animalPairs = venns
      .filter(({ def }) => groupOf(def).items.some((item) => item.emoji !== undefined))
      .map(({ def }) => (groupOf(def).axes ?? []).map((axis) => axis.rule?.all?.[0]).join(' × '));
    expect(animalPairs).toEqual(['can:fly × can:swim', 'farm × legs:4']);
  });

  it('W2.6 line-ups: 3-5 cards of one kind and colour that differ only in size (or only in how many), shown in a mixed order; the answer is the strict order, smallest or fewest first, with no tie', () => {
    const generated = ALL.filter(({ def }) => def.type === 'order' && /^lu-.*-\d+$/.test(def.id));
    // cls-line-up: 2 guided + 2 scored + 1 variant.
    expect(generated).toHaveLength(5);
    const SIZES = ['tiny', 'small', 'medium', 'big', 'huge'];
    for (const { where, def } of generated) {
      if (def.type !== 'order') throw new Error(`${where} is not an order`);
      const bySize = english(def.textKey) === 'Put them in order, smallest first.';
      const shapes = def.items.map((item) => item.shape as CardShape);
      expect(new Set(shapes.map((shape) => `${shape.kind}/${shape.colour}`)).size, where).toBe(1);
      const amount = (shape: CardShape): number =>
        bySize ? SIZES.indexOf(shape.size ?? 'big') : (shape.count ?? 1);
      const other = (shape: CardShape): number =>
        bySize ? (shape.count ?? 1) : SIZES.indexOf(shape.size ?? 'big');
      expect(new Set(shapes.map(other)).size, where).toBe(1);
      expect(new Set(shapes.map(amount)).size, where).toBe(shapes.length);
      const sorted = [...def.items].sort(
        (a, b) => amount(a.shape as CardShape) - amount(b.shape as CardShape),
      );
      expect(
        sorted.map((item) => item.id),
        where,
      ).toEqual(def.answer);
      expect(
        def.items.map((item) => item.id),
        where,
      ).not.toEqual(def.answer);
    }
    expect(generated.map(({ def }) => def.id)).toEqual([
      'lu-g-size-1',
      'lu-g-count-1',
      'lu-size-5-1',
      'lu-count-5-1',
      'lu-easy-1',
    ]);
  });

  it('W2.7 the four "taller than" items: two clues chain to the answer (A > B, B > C gives A > C), the cards are the animals of the text, and the names in the text are not in the order of the answer or of the cards', () => {
    const relation = (text: string): readonly (readonly [string, string])[] =>
      [...text.matchAll(/The (\w+) is (?:taller|bigger) than the (\w+)\./g)].map(
        (m) => [m[1] as string, m[2] as string] as const,
      );
    /** Whether `a` is above `b` by the clues, directly or through one more animal (the chain of two). */
    const above = (clues: readonly (readonly [string, string])[], a: string, b: string): boolean =>
      clues.some(([x, y]) => x === a && (y === b || clues.some(([p, q]) => p === y && q === b)));
    const EMOJI: Readonly<Record<string, string>> = {
      bear: '🐻',
      fox: '🦊',
      rabbit: '🐰',
      giraffe: '🦒',
      horse: '🐎',
      dog: '🐕',
      cat: '🐱',
      mouse: '🐭',
    };
    const find = (id: string): LogicExerciseDef => {
      const def = lessonOf('cls-line-up').exercises.find((one) => one.id === id);
      if (def === undefined) throw new Error(`no ${id}`);
      return def;
    };
    const names = (text: string): readonly string[] =>
      [...new Set([...text.matchAll(/the (\w+)/g)].map((m) => m[1] as string))].filter(
        (word) => EMOJI[word] !== undefined || ['owl', 'hen', 'chick'].includes(word),
      );
    // lu-tallest: the bear is above both others; its card is the answer.
    const tallest = find('lu-tallest');
    const tallestText = english(tallest.textKey);
    expect(tallestText).toBe(
      'The bear is taller than the fox. The fox is taller than the rabbit. Who is the tallest?',
    );
    const tallestOptions = optionsOf(tallest);
    expect(tallestOptions.map((option) => option.emoji).sort()).toEqual(['🐻', '🐰', '🦊'].sort());
    const clues1 = relation(tallestText);
    const top = tallestOptions.find((option) =>
      tallestOptions.every((other) => other === option || above(clues1, option.id, other.id)),
    );
    expect(top?.id).toBe('bear');
    expect(top?.id).toBe(tallest.type === 'choice' ? tallest.answer : '');
    expect(tallestOptions.map((option) => option.emoji)).toEqual(['🦊', '🐰', '🐻']);
    expect(tallestOptions.map((option) => option.id)).not.toEqual(names(tallestText));
    // lu-shortest: the dog is below both others.
    const shortest = find('lu-shortest');
    const shortestText = english(shortest.textKey);
    expect(shortestText).toBe(
      'The giraffe is taller than the horse. The horse is taller than the dog. Who is the shortest?',
    );
    const shortestOptions = optionsOf(shortest);
    expect(shortestOptions.map((option) => option.emoji).sort()).toEqual(['🐎', '🐕', '🦒'].sort());
    const clues2 = relation(shortestText);
    const bottom = shortestOptions.find((option) =>
      shortestOptions.every((other) => other === option || above(clues2, other.id, option.id)),
    );
    expect(bottom?.id).toBe('dog');
    expect(bottom?.id).toBe(shortest.type === 'choice' ? shortest.answer : '');
    expect(shortestOptions.map((option) => option.id)).not.toEqual(names(shortestText));
    // lu-order: smallest first = mouse, cat, dog; shown in another order than the text names them.
    const order = find('lu-order');
    const orderText = english(order.textKey);
    expect(orderText).toBe(
      'The cat is bigger than the mouse. The dog is bigger than the cat. Put them in order, smallest first.',
    );
    if (order.type !== 'order') throw new Error('lu-order is not an order');
    const clues3 = relation(orderText);
    // The smaller an animal, the fewer animals it is above.
    const below = (id: string): number =>
      order.items.filter((other) => other.id !== id && above(clues3, id, other.id)).length;
    const smallestFirst = [...order.items].sort((a, b) => below(a.id) - below(b.id));
    expect(smallestFirst.map((item) => item.id)).toEqual(order.answer);
    expect(order.answer).toEqual(['mouse', 'cat', 'dog']);
    expect(order.items.map((item) => item.emoji).sort()).toEqual(['🐕', '🐭', '🐱'].sort());
    expect(order.items.map((item) => item.id)).not.toEqual(order.answer);
    expect(names(orderText)).not.toEqual(order.answer);
    expect(order.items.map((item) => item.id)).not.toEqual(names(orderText));
    // lu-true: the chick is not taller than the owl (the owl is above the hen, the hen above the chick).
    const statement = find('lu-true');
    const statementText = english(statement.textKey);
    expect(statementText).toBe(
      'The owl is taller than the hen. The hen is taller than the chick. True or false: the chick is taller than the owl.',
    );
    const clues4 = relation(statementText);
    expect(above(clues4, 'owl', 'chick')).toBe(true);
    expect(above(clues4, 'chick', 'owl')).toBe(false);
    expect(statement.type === 'true-false' ? statement.answer : undefined).toBe(false);
    // The animals are never the same twice in a lesson's four items but for the horse and the dog (shortest / order).
    expect(Object.keys(EMOJI)).toHaveLength(8);
  });

  it('W2.8 the five demos agree with their cards', () => {
    const demo = (id: string) => ({
      text: english(lessonOf(id).demo.textKey),
      row: (lessonOf(id).demo.prompt?.shapes ?? []).filter(
        (token): token is CardShape => token !== 'gap',
      ),
    });
    // cls-odd: three blue circles and a blue square: the square is the odd one out.
    const odd = demo('cls-odd');
    expect(odd.row.map((card) => `${card.colour} ${card.kind}`)).toEqual([
      'blue circle',
      'blue circle',
      'blue circle',
      'blue square',
    ]);
    expect(odd.row.filter((card) => card.kind === 'circle')).toHaveLength(3);
    expect(odd.text).toBe('Three are circles. The square is the odd one out.');
    // cls-rule: small red circle, big red square, medium red star: all red, kinds and sizes differ.
    const rule = demo('cls-rule');
    expect(rule.row.map((card) => card.colour)).toEqual(['red', 'red', 'red']);
    expect(new Set(rule.row.map((card) => card.kind)).size).toBe(3);
    expect(new Set(rule.row.map((card) => value(card, 'size'))).size).toBe(3);
    expect(rule.text).toBe('Different shapes, different sizes, but all red. They are all red!');
    // cls-boxes: one big red circle: red, a circle.
    const boxesDemo = demo('cls-boxes');
    expect(boxesDemo.row).toEqual([{ kind: 'circle', colour: 'red' }]);
    expect(boxesDemo.text).toBe(
      'Is it red? Yes. Is it a circle? Yes. It goes where red meets circle.',
    );
    // cls-circles: one big blue square: blue yes, circle no.
    const vennDemo = demo('cls-circles');
    expect(vennDemo.row).toEqual([{ kind: 'square', colour: 'blue' }]);
    expect(vennDemo.text).toBe('Blue? Yes. A circle? No. It goes in the blue circle only.');
    // cls-line-up: tiny, medium, huge green triangles: smallest first.
    const lineDemo = demo('cls-line-up');
    expect(lineDemo.row.map((card) => card.size)).toEqual(['tiny', 'medium', 'huge']);
    expect(lineDemo.row.every((card) => card.kind === 'triangle' && card.colour === 'green')).toBe(
      true,
    );
    expect(lineDemo.text).toBe('Smallest first: tiny, then medium, then huge.');
  });

  it('W2.9 look-alikes: no two cards of one exercise differ only in a confusable colour (red-green, green-orange, blue-purple), and no square sits with a diamond', () => {
    const confusable = new Set(['green|red', 'green|orange', 'blue|purple']);
    const withShapes = ALL.filter(({ def }) => shapesOf(def).length > 0);
    // 50 exercises less the 2 animal Venns and the 4 authored clue items.
    expect(withShapes).toHaveLength(50 - 2 - 4);
    for (const { where, def } of withShapes) {
      const all = shapesOf(def);
      for (const [index, a] of all.entries()) {
        for (const b of all.slice(index + 1)) {
          const sameBut = (['kind', 'size', 'count'] as const).every(
            (attr) => value(a, attr) === value(b, attr),
          );
          expect(sameBut && confusable.has([a.colour, b.colour].sort().join('|')), where).toBe(
            false,
          );
        }
      }
      const kinds = new Set(all.map((card) => card.kind));
      expect(kinds.has('square') && kinds.has('diamond'), where).toBe(false);
    }
  });

  it('W2.10 the answer is not always the same card: among the choices of 4 cards each place holds the answer at least once (of 9), and the 3-card choices are not all one place', () => {
    const picks = (count: number): readonly number[] =>
      oddOnes.flatMap(({ def }) =>
        def.type === 'choice' && def.options.length === count
          ? [def.options.findIndex((option) => option.id === def.answer)]
          : [],
      );
    const four = picks(4);
    expect(four).toHaveLength(9);
    for (const place of [0, 1, 2, 3])
      expect(four.filter((pick) => pick === place).length, String(place)).toBeGreaterThanOrEqual(1);
    const three = picks(3);
    expect(three).toHaveLength(3);
    expect(new Set(three).size).toBeGreaterThan(1);
    // The 3 rule sentences: the right one sits in at least 2 of the 3 places.
    const rulePlaces = oddRules.map(({ def }) =>
      def.type === 'choice' ? def.options.findIndex((option) => option.id === def.answer) : -1,
    );
    expect(new Set(rulePlaces).size).toBeGreaterThanOrEqual(2);
  });
});

describe('the Sorting Sprint world boss', () => {
  it('is a series of 5 rounds: the odd one out (with noise), the rule, two boxes, the Carroll table and the Venn; 3 stars with no mistake, 2 up to 2', () => {
    expect(boss).toMatchObject({
      id: 'sorting-sprint',
      mode: 'series',
      concept: 'cls-circles',
      unlockAfter: 'cls-line-up',
      errors3: 0,
      errors2: 2,
    });
    expect(boss.rounds.map((round) => round.id)).toEqual([
      'sprint-odd-1',
      'sprint-rule-1',
      'sprint-boxes-1',
      'sprint-carroll-1',
      'sprint-venn-1',
    ]);
    expect(boss.rounds.map((round) => [round.type, english(round.textKey)])).toEqual([
      ['choice', 'Which one is different?'],
      ['choice', 'What is the same about all of them?'],
      ['group', 'Put each card in its box.'],
      ['group', 'Look at both rules. Where does each card go?'],
      ['group', 'Where does each card go? The middle fits both.'],
    ]);
    expect(english(boss.titleKey)).toBe('Sorting Sprint');
    expect(english(boss.goalKey)).toBe('Help Pip sort the shells!');
  });

  it('is the boss of the world (tracks.yaml), opened by the last lesson, in the YAML spec that is frozen', () => {
    expect(specOf(rawBoss)).toEqual(FROZEN_BOSS);
    const world = compiled.tracks.tracks[0]?.worlds.find((one) => one.id === 'sort-shore');
    expect(world?.boss).toBe('sorting-sprint');
    expect(lessonOf('cls-line-up').order).toBe(
      Math.max(
        ...content.lessons
          .filter((lesson) => lesson.world === 'sort-shore')
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
  it('is Sort Shore on the ocean (the second world), with the Sorting Sprint as its boss and the sorter rank after it', () => {
    const [main] = compiled.tracks.tracks;
    expect(main?.worlds[1]).toEqual(
      expect.objectContaining({
        id: 'sort-shore',
        order: 2,
        habitat: 'ocean',
        boss: 'sorting-sprint',
      }),
    );
    expect(compiled.tracks.ranks.at(-1)).toEqual({ id: 'sorter', after: 'world:sort-shore' });
    const en = locales.en as Record<string, Record<string, unknown>> | undefined;
    expect(en?.journey).toMatchObject({
      worlds: { 'sort-shore': 'Sort Shore' },
      ranks: { sorter: 'Shore Sorter' },
    });
  });

  it('has the Shore Sorter badge (master the world and beat the sprint)', () => {
    expect(compiled.badges.find((badge) => badge.id === 'shore-sorter')?.condition).toEqual({
      type: 'mastered',
      scope: 'world:sort-shore',
      thresholds: [1],
    });
    const en = locales.en as Record<string, Record<string, unknown>> | undefined;
    expect(en?.rewards?.badges).toMatchObject({
      'shore-sorter': {
        name: 'Shore Sorter',
        condition: 'Master Sort Shore and beat Sorting Sprint',
      },
    });
  });
});
