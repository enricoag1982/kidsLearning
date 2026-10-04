import { describe, expect, it } from 'vitest';
import type { ExerciseDefBase } from '@learn/platform-core';
import type { GroupDef } from '@learn/platform-core/domain/exercise/kinds/group/def';
import { CARD_FIXTURE_KIND_CONTENT } from '../../testing/card-fixture.ts';
import { createExerciseSchema } from '../../lesson-schema.ts';
import { makeCompileContext } from '../kind-content.ts';
import { cardStimulus } from '../cards/stimulus.ts';
import { GROUP_KIND_CONTENT } from './content.ts';

const schema = createExerciseSchema(CARD_FIXTURE_KIND_CONTENT, cardStimulus);

/** The raw YAML of each layout (a valid one), each field overridable. */
const row = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'gr-01',
  type: 'group',
  layout: 'row',
  boxes: [
    { id: 'red', text: 'red', rule: { all: ['colour:red'] } },
    { id: 'blue', text: 'blue', rule: { all: ['colour:blue'] } },
  ],
  items: [
    { id: 'a', shape: { kind: 'circle', colour: 'red' } },
    { id: 'b', shape: { kind: 'square', colour: 'blue' } },
    { id: 'c', shape: { kind: 'triangle', colour: 'red' } },
  ],
  answer: { a: 'red', b: 'blue', c: 'red' },
  ...overrides,
});
const carroll = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'gc-01',
  type: 'group',
  layout: 'carroll',
  axes: [
    { text: 'red', notText: 'not-red', rule: { all: ['colour:red'] } },
    { text: 'circle', notText: 'not-circle', rule: { all: ['kind:circle'] } },
  ],
  items: [
    { id: 'a', shape: { kind: 'circle', colour: 'red' } },
    { id: 'b', shape: { kind: 'square', colour: 'red' } },
    { id: 'c', shape: { kind: 'circle', colour: 'blue' } },
    { id: 'd', shape: { kind: 'triangle', colour: 'yellow' } },
  ],
  answer: { a: 'a-b', b: 'a-not-b', c: 'not-a-b', d: 'not-a-not-b' },
  ...overrides,
});
const venn = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'gv-01',
  type: 'group',
  layout: 'venn',
  axes: [
    { text: 'square', notText: 'not-square', rule: { all: ['kind:square'] } },
    { text: 'blue', notText: 'not-blue', rule: { all: ['colour:blue'] } },
  ],
  items: [
    { id: 'a', shape: { kind: 'square', colour: 'blue' } },
    { id: 'b', shape: { kind: 'square', colour: 'red' } },
    { id: 'c', shape: { kind: 'triangle', colour: 'blue' } },
    { id: 'd', shape: { kind: 'circle', colour: 'yellow' } },
  ],
  answer: { a: 'both', b: 'only-a', c: 'only-b', d: 'neither' },
  ...overrides,
});

function compile(raw: Record<string, unknown>, issues: string[] = []): GroupDef {
  const parsed = schema.parse(raw);
  const ctx = makeCompileContext(
    'lesson.yaml',
    'exercises[0]',
    issues,
    { id: parsed.id, concept: 'sorting', textKey: `lessons:${parsed.text ?? parsed.id}` },
    parsed.easier,
    { head: {}, tail: {} },
  );
  const def: ExerciseDefBase | null = CARD_FIXTURE_KIND_CONTENT.group.compile(parsed as never, ctx);
  if (def === null) throw new Error('compile returned null');
  return def as GroupDef;
}

/** Schema issues of a raw exercise; when it parses, the kind's own verify issues. */
function issuesOf(raw: Record<string, unknown>): readonly string[] {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return parsed.error.issues.map((issue) => issue.message);
  const issues: string[] = [];
  GROUP_KIND_CONTENT.verify?.(compile(raw), 'where', issues);
  return issues;
}

