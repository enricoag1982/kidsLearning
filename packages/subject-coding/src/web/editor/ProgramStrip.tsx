import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { tContent } from '@learn/platform-web/content-text.ts';
import { CloseIcon, LockIcon } from '@learn/platform-web/ui/ds/icons.tsx';
import { tapClass } from '@learn/platform-web/ui/ds/tap.ts';
import { MAX_REPEAT_BODY, samePath, tilePaths } from '../../core/tiles.ts';
import type { Tile } from '../../core/tiles.ts';
import { TileIcon } from './TileIcon.tsx';
import { tileName } from './tile-label.ts';

/** What the exercise is doing to one tile, by its path (`[top]` or `[top, body]`). */
export interface TileStatus {
  /** Greyed out and not tappable (a hint ruled it out). */
  readonly dim?: boolean;
  /** Pulses (a hint points at it). */
  readonly flash?: boolean;
  /** The error count of a wrong tap on this tile: it shakes (a new count restarts the shake). */
  readonly wrong?: number;
  /** The bug: red with a cross. */
  readonly bug?: boolean;
}

/** The step being run: its tile glows; for a repeat's body `iteration` fills the "2 of 3" badge. */
export interface ActiveStep {
  readonly path: readonly number[];
  readonly iteration?: number;
}

export interface ProgramStripProps {
  /** Top-level slots; `null` is an empty one (edit mode shows it as a dashed outline). */
  readonly slots: readonly (Tile | null)[];
  /** `edit`: slots named "Slot n", a tap on a tile empties it, a repeat is a block taking tiles. `read`: tiles named "Tile n",
   * flat pictures unless `onPick` makes them buttons. */
  readonly mode: 'edit' | 'read';
  /** Top-level indices the child cannot change (edit mode): a lock shows on them. */
  readonly locked?: readonly number[];
  /** The repeat taking the next tapped tile (edit mode). */
  readonly openRepeat?: number | null;
  /** A run is playing: nothing can be tapped. */
  readonly busy?: boolean;
  readonly active?: ActiveStep | null;
  /** Faded tiles in empty top-level slots, by index (a hint). */
  readonly ghosts?: Readonly<Record<number, Tile>>;
  readonly status?: (path: readonly number[]) => TileStatus;
  /** Edit mode: a tap on a tile (`[top]`, `[top, body]`) takes it out. */
  readonly onRemove?: (path: readonly number[]) => void;
  /** Edit mode: a tap on a repeat's loop picture opens it for tiles, or closes it again. */
  readonly onToggleRepeat?: (index: number) => void;
  /** Edit mode: a tap on a repeat's count. */
  readonly onCycleTimes?: (index: number) => void;
  /** Read mode: every tile (a repeat's own tile included) is a button. */
  readonly onPick?: (path: readonly number[]) => void;
  /** Changing it shakes the whole strip (a run that cannot start). */
  readonly shakeKey?: number;
  /** The list's accessible name; default "Your program". */
  readonly label?: string;
}

const SLOT = 'h-14 w-14 flex-none rounded-2xl';
const CENTER = 'relative flex items-center justify-center';
const GLOW = 'ring-4 ring-star ring-offset-2';
const EMPTY = `${SLOT} ${CENTER} border-2 border-dashed border-edge-locked`;

function statusClass(status: TileStatus, active: boolean): string {
  return [
    active ? GLOW : '',
    status.dim === true ? 'opacity-40' : '',
    status.flash === true ? `${GLOW} animate-pulse` : '',
    status.wrong === undefined ? '' : 'card-shake border-today',
    status.bug === true ? 'border-today bg-today/15' : '',
  ]
    .filter((part) => part !== '')
    .join(' ');
}

function BugMark(): JSX.Element {
  return (
    <span
      aria-hidden="true"
      data-testid="bug-mark"
      className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-today bg-card"
    >
      <CloseIcon size={16} strokeWidth={3.4} className="text-today" />
    </span>
  );
}

function LockBadge(): JSX.Element {
  return (
    <span
      aria-hidden="true"
      data-testid="lock-mark"
      className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-edge-locked bg-card text-muted"
    >
      <LockIcon size={14} />
    </span>
  );
}

interface TileViewProps {
  readonly tile: Tile;
  readonly name: string;
  readonly path: readonly number[];
  readonly status: TileStatus;
  readonly active: boolean;
  readonly locked: boolean;
  /** `undefined`: a picture (info, flat); else a raised button. */
  readonly onTap?: (() => void) | undefined;
  readonly busy: boolean;
}

