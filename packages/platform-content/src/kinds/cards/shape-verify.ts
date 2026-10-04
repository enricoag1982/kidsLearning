// The card kit's shape rules over a compiled exercise (or demo): a prompt row has 1-8 tokens and at most one `gap`, and no two
// tokens of the exercise (prompt row and item shapes together) differ only in a confusable colour (`shape-colours.ts`).
import type {
  CardItem,
  CardPrompt,
  CardShape,
} from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import {
  DEFAULT_SHAPE_COUNT,
  DEFAULT_SHAPE_SIZE,
  MAX_PROMPT_SHAPES,
} from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import { confusableColours } from './shape-colours.ts';

/** The def fields the rules read: `prompt`, and the card items of a choice (`options`) or an order (`items`) exercise. */
interface ShapeCarrier {
  readonly prompt?: CardPrompt;
  readonly options?: readonly CardItem[];
  readonly items?: readonly CardItem[];
}

function shapeName(shape: CardShape): string {
  const size = shape.size ?? DEFAULT_SHAPE_SIZE;
  const count = shape.count ?? DEFAULT_SHAPE_COUNT;
  return `${shape.colour} ${shape.kind}${size === DEFAULT_SHAPE_SIZE ? '' : `, ${size}`}${count === DEFAULT_SHAPE_COUNT ? '' : `, ×${String(count)}`}`;
}

function sameButColour(a: CardShape, b: CardShape): boolean {
  return (
    a.kind === b.kind &&
    (a.size ?? DEFAULT_SHAPE_SIZE) === (b.size ?? DEFAULT_SHAPE_SIZE) &&
    (a.count ?? DEFAULT_SHAPE_COUNT) === (b.count ?? DEFAULT_SHAPE_COUNT)
  );
}

/** Issues of one prompt row: 1-8 tokens, at most one `gap`. */
function verifyRow(row: NonNullable<CardPrompt['shapes']>, where: string, issues: string[]): void {
  if (row.length < 1 || row.length > MAX_PROMPT_SHAPES) {
    issues.push(
      `${where}: shapes has ${String(row.length)} tokens, needs 1 to ${String(MAX_PROMPT_SHAPES)}`,
    );
  }
  const gaps = row.filter((token) => token === 'gap').length;
  if (gaps > 1) {
    issues.push(`${where}: shapes has ${String(gaps)} "gap" tokens, at most 1`);
  }
}

/** Issues of the exercise's tokens: no two differ only in a confusable colour. */
function verifyColours(tokens: readonly CardShape[], where: string, issues: string[]): void {
  for (const [index, a] of tokens.entries()) {
    for (const b of tokens.slice(index + 1)) {
      if (sameButColour(a, b) && confusableColours(a.colour, b.colour)) {
        issues.push(
          `${where}: shapes "${shapeName(a)}" and "${shapeName(b)}" differ only in colour (${a.colour} / ${b.colour} look alike to many children): change the kind, size or count too`,
        );
      }
    }
  }
}

/** Every shape rule for one exercise def or demo (anything that may carry `prompt`, `options` or `items`). */
export function verifyCardShapes(def: object, where: string, issues: string[]): void {
  // One trust point: a card def is read through the fields the shape rules look at, the rest is ignored.
  const { prompt, options, items } = def as ShapeCarrier;
  const row = prompt?.shapes;
  if (row !== undefined) verifyRow(row, where, issues);
  const tokens = [
    ...(row ?? []).filter((token): token is CardShape => token !== 'gap'),
    ...[...(options ?? []), ...(items ?? [])].flatMap((item) =>
      item.shape === undefined ? [] : [item.shape],
    ),
  ];
  verifyColours(tokens, where, issues);
}
