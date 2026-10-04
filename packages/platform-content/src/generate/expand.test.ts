import { describe, expect, it } from 'vitest';
import type { Locales } from '../load.ts';
import { createExerciseEntrySchema } from '../lesson-schema.ts';
import { cardExerciseSchema } from '../kinds/cards/content.ts';
import type { ExerciseYamlBase } from '../subject.ts';
import { fixtureAdd, type FixtureAddItem, type FixtureAddParams } from '../testing/card-fixture.ts';
import { expandEntries, type ExpandEnv } from './expand.ts';
import type {
  AnyExerciseTemplate,
  ExerciseEntryYaml,
  ExerciseTemplate,
  GenerateContext,
  GenerateEntryYaml,
} from './template.ts';
import { createGeneratedTexts, mergeGeneratedTexts, type GeneratedTexts } from './texts.ts';

const WHERE = 'lessons/counting/count-up.yaml: exercises';

const enLocales = (): Locales => ({
  en: { lessons: { templates: { 'fixture-add': 'What is {{a}} plus {{b}}?' } } },
});

interface Setup {
  readonly env: ExpandEnv;
  readonly issues: string[];
  readonly texts: GeneratedTexts;
}

function setup(
  templates: Readonly<Record<string, AnyExerciseTemplate>> = { 'fixture-add': fixtureAdd },
  locales: Locales = enLocales(),
): Setup {
  const issues: string[] = [];
  const texts = createGeneratedTexts();
  return {
    env: { templates, exerciseSchema: cardExerciseSchema, texts, locales, issues },
    issues,
    texts,
  };
}

function addEntry(
  generate: Partial<GenerateEntryYaml['generate']> = {},
  extra: Partial<GenerateEntryYaml> = {},
): GenerateEntryYaml {
  return {
    id: 'fx-add',
    generate: { template: 'fixture-add', count: 3, seed: 7, params: { max: 10 }, ...generate },
    ...extra,
  };
}

/** The generated items as `{ id, big, text }` (text = the English sentence in the sink). */
function describeItems(
  items: readonly ExerciseYamlBase[],
  texts: GeneratedTexts,
): readonly { id: string; big: string; text: string | undefined }[] {
  return items.map((item) => ({
    id: item.id,
    big: (item as FixtureAddItem).prompt.big,
    text: texts.texts.get('en')?.get(item.text ?? ''),
  }));
}

