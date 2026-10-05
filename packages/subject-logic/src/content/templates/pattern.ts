// W1 pattern templates (docs/subjects/logic/curriculum.md §3): `pat-next` ("What comes next?": a row of shapes ending in a gap) and
// `pat-gap` ("What is missing?": the gap inside the row). The row is the unit (AB, AAB, ABB, ABC) repeated; the options are the right
// token, another token of the unit and one token outside the pattern. Reason `unit-break`: the wrong option equal to the token just
// before the gap (the child says "same again" instead of finding the part that repeats). Each `check` reads the row and the options
// off the card and asks every short period the row obeys what it puts in the gap: a second answer is a bad item.
import { pick, randomInt, shuffle, type Random } from '@learn/platform-core/domain/random';
import type { CardShape } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import type { ExerciseTemplate, GenerateContext } from '@learn/platform-content/generate/template';
import type { Where } from '@learn/platform-content/subject';
import { z } from 'zod';
import { bugRef } from './bugs.ts';
import { fail } from './draw.ts';
import type { PromptToken, ShapeChoiceItem, ShapeOption } from './items.ts';
import { PATTERN_SIZES, attrParam, drawPalette, tokenKey, type Attr } from './shapes.ts';

/** The units of the lesson, as the symbol of each place (0 = A, 1 = B, 2 = C). */
export const UNITS = {
  AB: [0, 1],
  AAB: [0, 0, 1],
  ABB: [0, 1, 1],
  ABC: [0, 1, 2],
} as const;

export const UNIT_NAMES = ['AB', 'AAB', 'ABB', 'ABC'] as const;
export const unitParam = z.enum(UNIT_NAMES);
export type UnitName = z.output<typeof unitParam>;

/** Most tokens in a prompt row, the gap included (the card kit's limit). */
export const MAX_ROW = 8;

const patternParams = z
  .object({
    unit: unitParam,
    attr: attrParam,
    units: z.number().int().min(2).max(3).default(2),
  })
  .strict();

export type PatternParams = z.output<typeof patternParams>;

/** The symbols of a unit, a place each. */
function symbolsOf(unit: UnitName): readonly number[] {
  return UNITS[unit];
}

/** How many different tokens the unit has (2 or 3). */
function distinctOf(unit: UnitName): number {
  return new Set(symbolsOf(unit)).size;
}

/** The full units shown in a row with room for `room` tokens: the `units` asked for, dropped to fit but never below 2 (one unit shown
 * once is no pattern). */
export function unitsShown(units: number, length: number, room: number): number {
  let shown = units;
  while (shown > 2 && shown * length > room) shown -= 1;
  return shown;
}

/** Which kind of item: the gap at the end (`next`) or inside the row (`gap`). */
type Mode = 'next' | 'gap';

/** The tokens that share a residue with `place` modulo `period` among the known ones: what that period puts at `place`. */
function sameResidue(row: readonly (string | null)[], place: number, period: number): string[] {
  return row.flatMap((key, index) =>
    key !== null && index % period === place % period ? [key] : [],
  );
}

/** Every period 1 … ⌊known / 2⌋ that the known tokens of `row` (`null` = the gap, as a token key) obey, with what it puts in the
 * gap: its token key, or `null` when no known token shares the gap's place. A period is obeyed when tokens a period apart are alike. */
export function shortPeriods(
  row: readonly (string | null)[],
): readonly { readonly period: number; readonly predicts: string | null }[] {
  const gap = row.indexOf(null);
  const known = row.filter((key) => key !== null).length;
  const found: { period: number; predicts: string | null }[] = [];
  for (let period = 1; period <= Math.floor(known / 2); period += 1) {
    const obeyed = Array.from({ length: period }, (_unused, residue) => {
      const keys = sameResidue(row, residue, period);
      return keys.every((key) => key === keys[0]);
    }).every(Boolean);
    if (obeyed) found.push({ period, predicts: sameResidue(row, gap, period)[0] ?? null });
  }
  return found;
}

/** Builds the options of an item: the answer, the token just before the gap when it is wrong (else another token of the unit), and the
 * outside token (when the attribute has no value left over, the third token of the unit). Shuffled, ids `a`, `b`, `c`. */
