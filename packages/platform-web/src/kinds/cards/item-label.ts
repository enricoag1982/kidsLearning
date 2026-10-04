import type { CardItem } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';

/** `ice-cream` → `ice cream`: the last resort name of a card that shows only a picture. */
export function humanize(id: string): string {
  return id.replaceAll('-', ' ');
}

/** The accessible name of a card: its text, else its big text, else its emoji, else its id as words. The drawn parts of the
 * card are `aria-hidden`, so this is the one name a screen reader (and an e2e driver) finds. */
export function cardItemLabel(item: CardItem, text: (key: string) => string): string {
  if (item.textKey !== undefined) return text(item.textKey);
  return item.big ?? item.emoji ?? humanize(item.id);
}
