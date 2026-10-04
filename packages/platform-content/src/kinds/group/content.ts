// The opt-in `group` kind's content (sort cards into boxes): a subject adds `group: GROUP_KIND_CONTENT` to its kinds
// (`{ ...CARD_KIND_CONTENT, group: GROUP_KIND_CONTENT }`). YAML shapes per layout, the rules a verify step checks against the answer.
import type { TextKeyRef } from '@learn/platform-core';
import type {
  GroupAxis,
  GroupBox,
  GroupDef,
  GroupItem,
  ZoneRule,
} from '@learn/platform-core/domain/exercise/kinds/group/def';
import { CARROLL_ZONES, VENN_ZONES } from '@learn/platform-core/domain/exercise/kinds/group/def';
import { groupZones, zoneOf } from '@learn/platform-core/domain/exercise/kinds/group/engine';
import { z } from 'zod';
import { keySchema, textRefSchema } from '../../schema.ts';
import type { ExerciseKindContent } from '../kind-content.ts';
import {
  CARD_ITEM_NEEDS,
  cardExerciseFields,
  cardItemVisualFields,
  compileCardVisual,
  compileShape,
  hasCardContent,
  shapeSchema,
} from '../cards/prompt.ts';

/** A fact a rule or tag names: `key:value` (`colour:red`, from the shape) or one plain word (`animal`), kebab-case. */
const factSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*(:[a-z0-9]+(-[a-z0-9]+)*)?$/, {
  message: 'not a fact (kebab-case words, `key:value` or one plain word)',
});

const ruleSchema = z
  .object({
    all: z.array(factSchema).min(1).optional(),
    none: z.array(factSchema).min(1).optional(),
  })
  .strict()
  .refine((rule) => rule.all !== undefined || rule.none !== undefined, {
    message: 'rule needs "all" or "none"',
  });

type RuleRaw = z.output<typeof ruleSchema>;

const itemSchema = z
  .object({
    id: keySchema,
    text: textRefSchema.optional(),
    ...cardItemVisualFields,
    tags: z.array(factSchema).optional(),
  })
  .strict()
  .refine(hasCardContent, { message: `item ${CARD_ITEM_NEEDS}` });

type ItemRaw = z.output<typeof itemSchema>;

/** A `row` box: its label (a text, an emoji or a shape: a verify rule) and, optionally, the rule over the cards' facts. */
const boxSchema = z
  .object({
    id: keySchema,
    text: textRefSchema.optional(),
    emoji: cardItemVisualFields.emoji,
    shape: shapeSchema.optional(),
    rule: ruleSchema.optional(),
  })
  .strict();

type BoxRaw = z.output<typeof boxSchema>;

/** An axis of a Carroll table / Venn: the yes side's text ("Red"), the other side's ("Not red"), the yes side's rule. */
const axisSchema = z
  .object({ text: textRefSchema, notText: textRefSchema, rule: ruleSchema.optional() })
  .strict();

type AxisRaw = z.output<typeof axisSchema>;

const groupSchema = z
  .object({
    ...cardExerciseFields,
    type: z.literal('group'),
    layout: z.enum(['row', 'carroll', 'venn']),
    boxes: z.array(boxSchema).min(2).max(4).optional(),
    axes: z.tuple([axisSchema, axisSchema]).optional(),
    items: z.array(itemSchema).min(3).max(8),
    answer: z.record(keySchema, keySchema),
    allowEmpty: z.literal(true).optional(),
  })
  .strict();

type GroupRaw = z.output<typeof groupSchema>;

function compileRule(raw: RuleRaw): ZoneRule {
  return {
    ...(raw.all === undefined ? {} : { all: raw.all }),
    ...(raw.none === undefined ? {} : { none: raw.none }),
  };
}

function compileBox(raw: BoxRaw): GroupBox {
  return {
    id: raw.id,
    ...(raw.text === undefined ? {} : { textKey: `lessons:${raw.text}` }),
    ...(raw.emoji === undefined ? {} : { emoji: raw.emoji }),
    ...(raw.shape === undefined ? {} : { shape: compileShape(raw.shape) }),
    ...(raw.rule === undefined ? {} : { rule: compileRule(raw.rule) }),
  };
}

function compileAxis(raw: AxisRaw): GroupAxis {
  return {
    textKey: `lessons:${raw.text}`,
    notTextKey: `lessons:${raw.notText}`,
    ...(raw.rule === undefined ? {} : { rule: compileRule(raw.rule) }),
  };
}

function compileItem(raw: ItemRaw): GroupItem {
  return {
    id: raw.id,
    ...(raw.text === undefined ? {} : { textKey: `lessons:${raw.text}` }),
    ...compileCardVisual(raw),
    ...(raw.tags === undefined ? {} : { tags: raw.tags }),
  };
}

/** The ids of the zones a layout names, for the `answer` check. */
function zonesOfRaw(raw: GroupRaw): readonly string[] {
  if (raw.layout === 'row') return (raw.boxes ?? []).map((box) => box.id);
  return raw.layout === 'carroll' ? CARROLL_ZONES : VENN_ZONES;
}

