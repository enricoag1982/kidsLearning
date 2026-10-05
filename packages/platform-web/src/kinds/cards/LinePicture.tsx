// The card kit's number-line picture: a line with a tick every `step`, the ends labelled and each mark a dot with its number above it.
// Everything is `aria-hidden`: the prompt that shows it names it (`lineLabel` in `item-label.ts`).
import type { JSX } from 'react';
import type { CardLine } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import { endLabels, LINE_BOX, LINE_TICK, lineTicks, lineX } from './line-geometry.ts';

export interface LinePictureProps {
  readonly line: CardLine;
}

const INK = { stroke: 'var(--color-ink)' } as const;
const TEXT_CLASS = 'font-display font-bold';

/** One number line drawn as an SVG that fills its parent's width (its height follows the box's proportions). The ends are taller ticks;
 * a dot (`--color-today`, outlined in ink) sits on each mark with its number above it. */
export function LinePicture({ line }: LinePictureProps): JSX.Element {
  const { y } = LINE_BOX;
  return (
    <svg
      viewBox={`0 0 ${String(LINE_BOX.width)} ${String(LINE_BOX.height)}`}
      aria-hidden="true"
      focusable="false"
      data-line-from={line.from}
      data-line-to={line.to}
      className="h-auto w-full"
    >
      <line
        x1={LINE_BOX.left}
        x2={LINE_BOX.right}
        y1={y}
        y2={y}
        style={INK}
        strokeWidth={3}
        strokeLinecap="round"
      />
      {lineTicks(line).map((tick) => {
        const end = tick === line.from || tick === line.to;
        const half = end ? LINE_TICK.endHalf : LINE_TICK.half;
        return (
          <line
            key={tick}
            data-tick={tick}
            x1={lineX(line, tick)}
            x2={lineX(line, tick)}
            y1={y - half}
            y2={y + half}
            style={INK}
            strokeWidth={end ? 3 : 2}
            strokeLinecap="round"
          />
        );
      })}
      {endLabels(line).map((end) => (
        <text
          key={end}
          data-end={end}
          x={lineX(line, end)}
          y={LINE_TICK.endBaseline}
          textAnchor="middle"
          fontSize={19}
          className={TEXT_CLASS}
          style={{ fill: 'var(--color-ink)' }}
        >
          {end}
        </text>
      ))}
      {line.marks.map((mark) => (
        <g key={mark} data-mark={mark}>
          <circle
            cx={lineX(line, mark)}
            cy={y}
            r={LINE_TICK.dot}
            style={{ fill: 'var(--color-today)', stroke: 'var(--color-ink)' }}
            strokeWidth={2.5}
          />
          <text
            x={lineX(line, mark)}
            y={LINE_TICK.markBaseline}
            textAnchor="middle"
            fontSize={22}
            className={TEXT_CLASS}
            style={{ fill: 'var(--color-ink)' }}
          >
            {mark}
          </text>
        </g>
      ))}
    </svg>
  );
}
