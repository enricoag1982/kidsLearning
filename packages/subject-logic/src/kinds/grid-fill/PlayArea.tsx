import { useRef, useState } from 'react';
import type { FocusEvent, JSX, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { Cell } from '@learn/platform-core/domain/grid';
import { ExerciseControls } from '@learn/platform-web/kinds/ExerciseControls.tsx';
import { ExerciseFrame } from '@learn/platform-web/kinds/ExercisePlay.tsx';
import { panelBody } from '@learn/platform-web/kinds/panel-body.tsx';
import { CardPromptView } from '@learn/platform-web/kinds/cards/CardPromptView.tsx';
import { GridBoard } from '@learn/platform-web/ui/grid/GridBoard.tsx';
import {
  FEEDBACK_MS,
  useCellShake,
  useEngineFilled,
  useFresh,
} from '../../web/grid-fill-feedback.ts';
import {
  boardCells,
  boxesOf,
  clueLabels,
  highlightsOf,
  indexOf,
  unitIndices,
} from './board-model.ts';
import type { BoardRings } from './board-model.ts';
import { DigitPad, NotesToggle, ToolPicker } from './controls.tsx';
import type { CrossTool } from './controls.tsx';
import type { GridFillPlayAreaProps } from './ui.ts';

/** `grid-cell-<column>-<row>`: the test id `GridBoard` gives every cell, read back from a focus event. */
const CELL_ID = /^grid-cell-(\d+)-(\d+)$/;

/** The board, the number pad (sudoku) or the tools (picture cross), the Notes toggle and Hint. The selected cell, the notes mode and the
 * tool are this component's own state: only an entry reaches the engine. A rejected entry shakes its cell and rings the unit that shows
 * why for a moment; a hint rings the units of its step (level 1), names the technique and rings the cell (level 2) or fills it
 * (level 3, flashing). A guided sudoku rings its target cell(s). A picture shows a "?" below the board and its `reveal` there once solved. */
function GridFillPlay({
  def,
  state,
  dispatch,
  showHint,
  top,
  done,
  actions,
}: GridFillPlayAreaProps): JSX.Element {
  const { t } = useTranslation();
  const { core } = state;
  const { puzzle } = def;
  const solved = core.solved;
  const sudoku = puzzle.rules === 'sudoku';
  const [selected, setSelected] = useState<number | null>(null);
  const [notes, setNotes] = useState(false);
  const [tool, setTool] = useState<CrossTool>('fill');
  const boardRef = useRef<HTMLDivElement | null>(null);

  const wrong = useFresh(core.wrong, FEEDBACK_MS);
  const filled = useEngineFilled(core);
  useCellShake(boardRef, puzzle, core.wrong);
  // The level-3 hint has done its step: its cell flashes instead of its units being ringed.
  const hint = core.hint?.level === 3 ? undefined : core.hint;

  const rings: BoardRings = {
    selected: sudoku && !solved && selected !== null ? selected : undefined,
    // A guided try rings the cell(s) to fill until they are filled; the selected one shows the selection instead.
    ringed: sudoku
      ? def.targets?.filter((cell) => core.cells[cell] === undefined && cell !== selected)
      : undefined,
    hint: hint?.units.flatMap((unit) => unitIndices(puzzle, unit)),
    target: hint?.level === 2 ? hint.cell : undefined,
    bad: wrong?.conflict === undefined ? undefined : unitIndices(puzzle, wrong.conflict),
    good: filled,
  };

  /** A digit into the selected empty cell (a note in notes mode); with no cell selected, the Owl asks for one. */
  function enter(digit: number): void {
    if (solved) {
      return;
    }
    if (selected === null) {
      dispatch({ type: 'tap-first' });
      return;
    }
    // A given or an entry already there: nothing to put.
    if (core.cells[selected] !== undefined) {
      return;
    }
    dispatch(
      notes
        ? { type: 'toggle-mark', cell: selected, value: digit }
        : { type: 'set-cell', cell: selected, value: digit },
    );
  }

  /** A tap: a sudoku selects the cell; a picture applies the tool (Cross on a crossed cell takes the cross back). */
  function tap(cell: Cell): void {
    if (solved) {
      return;
    }
    const index = indexOf(puzzle, cell);
    if (sudoku) {
      setSelected(index);
      return;
    }
    const current = core.cells[index];
    if (current === undefined) {
      dispatch({ type: 'set-cell', cell: index, value: tool });
    } else if (current === 'cross' && tool === 'cross') {
      dispatch({ type: 'clear-cell', cell: index });
    }
  }

  // The arrow keys move the board's focus (`GridBoard`); the selection of a sudoku follows it.
  function followFocus(event: FocusEvent<HTMLDivElement>): void {
    const match = CELL_ID.exec(
      event.target instanceof HTMLElement ? (event.target.dataset['testid'] ?? '') : '',
    );
    if (sudoku && !solved && match !== null) {
      setSelected(indexOf(puzzle, { x: Number(match[1]), y: Number(match[2]) }));
    }
  }

  function typeDigit(event: KeyboardEvent<HTMLDivElement>): void {
    if (!sudoku || event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) {
      return;
    }
    const digit = Number(event.key);
    if (Number.isInteger(digit) && digit >= 1 && digit <= puzzle.size) {
      event.preventDefault();
      enter(digit);
    }
  }

  const labels = puzzle.rules === 'picture-cross' ? clueLabels(puzzle) : undefined;
  const boxes = puzzle.rules === 'sudoku' ? boxesOf(puzzle) : undefined;
  // A picture with a `reveal` has a slot below the board from the start ("?"), so the drawing is never covered and the board never moves.
  const revealSlot = puzzle.rules === 'picture-cross' ? puzzle.reveal : undefined;

  const board = (
    <div className="flex h-full w-full flex-col gap-2">
      {def.prompt !== undefined && (
        <div className="shrink-0">
          <CardPromptView prompt={def.prompt} compact />
        </div>
      )}
      {/* Focus and key events bubble up from the board's own cell buttons; the wrapper is no control. */}
      <div
        ref={boardRef}
        data-testid="grid-fill-board"
        className="relative min-h-0 flex-1 [container-type:size]"
        onFocus={followFocus}
        onKeyDown={typeDigit}
      >
        <GridBoard
          size={{ cols: puzzle.size, rows: puzzle.size }}
          cells={boardCells(puzzle, core)}
          highlights={highlightsOf(puzzle, rings)}
          onCellTap={tap}
          {...(boxes === undefined ? {} : { boxes })}
          {...(labels === undefined ? {} : { edgeLabels: labels })}
          label={t(sudoku ? 'grid.board.sudoku' : 'grid.board.cross', { size: puzzle.size })}
        />
      </div>
      {revealSlot !== undefined && (
        <div className="flex h-14 shrink-0 items-center justify-center">
          {solved ? (
            <span
              role="img"
              aria-label={t('grid.reveal')}
              data-testid="grid-reveal"
              className="group-drop rounded-2xl bg-card px-4 py-1 text-4xl leading-none shadow"
            >
              {revealSlot}
            </span>
          ) : (
            <span
              aria-hidden="true"
              data-testid="grid-reveal-slot"
              className="flex h-12 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-edge-neutral font-display text-2xl leading-none font-bold text-muted"
            >
              ?
            </span>
          )}
        </div>
      )}
    </div>
  );

  const controls = (
    <div className="@container flex flex-col gap-3">
      {sudoku ? (
        <DigitPad size={puzzle.size} notes={notes} onDigit={enter} />
      ) : (
        <ToolPicker tool={tool} onPick={setTool} />
      )}
      <ExerciseControls
        showHint={showHint}
        onHint={() => {
          dispatch({ type: 'hint' });
        }}
        slot={
          sudoku ? (
            <NotesToggle
              on={notes}
              onToggle={() => {
                setNotes((on) => !on);
              }}
            />
          ) : undefined
        }
        extras={actions}
      />
    </div>
  );
  return <ExerciseFrame board={board} panel={panelBody(top, solved, done, controls)} />;
}

/** `grid-fill`'s play area: an element of `GridFillPlay` keyed by the exercise, so each exercise starts with nothing selected, notes
 * off and the Fill tool. */
export function PlayArea(props: GridFillPlayAreaProps): JSX.Element {
  return <GridFillPlay key={props.def.id} {...props} />;
}
