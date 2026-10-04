import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { tapClass } from '@learn/platform-web/ui/ds/tap.ts';
import type { TileKind } from '../../core/tiles.ts';
import { TileIcon } from './TileIcon.tsx';
import { trayName } from './tile-label.ts';

export interface TileTrayProps {
  /** The kinds the exercise allows, in tray order. */
  readonly kinds: readonly TileKind[];
  readonly onAdd: (kind: TileKind) => void;
  /** While a run plays the tiles cannot be added. */
  readonly disabled?: boolean;
}

/** The box of tiles: one big raised button per kind (64 px), icon only, named for a screen reader. A tap adds that tile to the
 * strip. */
export function TileTray({ kinds, onAdd, disabled = false }: TileTrayProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div
      role="group"
      aria-label={t('coding.tray.label')}
      className="flex flex-wrap justify-center gap-2"
    >
      {kinds.map((kind) => (
        <button
          key={kind}
          type="button"
          disabled={disabled}
          aria-label={trayName(t, kind)}
          data-tray-tile={kind}
          onClick={() => {
            onAdd(kind);
          }}
          className={tapClass(
            'custom',
            'neutral',
            'flex h-16 w-16 flex-none items-center justify-center rounded-2xl',
          )}
        >
          <TileIcon kind={kind} />
        </button>
      ))}
    </div>
  );
}