describe('group schema', () => {
  it('accepts a valid row, Carroll table and Venn', () => {
    for (const raw of [row(), carroll(), venn()]) expect(issuesOf(raw), String(raw.id)).toEqual([]);
  });

  it('accepts cards of any content (text, big, emoji, shape, image) and tags', () => {
    expect(
      issuesOf(
        row({
          boxes: [
            { id: 'one', emoji: '1️⃣' },
            { id: 'two', shape: { kind: 'star', colour: 'blue' } },
            { id: 'three', text: 'three' },
          ],
          items: [
            { id: 'a', text: 'ant', tags: ['animal', 'legs:six'] },
            { id: 'b', big: 2 },
            { id: 'c', image: 'fox' },
          ],
          answer: { a: 'one', b: 'two', c: 'three' },
        }),
      ),
    ).toEqual([]);
  });

  it('a row needs `boxes` and takes no `axes`; a Carroll / Venn needs `axes` and takes no `boxes`', () => {
    const axes = carroll().axes;
    const boxes = row().boxes;
    expect(issuesOf(row({ boxes: undefined }))).toEqual(['layout "row" needs "boxes"']);
    expect(issuesOf(row({ axes }))).toEqual(['layout "row" takes "boxes", not "axes"']);
    expect(issuesOf(carroll({ axes: undefined }))).toEqual(['layout "carroll" needs "axes"']);
    expect(issuesOf(carroll({ boxes }))).toEqual(['layout "carroll" takes "axes", not "boxes"']);
    expect(issuesOf(venn({ axes: undefined }))).toEqual(['layout "venn" needs "axes"']);
    expect(issuesOf(venn({ boxes }))).toEqual(['layout "venn" takes "axes", not "boxes"']);
  });

  it('a row has 2 to 4 boxes, an exercise 3 to 8 cards, a Carroll / Venn exactly 2 axes', () => {
    const items = (count: number) =>
      Array.from({ length: count }, (_unused, index) => ({ id: `i${String(index)}`, big: index }));
    const boxes = (count: number) =>
      Array.from({ length: count }, (_unused, index) => ({
        id: `b${String(index)}`,
        text: `b${String(index)}`,
      }));
    /** `cards` cards over `places` boxes: card n in box n modulo places. */
    const sort = (cards: number, places: number) => ({
      boxes: boxes(places),
      items: items(cards),
      answer: Object.fromEntries(
        items(cards).map((item, index) => [item.id, `b${String(index % places)}`]),
      ),
    });
    expect(issuesOf(row(sort(3, 1)))).toHaveLength(1);
    expect(issuesOf(row(sort(3, 2)))).toEqual([]);
    expect(issuesOf(row(sort(4, 4)))).toEqual([]);
    expect(issuesOf(row(sort(5, 5)))).toHaveLength(1);
    expect(issuesOf(row(sort(2, 2)))).toHaveLength(1);
    expect(issuesOf(row(sort(8, 3)))).toEqual([]);
    expect(issuesOf(row(sort(9, 3)))).toHaveLength(1);
    const [axisA] = carroll().axes as readonly unknown[];
    expect(issuesOf(carroll({ axes: [axisA] }))).not.toEqual([]);
    expect(issuesOf(carroll({ axes: [axisA, axisA, axisA] }))).not.toEqual([]);
  });

  it('rejects duplicate card ids and duplicate box ids', () => {
    const items = row().items as readonly { id: string }[];
    expect(issuesOf(row({ items: [...items, items[0]] }))).toContain('duplicate item id "a"');
    const [first] = row().boxes as readonly unknown[];
    expect(issuesOf(row({ boxes: [first, first] }))).toContain('duplicate box id "red"');
  });

  it('a card needs content', () => {
    const items = row().items as readonly unknown[];
    expect(issuesOf(row({ items: [...items.slice(0, 2), { id: 'c' }] }))).toEqual([
      'item needs "text", "emoji", "big", "image" or "shape"',
    ]);
  });

  it('`answer` covers every card once and names a box / zone of the layout', () => {
    expect(issuesOf(row({ answer: { a: 'red', b: 'blue' } }))).toEqual(['"answer" is missing "c"']);
    expect(issuesOf(row({ answer: { a: 'red', b: 'blue', c: 'red', z: 'red' } }))).toEqual([
      '"answer" references "z", which is not in "items"',
    ]);
    expect(issuesOf(row({ answer: { a: 'red', b: 'blue', c: 'green' } }))).toEqual([
      '"answer" puts "c" in "green", which is not a box of this row (red, blue)',
    ]);
    expect(
      issuesOf(carroll({ answer: { a: 'both', b: 'a-not-b', c: 'not-a-b', d: 'not-a-not-b' } })),
    ).toEqual([
      '"answer" puts "a" in "both", which is not a zone of this carroll (a-b, a-not-b, not-a-b, not-a-not-b)',
    ]);
    expect(
      issuesOf(venn({ answer: { a: 'a-b', b: 'only-a', c: 'only-b', d: 'neither' } })),
    ).toEqual([
      '"answer" puts "a" in "a-b", which is not a zone of this venn (both, only-a, only-b, neither)',
    ]);
  });

  it('`allowEmpty` is for a Venn only', () => {
    expect(issuesOf(row({ allowEmpty: true }))).toEqual([
      '"allowEmpty" is only for layout "venn" (its "neither" region)',
    ]);
    expect(issuesOf(carroll({ allowEmpty: true }))).toHaveLength(1);
    expect(issuesOf(venn({ allowEmpty: false }))).not.toEqual([]);
  });

  it('is strict: an unknown field on the exercise, a box, an axis, a rule or a card is rejected', () => {
    const [box, ...boxes] = row().boxes as readonly Record<string, unknown>[];
    const [axis, ...axes] = carroll().axes as readonly Record<string, unknown>[];
    const [item, ...items] = row().items as readonly Record<string, unknown>[];
    expect(issuesOf(row({ colour: 'red' }))).not.toEqual([]);
    expect(issuesOf(row({ boxes: [{ ...box, colour: 'red' }, ...boxes] }))).not.toEqual([]);
    expect(issuesOf(carroll({ axes: [{ ...axis, colour: 'red' }, ...axes] }))).not.toEqual([]);
    expect(
      issuesOf(row({ boxes: [{ ...box, rule: { all: ['colour:red'], any: [] } }, ...boxes] })),
    ).not.toEqual([]);
    expect(issuesOf(row({ items: [{ ...item, colour: 'red' }, ...items] }))).not.toEqual([]);
  });

  it('an axis needs both texts; a rule needs `all` or `none` and facts in kebab-case', () => {
    const [box, ...boxes] = row().boxes as readonly Record<string, unknown>[];
    const [axis, ...axes] = carroll().axes as readonly Record<string, unknown>[];
    expect(issuesOf(carroll({ axes: [{ text: 'red', rule: axis?.rule }, ...axes] }))).not.toEqual(
      [],
    );
    expect(issuesOf(row({ boxes: [{ ...box, rule: {} }, ...boxes] }))).toEqual([
      'rule needs "all" or "none"',
    ]);
    expect(issuesOf(row({ boxes: [{ ...box, rule: { all: [] } }, ...boxes] }))).not.toEqual([]);
    expect(issuesOf(row({ boxes: [{ ...box, rule: { all: ['Colour:Red'] } }, ...boxes] }))).toEqual(
      ['not a fact (kebab-case words, `key:value` or one plain word)'],
    );
    const [item, ...items] = row().items as readonly Record<string, unknown>[];
    expect(issuesOf(row({ items: [{ ...item, tags: ['a b'] }, ...items] }))).toEqual([
      'not a fact (kebab-case words, `key:value` or one plain word)',
    ]);
  });
});

