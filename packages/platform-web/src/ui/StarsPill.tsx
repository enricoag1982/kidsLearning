import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { StarIcon } from './ds/icons.tsx';
import { InfoPill } from './ds/primitives.tsx';
import { infoPillSize } from './ds/primitives-styles.ts';

/** Info pill (docs/screens.md §1): star icon + total for the Home and Lesson top bars; no background or border. */
export function StarsPill({
  count,
  dense = false,
}: {
  readonly count: number;
  /** Home's phone header: a 36 px line (the 56 px pill from `sm`), no side padding below `sm`. */
  readonly dense?: boolean;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <InfoPill
      role="img"
      data-testid="stars-pill"
      dense={dense}
      className={`${infoPillSize(dense)} font-display font-semibold text-[#6E4A07]`}
      aria-label={t('stars-count', { count })}
    >
      <span className="h-6 w-6" aria-hidden="true">
        <StarIcon />
      </span>
      <span aria-hidden="true">{count}</span>
    </InfoPill>
  );
}
