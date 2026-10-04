import { useRef, useState } from 'react';
import type { CSSProperties, JSX, KeyboardEvent } from 'react';
import { cellKey, cellPosition, inGrid, step } from '@learn/platform-core';
import type { Cell, GridSize, Heading } from '@learn/platform-core';
import { useMediaQuery } from '../useMediaQuery.ts';
import { GRID_FRAME_PX, useGridFit } from './fit.ts';
import {
  ArrowUpIcon,
  CheckMark,
  CrossMark,
  FlagIcon,
  PawIcon,
  RockIcon,
  StarMark,
} from './grid-art.tsx';
import './grid.css';

export interface GridCellContent {
  /** A rock: blocks movement (drawn as a rock tile). */
  readonly wall?: boolean;
  /** A collectable star. */
  readonly star?: boolean;
  /** The target (drawn as a flag). */
  readonly goal?: boolean;
  /** A token / number / picture; `label` is its accessible name. */
  readonly item?: {
    readonly emoji?: string;
    readonly image?: string;
    readonly text?: string;
    readonly label: string;
  };
  /** Logic puzzles: `filled` = solid cell, `crossed` = ✕ mark. */
  readonly tone?: 'neutral' | 'filled' | 'crossed';
}

export type GridHighlight = 'target' | 'good' | 'bad' | 'hint' | 'selected';

export interface GridActor {
  readonly cell: Cell;
  /** When set, an arrow chip beside the actor shows it (the actor image itself is not rotated). */
  readonly heading?: Heading;
  /** Image URL (the pack's art). */
  readonly image: string;
  /** E.g. "Hedgehog, facing right". */
  readonly label: string;
  /** Short shake (skipped with reduced motion); set it for each bump, and back to `false` to arm the next one. */
  readonly bumped?: boolean;
}

export interface GridBoardProps {
  /** 1 to 10 cells each way. */
  readonly size: GridSize;
  /** Keyed by `cellKey`. */
  readonly cells?: Readonly<Record<string, GridCellContent>>;
  readonly actor?: GridActor;
  /** Footprints, in order. */
  readonly trail?: readonly Cell[];
  /** Keyed by `cellKey`. */
  readonly highlights?: Readonly<Record<string, GridHighlight>>;
  /** When set, every cell is a button (tap targets ≥ 48 px on a 1024 × 768 tablet for a 6 × 6 grid); otherwise cells are not focusable. */
  readonly onCellTap?: (cell: Cell) => void;
  /** Accessible name per cell; default "row R, column C" + its content labels (rock, star, flag, item label, actor label). */
  readonly cellLabel?: (cell: Cell) => string;
  /** Accessible name of the whole board, e.g. "Meadow, 5 by 5". */
  readonly label: string;
  /** On the area the board is fitted into (margins, flex hints); the board never sizes itself from it. */
  readonly className?: string;
}

// Default accessible names are English; a pack that localises passes `cellLabel` (and `label`).
const HIGHLIGHT_NAME: Readonly<Record<GridHighlight, string>> = {
  target: 'target',
  good: 'correct',
  bad: 'not right',
  hint: 'hint',
  selected: 'selected',
};

function defaultCellLabel(
  cell: Cell,
  content: GridCellContent | undefined,
  actor: GridActor | undefined,
  highlight: GridHighlight | undefined,
): string {
  const { row, column } = cellPosition(cell);
  const parts = [`row ${String(row)}`, `column ${String(column)}`];
  if (content?.wall) parts.push('rock');
  if (content?.star) parts.push('star');
  if (content?.goal) parts.push('flag');
  if (content?.item) parts.push(content.item.label);
  if (actor && actor.cell.x === cell.x && actor.cell.y === cell.y) parts.push(actor.label);
  if (content?.tone === 'filled') parts.push('filled');
  if (content?.tone === 'crossed') parts.push('crossed out');
  if (highlight) parts.push(HIGHLIGHT_NAME[highlight]);
  return parts.join(', ');
}

const RING: Readonly<Record<GridHighlight, string>> = {
  target: 'border-4 border-grid-target bg-grid-target/25',
  selected: 'border-4 border-info bg-info/15',
  good: 'border-4 border-go bg-go/10',
  bad: 'border-4 border-today bg-today/10',
  hint: 'border-4 border-dashed border-today',
};

/** Where the heading chip sits: on the edge of the cell the actor faces. */
const CHIP_EDGE: Readonly<Record<Heading, string>> = {
  up: 'left-[36%] top-0',
  right: 'right-0 top-[36%]',
  down: 'bottom-0 left-[36%]',
  left: 'left-0 top-[36%]',
};

