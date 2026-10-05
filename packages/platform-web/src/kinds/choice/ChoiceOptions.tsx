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

/** The grid's columns by container width (not the viewport: on a tablet the options sit in the narrow side column). Three options
 * go in one row of 3 whenever each tile can be 6rem wide (3 x 6rem + 2 gaps: 19.5rem, 20rem with the large tiles' bigger gap), else
 * 2 + 1; any other count is 2 per row, 3 from 28rem, 4 from 42rem. Tailwind scans these strings, so each is written out whole. */
function columnsClass(count: number, large: boolean): string {
  if (count === 3) {
    return large
      ? 'grid-cols-2 @min-[20rem]:grid-cols-3'
      : 'grid-cols-2 @min-[19.5rem]:grid-cols-3';
  }
  return 'grid-cols-2 @md:grid-cols-3 @2xl:grid-cols-4';
}

/** Pickable options: tiles (visual over text) in a grid sized by its container (`columnsClass`): 2 per row, 3 options in one row
 * of 3 where they fit. Each tile is at least 56px tall (game screens, docs/screens.md §1); `large` tiles (7rem, 9rem from `sm`)
 * carry a choice with no stimulus. */
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
        className={`grid ${columnsClass(options.length, large)} ${large ? 'gap-4' : 'gap-3'}`}
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
