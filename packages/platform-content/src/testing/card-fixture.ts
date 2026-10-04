// A tiny subject made only of YAML (`card-subject/`) that uses all four card kinds: what the card kit's own tests and the
// platform-web App-flow test compile through `createCardContent`. One lesson entry and one series round are generated
// (`fixture-add`): the build-time expansion's own fixture (`generate/expand.test.ts`).
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomInt } from '@learn/platform-core/domain/random';
import { z } from 'zod';
import type { AnyExerciseTemplate, ExerciseTemplate } from '../generate/template.ts';
import type { ExerciseYamlBase } from '../subject.ts';

/** The fixture's content root: `lessons/`, `minigames/`, `locales/`, `tracks.yaml`, `badges.yaml`. */
export const CARD_FIXTURE_ROOT = join(dirname(fileURLToPath(import.meta.url)), 'card-subject');

/** The fixture's lesson characters (one source for `createCardCore` and `createCardContent`). */
export const CARD_FIXTURE_CHARACTERS = { fox: { topicKey: 'topic.fox' } } as const;

/** A generated `a + b` number-entry item, as the YAML would spell it. */
export interface FixtureAddItem extends ExerciseYamlBase {
  readonly type: 'number-entry';
  readonly text: string;
  readonly prompt: { readonly big: string };
  readonly answer: number;
  /** The off-by-one misconception (`a + b + 1`), when it fits the pad. */
  readonly reasons?: readonly { readonly value: number; readonly text: string }[];
}

export interface FixtureAddParams {
  /** Largest sum (2–20); both addends are 1 … max − 1. */
  readonly max: number;
}

const SUM_PROMPT = /^(\d+) \+ (\d+)$/;

/** `a + b` with a, b in 1 … max − 1 and a + b ≤ max; the text is `templates.fixture-add` ("What is {{a}} plus {{b}}?").
 * The wrong answer `a + b + 1` (one jump too many) speaks `bugs.off-by-one` (a reason, `docs/adding-a-subject.md` §6). */
export const fixtureAdd: ExerciseTemplate<FixtureAddParams, FixtureAddItem> = {
  params: z.object({ max: z.number().int().min(2).max(20) }).strict(),
  generate({ max }, ctx) {
    let a: number;
    let b: number;
    do {
      a = randomInt(ctx.random, 1, max - 1);
      b = randomInt(ctx.random, 1, max - 1);
    } while (a + b > max);
    const sum = a + b;
    // The pad's default width: the answer's own digits, at least 2.
    const fits = String(sum + 1).length <= Math.max(2, String(sum).length);
    return {
      id: ctx.id,
      type: 'number-entry',
      text: ctx.text('text', 'templates.fixture-add', { a, b }),
      prompt: { big: `${String(a)} + ${String(b)}` },
      answer: sum,
      ...(fits ? { reasons: [{ value: sum + 1, text: 'bugs.off-by-one' }] } : {}),
    };
  },
  check(item, _params, at) {
    const match = SUM_PROMPT.exec(item.prompt.big);
    if (match === null) {
      at.issues.push(`${at.where}: cannot read the prompt "${item.prompt.big}" as a sum`);
      return;
    }
    const sum = Number(match[1]) + Number(match[2]);
    if (sum !== item.answer) {
      at.issues.push(
        `${at.where}: "${item.prompt.big}" is ${String(sum)}, not ${String(item.answer)}`,
      );
    }
  },
};

/** The fixture's templates (`createCardContent({ templates })`). */
export const CARD_FIXTURE_TEMPLATES: Readonly<Record<string, AnyExerciseTemplate>> = {
  'fixture-add': fixtureAdd,
};
