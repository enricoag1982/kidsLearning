// The W2 story-problem template (docs/subjects/math/curriculum.md §3): an authored sentence (`lessons.yaml` `stories.<frame>-<n>`,
// two numbers `{{a}}` and `{{b}}`) of one of four frames, answered by the frame's operation: `part-whole` and `change-add` add,
// `change-take` and `compare` subtract (a comparison asks "how many more", a subtraction). The other operation's result is the
// `wrong-op` reason. The card is text only, and the generated sentence is not available to `check`, which therefore re-derives
// the two numbers from the answer and the reason (their sum and difference); the tests solve every item from its English sentence.
import { pick, randomInt, type Random } from '@learn/platform-core/domain/random';
import type { ExerciseTemplate } from '@learn/platform-content/generate/template';
import { z } from 'zod';
import { checkReasons, entryFields } from './arithmetic.ts';
import { wrongOperation } from './bugs.ts';
import { fail } from './draw.ts';
import type { NumberEntryItem } from './items.ts';

/** A story card: the text and the pad, no picture. */
export type StoryItem = Omit<NumberEntryItem, 'prompt'>;

export const STORY_FRAMES = ['part-whole', 'change-add', 'change-take', 'compare'] as const;

export type StoryFrame = (typeof STORY_FRAMES)[number];

/** How many authored stories each frame has: `stories.<frame>-1 … stories.<frame>-4`. */
export const STORIES_PER_FRAME = 4;

/** The text key of the `n`th (from 1) story of `frame`. */
export function storyKey(frame: StoryFrame, n: number): string {
  return `stories.${frame}-${String(n)}`;
}

/** Whether the frame adds (part-whole, change-add) or subtracts. */
function adds(frame: StoryFrame): boolean {
  return frame === 'part-whole' || frame === 'change-add';
}

const storyParams = z
  .object({ frame: z.enum(STORY_FRAMES), max: z.number().int().min(20).max(100) })
  .strict();

export type StoryParams = z.output<typeof storyParams>;

/** An addition story: two different numbers of at least 2 that add up to at most `max`. */
function drawAddends(random: Random, max: number): readonly [number, number] {
  const a = randomInt(random, 2, max - 2);
  const b = pick(
    random,
    Array.from({ length: max - a - 1 }, (_unused, index) => index + 2).filter((n) => n !== a),
  );
  return [a, b];
}

/** A subtraction story: the larger number up to `max` and a smaller one at least 2 and 2 below it. */
function drawMinuend(random: Random, max: number): readonly [number, number] {
  const a = randomInt(random, 5, max);
  return [a, randomInt(random, 2, a - 2)];
}

/** One story of the frame with its two numbers (`a` is the larger of a comparison; the sentence says where each goes). */
export const story: ExerciseTemplate<StoryParams, StoryItem> = {
  params: storyParams,
  generate({ frame, max }, ctx) {
    const [a, b] = adds(frame) ? drawAddends(ctx.random, max) : drawMinuend(ctx.random, max);
    const key = storyKey(frame, randomInt(ctx.random, 1, STORIES_PER_FRAME));
    return {
      id: ctx.id,
      type: 'number-entry',
      text: ctx.text('text', key, { a, b }),
      ...entryFields(adds(frame) ? a + b : a - b, [
        { value: wrongOperation(a, b, adds(frame)), bug: 'wrong-op' },
      ]),
    };
  },
  check(item, params, at) {
    const reason = item.reasons?.[0];
    if (item.reasons?.length !== 1 || reason === undefined) {
      fail(at, 'a story needs exactly one reason: wrong-op');
      return;
    }
    // Addition: answer a + b, wrong |a - b|. Subtraction: answer a - b (a the larger), wrong a + b. Either way the pair determines a, b.
    const [sum, difference] = adds(params.frame)
      ? [item.answer, reason.value]
      : [reason.value, item.answer];
    const [larger, smaller] = [(sum + difference) / 2, (sum - difference) / 2];
    const wholeNumbers = Number.isInteger(larger) && Number.isInteger(smaller);
    const fits = adds(params.frame)
      ? difference >= 1 && sum <= params.max
      : difference >= 2 && larger <= params.max && larger >= 5;
    if (!wholeNumbers || smaller < 2 || difference >= sum || !fits) {
      fail(
        at,
        `answer ${String(item.answer)} and wrong-op ${String(reason.value)} are not the two results of two numbers in a ${params.frame} story up to ${String(params.max)}`,
      );
      return;
    }
    checkReasons(
      item,
      [{ value: wrongOperation(larger, smaller, adds(params.frame)), bug: 'wrong-op' }],
      at,
    );
  },
};