function buildOptions(
  random: Random,
  values: readonly CardShape[],
  answer: CardShape,
  before: CardShape,
  outside: CardShape | undefined,
): { readonly options: readonly ShapeOption[]; readonly answerId: string } {
  const wrong = values.filter((value) => tokenKey(value) !== tokenKey(answer));
  const other = tokenKey(before) === tokenKey(answer) ? pick(random, wrong) : before;
  const rest = outside === undefined ? wrong : [other, outside];
  const ordered = shuffle([answer, ...rest], random);
  const unitBreak = tokenKey(before) === tokenKey(answer) ? undefined : tokenKey(before);
  const options = ordered.map((shape, index): ShapeOption => ({
    id: ['a', 'b', 'c'][index] ?? 'x',
    shape,
    ...(unitBreak !== undefined && tokenKey(shape) === unitBreak
      ? { reason: bugRef('unit-break') }
      : {}),
  }));
  const answerId = options.find((option) => tokenKey(option.shape) === tokenKey(answer))?.id ?? 'a';
  return { options, answerId };
}

/** The token of symbol `symbol` (0 = A). */
function valueAt(values: readonly CardShape[], symbol: number | undefined): CardShape {
  const value = values[symbol ?? 0];
  if (value === undefined) throw new RangeError(`no token for symbol ${String(symbol)}`);
  return value;
}