const CHIP_ROTATION: Readonly<Record<Heading, number>> = { up: 0, right: 90, down: 180, left: 270 };

const ITEM_FONT_EMOJI = 'calc(var(--grid-cell, 3rem) * 0.55)';
const ITEM_FONT_TEXT = 'calc(var(--grid-cell, 3rem) * 0.5)';

function Fill({
  inset,
  children,
}: {
  readonly inset: string;
  readonly children: JSX.Element;
}): JSX.Element {
  return (
    <span aria-hidden="true" className={`pointer-events-none absolute ${inset}`}>
      {children}
    </span>
  );
}

function CellItem({
  item,
  filled,
}: {
  readonly item: NonNullable<GridCellContent['item']>;
  readonly filled: boolean;
}): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      {item.image !== undefined ? (
        <img src={item.image} alt="" draggable={false} className="h-[74%] w-[74%] object-contain" />
      ) : item.emoji !== undefined ? (
        <span className="leading-none" style={{ fontSize: ITEM_FONT_EMOJI }}>
          {item.emoji}
        </span>
      ) : (
        <span
          className={`font-display font-semibold leading-none ${filled ? 'text-white' : 'text-ink'}`}
          style={{ fontSize: ITEM_FONT_TEXT }}
        >
          {item.text}
        </span>
      )}
    </span>
  );
}

/** A generic grid of square cells (robot maps, mazes, sudoku, arrays) that takes the largest cell size fitting its parent (the
 * parent must give it a width and a height). View mode: every cell is a labelled `role="img"`; tap mode (`onCellTap`): a
 * labelled button, arrow keys move between cells. The actor slides between cells; nothing here knows any rule. */
