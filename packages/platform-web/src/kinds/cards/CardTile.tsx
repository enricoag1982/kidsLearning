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
  /** About twice the normal face (the options of a choice with no prompt); wins over `compact`. */
  readonly large?: boolean;
  /** The normal face on a phone for a 56 px tile (the group pool): the shape box is 3.25 rem instead of 3.5; from `sm` the normal
   * face. Ignored with `compact` or `large`. */
  readonly dense?: boolean;
}

/** Sizing classes of each face part: the normal tile, the compact one (a card in a box), the large one (a choice option with no
 * prompt: about twice the normal size, until `sm` where the tile is taller). */
const FACE = {
  normal: { image: 'h-12 w-12', emoji: 'text-5xl', big: 'text-4xl', shape: undefined },
  dense: {
    image: 'h-12 w-12',
    emoji: 'text-5xl',
    big: 'text-4xl',
    shape: 'h-[3.25rem] w-[3.25rem] sm:h-14 sm:w-14',
  },
  /** A card placed in a box. A count cluster is drawn in a 2.5 rem box (a 2 x 2 cluster keeps its tokens at 20 px), a single token in
   * 2 rem. */
  compact: {
    image: 'h-8 w-8',
    emoji: 'text-3xl',
    big: 'text-2xl',
    shape: 'h-8 w-8',
    cluster: 'h-10 w-10',
  },
  large: {
    image: 'h-24 w-24 sm:h-28 sm:w-28',
    emoji: 'text-7xl sm:text-8xl',
    big: 'text-6xl sm:text-7xl',
    shape: 'h-28 w-28 sm:h-32 sm:w-32',
  },
  /** A longer big text (an expression such as "28 + 82") keeps to the width of a 2-per-row tile on a phone. */
  largeLongBig: 'text-4xl sm:text-5xl',
} as const;

/** More characters than this in a `big` text count as long. */
const LONG_BIG = 3;

/** One card's face: its emoji, big text, image and shape over its text. The drawn parts are `aria-hidden`: the host names the tile
 * (`cardItemLabel`). */
export function CardTile({
  item,
  text,
  compact = false,
  large = false,
  dense = false,
}: CardTileProps): JSX.Element {
  const pack = usePack();
  const face = large ? FACE.large : compact ? FACE.compact : dense ? FACE.dense : FACE.normal;
  const shapeClass =
    face === FACE.compact && (item.shape?.count ?? 1) > 1 ? FACE.compact.cluster : face.shape;
  return (
    <span
      className="flex flex-col items-center justify-center gap-1"
      data-compact={compact || undefined}
      data-large={large || undefined}
    >
      {item.image !== undefined && (
        <img
          src={animalImage(item.image, pack.art)}
          alt=""
          aria-hidden="true"
          draggable={false}
          className={`${face.image} object-contain`}
        />
      )}
      {item.emoji !== undefined && (
        <span aria-hidden="true" className={`leading-none ${face.emoji}`}>
          {item.emoji}
        </span>
      )}
      {item.big !== undefined && (
        <span
          aria-hidden="true"
          className={`font-display font-bold ${large && item.big.length > LONG_BIG ? FACE.largeLongBig : face.big}`}
        >
          {item.big}
        </span>
      )}
      {item.shape !== undefined && <ShapeCluster shape={item.shape} className={shapeClass} />}
      {text !== undefined && (
        <span className={`text-center font-semibold ${compact ? 'text-xs' : 'text-sm'}`}>
          {text}
        </span>
      )}
    </span>
  );
}
