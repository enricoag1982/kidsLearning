import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { CardExerciseDef } from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { CARD_NOTES, cardHintText } from '@learn/platform-core/domain/exercise/kinds/cards/notes';
import type { CardHint } from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { parse, stringify } from 'yaml';
import { compileAll } from '../../compile-all.ts';
import { ContentError, hasKeyPath, loadLocales } from '../../load.ts';
import { PLATFORM_LOCALES_DIR } from '../../paths.ts';
import { CARD_FIXTURE_CHARACTERS, CARD_FIXTURE_ROOT } from '../../testing/card-fixture.ts';
import type { ExerciseDefBase } from '@learn/platform-core';
import { makeCompileContext } from '../kind-content.ts';
import { CARD_KIND_CONTENT, cardExerciseSchema, createCardContent } from './content.ts';
import { cardStimulus } from './stimulus.ts';

const content = createCardContent({ characters: CARD_FIXTURE_CHARACTERS });

/** Every issue one raw exercise yields: schema, then compile, then the kind's verify. */
function issuesOf(raw: Record<string, unknown>): readonly string[] {
  const parsed = cardExerciseSchema.safeParse(raw);
  if (!parsed.success) return parsed.error.issues.map((issue) => issue.message);
  const issues: string[] = [];
  const def = compile(raw, issues);
  const kind = content.kinds[parsed.data.type];
  if (def !== null) kind?.verify?.(def, 'where', issues);
  return issues;
}

function compile(raw: Record<string, unknown>, issues: string[] = []): ExerciseDefBase | null {
  const parsed = cardExerciseSchema.parse(raw);
  const stimulus = cardStimulus.compile(parsed, { where: 'where', issues });
  if (stimulus === null) return null;
  const ctx = makeCompileContext(
    'lesson.yaml',
    'exercises[0]',
    issues,
    { id: parsed.id, concept: 'pick', textKey: `lessons:${parsed.text ?? parsed.id}` },
    parsed.easier,
    stimulus,
  );
  return content.kinds[parsed.type]?.compile(parsed, ctx) ?? null;
}

const choice = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'ch-01',
  type: 'choice',
  options: [
    { id: 'a', big: 2 },
    { id: 'b', emoji: '🍎', text: 'apple' },
  ],
  answer: 'b',
  ...overrides,
});
const trueFalse = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'tf-01',
  type: 'true-false',
  answer: true,
  ...overrides,
});
const numberEntry = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'ne-01',
  type: 'number-entry',
  answer: 12,
  ...overrides,
});
const order = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'or-01',
  type: 'order',
  items: [
    { id: 'b', big: 'B' },
    { id: 'a', big: 'A' },
    { id: 'c', image: 'fox' },
  ],
  answer: ['a', 'b', 'c'],
  ...overrides,
});

describe('card prompt', () => {
  it('accepts an emoji, a big text, a number and an image, alone or mixed', () => {
    for (const prompt of [
      { emoji: '🍎' },
      { big: '7 + 5' },
      { big: 7 },
      { image: 'fox' },
      { emoji: '🍎', big: '3', image: 'fox' },
    ]) {
      expect(issuesOf(trueFalse({ prompt }))).toEqual([]);
    }
  });

  it('rejects an empty prompt, an unknown field, a non-emoji and a long text', () => {
    expect(issuesOf(trueFalse({ prompt: {} }))).toEqual(['prompt needs "emoji", "big" or "image"']);
    expect(issuesOf(trueFalse({ prompt: { emoji: '🍎', color: 'red' } }))).toHaveLength(1);
    expect(issuesOf(trueFalse({ prompt: { emoji: 'apple' } }))).toEqual(['not an emoji']);
    expect(issuesOf(trueFalse({ prompt: { big: 'x'.repeat(17) } }))).toHaveLength(1);
    expect(issuesOf(trueFalse({ prompt: { image: 'Not An Id' } }))).toHaveLength(1);
  });

  it('compiles into the def head (after textKey, before type) in emoji, big, image order', () => {
    const def = compile(trueFalse({ prompt: { image: 'fox', big: 3, emoji: '🍎' } }));
    expect(Object.keys(def ?? {})).toEqual([
      'id',
      'concept',
      'textKey',
      'prompt',
      'type',
      'answer',
    ]);
    expect((def as CardExerciseDef | null)?.prompt).toEqual({
      emoji: '🍎',
      big: '3',
      image: 'fox',
    });
    expect(Object.keys((def as CardExerciseDef).prompt ?? {})).toEqual(['emoji', 'big', 'image']);
  });

  it('leaves the def without a prompt when there is none', () => {
    expect(Object.keys(compile(trueFalse()) ?? {})).toEqual([
      'id',
      'concept',
      'textKey',
      'type',
      'answer',
    ]);
  });
});

