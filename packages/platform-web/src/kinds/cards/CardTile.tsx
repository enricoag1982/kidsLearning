import type { JSX } from 'react';
import type { CardItem } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import { usePack } from '../../app/subject.ts';
import { animalImage } from '../../ui/art/animal-images.ts';

export interface CardTileProps {
  readonly item: CardItem;
  /** The item's text, resolved by the caller; a tile whose host draws the text itself (choice options) passes none. */
  readonly text?: string;
}

/** One card's face: its emoji, big text and image over its text. The drawn parts are `aria-hidden`: the host names the tile
 * (`cardItemLabel`). */
export function CardTile({ item, text }: CardTileProps): JSX.Element {
  const pack = usePack();
  return (
    <span className="flex flex-col items-center justify-center gap-1">
      {item.image !== undefined && (
        <img
          src={animalImage(item.image, pack.art)}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="h-12 w-12 object-contain"
        />
      )}
      {item.emoji !== undefined && (
        <span aria-hidden="true" className="text-5xl leading-none">
          {item.emoji}
        </span>
      )}
      {item.big !== undefined && (
        <span aria-hidden="true" className="font-display text-4xl font-bold">
          {item.big}
        </span>
      )}
      {text !== undefined && <span className="text-center text-sm font-semibold">{text}</span>}
    </span>
  );
}
