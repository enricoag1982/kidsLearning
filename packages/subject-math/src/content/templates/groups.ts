// W3 equal-groups templates (docs/subjects/math/curriculum.md §3): `groups` ("3 groups of 4": how many in all?) and `groups-choice`
// (which sum shows 3 groups of 4?). Bug `add-factors` (3 + 4 instead of 3 × 4); `neighbour` for a repeated sum with one group too
// many or too few. The card prompt's `emoji` holds 16 UTF-16 units (8 emoji): too few to draw the groups, so `groups` shows the
// words "3 groups of 4" with one emoji of the thing counted over them.
import { pick, randomInt, shuffle } from '@learn/platform-core/domain/random';
import type { ExerciseTemplate } from '@learn/platform-content/generate/template';
import { z } from 'zod';
import { addFactors, bugRef } from './bugs.ts';
import { fail, sameEntries } from './draw.ts';
import type { BigOption, ChoiceItem, PictureNumberEntryItem, ValueReason } from './items.ts';

/** The things counted, by a fixed function of the numbers (the same exercise always looks the same, so the expander can tell a
 * repeat from a new one). */
const THINGS = ['🍎', '🍪', '🐞', '⭐', '🌸', '🐟', '🍓', '🎈'] as const;

/** "3 groups of 4" as a card prints it. */
function groupsText(k: number, n: number): string {
  return `${String(k)} groups of ${String(n)}`;
}

/** The numbers of "3 groups of 4", or `null`. */
function readGroups(text: string): { readonly k: number; readonly n: number } | null {
  const found = /^(\d+) groups of (\d+)$/.exec(text);
  return found === null ? null : { k: Number(found[1]), n: Number(found[2]) };
}

/** The most terms of a sum on an option card: "4 + 4 + 4 + 4" is 13 of the 16 characters a card holds, five terms would be 17. */
const MAX_TERMS = 4;

/** `n` written `terms` times with plus signs: 4, 3 → "4 + 4 + 4". */
function sumOf(n: number, terms: number): string {
  return Array.from({ length: terms }, () => String(n)).join(' + ');
}

// ---------------------------------------------------------------------------------------------------------------------
// groups

const groupsParams = z
  .object({
    maxGroups: z.number().int().min(3).max(5),
    maxSize: z.number().int().min(3).max(5),
  })
  .strict();

export type GroupsParams = z.output<typeof groupsParams>;

/** "3 groups of 4": how many in all? 2 to `maxGroups` groups of 2 to `maxSize`; the added factors (3 + 4) speak `add-factors`, unless
 * they make the answer too (2 groups of 2). */
