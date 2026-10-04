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
import { CARD_FIXTURE_ROOT, createCardFixtureContent } from '../../testing/card-fixture.ts';
import type { ExerciseDefBase } from '@learn/platform-core';
import { makeCompileContext } from '../kind-content.ts';
import { CARD_KIND_CONTENT, cardExerciseSchema } from './content.ts';
import { CONFUSABLE_COLOUR_PAIRS, confusableColours } from './shape-colours.ts';
import { cardStimulus } from './stimulus.ts';

const content = createCardFixtureContent();

/** Every issue one raw exercise yields: schema, then compile, then the kind's verify. */
function issuesOf(raw: Record<string, unknown>): readonly string[] {
  const parsed = cardExerciseSchema.safeParse(raw);
  if (!parsed.success) return parsed.error.issues.map((issue) => issue.message);
  const issues: string[] = [];
  const def = compile(raw, issues);
  const kind = content.kinds[parsed.data.type];
  if (def !== null) {
    kind?.verify?.(def, 'where', issues);
    content.stimulus.check?.(def, { where: 'where', issues });
  }
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
    expect(issuesOf(trueFalse({ prompt: {} }))).toEqual([
      'prompt needs "emoji", "big", "image" or "shapes"',
    ]);
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
      'option needs "text", "emoji", "big", "image" or "shape"',
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

describe('card choice reasons', () => {
  const reasoned = (): Record<string, unknown> =>
    choice({
      options: [
        { id: 'a', big: 2, reason: 'why-two' },
        { id: 'b', emoji: '🍎', text: 'apple' },
      ],
    });

  it('takes a reason on a wrong option: compiled as reasonKey after textKey, listed among the text keys', () => {
    expect(issuesOf(reasoned())).toEqual([]);
    const def = compile(reasoned()) as CardExerciseDef & { options: readonly object[] };
    expect(def.options.map((option) => Object.keys(option))).toEqual([
      ['id', 'reasonKey', 'big'],
      ['id', 'textKey', 'emoji'],
    ]);
    expect(CARD_KIND_CONTENT.choice.textKeys?.(def as never)).toEqual([
      { key: 'lessons:why-two', label: 'option "a" reason' },
      { key: 'lessons:apple', label: 'option "b"' },
    ]);
  });

  it('rejects a reason on the answer option, and a reason that is no text ref', () => {
    const onAnswer = choice({
      options: [
        { id: 'a', big: 2 },
        { id: 'b', emoji: '🍎', reason: 'why-apple' },
      ],
    });
    expect(issuesOf(onAnswer)).toEqual([
      'option "b" is the answer: a reason is for a wrong option',
    ]);
    expect(
      issuesOf(
        choice({
          options: [
            { id: 'a', big: 2, reason: 'Not A Ref' },
            { id: 'b', emoji: '🍎' },
          ],
        }),
      ),
    ).toHaveLength(1);
  });
});

describe('card true-false', () => {
  it('takes a reason text ref: compiled as reasonKey after the answer, listed among the text keys', () => {
    expect(issuesOf(trueFalse({ reason: 'why-true' }))).toEqual([]);
    const def = compile(trueFalse({ reason: 'why-true' }));
    expect(Object.keys(def ?? {})).toEqual([
      'id',
      'concept',
      'textKey',
      'type',
      'answer',
      'reasonKey',
    ]);
    expect(CARD_KIND_CONTENT['true-false'].textKeys?.(def as never)).toEqual([
      { key: 'lessons:why-true', label: 'reason' },
    ]);
    expect(CARD_KIND_CONTENT['true-false'].textKeys?.(compile(trueFalse()) as never)).toEqual([]);
    expect(issuesOf(trueFalse({ reason: 'Not A Ref' }))).toHaveLength(1);
  });

  it('needs a boolean answer', () => {
    expect(issuesOf(trueFalse())).toEqual([]);
    expect(issuesOf(trueFalse({ answer: false }))).toEqual([]);
    expect(issuesOf(trueFalse({ answer: 'yes' }))).toHaveLength(1);
    expect(issuesOf({ id: 'tf-01', type: 'true-false' })).toHaveLength(1);
  });
});

describe('card number-entry', () => {
  it('takes an integer answer from 0 to 99 999', () => {
    for (const answer of [0, 9, 12, 100, 9999, 10000, 99999]) {
      expect(issuesOf(numberEntry({ answer }))).toEqual([]);
    }
    for (const answer of [-1, 100000, 1.5, '12']) {
      expect(issuesOf(numberEntry({ answer }))).toHaveLength(1);
    }
  });

  it('defaults maxDigits to the answer digits, at least 2', () => {
    const maxDigits = (answer: number): number | undefined =>
      (compile(numberEntry({ answer })) as { maxDigits?: number } | null)?.maxDigits;
    expect([0, 5, 12, 123, 9999, 10000, 99999].map(maxDigits)).toEqual([2, 2, 2, 3, 4, 5, 5]);
    expect(
      (compile(numberEntry({ answer: 5, maxDigits: 1 })) as { maxDigits?: number }).maxDigits,
    ).toBe(1);
  });

  it('rejects maxDigits outside 1-5 and an answer that does not fit its maxDigits', () => {
    expect(issuesOf(numberEntry({ maxDigits: 0 }))).toHaveLength(1);
    expect(issuesOf(numberEntry({ maxDigits: 5 }))).toEqual([]);
    expect(issuesOf(numberEntry({ maxDigits: 6 }))).toHaveLength(1);
    expect(issuesOf(numberEntry({ answer: 123, maxDigits: 2 }))).toEqual([
      'where: answer 123 has 3 digits but maxDigits is 2',
    ]);
    expect(issuesOf(numberEntry({ answer: 12, maxDigits: 3 }))).toEqual([]);
  });
});

describe('card number-entry reasons', () => {
  const reasons = (...values: readonly number[]): Record<string, unknown> => ({
    reasons: values.map((value) => ({ value, text: `why-${String(value)}` })),
  });

  it('takes wrong values with a text ref each: compiled as { value, reasonKey } after maxDigits, listed among the text keys', () => {
    expect(issuesOf(numberEntry(reasons(35, 13)))).toEqual([]);
    const def = compile(numberEntry(reasons(35, 13)));
    expect(Object.keys(def ?? {})).toEqual([
      'id',
      'concept',
      'textKey',
      'type',
      'answer',
      'maxDigits',
      'reasons',
    ]);
    expect((def as { reasons?: unknown }).reasons).toEqual([
      { value: 35, reasonKey: 'lessons:why-35' },
      { value: 13, reasonKey: 'lessons:why-13' },
    ]);
    expect(CARD_KIND_CONTENT['number-entry'].textKeys?.(def as never)).toEqual([
      { key: 'lessons:why-35', label: 'reason for 35' },
      { key: 'lessons:why-13', label: 'reason for 13' },
    ]);
    expect(CARD_KIND_CONTENT['number-entry'].textKeys?.(compile(numberEntry()) as never)).toEqual(
      [],
    );
  });

  it('rejects a repeated value, the answer itself, and a value the pad cannot take', () => {
    expect(issuesOf(numberEntry(reasons(35, 35)))).toEqual(['where: reason for 35 is given twice']);
    expect(issuesOf(numberEntry(reasons(12)))).toEqual([
      'where: reason for 12 is the answer: a reason is for a wrong value',
    ]);
    expect(issuesOf(numberEntry({ answer: 5, maxDigits: 1, ...reasons(10) }))).toEqual([
      'where: reason for 10 has 2 digits but maxDigits is 1',
    ]);
    // Without maxDigits the pad is the answer's digits, at least 2.
    expect(issuesOf(numberEntry(reasons(350)))).toEqual([
      'where: reason for 350 has 3 digits but maxDigits is 2',
    ]);
    expect(issuesOf(numberEntry({ answer: 120, ...reasons(350) }))).toEqual([]);
  });

  it('rejects a value outside 0-99 999, an empty list, a bad text ref and an unknown field', () => {
    expect(issuesOf(numberEntry({ reasons: [{ value: -1, text: 'why' }] }))).toHaveLength(1);
    expect(issuesOf(numberEntry({ reasons: [{ value: 100000, text: 'why' }] }))).toHaveLength(1);
    expect(issuesOf(numberEntry({ reasons: [] }))).toHaveLength(1);
    expect(issuesOf(numberEntry({ reasons: [{ value: 3, text: 'Not A Ref' }] }))).toHaveLength(1);
    expect(issuesOf(numberEntry({ reasons: [{ value: 3, text: 'why', extra: 1 }] }))).toHaveLength(
      1,
    );
    expect(issuesOf(numberEntry({ reasons: [{ value: 3.5, text: 'why' }] }))).toHaveLength(1);
  });
});

describe('card order', () => {
  it('accepts items in any display order with the answer a permutation of their ids', () => {
    expect(issuesOf(order())).toEqual([]);
  });

  it('rejects an item with nothing to show, duplicate ids and fewer than 2 items', () => {
    const bare = [{ id: 'b' }, { id: 'a', big: 'A' }];
    expect(issuesOf(order({ items: bare, answer: ['a', 'b'] }))).toEqual([
      'item needs "text", "emoji", "big", "image" or "shape"',
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

describe('card shapes', () => {
  const circleRed = { kind: 'circle', colour: 'red' };
  const squareBlue = { kind: 'square', colour: 'blue' };
  const opts = (...shapes: Record<string, unknown>[]): Record<string, unknown>[] =>
    shapes.map((shape, index) => ({ id: `o${String(index)}`, shape }));
  const shapeChoice = (
    shapes: Record<string, unknown>[],
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => choice({ options: opts(...shapes), answer: 'o0', ...overrides });
  const row = (...shapes: unknown[]): Record<string, unknown> => trueFalse({ prompt: { shapes } });

  describe('schema', () => {
    it('takes a shape as the only content of an option and of an order item', () => {
      expect(issuesOf(shapeChoice([circleRed, squareBlue]))).toEqual([]);
      expect(issuesOf(order({ items: opts(circleRed, squareBlue), answer: ['o1', 'o0'] }))).toEqual(
        [],
      );
    });

    it('takes a row of shapes as the only content of a prompt, `gap` among the tokens', () => {
      expect(issuesOf(row(circleRed, squareBlue, circleRed, 'gap'))).toEqual([]);
      expect(issuesOf(row('gap'))).toEqual([]);
    });

    it('takes every kind, colour and size, and a count of 1 to 9', () => {
      for (const kind of ['circle', 'square', 'triangle', 'star', 'heart', 'diamond']) {
        expect(issuesOf(shapeChoice([{ kind, colour: 'yellow' }, squareBlue]))).toEqual([]);
      }
      for (const colour of ['red', 'blue', 'yellow', 'green', 'purple', 'orange']) {
        expect(
          issuesOf(
            shapeChoice([
              { kind: 'star', colour },
              { kind: 'heart', colour },
            ]),
          ),
        ).toEqual([]);
      }
      for (const size of ['tiny', 'small', 'medium', 'big', 'huge']) {
        expect(issuesOf(shapeChoice([{ ...circleRed, size }, squareBlue]))).toEqual([]);
      }
      for (const count of [1, 9]) {
        expect(issuesOf(shapeChoice([{ ...circleRed, count }, squareBlue]))).toEqual([]);
      }
    });

    it('rejects an unknown kind, colour or size, a count outside 1-9 or not whole, and an unknown field', () => {
      for (const shape of [
        { kind: 'hexagon', colour: 'red' },
        { kind: 'circle', colour: 'pink' },
        { ...circleRed, size: 'gigantic' },
        { ...circleRed, count: 0 },
        { ...circleRed, count: 10 },
        { ...circleRed, count: 2.5 },
        { ...circleRed, opacity: 1 },
        { kind: 'circle' },
        { colour: 'red' },
        {},
      ]) {
        expect(issuesOf(shapeChoice([shape, squareBlue])), JSON.stringify(shape)).not.toEqual([]);
      }
      expect(issuesOf(row(circleRed, 'hole'))).not.toEqual([]);
      expect(issuesOf(trueFalse({ prompt: { shapes: 'gap' } }))).not.toEqual([]);
    });

    it('an option / item with only an empty shape object has nothing to show', () => {
      expect(
        issuesOf(
          choice({
            options: [
              { id: 'a', shape: {} },
              { id: 'b', big: 2 },
            ],
            answer: 'b',
          }),
        ),
      ).not.toEqual([]);
    });
  });

  describe('compile', () => {
    it('compiles an option shape after emoji, big and image, keys kind, colour, size, count', () => {
      const def = compile(
        shapeChoice([{ count: 3, size: 'small', colour: 'red', kind: 'circle' }, squareBlue], {}),
      ) as CardExerciseDef & { options: readonly object[] };
      expect(def.options.map((option) => Object.keys(option))).toEqual([
        ['id', 'shape'],
        ['id', 'shape'],
      ]);
      expect(def.options[0]).toEqual({
        id: 'o0',
        shape: { kind: 'circle', colour: 'red', size: 'small', count: 3 },
      });
      expect(Object.keys((def.options[0] as { shape: object }).shape)).toEqual([
        'kind',
        'colour',
        'size',
        'count',
      ]);
      expect((def.options[1] as { shape: object }).shape).toEqual(squareBlue);
    });

    it('keeps a shape beside an emoji in emoji, big, image, shape order', () => {
      const def = compile(
        choice({
          options: [
            { id: 'a', shape: circleRed, image: 'fox', big: 1, emoji: '🍎' },
            { id: 'b', big: 2 },
          ],
        }),
      ) as CardExerciseDef & { options: readonly object[] };
      expect(Object.keys(def.options[0] ?? {})).toEqual(['id', 'emoji', 'big', 'image', 'shape']);
    });

    it('compiles a prompt row in order with `gap` kept, after emoji, big and image', () => {
      const def = compile(
        trueFalse({
          prompt: { shapes: [circleRed, 'gap', { ...squareBlue, size: 'huge' }], big: 'AB?' },
        }),
      ) as CardExerciseDef;
      expect(def.prompt).toEqual({
        big: 'AB?',
        shapes: [circleRed, 'gap', { kind: 'square', colour: 'blue', size: 'huge' }],
      });
      expect(Object.keys(def.prompt ?? {})).toEqual(['big', 'shapes']);
    });
  });

  describe('verify', () => {
    it('rejects a row with more than one gap', () => {
      expect(issuesOf(row(circleRed, 'gap', squareBlue, 'gap'))).toEqual([
        'where: shapes has 2 "gap" tokens, at most 1',
      ]);
    });

    it('rejects an empty row and a row of more than 8 tokens, accepts 1 and 8', () => {
      expect(issuesOf(row())).toEqual(['where: shapes has 0 tokens, needs 1 to 8']);
      const nine = Array.from({ length: 9 }, (_, index) => ({
        kind: 'circle',
        colour: 'red',
        count: index + 1,
      }));
      expect(issuesOf(row(...nine))).toEqual(['where: shapes has 9 tokens, needs 1 to 8']);
      expect(issuesOf(row(...nine.slice(0, 8)))).toEqual([]);
      expect(issuesOf(row(circleRed))).toEqual([]);
    });

    it('rejects two option shapes that differ only in a confusable colour, each pair, either order', () => {
      for (const [a, b] of [
        ['red', 'green'],
        ['green', 'red'],
        ['green', 'orange'],
        ['orange', 'green'],
        ['blue', 'purple'],
        ['purple', 'blue'],
      ] as const) {
        expect(
          issuesOf(
            shapeChoice([
              { kind: 'star', colour: a },
              { kind: 'star', colour: b },
            ]),
          ),
          `${a} / ${b}`,
        ).toEqual([
          `where: shapes "${a} star" and "${b} star" differ only in colour (${a} / ${b} look alike to many children): change the kind, size or count too`,
        ]);
      }
    });

    it('applies the rule to order items, to the prompt row and between the row and the items', () => {
      const green = { kind: 'circle', colour: 'green' };
      expect(issuesOf(order({ items: opts(circleRed, green), answer: ['o1', 'o0'] }))).toHaveLength(
        1,
      );
      expect(issuesOf(row(circleRed, squareBlue, green, 'gap'))).toHaveLength(1);
      expect(
        issuesOf(
          choice({
            prompt: { shapes: [circleRed, 'gap'] },
            options: [
              { id: 'a', shape: green },
              { id: 'b', shape: squareBlue },
            ],
            answer: 'b',
          }),
        ),
      ).toHaveLength(1);
    });

    it('reports size and count in the message when they are not the defaults', () => {
      expect(
        issuesOf(
          shapeChoice([
            { kind: 'heart', colour: 'red', size: 'small', count: 3 },
            { kind: 'heart', colour: 'green', size: 'small', count: 3 },
          ]),
        ),
      ).toEqual([
        'where: shapes "red heart, small, ×3" and "green heart, small, ×3" differ only in colour (red / green look alike to many children): change the kind, size or count too',
      ]);
    });

    it('accepts confusable colours when the kind, the size or the count differs too', () => {
      for (const other of [
        { kind: 'square', colour: 'green' },
        { kind: 'circle', colour: 'green', size: 'small' },
        { kind: 'circle', colour: 'green', count: 2 },
      ]) {
        expect(issuesOf(shapeChoice([circleRed, other])), JSON.stringify(other)).toEqual([]);
      }
    });

    it('accepts colours that are not a confusable pair, and the same colour twice', () => {
      for (const [a, b] of [
        ['red', 'blue'],
        ['red', 'yellow'],
        ['red', 'orange'],
        ['green', 'blue'],
        ['green', 'purple'],
        ['yellow', 'orange'],
        ['blue', 'blue'],
      ] as const) {
        expect(
          issuesOf(
            shapeChoice([
              { kind: 'star', colour: a },
              { kind: 'star', colour: b },
            ]),
          ),
          `${a} / ${b}`,
        ).toEqual([]);
      }
    });

    it('treats an explicit default size and count as the default', () => {
      expect(
        issuesOf(
          shapeChoice([
            { kind: 'star', colour: 'red', size: 'big', count: 1 },
            { kind: 'star', colour: 'green' },
          ]),
        ),
      ).toHaveLength(1);
    });
  });

  describe('demo', () => {
    const demo = content.demo;
    const at = (): { where: string; issues: string[] } => ({ where: 'demo', issues: [] });

    it('takes a row of shapes as its prompt and compiles it', () => {
      const prompt = { shapes: [circleRed, 'gap'] };
      expect(demo.schema.safeParse({ prompt }).success).toBe(true);
      expect(demo.compile({ prompt }, 'lessons:l.demo', at())).toEqual({
        textKey: 'lessons:l.demo',
        prompt: { shapes: [circleRed, 'gap'] },
      });
    });

    it('checks the row: one gap at most, 1-8 tokens, no confusable colours', () => {
      const issues = at();
      const check = (shapes: unknown[]): string[] => {
        const found = at();
        const compiledDemo = demo.compile({ prompt: { shapes } }, 'lessons:l.demo', found);
        if (compiledDemo !== null) demo.check?.(compiledDemo, found);
        return found.issues;
      };
      expect(issues.issues).toEqual([]);
      expect(check([circleRed, 'gap'])).toEqual([]);
      expect(check(['gap', 'gap'])).toEqual(['demo: shapes has 2 "gap" tokens, at most 1']);
      expect(check([])).toEqual(['demo: shapes has 0 tokens, needs 1 to 8']);
      expect(check([circleRed, { kind: 'circle', colour: 'green' }])).toHaveLength(1);
    });
  });

  describe('colour table', () => {
    it('lists red-green, green-orange and blue-purple', () => {
      expect(CONFUSABLE_COLOUR_PAIRS).toEqual([
        ['red', 'green'],
        ['green', 'orange'],
        ['blue', 'purple'],
      ]);
    });

    it('is symmetric and false for equal or unrelated colours', () => {
      for (const [a, b] of CONFUSABLE_COLOUR_PAIRS) {
        expect(confusableColours(a, b)).toBe(true);
        expect(confusableColours(b, a)).toBe(true);
      }
      expect(confusableColours('red', 'red')).toBe(false);
      expect(confusableColours('red', 'orange')).toBe(false);
      expect(confusableColours('yellow', 'green')).toBe(false);
    });
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

  it('compiles: one lesson using all four kinds (shape tokens in two choices, three exercises generated), a series boss and a duel, tracks, badges', () => {
    expect(compiled.content.lessons.map((lesson) => lesson.id)).toEqual(['count-up']);
    const [lesson] = compiled.content.lessons;
    expect(
      [...(lesson?.guided ?? []), ...(lesson?.exercises ?? [])].map((def) => def.type),
    ).toEqual([
      'true-false',
      'choice',
      'choice',
      'choice',
      'true-false',
      'number-entry',
      'order',
      'number-entry',
      'number-entry',
      'number-entry',
    ]);
    expect(lesson?.demo).toEqual({
      textKey: 'lessons:count-up.demo',
      prompt: { emoji: '🍎🍎🍎', big: '3' },
    });
    expect(compiled.content.minigames).toHaveLength(2);
    expect(compiled.content.minigames.map((game) => [game.id, game.mode])).toEqual([
      ['parade', 'series'],
      ['take-away', 'duel'],
    ]);
    expect(compiled.content.minigames[1]).toMatchObject({
      game: 'take-away-fixture',
      params: { pile: 6 },
      level: 1,
      first: 'bot',
      hintKey: 'lessons:take-away-hint',
      titleKey: 'lessons:take-away.title',
      goalKey: 'lessons:take-away.goal',
      unlockAfter: 'count-up',
    });
    expect(compiled.tracks.tracks).toHaveLength(1);
    expect(compiled.badges).toHaveLength(1);
  });

  it('matches its golden content.json', async () => {
    await expect(`${JSON.stringify(compiled.content, null, 1)}\n`).toMatchFileSnapshot(
      join('__snapshots__', 'card-fixture-content.json'),
      'pnpm --filter @learn/platform-content exec vitest run src/kinds/cards/content.test.ts -u, then review the diff',
    );
  });

  it('matches its golden generated texts (lessons.gen.*, English)', async () => {
    await expect(
      `${JSON.stringify(compiled.locales.en?.lessons?.gen, null, 1)}\n`,
    ).toMatchFileSnapshot(
      join('__snapshots__', 'card-fixture-generated-texts.json'),
      'pnpm --filter @learn/platform-content exec vitest run src/kinds/cards/content.test.ts -u, then review the diff',
    );
  });

  it('expands the generated lesson entry and series round into ordinary items with their own texts', () => {
    const [lesson] = compiled.content.lessons;
    const generated = [
      ...(lesson?.exercises ?? []).filter((def) => def.id.startsWith('fx-add-')),
      ...compiled.content.minigames.flatMap((game) =>
        'rounds' in game ? (game.rounds as readonly ExerciseDefBase[]) : [],
      ),
    ].filter((def) => def.id.startsWith('fx-'));
    expect(generated.map((def) => def.id)).toEqual([
      'fx-add-1',
      'fx-add-2',
      'fx-add-3',
      'fx-round-1',
      'fx-round-2',
    ]);
    const gen = compiled.locales.en?.lessons?.gen as Record<string, { text: string }>;
    for (const def of generated.map((exercise) => exercise as CardExerciseDef)) {
      const [a, b] = (def.prompt?.big ?? '').split(' + ');
      expect(def.textKey).toBe(`lessons:gen.${def.id}.text`);
      expect(gen[def.id]?.text).toBe(`What is ${String(a)} plus ${String(b)}?`);
    }
    // The stem itself is no id.
    expect(JSON.stringify(compiled.content)).not.toContain('"id":"fx-add"');
  });

  it('gives the generated items the off-by-one reason (answer + 1) and the authored ones their own', () => {
    const [lesson] = compiled.content.lessons;
    const exercises = (lesson?.exercises ?? []) as readonly CardExerciseDef[];
    const authored = (id: string): CardExerciseDef | undefined =>
      exercises.find((def) => def.id === id);
    expect(authored('count-01')).toMatchObject({
      options: [{ id: 'a' }, { id: 'b' }, { id: 'c', reasonKey: 'lessons:count-01-reason-c' }],
    });
    expect(authored('count-02')).toMatchObject({ reasonKey: 'lessons:count-02-reason' });
    expect(authored('count-03')).toMatchObject({
      reasons: [{ value: 35, reasonKey: 'lessons:count-03-reason-times' }],
    });
    const generated = [
      ...exercises.filter((def) => def.id.startsWith('fx-add-')),
      ...compiled.content.minigames.flatMap((game) =>
        'rounds' in game ? (game.rounds as readonly CardExerciseDef[]) : [],
      ),
    ].filter((def) => def.id.startsWith('fx-'));
    expect(generated).toHaveLength(5);
    for (const def of generated) {
      if (def.type !== 'number-entry') throw new Error(`${def.id} is not a number-entry`);
      expect(def.reasons).toEqual([
        { value: def.answer + 1, reasonKey: 'lessons:bugs.off-by-one' },
      ]);
    }
    expect(compiled.locales.en?.lessons?.bugs).toEqual({
      'off-by-one': 'So close! Count the last jump again.',
    });
  });

  it('lists every generated text, concrete, in the voice inventory (lesson exercises and series rounds)', () => {
    const sentences = compiled.voiceTexts.entries.filter((entry) =>
      /^What is \d+ plus \d+\?$/.test(entry.text),
    );
    const bySource = (source: string): readonly string[] =>
      sentences.filter((entry) => entry.source === source).map((entry) => entry.text);
    // The authored "What is seven plus five?" has no digits, so these are the generated ones: 3 lesson items, 2 rounds.
    expect(bySource('lesson-exercise')).toHaveLength(3);
    expect(bySource('minigame-round')).toHaveLength(2);
    const gen = compiled.locales.en?.lessons?.gen as Record<string, { text: string }>;
    for (const { text } of Object.values(gen)) {
      expect(compiled.voiceTexts.entries.some((entry) => entry.text === text)).toBe(true);
    }
  });

  it("voices the content's own texts and the card notes of the kinds it uses", () => {
    const sources = new Set(compiled.voiceTexts.entries.map((entry) => entry.source));
    expect(sources.has('lesson-exercise')).toBe(true);
    const spoken = new Set(compiled.voiceTexts.entries.map((entry) => entry.text));
    expect(spoken.has('Put the numbers in order, smallest first.')).toBe(true);
    // The fixture uses all four kinds: their wrong notes (plain and with the easier offer), hints and praise.
    for (const text of [
      'Not quite! Try again.',
      'Not that number. Try again!',
      'Not that one. Try another!',
      'Not that number. Try again! This one is tricky. Want an easier one?',
      'It starts with 7.',
      'Which one comes next?',
      'Amazing!',
    ]) {
      expect(spoken.has(text), text).toBe(true);
    }
  });

  it('voices every reason, authored and generated: nothing a wrong answer can say is left without audio', () => {
    const spoken = new Set(compiled.voiceTexts.entries.map((entry) => entry.text));
    const en = compiled.locales.en?.lessons as Record<string, unknown>;
    const reasons = [
      'A hand is five fingers. Count the apples!',
      'Two and two make four, not five.',
      'That is seven times five. This one is plus!',
      'So close! Count the last jump again.',
    ];
    for (const reason of reasons) {
      expect(spoken.has(reason), reason).toBe(true);
    }
    // Every reasonKey of every compiled def resolves to a voiced text (no easier variant in the fixture: plain only).
    const defs = [
      ...compiled.content.lessons.flatMap((lesson) => [...lesson.guided, ...lesson.exercises]),
      ...compiled.content.minigames.flatMap((game) =>
        'rounds' in game ? (game.rounds as readonly ExerciseDefBase[]) : [],
      ),
    ];
    const keys = JSON.stringify(defs).match(/"reasonKey":"lessons:([^"]+)"/g) ?? [];
    expect(keys.length).toBeGreaterThan(5);
    for (const raw of keys) {
      const ref = /lessons:([^"]+)/.exec(raw)?.[1] ?? '';
      const text = ref
        .split('.')
        .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], en);
      expect(typeof text, ref).toBe('string');
      expect(spoken.has(text as string), ref).toBe(true);
    }
  });

  it("voices the duel's lines: turn, result, the game's own hint and the bot's name from the lesson's character", () => {
    const spoken = new Set(compiled.voiceTexts.entries.map((entry) => entry.text));
    for (const text of [
      'Your turn',
      "Fox's turn",
      'You won! Great thinking!',
      'I won this time. Try again!',
      'A draw! Try again.',
      'Leave me a pile of 3.',
      'Take 1 or 2 stones. Whoever takes the last stone wins!',
    ]) {
      expect(spoken.has(text), text).toBe(true);
    }
    // The fixture's duel has its own hint, so the platform's default line is not inventoried.
    expect(spoken.has('Look for a move that leaves me stuck.')).toBe(false);
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

  /** The issues of the lesson file itself (a skipped lesson also makes the series that unlocks after it report). */
  const lessonIssues = (issues: readonly string[]): readonly string[] =>
    issues.filter((issue) => issue.startsWith('lessons/'));

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

  it('reports an unknown template of a lesson `generate:` entry at its schema path', () => {
    const issues = issuesAfter((lesson) => {
      const exercises = lesson.exercises as { generate?: { template: string } }[];
      const generate = exercises[4]?.generate;
      if (generate === undefined) throw new Error('fixture has no generate entry');
      generate.template = 'nope';
    });
    expect(lessonIssues(issues)).toEqual([
      'lessons/counting/count-up.yaml: exercises.4.generate.template: unknown template "nope"',
    ]);
  });

  it('reports bad params of a `generate:` entry at generate.params.<path>', () => {
    const issues = issuesAfter((lesson) => {
      const exercises = lesson.exercises as { generate?: { params: { max: number } } }[];
      const generate = exercises[4]?.generate;
      if (generate === undefined) throw new Error('fixture has no generate entry');
      generate.params.max = 1;
    });
    expect(lessonIssues(issues)).toHaveLength(1);
    expect(issues[0]).toContain(
      'lessons/counting/count-up.yaml: exercises[4]: generate.params.max: ',
    );
  });

  it('reports a generate entry that cannot give distinct items', () => {
    const issues = issuesAfter((lesson) => {
      const exercises = lesson.exercises as { generate?: { params: { max: number } } }[];
      const generate = exercises[4]?.generate;
      if (generate === undefined) throw new Error('fixture has no generate entry');
      generate.params.max = 2;
    });
    expect(lessonIssues(issues)).toEqual([
      'lessons/counting/count-up.yaml: exercises[4]: could not generate 3 distinct items',
    ]);
  });

  it('claims every generated id: a second entry with the same stem duplicates them', () => {
    const issues = issuesAfter((lesson) => {
      const exercises = lesson.exercises as Record<string, unknown>[];
      exercises.push(structuredClone(exercises[4] ?? {}));
    });
    expect(issues.filter((issue) => issue.includes('duplicate id'))).toHaveLength(3);
    expect(issues.some((issue) => issue.includes('duplicate id "fx-add-1"'))).toBe(true);
  });

  it('copies `easier` onto the generated items, so the variant rules apply to them', () => {
    const issues = issuesAfter((lesson) => {
      const exercises = lesson.exercises as Record<string, unknown>[];
      Object.assign(exercises[4] ?? {}, { easier: 'no-such-variant' });
    });
    expect(issues).toEqual([
      'lessons/counting/count-up.yaml: fx-add-1: easier references unknown variant "no-such-variant" (must be in this lesson\'s variants)',
      'lessons/counting/count-up.yaml: fx-add-2: easier references unknown variant "no-such-variant" (must be in this lesson\'s variants)',
      'lessons/counting/count-up.yaml: fx-add-3: easier references unknown variant "no-such-variant" (must be in this lesson\'s variants)',
    ]);
  });

  it('reports an authored `lessons.gen` key as reserved', () => {
    dir = mkdtempSync(join(tmpdir(), 'card-fixture-'));
    cpSync(CARD_FIXTURE_ROOT, dir, { recursive: true });
    const file = join(dir, 'locales', 'en', 'lessons.yaml');
    const lessons = parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    lessons.gen = { mine: 'Not allowed' };
    writeFileSync(file, stringify(lessons), 'utf8');
    expect(() => compileAll(content, dir)).toThrow(
      /lessons: "gen" is reserved for generated texts/,
    );
  });

  it('reports an unknown template of a series round at its schema path', () => {
    dir = mkdtempSync(join(tmpdir(), 'card-fixture-'));
    cpSync(CARD_FIXTURE_ROOT, dir, { recursive: true });
    const file = join(dir, 'minigames', 'parade.yaml');
    const game = parse(readFileSync(file, 'utf8')) as {
      rounds: { generate?: { template: string } }[];
    };
    const generate = game.rounds[3]?.generate;
    if (generate === undefined) throw new Error('fixture has no generate round');
    generate.template = 'nope';
    writeFileSync(file, stringify(game), 'utf8');
    let issues: readonly string[] = [];
    try {
      compileAll(content, dir);
    } catch (error) {
      if (error instanceof ContentError) issues = error.issues;
      else throw error;
    }
    // A mini-game file's schema is a union over the subject's modes: with `duel` next to `series`, the issues also list what the
    // duel branch finds missing, so only the lines about the rounds are compared.
    expect(issues.filter((issue) => issue.includes(': rounds.'))).toEqual([
      'minigames/parade.yaml: rounds.3.generate.template: unknown template "nope"',
    ]);
  });

  it('reports a reason on the answer option of a choice, with the lesson path', () => {
    const issues = issuesAfter((lesson) => {
      const exercises = lesson.exercises as Record<string, unknown>[];
      const options = exercises[0]?.options as Record<string, unknown>[];
      Object.assign(options[1] ?? {}, { reason: 'count-01-reason-c' });
    });
    expect(lessonIssues(issues)).toEqual([
      'lessons/counting/count-up.yaml: exercises.0.options.1.reason: option "b" is the answer: a reason is for a wrong option',
    ]);
  });

  it('reports a repeated and an answer-equal number-entry reason value, with the lesson path', () => {
    const issues = issuesAfter((lesson) => {
      const exercises = lesson.exercises as Record<string, unknown>[];
      Object.assign(exercises[2] ?? {}, {
        reasons: [
          { value: 35, text: 'count-03-reason-times' },
          { value: 35, text: 'count-03-reason-times' },
          { value: 12, text: 'count-03-reason-times' },
        ],
      });
    });
    expect(issues).toEqual([
      'lessons/counting/count-up.yaml: count-03: reason for 35 is given twice',
      'lessons/counting/count-up.yaml: count-03: reason for 12 is the answer: a reason is for a wrong value',
    ]);
  });

  it('reports a reason value the pad cannot take', () => {
    const issues = issuesAfter((lesson) => {
      const exercises = lesson.exercises as Record<string, unknown>[];
      Object.assign(exercises[2] ?? {}, {
        reasons: [{ value: 350, text: 'count-03-reason-times' }],
      });
    });
    expect(issues).toEqual([
      'lessons/counting/count-up.yaml: count-03: reason for 350 has 3 digits but maxDigits is 2',
    ]);
  });

  it('reports an unknown reason text key of a choice option, a true-false and a number-entry value', () => {
    const issues = issuesAfter((lesson) => {
      const exercises = lesson.exercises as Record<string, unknown>[];
      const options = exercises[0]?.options as Record<string, unknown>[];
      Object.assign(options[0] ?? {}, { reason: 'no-such-choice-reason' });
      Object.assign(exercises[1] ?? {}, { reason: 'no-such-true-false-reason' });
      Object.assign(exercises[2] ?? {}, {
        reasons: [{ value: 35, text: 'no-such-number-reason' }],
      });
    });
    expect(issues).toEqual([
      'lessons/counting/count-up.yaml: count-01: option "a" reason: missing text key "lessons:no-such-choice-reason" in en locale',
      'lessons/counting/count-up.yaml: count-02: reason: missing text key "lessons:no-such-true-false-reason" in en locale',
      'lessons/counting/count-up.yaml: count-03: reason for 35: missing text key "lessons:no-such-number-reason" in en locale',
    ]);
  });

  it('reports a generated item whose reason text is missing, at the generated item', () => {
    dir = mkdtempSync(join(tmpdir(), 'card-fixture-'));
    cpSync(CARD_FIXTURE_ROOT, dir, { recursive: true });
    const file = join(dir, 'locales', 'en', 'lessons.yaml');
    const lessons = parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    delete lessons.bugs;
    writeFileSync(file, stringify(lessons), 'utf8');
    let issues: readonly string[] = [];
    try {
      compileAll(content, dir);
    } catch (error) {
      if (error instanceof ContentError) issues = error.issues;
      else throw error;
    }
    expect(issues.length).toBeGreaterThan(0);
    expect(
      issues.every((issue) => issue.includes('missing text key "lessons:bugs.off-by-one"')),
    ).toBe(true);
    expect(issues.some((issue) => issue.includes('fx-add-1: reason for 3'))).toBe(true);
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
