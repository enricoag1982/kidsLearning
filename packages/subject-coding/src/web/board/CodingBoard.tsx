import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { cellKey, cellPosition, sameCell } from '@learn/platform-core/domain/grid';
import type { Cell } from '@learn/platform-core/domain/grid';
import type { CardPrompt } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import { usePack } from '@learn/platform-web/app/subject.ts';
import { tContent } from '@learn/platform-web/content-text.ts';
import { CardPromptView } from '@learn/platform-web/kinds/cards/CardPromptView.tsx';
import { animalImage } from '@learn/platform-web/ui/art/animal-images.ts';
import { GridBoard } from '@learn/platform-web/ui/grid/GridBoard.tsx';
import type { GridHighlight } from '@learn/platform-web/ui/grid/GridBoard.tsx';
import type { Level } from '../../core/level.ts';
import type { StepEvent } from '../../core/simulator.ts';
import { boardModel } from './board-model.ts';

export interface CodingBoardProps {
  readonly level: Level;
  /** The steps of the run shown so far; none = the animal rests at the start. */
  readonly played: readonly StepEvent[];
  /** A heading arrow beside the animal (the lesson uses relative tiles). */
  readonly showHeading: boolean;
  /** By `cellKey`. */
  readonly highlights?: Readonly<Record<string, GridHighlight>>;
  /** Every cell is a button (predict). */
  readonly onCellTap?: (cell: Cell) => void;
  /** The exercise's card prompt (an emoji, a big text, an image), small above the grid. */
  readonly prompt?: CardPrompt;
}

const HIGHLIGHT_TEXT: Readonly<Record<GridHighlight, string>> = {
  target: 'coding.board.target',
  good: 'coding.board.good',
  bad: 'coding.board.bad',
  hint: 'coding.board.hint',
  selected: 'coding.board.hint',
};

/** The grid of a level: rocks, the stars still to collect, the flag, the animal (the pack's `actor` image, else the platform's fox)
 * with its heading when it matters, and the footprints of the run so far. Accessible names are this subject's own texts. */
export function CodingBoard({
  level,
  played,
  showHeading,
  highlights,
  onCellTap,
  prompt,
}: CodingBoardProps): JSX.Element {
  const { t } = useTranslation();
  const pack = usePack();
  const model = boardModel(level, played);
  const { actor } = model;

  const actorLabel = showHeading
    ? tContent(t, 'coding.board.actor-facing', {
        heading: tContent(t, `coding.board.heading.${actor.heading}`),
      })
    : tContent(t, 'coding.board.actor');

  function cellLabel(cell: Cell): string {
    const { row, column } = cellPosition(cell);
    const content = model.cells[cellKey(cell)];
    const highlight = highlights?.[cellKey(cell)];
    return [
      tContent(t, 'coding.board.cell', { row, column }),
      content?.wall === true ? tContent(t, 'coding.board.rock') : '',
      content?.star === true ? tContent(t, 'coding.board.star') : '',
      content?.goal === true ? tContent(t, 'coding.board.flag') : '',
      sameCell(cell, actor.cell) ? actorLabel : '',
      highlight === undefined ? '' : tContent(t, HIGHLIGHT_TEXT[highlight]),
    ]
      .filter((part) => part !== '')
      .join(', ');
  }

  return (
    <div className="flex h-full w-full flex-col gap-2">
      {prompt !== undefined && (
        <div className="h-20 flex-none">
          <CardPromptView prompt={prompt} compact />
        </div>
      )}
      <div className="min-h-0 flex-1">
        <GridBoard
          size={level.size}
          cells={model.cells}
          actor={{
            cell: actor.cell,
            ...(showHeading ? { heading: actor.heading } : {}),
            image: animalImage('actor', pack.art),
            label: actorLabel,
            bumped: actor.bumped,
          }}
          trail={model.trail}
          {...(highlights === undefined ? {} : { highlights })}
          {...(onCellTap === undefined ? {} : { onCellTap })}
          cellLabel={cellLabel}
          label={tContent(t, 'coding.board.label', {
            cols: level.size.cols,
            rows: level.size.rows,
          })}
        />
      </div>
    </div>
  );
}
