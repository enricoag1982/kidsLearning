// W1 place-value templates (docs/subjects/math/curriculum.md §3): `pv-build` (blocks), `pv-read` (type the number), `pv-which` (pick
// the numeral), `pv-expanded` (3000 + 400 + 5). Each `check` re-derives the answer from what the card shows (the prompt and options)
// and recomputes every reason from the digits as text, not through the arithmetic `generate` used.
import { randomInt, shuffle } from '@learn/platform-core/domain/random';
import type { ExerciseTemplate, TextVars } from '@learn/platform-content/generate/template';
import { z } from 'zod';
import { appendPlaces, bugRef, dropZero, swapHundredsTens, swapTensOnes, valueOf } from './bugs.ts';
import type { BugId } from './bugs.ts';
import { digitsParam, drawDigits, fail, sameEntries, zeroInParam } from './draw.ts';
import type { ZeroIn } from './draw.ts';
import type { ChoiceItem, NumberEntryItem, PlaceValueItem, ValueReason } from './items.ts';
import { digitsOf, numeral, parseNumeral } from './numeral.ts';

/** The longest `append` number a card shows: the 5-digit pad / numeral width (curriculum §1 "Numbers"). */
const MAX_APPEND_DIGITS = 5;

/** The place codes of a 3- and a 4-digit number, high to low: "2H 0T 5O", "1Th 2H 0T 5O". */
const CODES: Readonly<Record<3 | 4, readonly string[]>> = {
  3: ['H', 'T', 'O'],
  4: ['Th', 'H', 'T', 'O'],
};

/** The text variables of a number's places, high to low: `h t o` / `th h t o`. */
function placeVars(digits: readonly number[]): TextVars {
  const names = digits.length === 4 ? ['th', 'h', 't', 'o'] : ['h', 't', 'o'];
  return Object.fromEntries(names.map((name, index) => [name, digits[index] ?? 0]));
}

/** "2H 0T 5O" for the digits (3 or 4). */
function placeCode(digits: readonly number[]): string {
  const codes = digits.length === 4 ? CODES[4] : CODES[3];
  return digits.map((digit, index) => `${String(digit)}${codes[index] ?? ''}`).join(' ');
}

/** The digits of a "2H 0T 5O" / "1Th 2H 0T 5O" code, or `null`. */
function readPlaceCode(text: string): readonly number[] | null {
  const [, thousands, hundreds, tens, ones] = /^(?:(\d)Th )?(\d)H (\d)T (\d)O$/.exec(text) ?? [];
  if (hundreds === undefined || tens === undefined || ones === undefined) return null;
  return [
    ...(thousands === undefined ? [] : [Number(thousands)]),
    Number(hundreds),
    Number(tens),
    Number(ones),
  ];
}

// The string-based twins of `bugs.ts`, for the checks: the digits as text, places exchanged by position.

/** `text` with the characters at `i` and `i + 1` exchanged. */
function swapAt(text: string, i: number): string {
  return `${text.slice(0, i)}${text.charAt(i + 1)}${text.charAt(i)}${text.slice(i + 2)}`;
}

/** The place values written one after another without the zero place ("205" → "2005"), `null` without a zero place. */
function appendText(text: string): string | null {
  if (!text.includes('0')) return null;
  return text
    .split('')
    .map((digit, index) => (digit === '0' ? '' : digit + '0'.repeat(text.length - 1 - index)))
    .join('');
}

/** Every digit is 1-9 except the one zero `zeroIn` puts at the tens / ones. */
function zeroRule(text: string, zeroIn: ZeroIn): boolean {
  const zeroAt = zeroIn === 'tens' ? text.length - 2 : zeroIn === 'ones' ? text.length - 1 : -1;
  return text.split('').every((digit, index) => (digit === '0') === (index === zeroAt));
}

// ---------------------------------------------------------------------------------------------------------------------
// pv-build

const pvBuildParams = z
  .object({
    digits: digitsParam,
    zeroIn: zeroInParam,
    /** Fixed targets in order (a guided try): each has `digits` digits, whatever its zeros; the first `count` are used. */
    values: z.array(z.number().int()).min(1).optional(),
  })
  .strict()
  .superRefine((params, ctx) => {
    for (const [index, value] of (params.values ?? []).entries()) {
      if (value < 10 ** (params.digits - 1) || value >= 10 ** params.digits) {
        ctx.addIssue({
          code: 'custom',
          path: ['values', index],
          message: `${String(value)} is not a ${String(params.digits)}-digit number`,
        });
      }
    }
  });