describe('card choice', () => {
  it('accepts options made of a text, an emoji, a big text or an image', () => {
    expect(issuesOf(choice())).toEqual([]);
    expect(
      issuesOf(
        choice({
          options: [
            { id: 'a', text: 'one' },
            { id: 'b', image: 'fox' },
          ],
        }),
      ),
    ).toEqual([]);
  });

  it('rejects an option with nothing to show', () => {
    expect(issuesOf(choice({ options: [{ id: 'a' }, { id: 'b', big: 2 }], answer: 'b' }))).toEqual([
      'option needs "text", "emoji", "big" or "image"',
    ]);
  });

  it('rejects duplicate option ids, an answer that is no option and fewer than 2 options', () => {
    const dup = [
      { id: 'a', big: 1 },
      { id: 'a', big: 2 },
    ];
    expect(issuesOf(choice({ options: dup, answer: 'a' }))).toEqual(['duplicate option id "a"']);
    expect(issuesOf(choice({ answer: 'z' }))).toEqual(['"answer" must reference one of "options"']);
    expect(issuesOf(choice({ options: [{ id: 'a', big: 1 }], answer: 'a' }))).toHaveLength(1);
  });

  it('compiles options as id, textKey, emoji, big, image and lists the text keys', () => {
    const def = compile(choice()) as CardExerciseDef & { options: readonly object[] };
    expect(def.options.map((option) => Object.keys(option))).toEqual([
      ['id', 'big'],
      ['id', 'textKey', 'emoji'],
    ]);
    expect(CARD_KIND_CONTENT.choice.textKeys?.(def as never)).toEqual([
      { key: 'lessons:apple', label: 'option "b"' },
    ]);
  });
});

describe('card true-false', () => {
  it('needs a boolean answer', () => {
    expect(issuesOf(trueFalse())).toEqual([]);
    expect(issuesOf(trueFalse({ answer: false }))).toEqual([]);
    expect(issuesOf(trueFalse({ answer: 'yes' }))).toHaveLength(1);
    expect(issuesOf({ id: 'tf-01', type: 'true-false' })).toHaveLength(1);
  });
});

describe('card number-entry', () => {
  it('takes an integer answer from 0 to 9999', () => {
    for (const answer of [0, 9, 12, 100, 9999]) {
      expect(issuesOf(numberEntry({ answer }))).toEqual([]);
    }
    for (const answer of [-1, 10000, 1.5, '12']) {
      expect(issuesOf(numberEntry({ answer }))).toHaveLength(1);
    }
  });

  it('defaults maxDigits to the answer digits, at least 2', () => {
    const maxDigits = (answer: number): number | undefined =>
      (compile(numberEntry({ answer })) as { maxDigits?: number } | null)?.maxDigits;
    expect([0, 5, 12, 123, 9999].map(maxDigits)).toEqual([2, 2, 2, 3, 4]);
    expect(
      (compile(numberEntry({ answer: 5, maxDigits: 1 })) as { maxDigits?: number }).maxDigits,
    ).toBe(1);
  });

  it('rejects maxDigits outside 1-4 and an answer that does not fit its maxDigits', () => {
    expect(issuesOf(numberEntry({ maxDigits: 0 }))).toHaveLength(1);
    expect(issuesOf(numberEntry({ maxDigits: 5 }))).toHaveLength(1);
    expect(issuesOf(numberEntry({ answer: 123, maxDigits: 2 }))).toEqual([
      'where: answer 123 has 3 digits but maxDigits is 2',
    ]);
    expect(issuesOf(numberEntry({ answer: 12, maxDigits: 3 }))).toEqual([]);
  });
});

