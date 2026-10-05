import type { CardItem } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import type { ChoiceLook } from '../../choice/ChoiceOptions.tsx';
import { CardTile } from '../CardTile.tsx';
import { cardItemLabel } from '../item-label.ts';

/** A card option: its emoji / big text / image / shape as the tile face (the host adds the text), named by `cardItemLabel` when it
 * has no text; tiles at least 80 px tall, the face about twice as big in a large tile. */
export const CARD_CHOICE_LOOK: ChoiceLook<CardItem> = {
  tileClass: 'min-h-20',
  visual: (item, size) => <CardTile item={item} large={size === 'large'} />,
  label: (item, text) => cardItemLabel(item, text),
};