export type PvBuildParams = z.output<typeof pvBuildParams>;

/** Build `n` with blocks. Reason `swap`: the tens and ones the wrong way round, when they differ. */
export const pvBuild: ExerciseTemplate<PvBuildParams, PlaceValueItem> = {
  params: pvBuildParams,
  generate({ digits, zeroIn, values }, ctx) {
    const fixed = values?.[ctx.index];
    if (values !== undefined && fixed === undefined) {
      throw new Error(
        `values has ${String(values.length)} entries, item ${String(ctx.index + 1)} has none`,
      );
    }
    const target = fixed ?? valueOf(drawDigits(ctx.random, digits, zeroIn));
    const swapped = swapTensOnes(digitsOf(target, digits));
    return {
      id: ctx.id,
      type: 'place-value',
      text: ctx.text('text', 'templates.pv-build', { n: target }),
      prompt: { big: numeral(target) },
      target,
      columns: digits,
      ...(swapped === target ? {} : { reasons: [{ value: swapped, text: bugRef('swap') }] }),
    };
  },
  check(item, params, at) {
    const shown = parseNumeral(item.prompt.big);
    if (shown === null) {
      fail(at, `cannot read the prompt "${item.prompt.big}" as a number`);
      return;
    }
    const text = String(shown);
    if (shown !== item.target) {
      fail(at, `the prompt shows ${text} but the target is ${String(item.target)}`);
    }
    if (text.length !== params.digits || item.columns !== params.digits) {
      fail(
        at,
        `${text} in ${String(item.columns)} columns is not a ${String(params.digits)}-digit build`,
      );
    }
    if (
      params.values === undefined ? !zeroRule(text, params.zeroIn) : !params.values.includes(shown)
    ) {
      fail(
        at,
        `${text} breaks the zeros rule (${params.values === undefined ? params.zeroIn : 'values'})`,
      );
    }
    const swapped = Number(swapAt(text, text.length - 2));
    const expected: readonly ValueReason[] =
      swapped === shown ? [] : [{ value: swapped, text: bugRef('swap') }];
    if (
      !sameEntries(
        item.reasons ?? [],
        expected,
        (reason) => `${String(reason.value)} ${reason.text}`,
      )
    ) {
      fail(
        at,
        `reasons ${JSON.stringify(item.reasons ?? [])} should be ${JSON.stringify(expected)}`,
      );
    }
  },
};

// ---------------------------------------------------------------------------------------------------------------------
// pv-read

const pvReadParams = z.object({ digits: digitsParam, zeroIn: zeroInParam }).strict();

export type PvReadParams = z.output<typeof pvReadParams>;

/** The wrong answers of "2 hundreds, 0 tens and 5 ones": `swap` (250) always when tens and ones differ, `append` (2005) when a place
 * is zero and the result still fits the pad. */
function readReasons(digits: readonly number[], maxDigits: number): readonly ValueReason[] {
  const swapped = swapTensOnes(digits);
  const appended = appendPlaces(digits);
  return [
    ...(swapped === valueOf(digits) ? [] : [{ value: swapped, text: bugRef('swap') }]),
    ...(appended !== null && String(appended).length <= maxDigits
      ? [{ value: appended, text: bugRef('append') }]
      : []),
  ];
}