/** A primitive tile: a raised button when tappable, else a flat picture (a locked one carries its lock). */
function PrimitiveTile({
  tile,
  name,
  path,
  status,
  active,
  locked,
  onTap,
  busy,
}: TileViewProps): JSX.Element {
  const common = {
    'aria-label': name,
    'data-path': path.join('.'),
    'data-active': active,
    'data-wrong': status.wrong !== undefined,
    'data-bug': status.bug === true,
  };
  const tappable = onTap !== undefined && !locked;
  const looks = `${SLOT} ${CENTER} ${statusClass(status, active)}`;
  if (!tappable) {
    return (
      <div
        role="img"
        {...common}
        className={`${looks} border-2 bg-card ${locked ? 'border-dashed border-edge-locked' : 'border-line'}`}
      >
        <TileIcon kind={tile.kind} />
        {locked && <LockBadge />}
        {status.bug === true && <BugMark />}
      </div>
    );
  }
  const disabled = busy || status.dim === true;
  return (
    <button
      // The error count in the key restarts the shake when the same tile is tapped wrong twice.
      key={status.wrong === undefined ? undefined : `wrong-${String(status.wrong)}`}
      type="button"
      disabled={disabled}
      {...common}
      onClick={onTap}
      className={tapClass('custom', 'neutral', looks)}
    >
      <TileIcon kind={tile.kind} />
      {status.bug === true && <BugMark />}
    </button>
  );
}

interface BlockProps {
  readonly index: number;
  readonly tile: Extract<Tile, { readonly kind: 'repeat' }>;
  /** Names and numbers of the body tiles come from the strip's mode. */
  readonly props: ProgramStripProps;
  readonly slotName: (path: readonly number[], tile: Tile) => string;
}

/** What a tap on the tile at `path` does: edit mode empties it, read mode with `onPick` picks it; otherwise nothing (a picture). */
function tapHandler(
  edit: boolean,
  onRemove: ((path: readonly number[]) => void) | undefined,
  onPick: ((path: readonly number[]) => void) | undefined,
  path: readonly number[],
): (() => void) | undefined {
  const handler = edit ? onRemove : onPick;
  return handler === undefined
    ? undefined
    : () => {
        handler(path);
      };
}

/** A repeat: a C-shaped block (a header with its loop picture and count, and its body slots under it). */
function RepeatBlock({ index, tile, props, slotName }: BlockProps): JSX.Element {
  const { t } = useTranslation();
  const {
    mode,
    locked = [],
    openRepeat = null,
    busy = false,
    active = null,
    status,
    onRemove,
    onToggleRepeat,
    onCycleTimes,
    onPick,
  } = props;
  const edit = mode === 'edit';
  const isLocked = edit && locked.includes(index);
  const isOpen = edit && openRepeat === index;
  const own = status?.([index]) ?? {};
  const iterating = active?.path[0] === index && active.iteration !== undefined;
  const ownActive = active !== null && samePath(active.path, [index]);
  const badge = iterating
    ? tContent(t, 'coding.strip.loop', { iteration: active.iteration, times: tile.times })
    : `×${String(tile.times)}`;
  const room = isOpen && tile.body.length < MAX_REPEAT_BODY;
  const headerName = slotName([index], tile);
  const frame = `flex flex-col gap-1.5 rounded-2xl border-2 border-edge-info bg-info/10 p-1.5 ${
    isOpen ? 'ring-4 ring-info/40' : ''
  }`;
  const pill = `${CENTER} h-14 flex-none gap-2 rounded-2xl px-2`;
  const count = (
    <span aria-hidden="true" className="font-display text-xl font-bold text-info">
      {badge}
    </span>
  );

  let header: JSX.Element;
  if (edit && !isLocked) {
    header = (
      <>
        <button
          type="button"
          disabled={busy}
          aria-label={tContent(t, 'coding.strip.fill', { n: index + 1 })}
          aria-pressed={isOpen}
          onClick={() => {
            onToggleRepeat?.(index);
          }}
          className={tapClass(
            'custom',
            'neutral',
            `${SLOT} ${CENTER} ${isOpen ? 'tap-border-go' : ''}`,
          )}
        >
          <TileIcon kind="repeat" />
        </button>
        <button
          type="button"
          disabled={busy}
          aria-label={tContent(t, 'coding.strip.times', { n: index + 1, times: tile.times })}
          data-iterating={iterating}
          onClick={() => {
            onCycleTimes?.(index);
          }}
          className={tapClass(
            'custom',
            'neutral',
            `${CENTER} h-14 min-w-14 flex-none rounded-2xl px-2 font-display text-xl font-bold ${iterating ? GLOW : ''}`,
          )}
        >
          {badge}
        </button>
      </>
    );
  } else if (!edit && onPick !== undefined) {
    header = (
      <button
        key={own.wrong === undefined ? undefined : `wrong-${String(own.wrong)}`}
        type="button"
        disabled={busy || own.dim === true}
        aria-label={headerName}
        data-path={String(index)}
        data-active={ownActive}
        data-wrong={own.wrong !== undefined}
        data-bug={own.bug === true}
        onClick={() => {
          onPick([index]);
        }}
        className={tapClass('custom', 'neutral', `${pill} ${statusClass(own, ownActive)}`)}
      >
        <TileIcon kind="repeat" />
        {count}
        {own.bug === true && <BugMark />}
      </button>
    );
  } else {
    header = (
      <div
        role="img"
        aria-label={headerName}
        data-path={String(index)}
        data-active={ownActive}
        className={`${pill} border-2 bg-card ${
          isLocked ? 'border-dashed border-edge-locked' : 'border-line'
        } ${statusClass(own, ownActive)}`}
      >
        <TileIcon kind="repeat" />
        {count}
        {isLocked && <LockBadge />}
      </div>
    );
  }

  return (
    <div
      // Its two buttons carry the name; a header that is itself a named picture or button needs no second name around it.
      {...(edit && !isLocked ? { role: 'group', 'aria-label': headerName } : {})}
      data-repeat={index}
      data-open={isOpen}
      className={frame}
    >
      <div className="flex items-center gap-1.5">{header}</div>
      <ul className="flex flex-wrap gap-1.5 pl-3">
        {tile.body.map((inner, at) => {
          const path = [index, at] as const;
          return (
            <li key={at}>
              <PrimitiveTile
                tile={inner}
                name={slotName(path, inner)}
                path={path}
                status={status?.(path) ?? {}}
                active={active !== null && samePath(active.path, path)}
                locked={isLocked}
                busy={busy}
                onTap={tapHandler(edit, onRemove, onPick, path)}
              />
            </li>
          );
        })}
        {room && (
          <li>
            <div
              role="img"
              aria-label={tContent(t, 'coding.strip.inside-empty', { n: index + 1 })}
              className={EMPTY}
            />
          </li>
        )}
      </ul>
    </div>
  );
}

