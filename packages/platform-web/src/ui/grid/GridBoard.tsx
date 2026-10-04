import { useRef, useState } from 'react';
import type { CSSProperties, JSX, KeyboardEvent } from 'react';
import { cellKey, cellPosition, inGrid, step } from '@learn/platform-core';
import type { Cell, GridSize, Heading } from '@learn/platform-core';
import { useMediaQuery } from '../useMediaQuery.ts';
import {
  GRID_FRAME_PX,
  LANE_FONT_PX,
  LANE_LINE_PX,
  LANE_PAD_PX,
  clueLines,
  laneSizes,
  useGridFit,
} from './fit.ts';
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
    /** Number puzzles: `given` = bold ink, `entry` = the player's own, info colour (never colour alone: "given" joins the name). */
    readonly style?: 'given' | 'entry';
  };
  /** Logic puzzles: `filled` = solid cell, `crossed` = ✕ mark. */
  readonly tone?: 'neutral' | 'filled' | 'crossed';
  /** Pencil marks (small digits in a 2 × 2 / 3 × 3 mini grid, up to 9), never scored. Hidden when the cell is under 40 px. */
  readonly marks?: readonly string[];
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
  /** Accessible name per cell (replaces the default, so also its given / notes / clue parts); default "row R, column C" + its
   * content labels (rock, star, flag, item label, actor label, filled, crossed out, highlight), then "given", "notes 1 and 4",
   * and the column and row "clue …". */
  readonly cellLabel?: (cell: Cell) => string;
  /** Box size for thick borders between boxes (sudoku 4 × 4 → `{ cols: 2, rows: 2 }`; 6 × 6 → `{ cols: 3, rows: 2 }`). */
  readonly boxes?: { readonly cols: number; readonly rows: number };
  /** Clue lanes: one label per column above the board, one per row left of it (picture cross: "1 1", "3"). A top label's
   * words stand one under the other. Each label joins the accessible names of the cells in its column / row. */
  readonly edgeLabels?: { readonly top?: readonly string[]; readonly left?: readonly string[] };
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

/** Pencil marks drawn at most (a 3 × 3 mini grid). */
const MAX_MARKS = 9;
/** Below this cell side the marks are too small to read: not drawn, not in the name. */
const MARKS_MIN_CELL_PX = 40;

/** "notes 1", "notes 1 and 4", "notes 1, 2 and 4"; `''` without marks. */
function notesLabel(marks: readonly string[]): string {
  const last = marks[marks.length - 1];
  if (last === undefined) return '';
  if (marks.length === 1) return `notes ${last}`;
  return `notes ${marks.slice(0, -1).join(', ')} and ${last}`;
}

function visibleMarks(content: GridCellContent | undefined, showMarks: boolean): readonly string[] {
  if (!showMarks) return [];
  return (content?.marks ?? []).filter((mark) => mark !== '').slice(0, MAX_MARKS);
}

function defaultCellLabel(
  cell: Cell,
  content: GridCellContent | undefined,
  actor: GridActor | undefined,
  highlight: GridHighlight | undefined,
  marks: readonly string[],
  clues: readonly string[],
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
  if (content?.item?.style === 'given') parts.push('given');
  if (marks.length > 0) parts.push(notesLabel(marks));
  for (const clue of clues) parts.push(`clue ${clue}`);
  return parts.join(', ');
}

type BoxEdge = 'top' | 'right' | 'bottom' | 'left';

/** The sides of `cell` that border another box (the outer frame is never one), in CSS order. */
function boxEdges(size: GridSize, boxes: GridBoardProps['boxes'], cell: Cell): readonly BoxEdge[] {
  if (boxes === undefined || !(boxes.cols >= 1) || !(boxes.rows >= 1)) return [];
  const edges: BoxEdge[] = [];
  if (cell.y > 0 && cell.y % boxes.rows === 0) edges.push('top');
  if (cell.x < size.cols - 1 && (cell.x + 1) % boxes.cols === 0) edges.push('right');
  if (cell.y < size.rows - 1 && (cell.y + 1) % boxes.rows === 0) edges.push('bottom');
  if (cell.x > 0 && cell.x % boxes.cols === 0) edges.push('left');
  return edges;
}

const BOX_LINE_PX = 3;
const THIN = 'var(--color-grid-line)';
const THICK = 'var(--color-ink)';

/** The cell's inset lines: 1 px everywhere, except a box edge is a 3 px dark line. Both cells on a box edge know it
 * (`data-box-edges`), the line itself is drawn once, by the cell right of / below it, so the cells never move. */
function boxShadow(edges: readonly BoxEdge[]): string {
  const has = (edge: BoxEdge): boolean => edges.includes(edge);
  const thick = [
    has('left') ? `inset ${String(BOX_LINE_PX)}px 0 0 0 ${THICK}` : '',
    has('top') ? `inset 0 ${String(BOX_LINE_PX)}px 0 0 ${THICK}` : '',
  ];
  const thin = [
    has('left') ? '' : `inset 1px 0 0 0 ${THIN}`,
    has('right') ? '' : `inset -1px 0 0 0 ${THIN}`,
    has('top') ? '' : `inset 0 1px 0 0 ${THIN}`,
    has('bottom') ? '' : `inset 0 -1px 0 0 ${THIN}`,
  ];
  return [...thick, ...thin].filter((part) => part !== '').join(', ');
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

const TEXT_LOOK: Readonly<Record<'given' | 'entry' | 'plain', string>> = {
  given: 'font-bold text-ink',
  entry: 'font-normal text-info',
  plain: 'font-semibold text-ink',
};

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
      data-style={item.style}
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
          className={`font-display leading-none ${
            filled ? 'font-semibold text-white' : TEXT_LOOK[item.style ?? 'plain']
          }`}
          style={{ fontSize: ITEM_FONT_TEXT }}
        >
          {item.text}
        </span>
      )}
    </span>
  );
}