/** Type the number of "2 hundreds, 0 tens and 5 ones" (the card shows "2H 0T 5O"); the pad is one digit wider than the answer. */
export const pvRead: ExerciseTemplate<PvReadParams, NumberEntryItem> = {
  params: pvReadParams,
  generate({ digits, zeroIn }, ctx) {
    const places = drawDigits(ctx.random, digits, zeroIn);
    const maxDigits = digits + 1;
    const reasons = readReasons(places, maxDigits);
    return {
      id: ctx.id,
      type: 'number-entry',
      text: ctx.text(
        'text',
        digits === 3 ? 'templates.pv-read' : 'templates.pv-read-4',
        placeVars(places),
      ),
      prompt: { big: placeCode(places) },
      answer: valueOf(places),
      maxDigits,
      ...(reasons.length === 0 ? {} : { reasons }),
    };
  },
  check(item, params, at) {
    const places = readPlaceCode(item.prompt.big);
    if (places === null) {
      fail(at, `cannot read the prompt "${item.prompt.big}" as places`);
      return;
    }
    const text = places.join('');
    if (places.length !== params.digits || !zeroRule(text, params.zeroIn)) {
      fail(
        at,
        `"${item.prompt.big}" is not a ${String(params.digits)}-digit number with zeros ${params.zeroIn}`,
      );
    }
    if (Number(text) !== item.answer) {
      fail(at, `"${item.prompt.big}" is ${text}, not ${String(item.answer)}`);
    }
    if (item.maxDigits !== params.digits + 1) {
      fail(at, `maxDigits ${String(item.maxDigits)} should be ${String(params.digits + 1)}`);
    }
    const appended = appendText(text);
    const expected: readonly ValueReason[] = [
      ...(swapAt(text, text.length - 2) === text
        ? []
        : [{ value: Number(swapAt(text, text.length - 2)), text: bugRef('swap') }]),
      ...(appended !== null && appended.length <= params.digits + 1
        ? [{ value: Number(appended), text: bugRef('append') }]
        : []),
    ];
    if (
      !sameEntries(
        item.reasons ?? [],
        expected,
        (reason) => `${String(reason.value)} ${reason.text}`,
      )
    ) {
      fail(
        at,
        `reasons ${JSON.stringify(item.reasons ?? [])} should be ${JSON.stringify(expected)}`,
      );
    }
  },
};

// ---------------------------------------------------------------------------------------------------------------------
// pv-which

const pvWhichParams = pvReadParams;

export type PvWhichParams = z.output<typeof pvWhichParams>;

interface Distractor {
  readonly value: number;
  readonly bug: BugId;
}

/** The two wrong numerals: the tens / ones `swap`, then `append` (a zero place, if it fits) or else the hundreds / tens `swap`; `null`
 * when the three numbers would not be distinct. */
function whichDistractors(places: readonly number[]): readonly Distractor[] | null {
  const swapped = swapTensOnes(places);
  const appended = appendPlaces(places);
  const second: Distractor =
    appended !== null && String(appended).length <= MAX_APPEND_DIGITS
      ? { value: appended, bug: 'append' }
      : { value: swapHundredsTens(places), bug: 'swap' };
  const all = new Set([valueOf(places), swapped, second.value]);
  return all.size === 3 ? [{ value: swapped, bug: 'swap' }, second] : null;
}

const OPTION_IDS = ['a', 'b', 'c'] as const;

/** Pick the numeral of "2 hundreds, 0 tens and 5 ones" among 3 (the card also shows "2H 0T 5O"): the answer and the two wrong
 * numerals of their bugs, in a shuffled order. */
