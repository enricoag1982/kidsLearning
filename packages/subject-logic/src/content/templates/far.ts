// W1 far-term template (docs/subjects/logic/curriculum.md §3): `far-term` ("Which shape is number 12?"). The row shows two full units
// of an AB or ABC pattern; the child names the token at a place far beyond the row by counting in whole units. The options are the
// unit's tokens. Reason `far-off`: the token one place before or after. The place is part of the option ids (`p12-a`): the
// generated sentence is out of the `check`'s sight, and the ids carry what it names.
import { randomInt, shuffle } from '@learn/platform-core/domain/random';
import type { CardShape } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import type { ExerciseTemplate } from '@learn/platform-content/generate/template';
import { z } from 'zod';
import { bugRef } from './bugs.ts';
import { fail } from './draw.ts';
import type { ShapeChoiceItem, ShapeOption } from './items.ts';
import { attrParam, drawPalette, tokenKey } from './shapes.ts';

/** The units far-term uses (a symbol per place is every token once, in order). */
const FAR_UNITS = { AB: 2, ABC: 3 } as const;

const place = z.number().int().min(6).max(20);

const farParams = z
  .object({
    unit: z.enum(['AB', 'ABC']),
    attr: attrParam,
    /** The place asked for, drawn from `[min, max]` (1-based). */
    position: z.tuple([place, place]),
  })
  .strict()
  .superRefine((params, ctx) => {
    const [least, most] = params.position;
    if (least > most) {
      ctx.addIssue({
        code: 'custom',
        path: ['position'],
        message: 'position must go from the smaller to the larger',
      });
    }
    if (least <= 2 * FAR_UNITS[params.unit]) {
      ctx.addIssue({
        code: 'custom',
        path: ['position'],
        message: `the row shows ${String(2 * FAR_UNITS[params.unit])} tokens: the place must be further`,
      });
    }
  });

export type FarParams = z.output<typeof farParams>;

/** The ids of the options of the item asking for place `n`: `p<n>-a`, `p<n>-b`, … in the order shown. */
function optionId(n: number, index: number): string {
  return `p${String(n)}-${['a', 'b', 'c'][index] ?? 'x'}`;
}

/** The place an item asks for, read from its option ids (`null` unless every id is `p<n>-<letter>` of one `n`). */
export function placeOf(options: readonly { readonly id: string }[]): number | null {
  const places = new Set(options.map((option) => /^p(\d+)-[abc]$/.exec(option.id)?.[1] ?? ''));
  const [only] = places;
  return places.size === 1 && only !== undefined && only !== '' ? Number(only) : null;
}

export const farTerm: ExerciseTemplate<FarParams, ShapeChoiceItem> = {
  params: farParams,
  generate({ unit, attr, position: [least, most] }, ctx) {
    const length = FAR_UNITS[unit];
    const n = randomInt(ctx.random, least, most);
    const { values } = drawPalette(ctx.random, attr, length, false);
    const row = Array.from(
      { length: 2 * length },
      (_unused, index) => values[index % length] as CardShape,
    );
    const answer = values[(n - 1) % length] as CardShape;
    // The tokens one place off, before and after (the unit is 2 or 3 long: neither is the answer).
    const off = [values[(n - 2 + length) % length], values[n % length]].map((token) =>
      tokenKey(token as CardShape),
    );
    const shown = shuffle(values, ctx.random);
    const options = shown.map((shape, index): ShapeOption => ({
      id: optionId(n, index),
      shape,
      ...(tokenKey(shape) !== tokenKey(answer) && off.includes(tokenKey(shape))
        ? { reason: bugRef('far-off') }
        : {}),
    }));
    return {
      id: ctx.id,
      type: 'choice',
      text: ctx.text('text', 'templates.far-term', { n }),
      prompt: { shapes: row },
      options,
      answer: options.find((option) => tokenKey(option.shape) === tokenKey(answer))?.id ?? '',
    };
  },
  check(item, params, at) {
    const row = item.prompt.shapes;
    const tokens = row.filter((token): token is CardShape => token !== 'gap');
    const length = FAR_UNITS[params.unit];
    const n = placeOf(item.options);
    if (tokens.length !== row.length || row.length !== 2 * length) {
      fail(at, `the row must show 2 full units of ${String(length)} tokens, no gap`);
      return;
    }
    if (n === null) {
      fail(at, 'the option ids name no single place (p<n>-a, p<n>-b, …)');
      return;
    }
    if (n <= row.length) {
      fail(at, `place ${String(n)} is inside the ${String(row.length)} tokens shown`);
    }
    if (n < params.position[0] || n > params.position[1]) {
      fail(at, `place ${String(n)} is outside position ${params.position.join('-')}`);
    }
    const keys = tokens.map(tokenKey);
    const first = keys.slice(0, length);
    if (new Set(first).size !== length || keys.slice(length).join() !== first.join()) {
      fail(at, `the row is not 2 units of ${String(length)} different tokens`);
      return;
    }
    const optionKeys = item.options.map((option) => tokenKey(option.shape));
    if (
      optionKeys.length !== length ||
      JSON.stringify([...optionKeys].sort()) !== JSON.stringify([...first].sort())
    ) {
      fail(at, "the options must be the unit's tokens, once each");
      return;
    }
    const expected = first[(n - 1) % length];
    const answer = item.options.find((option) => option.id === item.answer);
    if (answer === undefined || tokenKey(answer.shape) !== expected) {
      fail(at, `place ${String(n)} is ${String(expected)}, not the answer card`);
    }
    const offKeys = [first[(n - 2 + length) % length], first[n % length]];
    const found = item.options.flatMap((option) =>
      option.reason === undefined ? [] : [`${option.id} ${option.reason}`],
    );
    const wanted = item.options.flatMap((option) =>
      tokenKey(option.shape) !== expected && offKeys.includes(tokenKey(option.shape))
        ? [`${option.id} ${bugRef('far-off')}`]
        : [],
    );
    if (JSON.stringify(found) !== JSON.stringify(wanted)) {
      fail(at, `reasons ${JSON.stringify(found)} should be ${JSON.stringify(wanted)}`);
    }
  },
};
