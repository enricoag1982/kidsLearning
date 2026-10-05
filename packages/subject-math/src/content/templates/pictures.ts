// The card pictures W1-W3 templates draw (card kit prompt fields): the clusters of "3 groups of 4" and the small number line of
// `round-ten` / `bridge-add`. A picture is a fixed function of the numbers the template already drew (never another draw from
// `ctx.random`: that would move every later item of the entry, and the expander tells a repeat by the whole item), and each
// template's `check` re-derives it from the card's numbers.
import type { CardLine } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import {
  MAX_SHAPE_COUNT,
  SHAPE_COLOURS,
  SHAPE_KINDS,
} from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import type { Where } from '@learn/platform-content/subject';
import { fail } from './draw.ts';
import type { GroupCluster } from './items.ts';

/** Most groups a picture draws: the prompt row holds 8 tokens, the curriculum never asks for more than 5 groups. */
export const MAX_DRAWN_GROUPS = 5;
/** Most things in a group: the card kit's cluster (3 × 3). */
export const MAX_DRAWN_GROUP_SIZE = MAX_SHAPE_COUNT;

/** The thing counted in "k groups of n", by a fixed function of the numbers (the same exercise always looks the same, so the
 * expander can tell a repeat from a new one): one kind and one colour for all the groups of the item. */
export function groupKindAndColour(k: number, n: number): Pick<GroupCluster, 'kind' | 'colour'> {
  return {
    kind: SHAPE_KINDS[(3 * k + n) % SHAPE_KINDS.length] ?? 'circle',
    colour: SHAPE_COLOURS[(k + 2 * n) % SHAPE_COLOURS.length] ?? 'red',
  };
}

/** "k groups of n" drawn: `k` clusters of `n` shapes. */
export function groupClusters(k: number, n: number): readonly GroupCluster[] {
  const { kind, colour } = groupKindAndColour(k, n);
  return Array.from({ length: k }, () => ({ kind, colour, count: n }));
}

/** Pushes an issue unless `clusters` draws k groups of n: k clusters, each of n, all one kind and colour. */
export function checkGroupClusters(
  clusters: readonly GroupCluster[] | undefined,
  k: number,
  n: number,
  at: Where,
): void {
  const drawn = clusters ?? [];
  if (drawn.length !== k || drawn.some((cluster) => cluster.count !== n)) {
    fail(
      at,
      `the picture shows ${JSON.stringify(drawn.map((cluster) => cluster.count))} but the card says ${String(k)} groups of ${String(n)}`,
    );
  }
  const first = drawn[0];
  if (
    first === undefined ||
    drawn.some((cluster) => cluster.kind !== first.kind || cluster.colour !== first.colour)
  ) {
    fail(at, 'the picture needs one kind and one colour for all the groups');
  }
}

/** A number line with a tick for every whole number (the pictures never skip count). */
export function wholeNumberLine(from: number, to: number, marks: readonly number[]): CardLine {
  return { from, to, step: 1, marks };
}

/** The card's line, or `undefined` for a hand-broken item without one (typed as optional so the checks read it as such). */
export function lineOf(item: {
  readonly prompt: { readonly line?: CardLine };
}): CardLine | undefined {
  return item.prompt.line;
}

/** Pushes an issue unless the card's line is exactly `expected`. */
export function checkLine(line: CardLine | undefined, expected: CardLine, at: Where): void {
  if (line === undefined) {
    fail(at, `the card has no number line (expected ${JSON.stringify(expected)})`);
  } else if (JSON.stringify(line) !== JSON.stringify(expected)) {
    fail(at, `the number line ${JSON.stringify(line)} should be ${JSON.stringify(expected)}`);
  }
}