describe('card order', () => {
  it('accepts items in any display order with the answer a permutation of their ids', () => {
    expect(issuesOf(order())).toEqual([]);
  });

  it('rejects an item with nothing to show, duplicate ids and fewer than 2 items', () => {
    const bare = [{ id: 'b' }, { id: 'a', big: 'A' }];
    expect(issuesOf(order({ items: bare, answer: ['a', 'b'] }))).toEqual([
      'item needs "text", "emoji", "big" or "image"',
    ]);
    const dup = [
      { id: 'a', big: 'A' },
      { id: 'a', big: 'B' },
    ];
    expect(issuesOf(order({ items: dup, answer: ['a', 'a'] }))).toContain('duplicate item id "a"');
    expect(issuesOf(order({ items: [{ id: 'a', big: 'A' }], answer: ['a'] }))).not.toEqual([]);
  });

  it('rejects an answer that is not a permutation of the item ids', () => {
    expect(issuesOf(order({ answer: ['a', 'b', 'z'] }))).toContain(
      '"answer" references "z", which is not in "items"',
    );
    expect(issuesOf(order({ answer: ['a', 'b', 'b'] }))).toContain('"answer" repeats "b"');
    expect(issuesOf(order({ answer: ['a', 'b'] }))).toContain('"answer" is missing "c"');
  });

  it('rejects an answer equal to the display order', () => {
    expect(issuesOf(order({ answer: ['b', 'a', 'c'] }))).toEqual([
      '"answer" must differ from the order of "items" (nothing to sort)',
    ]);
  });

  it('compiles items like options and lists the item text keys', () => {
    const def = compile(
      order({
        items: [
          { id: 'b', text: 'bee', big: 'B' },
          { id: 'a', big: 'A' },
        ],
        answer: ['a', 'b'],
      }),
    ) as CardExerciseDef & { items: readonly object[] };
    expect(def.items.map((item) => Object.keys(item))).toEqual([
      ['id', 'textKey', 'big'],
      ['id', 'big'],
    ]);
    expect(Object.keys(def)).toEqual(['id', 'concept', 'textKey', 'type', 'items', 'answer']);
    expect(CARD_KIND_CONTENT.order.textKeys?.(def as never)).toEqual([
      { key: 'lessons:bee', label: 'item "b"' },
    ]);
  });
});

describe('card demo', () => {
  const demo = content.demo;

  it('takes an optional text and prompt', () => {
    expect(demo.schema.safeParse({}).success).toBe(true);
    expect(demo.schema.safeParse({ text: 'x', prompt: { big: 3 } }).success).toBe(true);
    expect(demo.schema.safeParse({ prompt: {} }).success).toBe(false);
    expect(demo.schema.safeParse({ prompt: { big: 3 }, other: 1 }).success).toBe(false);
  });

  it('compiles to the text key and the compiled prompt', () => {
    const at = { where: 'demo', issues: [] };
    expect(demo.compile({ prompt: { big: 3, emoji: '🍎' } }, 'lessons:l.demo', at)).toEqual({
      textKey: 'lessons:l.demo',
      prompt: { emoji: '🍎', big: '3' },
    });
    expect(demo.compile({}, 'lessons:l.demo', at)).toEqual({ textKey: 'lessons:l.demo' });
  });
});

