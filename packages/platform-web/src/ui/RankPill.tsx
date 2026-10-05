import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { RankDef } from '@learn/platform-core';
import { tContent } from '../content-text.ts';
import { InfoPill } from './ds/primitives.tsx';
import { infoPillSize } from './ds/primitives-styles.ts';
import { RankCrownIcon } from './ds/icons.tsx';

/** Info pill (docs/screens.md §1): crown icon + rank name, no background or border, so it never reads as a tappable chip. */
export function RankPill({
  rank,
  compact = false,
  dense = false,
}: {
  readonly rank: RankDef | undefined;
  /** Parent area: text-sized, next to a nickname in a list row (kid screens keep the 56 px pill). */
  readonly compact?: boolean;
  /** Home's phone header: a 36 px line (the 56 px pill from `sm`), no side padding below `sm`. */
  readonly dense?: boolean;
}): JSX.Element | null {
  const { t } = useTranslation();
  if (!rank) return null;
  const name = tContent(t, `journey:ranks.${rank.id}`);
  return (
    <InfoPill
      data-testid="rank-pill"
      dense={dense}
      className={
        compact
          ? 'h-7 self-start text-xs font-bold text-[#1F5A41]'
          : `${infoPillSize(dense)} font-display font-semibold text-[#1F5A41]`
      }
    >
      <RankCrownIcon />
      {tContent(t, 'journey:ui.rank-pill', { rank: name })}
    </InfoPill>
  );
}
