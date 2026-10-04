import type { CardItem, CardShape } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import { DEFAULT_SHAPE_SIZE } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import type { ContentText } from '../../content-text.ts';

/** `ice-cream` → `ice cream`: the last resort name of a card that shows only a picture. */
export function humanize(id: string): string {
  return id.replaceAll('-', ' ');
}

/** The name of a shape token: `3 small red circles`, `blue square` (no number for one, no size word for the default `big`). The
 * words and their order are the locale's (`cards.shape.*`). */
export function shapeLabel(text: ContentText, shape: CardShape): string {
  const count = shape.count ?? 1;
  const size = shape.size ?? DEFAULT_SHAPE_SIZE;
  return text('cards.shape.label', {
    number: count > 1 ? String(count) : '',
    size: size === DEFAULT_SHAPE_SIZE ? '' : text(`cards.shape.size.${size}`),
    colour: text(`cards.shape.colour.${shape.colour}`),
    kind: text(`cards.shape.kind.${shape.kind}`, { count }),
  })
    .replaceAll(/\s+/g, ' ')
    .trim();
}

/** The name of a prompt's row of shapes: every token's label, a gap as "a gap", joined with ", ". */
export function shapeRowLabel(text: ContentText, shapes: readonly (CardShape | 'gap')[]): string {
  return text('cards.shape.row', {
    tokens: shapes
      .map((token) => (token === 'gap' ? text('cards.shape.gap') : shapeLabel(text, token)))
      .join(', '),
  });
}

/** The accessible name of a card: its text, else its big text, else its shape, else its emoji, else its id as words. The drawn
 * parts of the card are `aria-hidden`, so this is the one name a screen reader (and an e2e driver) finds. */
export function cardItemLabel(item: CardItem, text: ContentText): string {
  if (item.textKey !== undefined) return text(item.textKey);
  if (item.big !== undefined) return item.big;
  if (item.shape !== undefined) return shapeLabel(text, item.shape);
  return item.emoji ?? humanize(item.id);
}