describe('group compile', () => {
  it('a row: keys in the def order, text refs in the `lessons` namespace, rules, tags and shapes carried over', () => {
    const def = compile(
      row({
        boxes: [
          {
            id: 'red',
            text: 'red',
            emoji: '🔴',
            rule: { all: ['colour:red'], none: ['kind:star'] },
          },
          { id: 'blue', shape: { kind: 'circle', colour: 'blue', size: 'small' } },
        ],
        items: [
          { id: 'a', big: 1, tags: ['odd'] },
          { id: 'b', text: 'bee', emoji: '🐝' },
          { id: 'c', shape: { kind: 'star', colour: 'red', count: 3 } },
        ],
        answer: { a: 'blue', b: 'blue', c: 'red' },
      }),
    );
    expect(Object.keys(def)).toEqual([
      'id',
      'concept',
      'textKey',
      'type',
      'layout',
      'boxes',
      'items',
      'answer',
    ]);
    expect(def.boxes).toEqual([
      {
        id: 'red',
        textKey: 'lessons:red',
        emoji: '🔴',
        rule: { all: ['colour:red'], none: ['kind:star'] },
      },
      { id: 'blue', shape: { kind: 'circle', colour: 'blue', size: 'small' } },
    ]);
    expect(def.items).toEqual([
      { id: 'a', big: '1', tags: ['odd'] },
      { id: 'b', textKey: 'lessons:bee', emoji: '🐝' },
      { id: 'c', shape: { kind: 'star', colour: 'red', count: 3 } },
    ]);
    expect(def.answer).toEqual({ a: 'blue', b: 'blue', c: 'red' });
  });

  it('a Carroll table / Venn: both axes with their texts, "not" texts and rules; `allowEmpty` kept', () => {
    const def = compile(venn({ allowEmpty: true }));
    expect(Object.keys(def)).toEqual([
      'id',
      'concept',
      'textKey',
      'type',
      'layout',
      'axes',
      'items',
      'answer',
      'allowEmpty',
    ]);
    expect(def.axes).toEqual([
      {
        textKey: 'lessons:square',
        notTextKey: 'lessons:not-square',
        rule: { all: ['kind:square'] },
      },
      { textKey: 'lessons:blue', notTextKey: 'lessons:not-blue', rule: { all: ['colour:blue'] } },
    ]);
    expect(def.allowEmpty).toBe(true);
    expect(compile(carroll()).allowEmpty).toBeUndefined();
  });

  it('an axis without a rule compiles without one', () => {
    const [axis, other] = carroll().axes as readonly Record<string, unknown>[];
    const def = compile(
      carroll({ axes: [{ text: 'red', notText: 'not-red' }, other], answer: carroll().answer }),
    );
    expect(def.axes?.[0]).toEqual({ textKey: 'lessons:red', notTextKey: 'lessons:not-red' });
    expect(axis).toBeDefined();
  });

  it('lists every text key it shows: cards, boxes, both sides of each axis', () => {
    const keys = (def: GroupDef) =>
      GROUP_KIND_CONTENT.textKeys?.(def).map((ref) => [ref.key, ref.label]);
    expect(
      keys(
        compile(
          row({
            items: [
              { id: 'a', text: 'ant' },
              { id: 'b', big: 1 },
              { id: 'c', big: 2 },
            ],
            answer: { a: 'red', b: 'blue', c: 'red' },
          }),
        ),
      ),
    ).toEqual([
      ['lessons:ant', 'item "a"'],
      ['lessons:red', 'box "red"'],
      ['lessons:blue', 'box "blue"'],
    ]);
    expect(keys(compile(carroll()))).toEqual([
      ['lessons:red', 'axis 1'],
      ['lessons:not-red', 'axis 1 (not)'],
      ['lessons:circle', 'axis 2'],
      ['lessons:not-circle', 'axis 2 (not)'],
    ]);
  });
});