function ClueLane({
  edge,
  labels,
  count,
}: {
  readonly edge: 'top' | 'left';
  readonly labels: readonly string[] | undefined;
  readonly count: number;
}): JSX.Element {
  const top = edge === 'top';
  const gap = LANE_PAD_PX / 2;
  const template = `repeat(${String(count)}, minmax(0, 1fr))`;
  return (
    <div
      aria-hidden="true"
      data-testid={`grid-lane-${edge}`}
      className="relative"
      style={top ? { gridColumn: 2, gridRow: 1 } : { gridColumn: 1, gridRow: 2 }}
    >
      <div
        className={`absolute grid rounded-lg bg-grid-cell-alt font-display font-bold text-ink ${
          top ? 'inset-x-0 top-0' : 'inset-y-0 left-0'
        }`}
        style={{
          ...(top ? { bottom: gap } : { right: gap }),
          ...(top ? { gridTemplateColumns: template } : { gridTemplateRows: template }),
          fontSize: LANE_FONT_PX,
          lineHeight: `${String(LANE_LINE_PX)}px`,
        }}
      >
        {Array.from({ length: count }, (_, index) => {
          const words = clueLines(labels?.[index] ?? '');
          return (
            <div
              key={index}
              data-testid={`grid-clue-${edge}-${String(index)}`}
              className={`flex shadow-[inset_0_0_0_1px_var(--color-grid-line)] ${
                top ? 'flex-col items-center justify-end pb-0.5' : 'items-center justify-end pr-2'
              }`}
            >
              {top ? words.map((word, at) => <span key={at}>{word}</span>) : words.join(' ')}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const MARK_FONT = 'calc(var(--grid-cell, 3rem) * 0.25)';

function CellMarks({
  marks,
  testId,
}: {
  readonly marks: readonly string[];
  readonly testId: string;
}): JSX.Element {
  // Up to 4 marks fill a 2 × 2 mini grid, more a 3 × 3 one; in the order given, row by row.
  const side = marks.length <= 4 ? 2 : 3;
  return (
    <span
      aria-hidden="true"
      data-testid={testId}
      className="pointer-events-none absolute inset-[6%] grid place-items-center"
      style={{
        gridTemplateColumns: `repeat(${String(side)}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${String(side)}, minmax(0, 1fr))`,
        fontSize: MARK_FONT,
      }}
    >
      {marks.map((mark, index) => (
        <span key={index} className="font-display font-semibold leading-none text-muted">
          {mark}
        </span>
      ))}
    </span>
  );
}

/** A generic grid of square cells (robot maps, mazes, sudoku, arrays, picture-cross clues) that takes the largest cell size fitting
 * its parent, clue lanes included (the parent must give it a width and a height). View mode: every cell is a labelled `role="img"`; tap mode (`onCellTap`): a
 * labelled button, arrow keys move between cells. The actor slides between cells; nothing here knows any rule. */
export function GridBoard({
  size,
  cells,
  actor,
  trail,
  highlights,
  onCellTap,
  cellLabel,
  boxes,
  edgeLabels,
  label,
  className,
}: GridBoardProps): JSX.Element {
  const { cols, rows } = size;
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const lanes = laneSizes(edgeLabels);
  const hasLanes = lanes.top > 0 || lanes.left > 0;
  const { areaRef, cell: cellPx } = useGridFit(size, lanes);
  const showMarks = cellPx === null || cellPx >= MARKS_MIN_CELL_PX;
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
          width: cellPx * cols + 2 * GRID_FRAME_PX + lanes.left,
          height: cellPx * rows + 2 * GRID_FRAME_PX + lanes.top,
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
      const marks = visibleMarks(content, showMarks);
      const clues = [edgeLabels?.top?.[x], edgeLabels?.left?.[y]]
        .map((clue) => clueLines(clue ?? '').join(' '))
        .filter((clue) => clue !== '');
      const name = cellLabel
        ? cellLabel(cell)
        : defaultCellLabel(cell, content, actor, highlight, marks, clues);
      const edges = boxEdges(size, boxes, cell);
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
          {marks.length > 0 && (
            <CellMarks marks={marks} testId={`grid-marks-${String(x)}-${String(y)}`} />
          )}
        </>
      );

      const common = {
        'aria-label': name,
        'data-testid': `grid-cell-${String(x)}-${String(y)}`,
        'data-highlight': highlight,
        'data-box-edges': edges.length > 0 ? edges.join(' ') : undefined,
        style: edges.length > 0 ? { boxShadow: boxShadow(edges) } : undefined,
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

  const cellsArea = (
    <div
      className="relative h-full w-full overflow-hidden rounded-lg"
      style={hasLanes ? { gridColumn: 2, gridRow: 2 } : undefined}
    >
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
  );

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
        {hasLanes ? (
          <div
            className="grid h-full w-full"
            style={{
              gridTemplateColumns: `${String(lanes.left)}px minmax(0, 1fr)`,
              gridTemplateRows: `${String(lanes.top)}px minmax(0, 1fr)`,
            }}
          >
            {lanes.top > 0 && <ClueLane edge="top" labels={edgeLabels?.top} count={cols} />}
            {lanes.left > 0 && <ClueLane edge="left" labels={edgeLabels?.left} count={rows} />}
            {cellsArea}
          </div>
        ) : (
          cellsArea
        )}
      </div>
    </div>
  );
}
