import type { GroupDef, GroupHint, GroupItem, GroupMiss, GroupOutcome, GroupState } from './def.ts';
import type { ZoneRule } from './def.ts';
import { CARROLL_ZONES, VENN_ZONES } from './def.ts';
import { shapeFacts } from '../cards/prompt.ts';

interface Step<S> {
  readonly state: S;
  readonly outcome: GroupOutcome;
}

/** The ids a card can be put in: a `row`'s box ids, else the four Carroll / Venn zones. */
export function groupZones(def: GroupDef): readonly string[] {
  if (def.layout === 'row') return (def.boxes ?? []).map((box) => box.id);
  return def.layout === 'carroll' ? CARROLL_ZONES : VENN_ZONES;
}

/** What rules can ask about a card: its shape's facts (`kind:circle`, `colour:red`, ...) and its own tags. */
export function itemFacts(item: GroupItem): readonly string[] {
  return [...(item.shape === undefined ? [] : shapeFacts(item.shape)), ...(item.tags ?? [])];
}

function meets(rule: ZoneRule, facts: readonly string[]): boolean {
  return (
    (rule.all ?? []).every((fact) => facts.includes(fact)) &&
    !(rule.none ?? []).some((fact) => facts.includes(fact))
  );
}

/** The one zone whose rule(s) the card meets: a `row` box with a rule it meets (exactly one); a Carroll / Venn zone from the
 * card's side of each axis (both axes need a rule). `undefined` without rules, or when none / several boxes fit. */
export function zoneOf(def: GroupDef, item: GroupItem): string | undefined {
  const facts = itemFacts(item);
  if (def.layout === 'row') {
    const hits = (def.boxes ?? []).filter(
      (box) => box.rule !== undefined && meets(box.rule, facts),
    );
    return hits.length === 1 ? hits[0]?.id : undefined;
  }
  const [a, b] = def.axes ?? [];
  if (a?.rule === undefined || b?.rule === undefined) return undefined;
  const inA = meets(a.rule, facts);
  const inB = meets(b.rule, facts);
  if (def.layout === 'carroll') return CARROLL_ZONES[(inA ? 0 : 2) + (inB ? 0 : 1)];
  if (inA) return inB ? 'both' : 'only-a';
  return inB ? 'only-b' : 'neither';
}

/** Which side of each axis a Carroll cell is on. */
const CARROLL_SIDES: Readonly<Record<string, { readonly a: boolean; readonly b: boolean }>> = {
  'a-b': { a: true, b: true },
  'a-not-b': { a: true, b: false },
  'not-a-b': { a: false, b: true },
  'not-a-not-b': { a: false, b: false },
};

/** What a wrong put (`put` instead of `right`) got half right, for the note; `undefined` = nothing to say beyond "not this box". */
function missOf(def: GroupDef, right: string, put: string): GroupMiss | undefined {
  if (def.layout === 'carroll') {
    const wanted = CARROLL_SIDES[right];
    const given = CARROLL_SIDES[put];
    if (wanted === undefined || given === undefined) return undefined;
    const column = wanted.a === given.a;
    const row = wanted.b === given.b;
    if (!column && row) return 'column';
    if (column && !row) return 'row';
    return undefined;
  }
  if (def.layout === 'venn') {
    if (right === 'both' || put === 'both') return 'overlap';
    if (right === 'neither' || put === 'neither') return 'outside';
  }
  return undefined;
}

/** The ids of the cards not yet placed, in display order. */
function unplacedIds(state: GroupState): readonly string[] {
  return state.def.items.map((item) => item.id).filter((id) => state.placed[id] === undefined);
}

/** Puts `itemId` in its right box: clears the wrong flash and that card's crossed-out boxes; solved with the last card. */
function place<S extends GroupState>(state: S, itemId: string, boxId: string): S {
  const placed = { ...state.placed, [itemId]: boxId };
  return {
    ...state,
    placed,
    ruledOut: state.ruledOut.filter((entry) => entry.itemId !== itemId),
    wrong: undefined,
    solved: Object.keys(placed).length === state.def.items.length,
  };
}

/** The right box → placed (solved with the last card); another box → errors + 1, `wrong` set, the card stays in the pool. A card
 * already placed, an unknown card or box, and any put once solved are ignored. */
export function putItem<S extends GroupState>(state: S, itemId: string, boxId: string): Step<S> {
  const right = state.def.answer[itemId];
  const known = state.def.items.some((item) => item.id === itemId);
  if (
    state.solved ||
    !known ||
    right === undefined ||
    state.placed[itemId] !== undefined ||
    !groupZones(state.def).includes(boxId)
  ) {
    return { state, outcome: { kind: 'ignored' } };
  }
  if (boxId === right) {
    const next = { ...place(state, itemId, boxId), moves: state.moves + 1 };
    return { state: next, outcome: { kind: next.solved ? 'solved' : 'placed' } };
  }
  const miss = missOf(state.def, right, boxId);
  return {
    state: {
      ...state,
      errors: state.errors + 1,
      moves: state.moves + 1,
      wrong: { itemId, boxId },
    },
    outcome: { kind: 'wrong', itemId, boxId, ...(miss === undefined ? {} : { miss }) },
  };
}

/** 1: read what each box wants; 2: crosses out one wrong box for the first card still in the pool (not one already crossed out,
 * unless every wrong box is); 3: places that card. A hint clears the last wrong flash. `level` is already on `state.hintLevel`.
 * With every card placed there is nothing to point at: the level-1 nudge, state unchanged. */
export function groupHint<S extends GroupState>(
  state: S,
  level: 1 | 2 | 3,
): { readonly state: S; readonly hint: GroupHint } {
  const calm: S = { ...state, wrong: undefined };
  const itemId = unplacedIds(state)[0];
  const right = itemId === undefined ? undefined : state.def.answer[itemId];
  if (level === 1 || itemId === undefined || right === undefined) {
    return { state: calm, hint: { kind: 'group', level: 1 } };
  }
  if (level === 3) {
    return {
      state: place(calm, itemId, right),
      hint: { kind: 'group', level, itemId, boxId: right },
    };
  }
  const wrongZones = groupZones(state.def).filter((zone) => zone !== right);
  const crossed = (zone: string): boolean =>
    state.ruledOut.some((entry) => entry.itemId === itemId && entry.boxId === zone);
  const boxId = wrongZones.find((zone) => !crossed(zone)) ?? wrongZones[0];
  if (boxId === undefined) {
    return { state: calm, hint: { kind: 'group', level: 1 } };
  }
  return {
    state: crossed(boxId) ? calm : { ...calm, ruledOut: [...state.ruledOut, { itemId, boxId }] },
    hint: { kind: 'group', level, itemId, boxId },
  };
}