describe('group verify', () => {
  it('a row box without a label is an issue (a text, an emoji or a shape is one)', () => {
    const [first, second] = row().boxes as readonly Record<string, unknown>[];
    expect(
      issuesOf(row({ boxes: [first, { id: 'blue', rule: { all: ['colour:blue'] } }] })),
    ).toEqual(['where: box "blue" has no label (needs "text", "emoji" or "shape")']);
    expect(
      issuesOf(row({ boxes: [{ id: 'red', emoji: '🔴', rule: first?.rule }, second] })),
    ).toEqual([]);
    expect(
      issuesOf(
        row({
          boxes: [
            { id: 'red', shape: { kind: 'circle', colour: 'red' }, rule: first?.rule },
            second,
          ],
        }),
      ),
    ).toEqual([]);
  });

  it('rules that put a card elsewhere than `answer` are an issue, per layout', () => {
    expect(issuesOf(row({ answer: { a: 'blue', b: 'blue', c: 'red' } }))).toEqual([
      'where: "answer" puts "a" in "blue", but the rules put it in "red"',
    ]);
    expect(
      issuesOf(carroll({ answer: { a: 'a-not-b', b: 'a-not-b', c: 'not-a-b', d: 'not-a-not-b' } })),
    ).toContain('where: "answer" puts "a" in "a-not-b", but the rules put it in "a-b"');
    expect(
      issuesOf(venn({ answer: { a: 'only-a', b: 'only-a', c: 'only-b', d: 'neither' } })),
    ).toContain('where: "answer" puts "a" in "only-a", but the rules put it in "both"');
  });

  it('a row card that meets the rule of no box, or of several, is an issue', () => {
    const items = row().items as readonly Record<string, unknown>[];
    const yellow = { id: 'c', shape: { kind: 'triangle', colour: 'yellow' } };
    expect(issuesOf(row({ items: [...items.slice(0, 2), yellow] }))).toContain(
      'where: item "c" meets the rule of no box, or of several',
    );
    const overlapping = [
      { id: 'red', text: 'red', rule: { all: ['colour:red'] } },
      { id: 'blue', text: 'blue', rule: { none: ['kind:square'] } },
    ];
    expect(issuesOf(row({ boxes: overlapping }))).toContain(
      'where: item "a" meets the rule of no box, or of several',
    );
  });

  it('a Carroll table / Venn with a rule on one axis only cannot place a card: an issue', () => {
    const [axis] = carroll().axes as readonly Record<string, unknown>[];
    const [vennAxis] = venn().axes as readonly Record<string, unknown>[];
    const bare = { text: 'other', notText: 'not-other' };
    for (const raw of [carroll({ axes: [axis, bare] }), venn({ axes: [vennAxis, bare] })]) {
      const issues = issuesOf(raw).filter((issue) => issue.includes('both axes need a rule'));
      expect(issues, String(raw.id)).toHaveLength(4);
    }
    expect(issuesOf(carroll({ axes: [bare, axis] }))[0]).toBe(
      'where: item "a" cannot be placed by the rules: both axes need a rule',
    );
  });

  it('without any rule, the answer is not checked against rules (a hand-made sort)', () => {
    expect(
      issuesOf(
        row({
          boxes: [
            { id: 'one', text: 'one' },
            { id: 'two', text: 'two' },
          ],
          answer: { a: 'one', b: 'two', c: 'one' },
        }),
      ),
    ).toEqual([]);
    expect(
      issuesOf(
        carroll({
          axes: [
            { text: 'red', notText: 'not-red' },
            { text: 'circle', notText: 'not-circle' },
          ],
        }),
      ),
    ).toEqual([]);
  });

  it('every row box holds a card', () => {
    const boxes = [
      { id: 'one', text: 'one' },
      { id: 'two', text: 'two' },
      { id: 'three', text: 'three' },
    ];
    expect(issuesOf(row({ boxes, answer: { a: 'one', b: 'two', c: 'one' } }))).toEqual([
      'where: box "three" holds no item',
    ]);
  });

  it('every Carroll cell and Venn region holds a card', () => {
    expect(
      issuesOf(
        carroll({
          axes: [
            { text: 'red', notText: 'not-red' },
            { text: 'circle', notText: 'not-circle' },
          ],
          answer: { a: 'a-b', b: 'a-not-b', c: 'a-b', d: 'not-a-b' },
        }),
      ),
    ).toEqual(['where: zone "not-a-not-b" holds no item']);
    expect(
      issuesOf(
        venn({
          axes: [
            { text: 'square', notText: 'not-square' },
            { text: 'blue', notText: 'not-blue' },
          ],
          answer: { a: 'both', b: 'only-a', c: 'only-b', d: 'only-b' },
        }),
      ),
    ).toEqual(['where: zone "neither" holds no item']);
  });

  it('a Venn `neither` may stay empty with `allowEmpty`, no other zone may', () => {
    const noRules = [
      { text: 'square', notText: 'not-square' },
      { text: 'blue', notText: 'not-blue' },
    ];
    expect(
      issuesOf(
        venn({
          axes: noRules,
          allowEmpty: true,
          answer: { a: 'both', b: 'only-a', c: 'only-b', d: 'only-b' },
        }),
      ),
    ).toEqual([]);
    expect(
      issuesOf(
        venn({
          axes: noRules,
          allowEmpty: true,
          answer: { a: 'both', b: 'both', c: 'only-b', d: 'neither' },
        }),
      ),
    ).toEqual(['where: zone "only-a" holds no item']);
  });

  it('with the rules in place, an empty `neither` still needs `allowEmpty` (the rules put a card there otherwise)', () => {
    const items = (venn().items as readonly unknown[]).slice(0, 3);
    expect(issuesOf(venn({ items, answer: { a: 'both', b: 'only-a', c: 'only-b' } }))).toEqual([
      'where: zone "neither" holds no item',
    ]);
    expect(
      issuesOf(venn({ items, answer: { a: 'both', b: 'only-a', c: 'only-b' }, allowEmpty: true })),
    ).toEqual([]);
  });
});