/** The program as a row of slots (wrapping when the panel is narrow). Edit mode: dashed empty slots, a lock on the fixed ones, a
 * repeat as a C-shaped block with a count and its own slots, the running step glowing and a "2 of 3" badge on the loop. Read mode:
 * the same tiles as flat pictures, or (with `onPick`) as buttons; `status` marks a tile (grey, pulse, shake, bug). */
export function ProgramStrip(props: ProgramStripProps): JSX.Element {
  const { t } = useTranslation();
  const {
    slots,
    mode,
    locked = [],
    busy = false,
    active = null,
    ghosts = {},
    status,
    onRemove,
    onPick,
    shakeKey = 0,
    label,
  } = props;
  const edit = mode === 'edit';
  const tiles = slots.filter((slot): slot is Tile => slot !== null);
  const numbering = tilePaths(tiles);

  const slotName = (path: readonly number[], tile: Tile): string => {
    if (!edit) {
      const n = numbering.findIndex((candidate) => samePath(candidate, path)) + 1;
      const key = status?.(path).bug === true ? 'coding.strip.tile-bug' : 'coding.strip.tile';
      return tContent(t, key, { n, tile: tileName(t, tile) });
    }
    const [top] = path;
    const n = (top ?? 0) + 1;
    if (path.length === 2) {
      return tContent(t, 'coding.strip.inside', { n, tile: tileName(t, tile) });
    }
    return tContent(
      t,
      locked.includes(top ?? -1) ? 'coding.strip.slot-locked' : 'coding.strip.slot-filled',
      {
        n,
        tile: tileName(t, tile),
      },
    );
  };

  const items = slots.map((slot, index) => {
    if (slot === null) {
      const ghost = ghosts[index];
      return (
        <li key={`empty-${String(index)}`}>
          <div
            role="img"
            aria-label={tContent(t, 'coding.strip.slot-empty', { n: index + 1 })}
            data-slot={index}
            data-ghost={ghost === undefined ? undefined : ghost.kind}
            className={EMPTY}
          >
            {ghost !== undefined && <Ghost tile={ghost} />}
          </div>
        </li>
      );
    }
    // Read mode has no empty slots, so a tile's top-level index is the number of tiles before it.
    const topIndex = edit ? index : slots.slice(0, index).filter((other) => other !== null).length;
    const path = [topIndex] as const;
    if (slot.kind === 'repeat') {
      return (
        <li key={`repeat-${String(topIndex)}`}>
          <RepeatBlock index={topIndex} tile={slot} props={props} slotName={slotName} />
        </li>
      );
    }
    const tileStatus = status?.(path) ?? {};
    return (
      <li key={`tile-${String(topIndex)}`}>
        <PrimitiveTile
          tile={slot}
          name={slotName(path, slot)}
          path={path}
          status={tileStatus}
          active={active !== null && samePath(active.path, path)}
          locked={edit && locked.includes(topIndex)}
          busy={busy}
          onTap={tapHandler(edit, onRemove, onPick, path)}
        />
      </li>
    );
  });

  return (
    <div key={shakeKey} className={shakeKey > 0 ? 'card-shake' : undefined}>
      <ol
        aria-label={label ?? t('coding.strip.label')}
        data-testid="program-strip"
        className="flex flex-wrap items-start justify-center gap-2 lg:justify-start"
      >
        {items}
      </ol>
    </div>
  );
}

/** A tile a hint shows in an empty slot: faded, not tappable, hidden from a screen reader (the hint's note says it). */
function Ghost({ tile }: { readonly tile: Tile }): JSX.Element {
  return (
    <span aria-hidden="true" data-testid="ghost-tile" className="opacity-40">
      <TileIcon kind={tile.kind} />
    </span>
  );
}
