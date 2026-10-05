import type { CSSProperties, JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { CardPrompt } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import { usePack } from '../../app/subject.ts';
import { tContent } from '../../content-text.ts';
import { animalImage } from '../../ui/art/animal-images.ts';
import { bigFitCqi } from './big-fit.ts';
import { humanize, lineLabel, shapeRowLabel } from './item-label.ts';
import { LinePicture } from './LinePicture.tsx';
import { ShapeRow } from './ShapeToken.tsx';

export interface CardPromptViewProps {
  readonly prompt: CardPrompt;
  /** A small card for the Story step. */
  readonly compact?: boolean;
}

/** The card a kid looks at: a big emoji (96 px), a row of shape tokens, a big short text (3 rem, shrunk to fit the card's width on one
 * line down to 1.5 rem: `.card-big`), a number-line picture and / or an art image from the pack's `art`, centred in a white card that
 * fills the board square. The row is one image named by `shapeRowLabel`, the line one named by `lineLabel`. The question itself is the
 * instruction bubble's text. */
export function CardPromptView({ prompt, compact = false }: CardPromptViewProps): JSX.Element {
  const pack = usePack();
  const { t } = useTranslation();
  return (
    <div className="@container flex h-full w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border-2 border-line bg-card p-3">
      {prompt.image !== undefined && (
        <img
          src={animalImage(prompt.image, pack.art)}
          alt={humanize(prompt.image)}
          draggable={false}
          className={`min-h-0 object-contain ${compact ? 'h-12' : 'h-32 sm:h-40'}`}
        />
      )}
      {prompt.emoji !== undefined && (
        <p
          className={`text-center leading-none [overflow-wrap:anywhere] ${compact ? 'text-5xl' : 'text-[96px]'}`}
        >
          {prompt.emoji}
        </p>
      )}
      {prompt.shapes !== undefined && (
        <div
          role="img"
          aria-label={shapeRowLabel((key, options) => tContent(t, key, options), prompt.shapes)}
          className="flex max-w-full justify-center"
        >
          <ShapeRow shapes={prompt.shapes} compact={compact} />
        </div>
      )}
      {prompt.big !== undefined && (
        <p
          className={`text-center font-display font-bold text-ink [overflow-wrap:anywhere] ${compact ? 'text-2xl' : 'card-big text-5xl sm:text-6xl'}`}
          {...(compact
            ? {}
            : { style: { '--big-fit': `${String(bigFitCqi(prompt.big))}cqi` } as CSSProperties })}
        >
          {prompt.big}
        </p>
      )}
      {prompt.line !== undefined && (
        <div
          role="img"
          aria-label={lineLabel((key, options) => tContent(t, key, options), prompt.line)}
          className={`w-full ${compact ? 'max-w-48' : 'max-w-xl'}`}
        >
          <LinePicture line={prompt.line} />
        </div>
      )}
    </div>
  );
}