/** Layout-specific fields, unique ids, and an `answer` that names a zone of the layout for every item exactly once. */
function refineGroup(raw: GroupRaw, ctx: z.RefinementCtx): void {
  const issue = (path: string, message: string): void => {
    ctx.addIssue({ code: 'custom', path: [path], message });
  };
  if (raw.layout === 'row') {
    if (raw.boxes === undefined) issue('boxes', 'layout "row" needs "boxes"');
    if (raw.axes !== undefined) issue('axes', 'layout "row" takes "boxes", not "axes"');
  } else {
    if (raw.axes === undefined) issue('axes', `layout "${raw.layout}" needs "axes"`);
    if (raw.boxes !== undefined) issue('boxes', `layout "${raw.layout}" takes "axes", not "boxes"`);
  }
  if (raw.allowEmpty !== undefined && raw.layout !== 'venn') {
    issue('allowEmpty', '"allowEmpty" is only for layout "venn" (its "neither" region)');
  }
  const boxIds = new Set<string>();
  for (const { id } of raw.boxes ?? []) {
    if (boxIds.has(id)) issue('boxes', `duplicate box id "${id}"`);
    boxIds.add(id);
  }
  const itemIds = new Set<string>();
  for (const { id } of raw.items) {
    if (itemIds.has(id)) issue('items', `duplicate item id "${id}"`);
    itemIds.add(id);
  }
  const zones = zonesOfRaw(raw);
  for (const [itemId, zone] of Object.entries(raw.answer)) {
    if (!itemIds.has(itemId)) {
      issue('answer', `"answer" references "${itemId}", which is not in "items"`);
    } else if (zones.length > 0 && !zones.includes(zone)) {
      issue(
        'answer',
        `"answer" puts "${itemId}" in "${zone}", which is not a ${raw.layout === 'row' ? 'box' : 'zone'} of this ${raw.layout} (${zones.join(', ')})`,
      );
    }
  }
  for (const id of itemIds) {
    if (raw.answer[id] === undefined) issue('answer', `"answer" is missing "${id}"`);
  }
}

function hasRules(def: GroupDef): boolean {
  return def.layout === 'row'
    ? (def.boxes ?? []).some((box) => box.rule !== undefined)
    : (def.axes ?? []).some((axis) => axis.rule !== undefined);
}

/** Tap the cards into the boxes: a `row` of 2-4 boxes, a Carroll 2 x 2 (axes: columns, rows) or a Venn of two circles. */
export const GROUP_KIND_CONTENT: ExerciseKindContent<GroupDef, typeof groupSchema> = {
  type: 'group',
  schema: groupSchema,
  refine: refineGroup,

  compile: (raw, ctx) =>
    ctx.build<GroupDef>({
      type: 'group',
      layout: raw.layout,
      ...(raw.boxes === undefined ? {} : { boxes: raw.boxes.map(compileBox) }),
      ...(raw.axes === undefined
        ? {}
        : { axes: [compileAxis(raw.axes[0]), compileAxis(raw.axes[1])] }),
      items: raw.items.map(compileItem),
      answer: raw.answer,
      ...(raw.allowEmpty === undefined ? {} : { allowEmpty: true }),
    }),

  /** A row's boxes are labelled; the rules (when there are any) put every card where `answer` does; every box / zone holds a card
   * (a Venn's `neither` may stay empty with `allowEmpty`). */
  verify(def, where, issues) {
    if (def.layout === 'row') {
      for (const box of def.boxes ?? []) {
        if (box.textKey === undefined && box.emoji === undefined && box.shape === undefined) {
          issues.push(`${where}: box "${box.id}" has no label (needs "text", "emoji" or "shape")`);
        }
      }
    }
    if (hasRules(def)) {
      for (const item of def.items) {
        const wanted = def.answer[item.id];
        const ruled = zoneOf(def, item);
        if (ruled === undefined) {
          issues.push(
            def.layout === 'row'
              ? `${where}: item "${item.id}" meets the rule of no box, or of several`
              : `${where}: item "${item.id}" cannot be placed by the rules: both axes need a rule`,
          );
        } else if (ruled !== wanted) {
          issues.push(
            `${where}: "answer" puts "${item.id}" in "${wanted ?? '?'}", but the rules put it in "${ruled}"`,
          );
        }
      }
    }
    for (const zone of groupZones(def)) {
      const empty = !def.items.some((item) => def.answer[item.id] === zone);
      if (empty && !(def.layout === 'venn' && zone === 'neither' && def.allowEmpty === true)) {
        issues.push(`${where}: ${def.layout === 'row' ? 'box' : 'zone'} "${zone}" holds no item`);
      }
    }
  },

  textKeys: (def): readonly TextKeyRef[] => [
    ...def.items.flatMap((item) =>
      item.textKey === undefined ? [] : [{ key: item.textKey, label: `item "${item.id}"` }],
    ),
    ...(def.boxes ?? []).flatMap((box) =>
      box.textKey === undefined ? [] : [{ key: box.textKey, label: `box "${box.id}"` }],
    ),
    ...(def.axes ?? []).flatMap((axis, index) => [
      { key: axis.textKey, label: `axis ${String(index + 1)}` },
      { key: axis.notTextKey, label: `axis ${String(index + 1)} (not)` },
    ]),
  ],
};