export function GridBoard({
  size,
  cells,
  actor,
  trail,
  highlights,
  onCellTap,
  cellLabel,
  label,
  className,
}: GridBoardProps): JSX.Element {
  const { cols, rows } = size;
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const { areaRef, cell: cellPx } = useGridFit(size);
  const tapMode = onCellTap !== undefined;

  const [focusedCell, setFocusedCell] = useState<Cell>({ x: 0, y: 0 });
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const tabStop = inGrid(size, focusedCell) ? focusedCell : { x: 0, y: 0 };

  const trailKeys = new Set((trail ?? []).map(cellKey));
  const actorCell = actor !== undefined && inGrid(size, actor.cell) ? actor.cell : undefined;

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, from: Cell): void {
    const heading = (
      { ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left' } as Partial<
        Record<string, Heading>
      >
    )[event.key];
    if (heading === undefined) return;
    event.preventDefault();
    const next = step(from, heading);
    if (!inGrid(size, next)) return;
    setFocusedCell(next);
    buttons.current.get(cellKey(next))?.focus();
  }

  const boardStyle: CSSProperties =
    cellPx === null
      ? { padding: GRID_FRAME_PX, aspectRatio: `${String(cols)} / ${String(rows)}` }
      : ({
          padding: GRID_FRAME_PX,
          width: cellPx * cols + 2 * GRID_FRAME_PX,
          height: cellPx * rows + 2 * GRID_FRAME_PX,
          '--grid-cell': `${String(cellPx)}px`,
        } as CSSProperties);
  const template: CSSProperties = {
    gridTemplateColumns: `repeat(${String(cols)}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${String(rows)}, minmax(0, 1fr))`,
  };

  const cellElements: JSX.Element[] = [];
  const highlightElements: JSX.Element[] = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const cell: Cell = { x, y };
      const key = cellKey(cell);
      const content = cells?.[key];
      const highlight = highlights?.[key];
      const name = cellLabel ? cellLabel(cell) : defaultCellLabel(cell, content, actor, highlight);
      const filled = content?.tone === 'filled';
      const background = filled
        ? 'bg-grid-filled'
        : (x + y) % 2 === 0
          ? 'bg-grid-cell'
          : 'bg-grid-cell-alt';
      const cornerStar = content?.goal === true && content.star === true;

      const inner = (
        <>
          {content?.tone === 'crossed' && (
            <Fill inset="inset-[24%]">
              <CrossMark className="stroke-muted" />
            </Fill>
          )}
          {trailKeys.has(key) && (
            <span
              aria-hidden="true"
              data-testid={`grid-trail-${String(x)}-${String(y)}`}
              className="pointer-events-none absolute inset-[34%]"
            >
              <PawIcon />
            </span>
          )}
          {content?.wall === true && (
            <Fill inset="inset-[8%]">
              <RockIcon />
            </Fill>
          )}
          {content?.goal === true && (
            <Fill inset="inset-[12%]">
              <FlagIcon />
            </Fill>
          )}
          {content?.star === true && (
            <Fill inset={cornerStar ? 'right-[6%] top-[6%] h-[38%] w-[38%]' : 'inset-[15%]'}>
              <StarMark />
            </Fill>
          )}
          {content?.item && <CellItem item={content.item} filled={filled} />}
        </>
      );

      const common = {
        'aria-label': name,
        'data-testid': `grid-cell-${String(x)}-${String(y)}`,
        'data-highlight': highlight,
      };
      const look = `relative block ${background} shadow-[inset_0_0_0_1px_var(--color-grid-line)]`;
      cellElements.push(
        tapMode ? (
          <button
            key={key}
            type="button"
            {...common}
            ref={(element) => {
              if (element) buttons.current.set(key, element);
              else buttons.current.delete(key);
            }}
            tabIndex={tabStop.x === x && tabStop.y === y ? 0 : -1}
            className={`${look} grid-cell-button cursor-pointer`}
            onClick={() => {
              onCellTap(cell);
            }}
            onFocus={() => {
              setFocusedCell(cell);
            }}
            onKeyDown={(event) => {
              moveFocus(event, cell);
            }}
          >
            {inner}
          </button>
        ) : (
          <div key={key} role="img" {...common} className={look}>
            {inner}
          </div>
        ),
      );

      if (highlight !== undefined) {
        highlightElements.push(
          <div
            key={key}
            aria-hidden="true"
            className="relative"
            style={{ gridColumn: x + 1, gridRow: y + 1 }}
          >
            <span
              data-testid={`grid-highlight-${String(x)}-${String(y)}`}
              data-kind={highlight}
              className={`absolute inset-[5%] rounded-lg ${RING[highlight]}`}
            />
            {(highlight === 'good' || highlight === 'bad') && (
              <span
                data-testid={`grid-mark-${String(x)}-${String(y)}`}
                data-kind={highlight}
                className={`absolute right-[4%] top-[4%] h-[34%] w-[34%] rounded-full border-2 bg-card p-[4%] ${
                  highlight === 'good' ? 'border-go' : 'border-today'
                }`}
              >
                {highlight === 'good' ? <CheckMark /> : <CrossMark className="stroke-today" />}
              </span>
            )}
          </div>,
        );
      }
    }
  }

  return (
    <div
      ref={areaRef}
      className={`flex h-full min-h-0 w-full min-w-0 items-center justify-center ${className ?? ''}`.trim()}
    >
      <div
        role="group"
        aria-label={label}
        data-testid="grid-board"
        data-cols={cols}
        data-rows={rows}
        className={`rounded-2xl bg-grid-frame ${cellPx === null ? 'max-h-full w-full' : ''}`.trim()}
        style={boardStyle}
      >
        <div className="relative h-full w-full overflow-hidden rounded-lg">
          <div className="grid h-full w-full" style={template}>
            {cellElements}
          </div>
          {actorCell !== undefined && actor !== undefined && (
            <div
              aria-hidden="true"
              data-testid="grid-actor"
              data-cell={cellKey(actorCell)}
              data-heading={actor.heading}
              className={`grid-actor ${reducedMotion ? '' : 'grid-actor-move'}`.trim()}
              style={{
                width: `${String(100 / cols)}%`,
                height: `${String(100 / rows)}%`,
                transform: `translate(${String(actorCell.x * 100)}%, ${String(actorCell.y * 100)}%)`,
              }}
            >
              <div
                className={`relative h-full w-full ${
                  actor.bumped === true && !reducedMotion ? 'grid-actor-bump' : ''
                }`.trim()}
              >
                <img
                  src={actor.image}
                  alt=""
                  draggable={false}
                  className="absolute left-[16%] top-[16%] h-[68%] w-[68%] object-contain drop-shadow-md"
                />
                {actor.heading !== undefined && (
                  <span
                    data-testid="grid-actor-heading"
                    data-heading={actor.heading}
                    className={`absolute h-[28%] w-[28%] rounded-full border-2 border-edge-info bg-card p-[2%] ${CHIP_EDGE[actor.heading]}`}
                  >
                    <span
                      className="block h-full w-full"
                      style={{ transform: `rotate(${String(CHIP_ROTATION[actor.heading])}deg)` }}
                    >
                      <ArrowUpIcon />
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}
          {highlightElements.length > 0 && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 grid"
              style={template}
            >
              {highlightElements}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
