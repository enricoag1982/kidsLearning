// W3 array templates (docs/subjects/math/curriculum.md §3): `array-build` (make r rows of c dots) and `array-commute` ("3 × 4 = 4 × 3":
// is it true?). Bug `neighbour` for an array one dot too long or too short in a row; `add-factors` for "3 × 4 = 3 + 4".
import { randomInt } from '@learn/platform-core/domain/random';
import type { ExerciseTemplate } from '@learn/platform-content/generate/template';
import { z } from 'zod';
import { bugRef } from './bugs.ts';
import { fail, sameEntries } from './draw.ts';
import type { ArrayItem, ShapeReason, TrueFalseItem } from './items.ts';
import { ARRAY_MAX } from '../../kinds/array/shape.ts';

const TIMES = '×';

// ---------------------------------------------------------------------------------------------------------------------
// array-build

const arrayBuildParams = z
  .object({
    maxRows: z.number().int().min(3).max(ARRAY_MAX),
    maxCols: z.number().int().min(3).max(ARRAY_MAX),
    /** `true`: the text fixes the rows ("3 rows of 4"); `false`: "an array for 3 times 4" and 4 rows of 3 is right too. */
    fixedRows: z.boolean().default(true),
  })
  .strict();

export type ArrayBuildParams = z.output<typeof arrayBuildParams>;

/** The shapes one dot too short or too long in each row that are on the grid, each a `neighbour`. */
function neighbourShapes(rows: number, cols: number): readonly ShapeReason[] {
  return [cols - 1, cols + 1]
    .filter((count) => count >= 1 && count <= ARRAY_MAX)
    .map((count) => ({ rows, cols: count, text: bugRef('neighbour') }));
}

/** Make r rows of c dots (2 to `maxRows` rows of 2 to `maxCols`), tapping the bottom-right dot. The card shows "3 × 4". */
export const arrayBuild: ExerciseTemplate<ArrayBuildParams, ArrayItem> = {
  params: arrayBuildParams,
  generate({ maxRows, maxCols, fixedRows }, ctx) {
    const rows = randomInt(ctx.random, 2, maxRows);
    const cols = randomInt(ctx.random, 2, maxCols);
    return {
      id: ctx.id,
      type: 'array',
      text: ctx.text('text', fixedRows ? 'templates.array-build' : 'templates.array-build-free', {
        r: rows,
        c: cols,
      }),
      prompt: { big: `${String(rows)} ${TIMES} ${String(cols)}` },
      rows,
      cols,
      ...(fixedRows ? {} : { 'fixed-rows': false }),
      reasons: neighbourShapes(rows, cols),
    };
  },
  check(item, params, at) {
    const found = new RegExp(`^(\\d+) ${TIMES} (\\d+)$`).exec(item.prompt.big);
    if (found === null) {
      fail(at, `cannot read the prompt "${item.prompt.big}" as "r ${TIMES} c"`);
      return;
    }
    const [rows, cols] = [Number(found[1]), Number(found[2])];
    if (rows < 2 || rows > params.maxRows || cols < 2 || cols > params.maxCols) {
      fail(
        at,
        `${item.prompt.big} does not fit 2-${String(params.maxRows)} rows of 2-${String(params.maxCols)}`,
      );
    }
    if (item.rows !== rows || item.cols !== cols) {
      fail(
        at,
        `the card says ${item.prompt.big} but the array is ${String(item.rows)} ${TIMES} ${String(item.cols)}`,
      );
    }
    if ((item['fixed-rows'] ?? true) !== params.fixedRows) {
      fail(
        at,
        `fixed-rows is ${String(item['fixed-rows'] ?? true)}, not ${String(params.fixedRows)}`,
      );
    }
    // One dot more or fewer in each row, where the grid has it: the rows of the other way round stay a (spoken) turned array.
    const expected: ShapeReason[] = [];
    if (cols > 1) expected.push({ rows, cols: cols - 1, text: 'bugs.neighbour' });
    if (cols < ARRAY_MAX) expected.push({ rows, cols: cols + 1, text: 'bugs.neighbour' });
    if (
      !sameEntries(
        item.reasons ?? [],
        expected,
        (reason) => `${String(reason.rows)}x${String(reason.cols)} ${reason.text}`,
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
// array-commute

const arrayCommuteParams = z
  .object({
    max: z.number().int().min(3).max(10),
  })
  .strict();

export type ArrayCommuteParams = z.output<typeof arrayCommuteParams>;

/** "3 × 4 = 4 × 3" (true) or "3 × 4 = 3 + 4" (false, `add-factors`): two different factors from 2 to `max`, true half the time. */
export const arrayCommute: ExerciseTemplate<ArrayCommuteParams, TrueFalseItem> = {
  params: arrayCommuteParams,
  generate({ max }, ctx) {
    const a = randomInt(ctx.random, 2, max);
    // Any other factor, uniformly: draw from the range without `a`, then step over it.
    const drawn = randomInt(ctx.random, 2, max - 1);
    const b = drawn >= a ? drawn + 1 : drawn;
    const answer = randomInt(ctx.random, 0, 1) === 0;
    const left = `${String(a)} ${TIMES} ${String(b)}`;
    return {
      id: ctx.id,
      type: 'true-false',
      text: ctx.text('text', 'templates.array-commute'),
      prompt: {
        big: answer
          ? `${left} = ${String(b)} ${TIMES} ${String(a)}`
          : `${left} = ${String(a)} + ${String(b)}`,
      },
      answer,
      ...(answer ? {} : { reason: bugRef('add-factors') }),
    };
  },
  check(item, params, at) {
    const found = new RegExp(`^(\\d+) ${TIMES} (\\d+) = (\\d+) (${TIMES}|\\+) (\\d+)$`).exec(
      item.prompt.big,
    );
    if (found === null) {
      fail(
        at,
        `cannot read the prompt "${item.prompt.big}" as "a ${TIMES} b = c ${TIMES} d" or "a ${TIMES} b = c + d"`,
      );
      return;
    }
    const [a, b, c, d] = [found[1], found[2], found[3], found[5]].map(Number) as [
      number,
      number,
      number,
      number,
    ];
    const sign = found[4];
    if ([a, b].some((n) => n < 2 || n > params.max) || a === b) {
      fail(at, `"${item.prompt.big}" needs two different factors from 2 to ${String(params.max)}`);
    }
    // Both sides worked out: times by adding up, so it does not trust a rule like "the order does not matter".
    const times = (x: number, y: number): number => {
      let total = 0;
      for (let step = 0; step < y; step += 1) total += x;
      return total;
    };
    const right = sign === '+' ? c + d : times(c, d);
    if (item.answer !== (times(a, b) === right)) {
      fail(
        at,
        `"${item.prompt.big}" is ${String(times(a, b) === right)}, not ${String(item.answer)}`,
      );
    }
    if (sign === '+' ? c !== a || d !== b : c !== b || d !== a) {
      fail(at, `"${item.prompt.big}" is not the factors turned round or added`);
    }
    const expected = sign === '+' && !item.answer ? 'bugs.add-factors' : undefined;
    if (item.reason !== expected) {
      fail(at, `reason ${item.reason ?? '(none)'} should be ${expected ?? '(none)'}`);
    }
  },
};