export const pvWhich: ExerciseTemplate<PvWhichParams, ChoiceItem> = {
  params: pvWhichParams,
  generate({ digits, zeroIn }, ctx) {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const places = drawDigits(ctx.random, digits, zeroIn);
      const wrong = whichDistractors(places);
      if (wrong === null) continue;
      const entries = shuffle(
        [
          { value: valueOf(places), reason: undefined },
          ...wrong.map(({ value, bug }) => ({ value, reason: bugRef(bug) })),
        ],
        ctx.random,
      );
      const options = entries.map(({ value, reason }, index) => ({
        id: OPTION_IDS[index] ?? 'x',
        big: numeral(value),
        ...(reason === undefined ? {} : { reason }),
      }));
      const answer = options.find((_option, index) => entries[index]?.reason === undefined);
      return {
        id: ctx.id,
        type: 'choice',
        text: ctx.text(
          'text',
          digits === 3 ? 'templates.pv-which' : 'templates.pv-which-4',
          placeVars(places),
        ),
        prompt: { big: placeCode(places) },
        options,
        answer: answer?.id ?? 'a',
      };
    }
    throw new Error('no distinct wrong numerals found in 100 draws');
  },
  check(item, params, at) {
    const places = readPlaceCode(item.prompt?.big ?? '');
    if (places === null) {
      fail(at, `cannot read the prompt "${item.prompt?.big ?? ''}" as places`);
      return;
    }
    const text = places.join('');
    if (places.length !== params.digits || !zeroRule(text, params.zeroIn)) {
      fail(
        at,
        `"${item.prompt?.big ?? ''}" is not a ${String(params.digits)}-digit number with zeros ${params.zeroIn}`,
      );
    }
    const values = item.options.map((option) => parseNumeral(option.big));
    if (values.length !== 3 || values.includes(null) || new Set(values).size !== 3) {
      fail(
        at,
        `the options ${JSON.stringify(item.options.map((option) => option.big))} are not 3 distinct numerals`,
      );
      return;
    }
    const right = item.options.filter((_option, index) => values[index] === Number(text));
    if (right.length !== 1 || right[0]?.id !== item.answer) {
      fail(
        at,
        `exactly the option "${item.answer}" should show ${text}, found ${String(right.length)} that do`,
      );
    }
    if (right[0]?.reason !== undefined) {
      fail(at, `the right option ${item.answer} has a reason`);
    }
    const appended = appendText(text);
    const expected: readonly string[] = [
      `${swapAt(text, text.length - 2)} ${bugRef('swap')}`,
      appended !== null && appended.length <= MAX_APPEND_DIGITS
        ? `${appended} ${bugRef('append')}`
        : `${swapAt(text, text.length - 3)} ${bugRef('swap')}`,
    ];
    const found = item.options
      .filter((option) => option.id !== item.answer)
      .map((option) => `${String(parseNumeral(option.big))} ${option.reason ?? '(none)'}`);
    if (JSON.stringify([...found].sort()) !== JSON.stringify([...expected].sort())) {
      fail(at, `the wrong options ${JSON.stringify(found)} should be ${JSON.stringify(expected)}`);
    }
  },
};

// ---------------------------------------------------------------------------------------------------------------------
// pv-expanded

const pvExpandedParams = z.object({ digits: digitsParam }).strict();

export type PvExpandedParams = z.output<typeof pvExpandedParams>;

/** "3000 + 400 + 5": the number with exactly one zero place, not the leading one, left out of the sum. */
export const pvExpanded: ExerciseTemplate<PvExpandedParams, NumberEntryItem> = {
  params: pvExpandedParams,
  generate({ digits }, ctx) {
    const zeroAt = randomInt(ctx.random, 1, digits - 1);
    const places = Array.from({ length: digits }, (_unused, index) =>
      index === zeroAt ? 0 : randomInt(ctx.random, 1, 9),
    );
    const parts = places.flatMap((digit, index) =>
      digit === 0 ? [] : [String(digit * 10 ** (digits - 1 - index))],
    );
    return {
      id: ctx.id,
      type: 'number-entry',
      text: ctx.text('text', 'templates.pv-expanded'),
      prompt: { big: parts.join(' + ') },
      answer: valueOf(places),
      reasons: [{ value: dropZero(places), text: bugRef('drop-zero') }],
    };
  },
  check(item, params, at) {
    const parts = item.prompt.big.split(' + ');
    const shape = parts.every((part) => /^[1-9]0*$/.test(part));
    const lengths = parts.map((part) => part.length);
    if (
      !shape ||
      lengths.some((length, index) => index > 0 && length >= (lengths[index - 1] ?? 0))
    ) {
      fail(at, `"${item.prompt.big}" is not a sum of place values, highest first`);
      return;
    }
    const sum = parts.reduce((total, part) => total + Number(part), 0);
    if (sum !== item.answer) {
      fail(at, `"${item.prompt.big}" is ${String(sum)}, not ${String(item.answer)}`);
    }
    const text = String(item.answer);
    if (text.length !== params.digits || text.slice(1).split('0').length !== 2) {
      fail(
        at,
        `${text} is not a ${String(params.digits)}-digit number with exactly one zero place after the first`,
      );
    }
    const dropped = Number(text.replaceAll('0', ''));
    const expected: readonly ValueReason[] = [{ value: dropped, text: bugRef('drop-zero') }];
    if (
      !sameEntries(
        item.reasons ?? [],
        expected,
        (reason) => `${String(reason.value)} ${reason.text}`,
      )
    ) {
      fail(
        at,
        `reasons ${JSON.stringify(item.reasons ?? [])} should be ${JSON.stringify(expected)}`,
      );
    }
  },
};
