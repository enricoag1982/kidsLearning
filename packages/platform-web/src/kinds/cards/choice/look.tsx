import type { CardItem } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import type { ChoiceLook } from '../../choice/ChoiceOptions.tsx';
import { CardTile } from '../CardTile.tsx';
import { cardItemLabel } from '../item-label.ts';

/** A card option: its emoji / big text / image as the tile face (the host adds the text), named by `cardItemLabel` when it
 * has no text; tiles at least 80 px tall. */
export const CARD_CHOICE_LOOK: ChoiceLook<CardItem> = {
  tileClass: 'min-h-20',
  visual: (item) => <CardTile item={item} />,
  label: (item, text) => cardItemLabel(item, text),
};