function generateItem(
  mode: Mode,
  params: PatternParams,
  ctx: GenerateContext,
  textKey: string,
): ShapeChoiceItem {
  const unit = symbolsOf(params.unit);
  const length = unit.length;
  const palette = drawPalette(ctx.random, params.attr, distinctOf(params.unit), true);
  const at = (place: number): CardShape => valueAt(palette.values, unit[place % length]);
  let row: readonly PromptToken[];
  let gapAt: number;
  if (mode === 'next') {
    const full = unitsShown(params.units, length, MAX_ROW - 1);
    const known =
      full * length + randomInt(ctx.random, 0, Math.min(length - 1, MAX_ROW - 1 - full * length));
    gapAt = known;
    row = [...Array.from({ length: known }, (_unused, place) => at(place)), 'gap'];
  } else {
    const total = unitsShown(params.units, length, MAX_ROW) * length;
    gapAt = randomInt(ctx.random, length, total - 2);
    row = Array.from({ length: total }, (_unused, place) => (place === gapAt ? 'gap' : at(place)));
  }
  const { options, answerId } = buildOptions(
    ctx.random,
    palette.values,
    at(gapAt),
    at(gapAt - 1),
    palette.outside,
  );
  return {
    id: ctx.id,
    type: 'choice',
    text: ctx.text('text', textKey),
    prompt: { shapes: row },
    options,
    answer: answerId,
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// check

/** The tokens of a row (the gap left out), as drawn shapes. */
function tokensOf(row: readonly PromptToken[]): readonly CardShape[] {
  return row.filter((token): token is CardShape => token !== 'gap');
}

/** Whether `token` varies only the attribute `attr` of the pattern: one fixed kind (colour, size), one fixed colour (kind, size),
 * sizes from the pattern's three (size), the default size and count (colour, kind, kind + colour). */
function fitsAttr(token: CardShape, attr: Attr, reference: CardShape): boolean {
  const plain = token.size === undefined && token.count === undefined;
  switch (attr) {
    case 'colour':
      return plain && token.kind === reference.kind;
    case 'kind':
      return plain && token.colour === reference.colour;
    case 'size':
      return (
        token.count === undefined &&
        token.kind === reference.kind &&
        token.colour === reference.colour &&
        PATTERN_SIZES.some((size) => size === token.size)
      );
    case 'kind+colour':
      return plain;
  }
}

/** Checks one pattern item against `mode`'s rules. */
function checkItem(mode: Mode, item: ShapeChoiceItem, params: PatternParams, at: Where): void {
  const row = item.prompt.shapes;
  const tokens = tokensOf(row);
  const gaps = row.flatMap((token, index) => (token === 'gap' ? [index] : []));
  const gapAt = gaps[0];
  if (gaps.length !== 1 || gapAt === undefined) {
    fail(at, `the row needs exactly one gap, has ${String(gaps.length)}`);
    return;
  }
  const unit = symbolsOf(params.unit);
  const length = unit.length;
  if (mode === 'next' ? gapAt !== row.length - 1 : gapAt < length || gapAt > row.length - 2) {
    fail(
      at,
      mode === 'next'
        ? 'the gap must be the last token'
        : `the gap must be after the first unit and before the last token, not at ${String(gapAt)}`,
    );
    return;
  }
  const expectedUnits = unitsShown(params.units, length, mode === 'next' ? MAX_ROW - 1 : MAX_ROW);
  const fullUnits = Math.floor((mode === 'next' ? row.length - 1 : row.length) / length);
  if (row.length > MAX_ROW || fullUnits !== expectedUnits) {
    fail(
      at,
      `${String(row.length)} tokens show ${String(fullUnits)} full units, ${String(expectedUnits)} expected for units ${String(params.units)}`,
    );
  }
  const [reference] = tokens;
  if (reference === undefined) return;
  // The row is the unit repeated: tokens at places with the same symbol are alike, with different symbols different.
  const keys = row.map((token) => (token === 'gap' ? null : tokenKey(token)));
  for (const [first, a] of keys.entries()) {
    for (const [second, b] of keys.entries()) {
      if (second <= first || a === null || b === null) continue;
      const sameSymbol = unit[first % length] === unit[second % length];
      if (sameSymbol !== (a === b)) {
        fail(
          at,
          `tokens ${String(first + 1)} and ${String(second + 1)} break the unit ${params.unit}`,
        );
        return;
      }
    }
  }
  if (tokens.some((token) => !fitsAttr(token, params.attr, reference))) {
    fail(at, `the tokens vary more than the attribute "${params.attr}"`);
  }
  const optionKeys = item.options.map((option) => tokenKey(option.shape));
  if (item.options.length !== 3 || new Set(optionKeys).size !== 3) {
    fail(at, `needs 3 different options, has ${JSON.stringify(optionKeys)}`);
    return;
  }
  const answer = item.options.find((option) => option.id === item.answer);
  if (answer === undefined) {
    fail(at, `the answer "${item.answer}" is not one of the options`);
    return;
  }
  const answerKey = tokenKey(answer.shape);
  // The token one unit before the gap shows what the gap holds.
  const expected = keys[gapAt - length];
  if (expected === null || expected === undefined || answerKey !== expected) {
    fail(at, `the answer is not the token one unit before the gap (${expected ?? 'none'})`);
  }
  // Every short period the row obeys must put the answer in the gap (or nothing).
  for (const { period, predicts } of shortPeriods(keys)) {
    if (predicts !== null && predicts !== answerKey) {
      fail(
        at,
        `period ${String(period)} also fits the row and puts ${predicts} in the gap, not ${answerKey}`,
      );
    }
  }
  const outside = item.options.filter((option) => !keys.includes(tokenKey(option.shape)));
  if (
    outside.length > 1 ||
    outside.some((option) => !fitsAttr(option.shape, params.attr, reference))
  ) {
    fail(
      at,
      'at most one option may be outside the pattern, and it must vary only the same attribute',
    );
  }
  const before = keys[gapAt - 1];
  const wrongBefore =
    before !== null && before !== undefined && before !== answerKey ? before : undefined;
  if (wrongBefore !== undefined && !optionKeys.includes(wrongBefore)) {
    fail(at, 'the token before the gap is wrong for the gap, so it must be one of the options');
  }
  const reasons = item.options.flatMap((option) =>
    option.reason === undefined ? [] : [`${option.id} ${option.reason}`],
  );
  const wanted = item.options.flatMap((option) =>
    wrongBefore !== undefined && tokenKey(option.shape) === wrongBefore
      ? [`${option.id} ${bugRef('unit-break')}`]
      : [],
  );
  if (JSON.stringify(reasons) !== JSON.stringify(wanted)) {
    fail(at, `reasons ${JSON.stringify(reasons)} should be ${JSON.stringify(wanted)}`);
  }
}

/** "What comes next?": the unit repeated `units` times and a few more tokens (fewer than a unit), then the gap. */
export const patNext: ExerciseTemplate<PatternParams, ShapeChoiceItem> = {
  params: patternParams,
  generate: (params, ctx) => generateItem('next', params, ctx, 'templates.pat-next'),
  check: (item, params, at) => {
    checkItem('next', item, params, at);
  },
};

/** "What is missing?": the unit repeated, one token (not in the first unit, not the last) hidden by the gap. */
export const patGap: ExerciseTemplate<PatternParams, ShapeChoiceItem> = {
  params: patternParams,
  generate: (params, ctx) => generateItem('gap', params, ctx, 'templates.pat-gap'),
  check: (item, params, at) => {
    checkItem('gap', item, params, at);
  },
};