export const groups: ExerciseTemplate<GroupsParams, PictureNumberEntryItem> = {
  params: groupsParams,
  generate({ maxGroups, maxSize }, ctx) {
    const k = randomInt(ctx.random, 2, maxGroups);
    const n = randomInt(ctx.random, 2, maxSize);
    const answer = k * n;
    const reasons: readonly ValueReason[] =
      addFactors(k, n) === answer ? [] : [{ value: addFactors(k, n), text: bugRef('add-factors') }];
    return {
      id: ctx.id,
      type: 'number-entry',
      text: ctx.text('text', 'templates.groups'),
      prompt: { emoji: THINGS[(3 * k + n) % THINGS.length] ?? '🍎', big: groupsText(k, n) },
      answer,
      ...(reasons.length === 0 ? {} : { reasons }),
    };
  },
  check(item, params, at) {
    const read = readGroups(item.prompt.big);
    if (read === null) {
      fail(at, `cannot read the prompt "${item.prompt.big}" as "k groups of n"`);
      return;
    }
    const { k, n } = read;
    if (k < 2 || k > params.maxGroups || n < 2 || n > params.maxSize) {
      fail(
        at,
        `"${item.prompt.big}" does not fit 2-${String(params.maxGroups)} groups of 2-${String(params.maxSize)}`,
      );
    }
    // Add n, k times.
    let total = 0;
    for (let group = 0; group < k; group += 1) total += n;
    if (item.answer !== total) {
      fail(at, `${item.prompt.big} is ${String(total)}, not ${String(item.answer)}`);
    }
    if (item.prompt.emoji === '') {
      fail(at, 'the picture is empty');
    }
    const expected: readonly ValueReason[] =
      k + n === total ? [] : [{ value: k + n, text: 'bugs.add-factors' }];
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
// groups-choice

// A sum card holds four terms, so up to 4 groups of up to 4 (the group count of "5 groups of 5" would need 17 characters).
const groupsChoiceParams = z
  .object({
    maxGroups: z.number().int().min(3).max(MAX_TERMS),
    maxSize: z.number().int().min(3).max(MAX_TERMS),
  })
  .strict();

export type GroupsChoiceParams = z.output<typeof groupsChoiceParams>;

const OPTION_IDS = ['a', 'b', 'c'] as const;

/** The sum of the wrong count (one group more, or one fewer when that is too many terms) for equal numbers of groups and members. */
function wrongCount(k: number): number {
  return k + 1 <= MAX_TERMS ? k + 1 : k - 1;
}

/** Which sum shows k groups of n? The sum of k n's, the added factors `k + n` (`add-factors`), and the n's and k's the other way round
 * (4 groups of 3: nothing spoken but the wrong-answer note) or, with k = n, the same number written one time too many or too few
 * (`neighbour`). 2 groups of 2 would show the same sum twice and is never drawn. */
export const groupsChoice: ExerciseTemplate<GroupsChoiceParams, ChoiceItem> = {
  params: groupsChoiceParams,
  generate({ maxGroups, maxSize }, ctx) {
    const pairs: { k: number; n: number }[] = [];
    for (let k = 2; k <= maxGroups; k += 1) {
      for (let n = 2; n <= maxSize; n += 1) {
        if (k !== 2 || n !== 2) pairs.push({ k, n });
      }
    }
    const { k, n } = pick(ctx.random, pairs);
    // The right sum, the added factors, and the third (see above); the reasons go with the wrong ones.
    const entries = shuffle<{
      readonly big: string;
      readonly reason?: string;
      readonly right?: true;
    }>(
      [
        { big: sumOf(n, k), right: true },
        { big: `${String(k)} + ${String(n)}`, reason: bugRef('add-factors') },
        k === n
          ? { big: sumOf(n, wrongCount(k)), reason: bugRef('neighbour') }
          : { big: sumOf(k, n) },
      ],
      ctx.random,
    );
    const options: readonly BigOption[] = entries.map(({ big, reason }, index) => ({
      id: OPTION_IDS[index] ?? 'x',
      big,
      ...(reason === undefined ? {} : { reason }),
    }));
    return {
      id: ctx.id,
      type: 'choice',
      text: ctx.text('text', 'templates.groups-choice', { k, n }),
      prompt: { big: groupsText(k, n) },
      options,
      answer: options[entries.findIndex((entry) => entry.right === true)]?.id ?? 'a',
    };
  },
  check(item, params, at) {
    const read = readGroups(item.prompt?.big ?? '');
    if (read === null) {
      fail(at, `cannot read the prompt "${item.prompt?.big ?? ''}" as "k groups of n"`);
      return;
    }
    const { k, n } = read;
    if (k < 2 || k > params.maxGroups || n < 2 || n > params.maxSize || (k === 2 && n === 2)) {
      fail(at, `"${item.prompt?.big ?? ''}" does not fit the params`);
    }
    // A sum is a list of terms: the options as numbers, so "4 + 4 + 4" is three 4s whatever the spaces.
    const terms = item.options.map((option) => option.big.split(' + ').map(Number));
    if (
      item.options.length !== 3 ||
      terms.some((list) => list.length < 2 || list.length > MAX_TERMS || list.some(Number.isNaN)) ||
      new Set(item.options.map((option) => option.big)).size !== 3
    ) {
      fail(
        at,
        `the options ${JSON.stringify(item.options.map((option) => option.big))} are not 3 distinct sums of 2-${String(MAX_TERMS)} numbers`,
      );
      return;
    }
    // "k groups of n" is k terms that are all n.
    const showing = item.options.filter((_option, index) => {
      const list = terms[index] ?? [];
      return list.length === k && list.every((term) => term === n);
    });
    if (showing.length !== 1 || showing[0]?.id !== item.answer) {
      fail(
        at,
        `exactly the option "${item.answer}" should show ${String(k)} groups of ${String(n)}, found ${String(showing.length)} that do`,
      );
    }
    const found = item.options
      .filter((option) => option.id !== item.answer)
      .map((option) => `${option.big} ${option.reason ?? '(none)'}`);
    const added = `${String(k)} + ${String(n)} bugs.add-factors`;
    const other =
      k === n
        ? `${sumOf(n, k < MAX_TERMS ? k + 1 : k - 1)} bugs.neighbour`
        : `${sumOf(k, n)} (none)`;
    if (JSON.stringify([...found].sort()) !== JSON.stringify([added, other].sort())) {
      fail(
        at,
        `the wrong options ${JSON.stringify(found)} should be ${JSON.stringify([added, other])}`,
      );
    }
    if (showing[0]?.reason !== undefined) {
      fail(at, `the right option ${item.answer} has a reason`);
    }
  },
};
