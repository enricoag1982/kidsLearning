import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { InfoPill } from './ds/primitives.tsx';
import { infoPillSize } from './ds/primitives-styles.ts';
import { FlameIcon } from './ds/icons.tsx';

/** Info pill (docs/screens.md §1): flame + streak days, no background or border; Home's top bar (>= 2 days) and My Den. */
export function StreakPill({
  days,
  dense = false,
}: {
  readonly days: number;
  /** Home's phone header: a 36 px line (the 56 px pill from `sm`), no side padding below `sm`. */
  readonly dense?: boolean;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <InfoPill
      role="img"
      data-testid="streak-pill"
      dense={dense}
      className={`${infoPillSize(dense)} font-display font-semibold text-[#7A3A0F]`}
      aria-label={t('streak.pill', { count: days })}
    >
      <FlameIcon />
      <span aria-hidden="true">{days}</span>
    </InfoPill>
  );
}
