import type { JSX } from 'react';
import type { CardItem } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import { usePack } from '../../app/subject.ts';
import { animalImage } from '../../ui/art/animal-images.ts';
import { ShapeCluster } from './ShapeToken.tsx';

export interface CardTileProps {
  readonly item: CardItem;
  /** The item's text, resolved by the caller; a tile whose host draws the text itself (choice options) passes none. */
  readonly text?: string;
  /** A small face (a card placed in a box): smaller picture, emoji, big text, shape and text. */
  readonly compact?: boolean;
}

/** One card's face: its emoji, big text, image and shape over its text. The drawn parts are `aria-hidden`: the host names the tile
 * (`cardItemLabel`). */
export function CardTile({ item, text, compact = false }: CardTileProps): JSX.Element {
  const pack = usePack();
  return (
    <span
      className="flex flex-col items-center justify-center gap-1"
      data-compact={compact || undefined}
    >
      {item.image !== undefined && (
        <img
          src={animalImage(item.image, pack.art)}
          alt=""
          aria-hidden="true"
          draggable={false}
          className={compact ? 'h-8 w-8 object-contain' : 'h-12 w-12 object-contain'}
        />
      )}
      {item.emoji !== undefined && (
        <span aria-hidden="true" className={`leading-none ${compact ? 'text-3xl' : 'text-5xl'}`}>
          {item.emoji}
        </span>
      )}
      {item.big !== undefined && (
        <span
          aria-hidden="true"
          className={`font-display font-bold ${compact ? 'text-2xl' : 'text-4xl'}`}
        >
          {item.big}
        </span>
      )}
      {item.shape !== undefined && (
        <ShapeCluster shape={item.shape} className={compact ? 'h-8 w-8' : undefined} />
      )}
      {text !== undefined && (
        <span className={`text-center font-semibold ${compact ? 'text-xs' : 'text-sm'}`}>
          {text}
        </span>
      )}
    </span>
  );
}
