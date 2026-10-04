import { useState } from 'react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { cellKey } from '@learn/platform-core/domain/grid';
import type { Cell } from '@learn/platform-core/domain/grid';
import { ExerciseControls } from '@learn/platform-web/kinds/ExerciseControls.tsx';
import { ExerciseFrame } from '@learn/platform-web/kinds/ExercisePlay.tsx';
import { panelBody } from '@learn/platform-web/kinds/panel-body.tsx';
import { CardPromptView } from '@learn/platform-web/kinds/cards/CardPromptView.tsx';
import { GridBoard } from '@learn/platform-web/ui/grid/GridBoard.tsx';
import type { GridCellContent, GridHighlight } from '@learn/platform-web/ui/grid/GridBoard.tsx';
import { PRIMARY_BUTTON } from '@learn/platform-web/ui/lesson/button-styles.ts';
import { ARRAY_MAX, covers } from './shape.ts';
import type { ArrayShape } from './shape.ts';
import type { ArrayPlayAreaProps } from './ui.ts';

const SIZE = { cols: ARRAY_MAX, rows: ARRAY_MAX } as const;

/** A dot in the child's array, and a place a dot could go. */
const DOT: GridCellContent = { item: { emoji: '🔵', label: 'dot' } };
const EMPTY_DOT: GridCellContent = { item: { emoji: '⚪', label: 'empty' } };

/** Every cell of the 6 x 6 grid: a filled dot inside the array (the top-left cell to the tapped corner), an empty dot outside. */
function dotCells(shape: ArrayShape | null): Record<string, GridCellContent> {
  const cells: Record<string, GridCellContent> = {};
  for (let y = 0; y < ARRAY_MAX; y += 1) {
    for (let x = 0; x < ARRAY_MAX; x += 1) {
      cells[cellKey({ x, y })] = shape !== null && covers(shape, x, y) ? DOT : EMPTY_DOT;
    }
  }
  return cells;
}

/** The hint outlines (from the hint level the engine counts): hint 2 the first row of the answer, hint 3 all its rows. The child
 * still taps the corner and Check. */
function hintOutline(
  rows: number,
  cols: number,
  hintLevel: 0 | 1 | 2 | 3,
): Record<string, GridHighlight> {
  const outline: Record<string, GridHighlight> = {};
  if (hintLevel < 2) return outline;
  const shown = hintLevel === 3 ? rows : 1;
  for (let y = 0; y < shown; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      outline[cellKey({ x, y })] = 'hint';
    }
  }
  return outline;
}

/** The dot grid, the Hint button and Check. The tapped corner is this component's draft: Check sends its shape to the engine. A
 * count of the array ("3 rows of 4") shows only after hint 2 or once solved, so there is nothing to read the answer off before. */
function ArrayPlay({
  def,
  state,
  dispatch,
  showHint,
  top,
  done,
  actions,
}: ArrayPlayAreaProps): JSX.Element {
  const { t } = useTranslation();
  const { core } = state;
  const [shape, setShape] = useState<ArrayShape | null>(null);

  const solved = core.solved;
  const { wrongShape } = state;
  // A wrong Check leaves the corner where it was ("not right"); Check waits for another corner.
  const wrongHere =
    shape !== null &&
    wrongShape !== undefined &&
    shape.rows === wrongShape.rows &&
    shape.cols === wrongShape.cols;
  const canCheck = shape !== null && !wrongHere && !solved;

  function tap(cell: Cell): void {
    if (solved) return;
    setShape({ rows: cell.y + 1, cols: cell.x + 1 });
  }

  function check(): void {
    if (shape !== null && canCheck) {
      dispatch({ type: 'make-array', rows: shape.rows, cols: shape.cols });
    }
  }

  const highlights = hintOutline(def.rows, def.cols, core.hintLevel);
  if (shape !== null && (solved || wrongHere)) {
    highlights[cellKey({ x: shape.cols - 1, y: shape.rows - 1 })] = solved ? 'good' : 'bad';
  }

  const caption =
    shape !== null && (solved || core.hintLevel >= 2)
      ? t('math.array.caption', { count: shape.rows, cols: shape.cols })
      : '';

  const board = (
    <div className="flex h-full w-full flex-col gap-2">
      <div className="min-h-0 flex-1">
        <GridBoard
          size={SIZE}
          cells={dotCells(shape)}
          highlights={highlights}
          onCellTap={tap}
          cellLabel={(cell) =>
            t(
              shape !== null && covers(shape, cell.x, cell.y)
                ? 'math.array.cell-inside'
                : 'math.array.cell',
              { row: cell.y + 1, column: cell.x + 1 },
            )
          }
          label={t('math.array.board', { size: ARRAY_MAX })}
        />
      </div>
      <div className="flex h-12 shrink-0 items-center gap-3">
        {def.prompt !== undefined && (
          <div className="h-full min-w-28">
            <CardPromptView prompt={def.prompt} compact />
          </div>
        )}
        <p
          aria-hidden="true"
          data-testid="array-caption"
          className="min-w-0 flex-1 text-center font-display text-xl font-bold text-ink"
        >
          {caption}
        </p>
      </div>
      <p role="status" data-testid="array-live" className="sr-only">
        {shape === null ? '' : t('math.array.shape', { count: shape.rows, cols: shape.cols })}
      </p>
    </div>
  );
  const controls = (
    <ExerciseControls
      showHint={showHint}
      onHint={() => {
        dispatch({ type: 'hint' });
      }}
      extras={actions}
      slot={
        <button
          type="button"
          disabled={!canCheck}
          onClick={check}
          className={`${PRIMARY_BUTTON} disabled:opacity-40`}
        >
          {t('exercise.check')}
        </button>
      }
    />
  );
  return <ExerciseFrame board={board} panel={panelBody(top, solved, done, controls)} />;
}

/** `array`'s play area: an element of `ArrayPlay` keyed by the exercise, so each exercise starts with no corner tapped. */
export function PlayArea(props: ArrayPlayAreaProps): JSX.Element {
  return <ArrayPlay key={props.def.id} {...props} />;
}
