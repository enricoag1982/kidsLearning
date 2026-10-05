import type { JSX, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChoiceOptionBase } from '@learn/platform-core/domain/exercise/kinds/choice/def';
import { tContent } from '../../content-text.ts';
import type { ContentText } from '../../content-text.ts';

/** `large`: the options are the whole exercise (a choice without a stimulus), so bigger tiles and visuals. */
export type ChoiceSize = 'normal' | 'large';

/** How a subject draws an option beside its text (chess: a piece icon; math: a numeral). */
export interface ChoiceLook<O extends ChoiceOptionBase = ChoiceOptionBase> {
  /** `size` is `large` for the big tiles: the visual about twice its normal size. */
  visual?(option: O, size: ChoiceSize): ReactNode;
  /** Accessible name of an option without text. */
  label?(option: O, text: ContentText): string | undefined;
  /** The normal tile's minimum height class, in place of the default `min-h-14` (56 px); the large tile is always 7rem (9rem from `sm`). */
  readonly tileClass?: string;
}

export interface ChoiceOptionsProps<O extends ChoiceOptionBase> {
  readonly options: readonly O[];
  readonly wrongOptionIds: readonly string[];
  readonly onPick: (optionId: string) => void;
  readonly look: ChoiceLook<O>;
  /** Default `normal`. */
  readonly size?: ChoiceSize;
}

/** Pickable options: tiles (visual over text) in a grid sized by its container (not the viewport: on a tablet the options sit in the
 * narrow side column), 2 per row up to 4. Each tile is at least 56px tall (game screens, docs/screens.md §1); `large` tiles
 * (7rem, 9rem from `sm`) carry a choice with no stimulus. */
export function ChoiceOptions<O extends ChoiceOptionBase>({
  options,
  wrongOptionIds,
  onPick,
  look,
  size = 'normal',
}: ChoiceOptionsProps<O>): JSX.Element {
  const { t } = useTranslation();
  const text: ContentText = (key, options) => tContent(t, key, options);
  const large = size === 'large';
  const tileClass = large
    ? 'min-h-28 py-3 text-lg sm:min-h-36'
    : `${look.tileClass ?? 'min-h-14'} text-sm`;
  return (
    <div className="@container">
      <div
        data-size={size}
        className={`grid grid-cols-2 @md:grid-cols-3 @2xl:grid-cols-4 ${large ? 'gap-4' : 'gap-3'}`}
      >
        {options.map((option) => {
          const isWrong = wrongOptionIds.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              disabled={isWrong}
              aria-disabled={isWrong}
              aria-label={option.textKey === undefined ? look.label?.(option, text) : undefined}
              onClick={() => {
                onPick(option.id);
              }}
              className={`tap-raised flex ${tileClass} flex-col items-center justify-center gap-1 rounded-2xl px-2 font-display font-semibold ${
                isWrong ? 'border-today text-today opacity-80' : 'bg-card text-ink'
              }`}
            >
              {look.visual?.(option, size)}
              {option.textKey && <span className="text-center">{text(option.textKey)}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