describe('expandEntries', () => {
  it('passes authored items through unchanged and in place, expanding only generate entries', () => {
    const { env, issues } = setup();
    const authored: ExerciseEntryYaml = { id: 'a-1', type: 'true-false', answer: true } as never;
    const authoredToo: ExerciseEntryYaml = {
      id: 'a-2',
      type: 'true-false',
      answer: false,
    } as never;

    const items = expandEntries([authored, addEntry({ count: 2 }), authoredToo], WHERE, env);

    expect(issues).toEqual([]);
    expect(items.map((item) => item.id)).toEqual(['a-1', 'fx-add-1', 'fx-add-2', 'a-2']);
    expect(items[0]).toBe(authored);
    expect(items[3]).toBe(authoredToo);
  });

  describe('ids', () => {
    it('are <stem>-1 … <stem>-<count>, never the bare stem', () => {
      const { env, issues } = setup();

      const items = expandEntries([addEntry({ count: 5 })], WHERE, env);

      expect(issues).toEqual([]);
      expect(items.map((item) => item.id)).toEqual([
        'fx-add-1',
        'fx-add-2',
        'fx-add-3',
        'fx-add-4',
        'fx-add-5',
      ]);
    });

    it('do not depend on the seed', () => {
      const ids = (seed: number): readonly string[] =>
        expandEntries([addEntry({ seed })], WHERE, setup().env).map((item) => item.id);

      expect(ids(1)).toEqual(ids(999));
    });

    it('are the ones the template was given: a template that writes another id is reported', () => {
      const wrongId: ExerciseTemplate<FixtureAddParams, FixtureAddItem> = {
        ...fixtureAdd,
        generate: (params, ctx) => ({ ...fixtureAdd.generate(params, ctx), id: 'other' }),
      };
      const { env, issues } = setup({ 'fixture-add': wrongId });

      expandEntries([addEntry({ count: 1 })], WHERE, env);

      expect(issues).toEqual([
        `${WHERE}[0] (generated fx-add-1): the template must use the given id "fx-add-1", not "other"`,
      ]);
    });
  });

  describe('seed', () => {
    it('same seed, same items and same texts', () => {
      const a = setup();
      const b = setup();

      const itemsA = expandEntries([addEntry()], WHERE, a.env);
      const itemsB = expandEntries([addEntry()], WHERE, b.env);

      expect(itemsA).toEqual(itemsB);
      expect(a.texts.texts).toEqual(b.texts.texts);
      expect(a.issues).toEqual([]);
    });

    it('a different seed gives different numbers, the same ids', () => {
      const a = setup();
      const b = setup();

      const itemsA = expandEntries([addEntry({ seed: 7, count: 6 })], WHERE, a.env);
      const itemsB = expandEntries([addEntry({ seed: 8, count: 6 })], WHERE, b.env);

      expect(itemsA.map((item) => item.id)).toEqual(itemsB.map((item) => item.id));
      expect(describeItems(itemsA, a.texts).map((item) => item.big)).not.toEqual(
        describeItems(itemsB, b.texts).map((item) => item.big),
      );
    });

    it('one stream per entry: two entries with one seed draw the same numbers, each from its start', () => {
      const { env, texts } = setup();

      const items = expandEntries(
        [addEntry({ count: 3 }), addEntry({ count: 3 }, { id: 'fx-two' })],
        WHERE,
        env,
      );

      const bigs = describeItems(items, texts).map((item) => item.big);
      expect(bigs.slice(0, 3)).toEqual(bigs.slice(3));
    });
  });

  describe('distinct items', () => {
    it('redraws a duplicate: 3 items from the only 3 sums that fit max 3, whatever the seed', () => {
      for (let seed = 0; seed < 25; seed++) {
        const { env, issues, texts } = setup();

        const items = expandEntries([addEntry({ seed, count: 3, params: { max: 3 } })], WHERE, env);

        expect(issues).toEqual([]);
        const bigs = describeItems(items, texts).map((item) => item.big);
        expect(new Set(bigs).size).toBe(3);
      }
    });

    it('reports when the template cannot give `count` distinct items (max 2: only 1 + 1)', () => {
      const { env, issues } = setup();

      const items = expandEntries([addEntry({ count: 3, params: { max: 2 } })], WHERE, env);

      expect(issues).toEqual([`${WHERE}[0]: could not generate 3 distinct items`]);
      expect(items.map((item) => item.id)).toEqual(['fx-add-1']);
    });

    it('compares what the kid sees: two draws with other text refs but the same sentence are duplicates', () => {
      const sameSentence: ExerciseTemplate<FixtureAddParams, FixtureAddItem> = {
        ...fixtureAdd,
        // Always the same numbers; the ref differs per item (`gen.<id>.text`) but the English text is identical.
        generate: (_params, ctx) => ({
          id: ctx.id,
          type: 'number-entry',
          text: ctx.text('text', 'templates.fixture-add', { a: 1, b: 1 }),
          prompt: { big: '1 + 1' },
          answer: 2,
        }),
      };
      const { env, issues } = setup({ 'fixture-add': sameSentence });

      expandEntries([addEntry({ count: 2 })], WHERE, env);

      expect(issues).toEqual([`${WHERE}[0]: could not generate 2 distinct items`]);
    });

    it('tells draws apart by their texts alone when the rest is equal', () => {
      const textOnly: ExerciseTemplate<FixtureAddParams, FixtureAddItem> = {
        ...fixtureAdd,
        generate: (_params, ctx) => {
          const a = 1 + ctx.index;
          return {
            id: ctx.id,
            type: 'number-entry',
            text: ctx.text('text', 'templates.fixture-add', { a, b: 1 }),
            prompt: { big: '2 + 1' },
            answer: 3,
          };
        },
        check: () => undefined,
      };
      const { env, issues } = setup({ 'fixture-add': textOnly });

      const items = expandEntries([addEntry({ count: 3 })], WHERE, env);

      expect(issues).toEqual([]);
      expect(items).toHaveLength(3);
    });

    it("drops the texts of a rejected draw, keeps the accepted draw's", () => {
      const attempts = new Map<number, number>();
      const flaky: ExerciseTemplate<FixtureAddParams, FixtureAddItem> = {
        ...fixtureAdd,
        generate(_params, ctx) {
          const attempt = attempts.get(ctx.index) ?? 0;
          attempts.set(ctx.index, attempt + 1);
          // From the second item on, the first draw repeats item 1 (rejected, after registering a `junk` text).
          const rejected = ctx.index > 0 && attempt === 0;
          const n = rejected ? 1 : ctx.index + 1;
          return {
            id: ctx.id,
            type: 'number-entry',
            text: ctx.text(rejected ? 'junk' : 'text', 'templates.fixture-add', { a: n, b: 1 }),
            prompt: { big: `${String(n)} + 1` },
            answer: n + 1,
          };
        },
      };
      const { env, issues, texts } = setup({ 'fixture-add': flaky });

      const items = expandEntries([addEntry({ count: 3 })], WHERE, env);

      // A rejected draw's `text: gen.<id>.junk` ref never reaches an item; its text never reaches the sink.
      expect(issues).toEqual([]);
      expect(items.map((item) => item.text)).toEqual([
        'gen.fx-add-1.text',
        'gen.fx-add-2.text',
        'gen.fx-add-3.text',
      ]);
      expect([...(texts.texts.get('en')?.keys() ?? [])].sort()).toEqual([
        'gen.fx-add-1.text',
        'gen.fx-add-2.text',
        'gen.fx-add-3.text',
      ]);
      expect([...attempts.values()]).toEqual([1, 2, 2]);
    });
  });

  describe('params', () => {
    it('are parsed by the template schema; a bad value is reported at generate.params.<path>', () => {
      const { env, issues } = setup();

      const items = expandEntries([addEntry({ params: { max: 1 } })], WHERE, env);

      expect(items).toEqual([]);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toContain(`${WHERE}[0]: generate.params.max: `);
    });

    it('a missing params object and an unknown param key are reported too', () => {
      const missing = setup();
      expandEntries(
        [{ id: 'fx-add', generate: { template: 'fixture-add', count: 1, seed: 1 } }],
        WHERE,
        missing.env,
      );
      expect(missing.issues).toHaveLength(1);
      expect(missing.issues[0]).toContain(`${WHERE}[0]: generate.params: `);

      const extra = setup();
      expandEntries([addEntry({ params: { max: 5, min: 1 } })], WHERE, extra.env);
      expect(extra.issues).toHaveLength(1);
      expect(extra.issues[0]).toContain(`${WHERE}[0]: generate.params: `);
    });

    it("the entry index in the issue is the entry's position among all entries", () => {
      const { env, issues } = setup();
      const authored = {
        id: 'a-1',
        type: 'true-false',
        answer: true,
      } as unknown as ExerciseEntryYaml;

      expandEntries([authored, addEntry({ params: { max: 99 } })], WHERE, env);

      expect(issues[0]).toContain(`${WHERE}[1]: generate.params.max: `);
    });

    it('an unknown template is reported (the schema reports it first in a real build)', () => {
      const { env, issues } = setup();

      expandEntries([addEntry({ template: 'nope' })], WHERE, env);

      expect(issues).toEqual([`${WHERE}[0]: generate.template: unknown template "nope"`]);
    });
  });

  describe('template check', () => {
    it('a wrong answer is reported at the generated item', () => {
      const wrongAnswer: ExerciseTemplate<FixtureAddParams, FixtureAddItem> = {
        ...fixtureAdd,
        generate: (params, ctx) => {
          const item = fixtureAdd.generate(params, ctx);
          return { ...item, answer: item.answer + 1 };
        },
      };
      const { env, issues } = setup({ 'fixture-add': wrongAnswer });

      expandEntries([addEntry({ count: 2 })], WHERE, env);

      expect(issues).toHaveLength(2);
      expect(issues[0]).toMatch(/\[0\] \(generated fx-add-1\): "\d+ \+ \d+" is \d+, not \d+$/);
      expect(issues[1]).toContain('(generated fx-add-2)');
    });

    it('an unreadable prompt is reported', () => {
      const unreadable: ExerciseTemplate<FixtureAddParams, FixtureAddItem> = {
        ...fixtureAdd,
        generate: (params, ctx) => ({
          ...fixtureAdd.generate(params, ctx),
          prompt: { big: 'many' },
        }),
      };
      const { env, issues } = setup({ 'fixture-add': unreadable });

      expandEntries([addEntry({ count: 1 })], WHERE, env);

      expect(issues).toEqual([
        `${WHERE}[0] (generated fx-add-1): cannot read the prompt "many" as a sum`,
      ]);
    });

    it("the check receives the params and the item exactly as drawn (with the entry's easier)", () => {
      const seen: { item: ExerciseYamlBase; params: unknown }[] = [];
      const spy: ExerciseTemplate<FixtureAddParams, FixtureAddItem> = {
        ...fixtureAdd,
        check: (item, params) => {
          seen.push({ item, params });
        },
      };
      const { env } = setup({ 'fixture-add': spy });

      expandEntries([addEntry({ count: 2 }, { easier: 'fx-easy' })], WHERE, env);

      expect(seen.map((entry) => entry.params)).toEqual([{ max: 10 }, { max: 10 }]);
      expect(seen.map((entry) => entry.item.id)).toEqual(['fx-add-1', 'fx-add-2']);
      expect(seen.every((entry) => entry.item.easier === 'fx-easy')).toBe(true);
    });

    it('does not run on an item the exercise schema rejected', () => {
      let checked = 0;
      const broken: ExerciseTemplate<FixtureAddParams, FixtureAddItem> = {
        ...fixtureAdd,
        generate: (params, ctx) => ({ ...fixtureAdd.generate(params, ctx), answer: -5 }),
        check: () => {
          checked++;
        },
      };
      const { env, issues } = setup({ 'fixture-add': broken });

      const items = expandEntries([addEntry({ count: 2 })], WHERE, env);

      expect(items).toEqual([]);
      expect(checked).toBe(0);
      expect(issues).toHaveLength(2);
      expect(issues[0]).toContain(`${WHERE}[0] (generated fx-add-1): answer: `);
    });
  });

  describe('easier', () => {
    it('is copied from the entry onto every generated item', () => {
      const { env, issues } = setup();

      const items = expandEntries([addEntry({ count: 3 }, { easier: 'fx-easy' })], WHERE, env);

      expect(issues).toEqual([]);
      expect(items.map((item) => item.easier)).toEqual(['fx-easy', 'fx-easy', 'fx-easy']);
    });

    it('is absent when the entry has none', () => {
      const items = expandEntries([addEntry()], WHERE, setup().env);

      expect(items.every((item) => !('easier' in item))).toBe(true);
    });
  });

  describe('generated texts', () => {
    it("interpolate the template text with the draw's values, one text per item", () => {
      const { env, issues, texts } = setup();

      const items = expandEntries([addEntry()], WHERE, env);

      expect(issues).toEqual([]);
      for (const { big, text } of describeItems(items, texts)) {
        const [a, b] = big.split(' + ');
        expect(text).toBe(`What is ${String(a)} plus ${String(b)}?`);
      }
      expect(items.map((item) => item.text)).toEqual([
        'gen.fx-add-1.text',
        'gen.fx-add-2.text',
        'gen.fx-add-3.text',
      ]);
    });

    it('merge into lessons.gen.<id>.text of the locales', () => {
      const { env, texts } = setup();
      expandEntries([addEntry({ count: 2 })], WHERE, env);

      const merged = mergeGeneratedTexts(env.locales, texts, []);

      const gen = merged.en?.lessons?.gen as Record<string, { text: string }>;
      expect(Object.keys(gen)).toEqual(['fx-add-1', 'fx-add-2']);
      expect(gen['fx-add-1']?.text).toMatch(/^What is \d+ plus \d+\?$/);
    });

    it('are written per language, numbers formatted for it (1234, 10,000 in English)', () => {
      const big: ExerciseTemplate<FixtureAddParams, FixtureAddItem> = {
        ...fixtureAdd,
        generate: (_params, ctx) => ({
          id: ctx.id,
          type: 'number-entry',
          text: ctx.text('text', 'templates.big', { n: 10000 + ctx.index, year: 1234 }),
          prompt: { big: '1 + 1' },
          answer: 2,
        }),
      };
      const locales: Locales = {
        en: { lessons: { templates: { big: 'Count {{n}} from {{year}}' } } },
        de: { lessons: { templates: { big: 'Zähle {{n}} ab {{year}}' } } },
      };
      const { env, issues, texts } = setup({ big }, locales);

      expandEntries([addEntry({ template: 'big', count: 2, params: { max: 5 } })], WHERE, env);

      expect(issues).toEqual([]);
      expect(texts.texts.get('en')?.get('gen.fx-add-1.text')).toBe('Count 10,000 from 1234');
      expect(texts.texts.get('en')?.get('gen.fx-add-2.text')).toBe('Count 10,001 from 1234');
      expect(texts.texts.get('de')?.get('gen.fx-add-1.text')).toBe('Zähle 10.000 ab 1234');
    });

    it('a template key missing in a second language is reported with the language and the key', () => {
      const locales: Locales = {
        ...enLocales(),
        de: { lessons: { other: 'Anderes' } },
      };
      const { env, texts } = setup(undefined, locales);

      expandEntries([addEntry()], WHERE, env);
      const issues: string[] = [];
      const merged = mergeGeneratedTexts(locales, texts, issues);

      expect(issues).toEqual([
        'de/lessons.yaml: missing text key "templates.fixture-add" (used by a generated exercise)',
      ]);
      expect(merged.de?.lessons).toEqual({ other: 'Anderes' });
    });

    it('a template key missing everywhere is reported for every language, once each', () => {
      const locales: Locales = { en: { lessons: {} }, de: { lessons: {} } };
      const { env, texts } = setup(undefined, locales);

      expandEntries([addEntry()], WHERE, env);
      const issues: string[] = [];
      mergeGeneratedTexts(locales, texts, issues);

      expect(issues).toEqual([
        'en/lessons.yaml: missing text key "templates.fixture-add" (used by a generated exercise)',
        'de/lessons.yaml: missing text key "templates.fixture-add" (used by a generated exercise)',
      ]);
    });

    it('a text name that is not kebab-case, a name used twice and a value the text does not take are reported', () => {
      const trying = (call: (text: GenerateContext['text']) => void) => {
        const template: ExerciseTemplate<FixtureAddParams, FixtureAddItem> = {
          ...fixtureAdd,
          generate: (_params, ctx) => {
            call((name, key, vars) => ctx.text(name, key, vars));
            return fixtureAdd.generate({ max: 5 }, ctx);
          },
        };
        const { env, issues } = setup({ 'fixture-add': template });
        expandEntries([addEntry({ count: 1 })], WHERE, env);
        return issues;
      };

      expect(trying((text) => text('Bad Name', 'templates.fixture-add', { a: 1, b: 2 }))).toEqual([
        `${WHERE}[0] (generated fx-add-1): text name "Bad Name" must be lowercase kebab-case`,
      ]);
      expect(
        trying((text) => {
          text('twice', 'templates.fixture-add', { a: 1, b: 2 });
          text('twice', 'templates.fixture-add', { a: 1, b: 2 });
        }),
      ).toEqual([`${WHERE}[0] (generated fx-add-1): text "twice" is registered twice`]);
      expect(trying((text) => text('t', 'templates.fixture-add', { a: 1 }))).toEqual([
        `${WHERE}[0] (generated fx-add-1): text "templates.fixture-add" (en) has no value for {{b}}`,
      ]);
    });
  });

  it('reports a template that throws, at the item, instead of crashing the build', () => {
    const throwing: ExerciseTemplate<FixtureAddParams, FixtureAddItem> = {
      ...fixtureAdd,
      generate: () => {
        throw new Error('no numbers fit');
      },
    };
    const { env, issues } = setup({ 'fixture-add': throwing });

    const items = expandEntries([addEntry()], WHERE, env);

    expect(items).toEqual([]);
    expect(issues).toEqual([`${WHERE}[0] (generated fx-add-1): no numbers fit`]);
  });

  it('parses every item with the exercise schema and reports its issues at the generated item', () => {
    const noPrompt: ExerciseTemplate<FixtureAddParams, FixtureAddItem> = {
      ...fixtureAdd,
      generate: (params, ctx) => ({ ...fixtureAdd.generate(params, ctx), prompt: { big: '' } }),
    };
    const { env, issues } = setup({ 'fixture-add': noPrompt });

    const items = expandEntries([addEntry({ count: 1 })], WHERE, env);

    expect(items).toEqual([]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain(`${WHERE}[0] (generated fx-add-1): prompt.big: `);
  });
});

describe('the fixture template solves what it draws', () => {
  it('every sum is within max, addends in 1 … max - 1, over many seeds and maxima', () => {
    for (const max of [2, 3, 5, 10, 20]) {
      for (let seed = 0; seed < 20; seed++) {
        const { env, issues, texts } = setup();
        const items = expandEntries(
          [addEntry({ seed, count: max === 2 ? 1 : 3, params: { max } })],
          WHERE,
          env,
        );
        expect(issues).toEqual([]);
        for (const { big } of describeItems(items, texts)) {
          const [a, b] = big.split(' + ').map(Number);
          expect(a).toBeGreaterThanOrEqual(1);
          expect(b).toBeGreaterThanOrEqual(1);
          expect((a ?? 0) + (b ?? 0)).toBeLessThanOrEqual(max);
        }
      }
    }
  });
});

describe('the entry schema in front of the expander', () => {
  const schema = createExerciseEntrySchema(cardExerciseSchema, ['fixture-add']);

  it('hands a parsed generate entry to the expander as is', () => {
    const parsed = schema.parse({
      id: 'fx-add',
      generate: { template: 'fixture-add', count: 2, seed: 1, params: { max: 10 } },
    });
    const { env, issues } = setup();

    const items = expandEntries([parsed], WHERE, env);

    expect(issues).toEqual([]);
    expect(items).toHaveLength(2);
  });
});