describe('the card fixture subject', () => {
  const compiled = compileAll(content, CARD_FIXTURE_ROOT);

  it('compiles: one lesson using all four kinds, one series boss, tracks, badges', () => {
    expect(compiled.content.lessons.map((lesson) => lesson.id)).toEqual(['count-up']);
    const [lesson] = compiled.content.lessons;
    expect(
      [...(lesson?.guided ?? []), ...(lesson?.exercises ?? [])].map((def) => def.type),
    ).toEqual(['true-false', 'choice', 'true-false', 'number-entry', 'order']);
    expect(lesson?.demo).toEqual({
      textKey: 'lessons:count-up.demo',
      prompt: { emoji: '🍎🍎🍎', big: '3' },
    });
    expect(compiled.content.minigames).toHaveLength(1);
    expect(compiled.content.minigames[0]).toMatchObject({ id: 'parade', mode: 'series' });
    expect(compiled.tracks.tracks).toHaveLength(1);
    expect(compiled.badges).toHaveLength(1);
  });

  it('matches its golden content.json', async () => {
    await expect(`${JSON.stringify(compiled.content, null, 1)}\n`).toMatchFileSnapshot(
      join('__snapshots__', 'card-fixture-content.json'),
      'pnpm --filter @learn/platform-content exec vitest run src/kinds/cards/content.test.ts -u, then review the diff',
    );
  });

  it('voices the exercise, story and demo texts only', () => {
    const sources = new Set(compiled.voiceTexts.entries.map((entry) => entry.source));
    expect(sources.has('lesson-exercise')).toBe(true);
    expect(
      compiled.voiceTexts.entries.some((entry) => entry.text.startsWith('Put the numbers')),
    ).toBe(true);
    expect(
      compiled.voiceTexts.entries.some((entry) => entry.text === 'Not that number. Try again!'),
    ).toBe(false);
  });

  it('every text the kit speaks or shows resolves in the merged English bundle', () => {
    const common = compiled.locales.en?.common;
    expect(common).toBeDefined();
    const keys = new Set<string>();
    const record = (key: string): string => {
      keys.add(key);
      return key;
    };
    const hints: readonly CardHint[] = [
      { kind: 'choice', level: 1, reveal: false },
      { kind: 'choice', level: 3, reveal: true },
      { kind: 'true-false', level: 1, highlight: false, reveal: false },
      { kind: 'number-entry', level: 1, reveal: false },
      { kind: 'number-entry', level: 2, reveal: false, digit: '1' },
      { kind: 'order', level: 1, reveal: false, nextSlot: 0 },
      { kind: 'order', level: 2, reveal: false, nextSlot: 0, ruledOutId: 'x' },
    ];
    for (const hint of hints) cardHintText(record, hint);
    const ctx = { name: 'Fox', stars: 3, vars: {} } as const;
    for (const note of Object.values(CARD_NOTES)) {
      (note.text as (r: typeof record, f: object, c: typeof ctx) => string)(
        record,
        { hint: hints[0] },
        ctx,
      );
    }
    // Keys the card UIs read directly (components in platform-web): the whole `cards` group.
    for (const key of [
      'cards.true',
      'cards.false',
      'cards.pad-label',
      'cards.erase',
      'cards.entry-label',
      'cards.order-slots',
      'cards.order-pool',
      'cards.slot-filled',
      'cards.slot-empty',
    ]) {
      keys.add(key);
    }
    expect([...keys].filter((key) => !hasKeyPath(common ?? {}, key))).toEqual([]);
    expect(keys.size).toBeGreaterThan(15);
  });

  it('the platform locale carries the cards group, so no subject has to', () => {
    const platform = loadLocales(PLATFORM_LOCALES_DIR).en?.common ?? {};
    expect(hasKeyPath(platform, 'cards.true')).toBe(true);
    expect(hasKeyPath(platform, 'cards.order-wrong')).toBe(true);
  });
});

describe('a broken card fixture subject', () => {
  let dir = '';
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  /** Copies the fixture, lets `mutate` edit its lesson file, and returns the issues compiling it reports. */
  function issuesAfter(mutate: (lesson: Record<string, unknown>) => void): readonly string[] {
    dir = mkdtempSync(join(tmpdir(), 'card-fixture-'));
    cpSync(CARD_FIXTURE_ROOT, dir, { recursive: true });
    const file = join(dir, 'lessons', 'counting', 'count-up.yaml');
    const lesson = parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    mutate(lesson);
    writeFileSync(file, stringify(lesson), 'utf8');
    try {
      compileAll(content, dir);
      return [];
    } catch (error) {
      if (error instanceof ContentError) return error.issues;
      throw error;
    }
  }

  it('is valid as copied', () => {
    expect(issuesAfter(() => undefined)).toEqual([]);
  });

  it('reports an unknown prompt field', () => {
    const issues = issuesAfter((lesson) => {
      const [first] = lesson.exercises as Record<string, unknown>[];
      if (first === undefined) throw new Error('fixture has no exercise');
      first.prompt = { emoji: '🍎', colour: 'red' };
    });
    expect(issues.some((issue) => issue.includes('exercises.0.prompt'))).toBe(true);
  });

  it('reports a missing option text key and a missing item text key', () => {
    const issues = issuesAfter((lesson) => {
      const exercises = lesson.exercises as Record<string, unknown>[];
      (exercises[0]?.options as Record<string, unknown>[]).push({
        id: 'd',
        text: 'no-such-option',
      });
      (exercises[3]?.items as Record<string, unknown>[]).push({ id: 'four', text: 'no-such-item' });
      (exercises[3]?.answer as string[]).push('four');
    });
    expect(
      issues.some((issue) => issue.includes('missing text key "lessons:no-such-option"')),
    ).toBe(true);
    expect(issues.some((issue) => issue.includes('missing text key "lessons:no-such-item"'))).toBe(
      true,
    );
  });

  it('reports a number-entry answer that does not fit its digits, with the lesson path', () => {
    const issues = issuesAfter((lesson) => {
      const exercises = lesson.exercises as Record<string, unknown>[];
      Object.assign(exercises[2] ?? {}, { answer: 123, maxDigits: 2 });
    });
    expect(issues).toEqual([
      'lessons/counting/count-up.yaml: count-03: answer 123 has 3 digits but maxDigits is 2',
    ]);
  });
});
