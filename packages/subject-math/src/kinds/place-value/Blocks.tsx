import type { JSX } from 'react';
import type { PlaceName } from './model.ts';

/** Blocks lie in rows of 3 (a count up to 9 is 3 rows at most), every column drawn on one `VIEW_WIDTH` x `VIEW_HEIGHT` sheet so
 * the four places keep their sizes against each other (a one is a small cube, a ten a rod, a hundred a flat square, a thousand a
 * big cube) and the sheet scales to the column. */
const PER_ROW = 3;
const PITCH_X = 25;
const VIEW_WIDTH = PER_ROW * PITCH_X;
/** Row pitch per place: the block's height and a gap. */
const PITCH_Y: Readonly<Record<PlaceName, number>> = {
  thousands: 29,
  hundreds: 27,
  tens: 38,
  ones: 20,
};
const VIEW_HEIGHT = 3 * PITCH_Y.tens - 4;

/** Flat colours per place (theme tokens): fill and a darker edge. */
const LOOK: Readonly<Record<PlaceName, string>> = {
  thousands: 'fill-info stroke-edge-info',
  hundreds: 'fill-go stroke-edge-go',
  tens: 'fill-today stroke-edge-today',
  ones: 'fill-grid-star stroke-grid-star-edge',
};

/** The faint lines that show a rod's 10 cubes and a flat's 10 x 10. */
const LINES = 'stroke-edge-neutral opacity-40';

/** Where a block `width` wide starts in its cell, so it sits in the middle. */
const centred = (x: number, width: number): number => x + (PITCH_X - width) / 2;

/** A polygon's `points` attribute from its corners. */
const points = (...corners: readonly (readonly [number, number])[]): string =>
  corners.map(([x, y]) => `${String(x)},${String(y)}`).join(' ');

/** `n` evenly spaced offsets strictly inside `0..size`. */
const inner = (size: number, parts: number): number[] =>
  Array.from({ length: parts - 1 }, (_unused, index) => ((index + 1) * size) / parts);

function Cube({ x, y }: { readonly x: number; readonly y: number }): JSX.Element {
  return <rect x={centred(x, 16)} y={y} width={16} height={16} rx={2.5} strokeWidth={1.2} />;
}

function Rod({ x, y }: { readonly x: number; readonly y: number }): JSX.Element {
  const left = centred(x, 12);
  return (
    <>
      <rect x={left} y={y} width={12} height={34} rx={2.5} strokeWidth={1.2} />
      {inner(34, 10).map((offset) => (
        <line
          key={offset}
          x1={left}
          x2={left + 12}
          y1={y + offset}
          y2={y + offset}
          strokeWidth={0.6}
          className={LINES}
        />
      ))}
    </>
  );
}

function Flat({ x, y }: { readonly x: number; readonly y: number }): JSX.Element {
  const left = centred(x, 23);
  return (
    <>
      <rect x={left} y={y} width={23} height={23} rx={2.5} strokeWidth={1.2} />
      {inner(23, 10).map((offset) => (
        <g key={offset} strokeWidth={0.5} className={LINES}>
          <line x1={left + offset} x2={left + offset} y1={y} y2={y + 23} />
          <line x1={left} x2={left + 23} y1={y + offset} y2={y + offset} />
        </g>
      ))}
    </>
  );
}

/** A big cube: a front face, with its top and its side as lighter faces of the same colour. */
function BigCube({ x, y }: { readonly x: number; readonly y: number }): JSX.Element {
  const left = centred(x, 23);
  const top = y + 6;
  return (
    <>
      <polygon
        points={points([left, top], [left + 6, y], [left + 23, y], [left + 17, top])}
        fillOpacity={0.55}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <polygon
        points={points(
          [left + 18, top],
          [left + 24, y],
          [left + 24, y + 18],
          [left + 18, top + 18],
        )}
        fillOpacity={0.8}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <rect x={left} y={top} width={17} height={17} rx={1.5} strokeWidth={1.2} />
    </>
  );
}

const SHAPE: Readonly<
  Record<PlaceName, (props: { readonly x: number; readonly y: number }) => JSX.Element>
> = { thousands: BigCube, hundreds: Flat, tens: Rod, ones: Cube };

export interface BlocksProps {
  readonly place: PlaceName;
  /** How many blocks lie in the column, 0-9. */
  readonly count: number;
}

/** The blocks of one column: `count` blocks of `place` in rows of 3, from the top left. Decoration only: the column's group name
 * and its live region say the count. */
export function Blocks({ place, count }: BlocksProps): JSX.Element {
  const Shape = SHAPE[place];
  return (
    <svg
      viewBox={`0 0 ${String(VIEW_WIDTH)} ${String(VIEW_HEIGHT)}`}
      preserveAspectRatio="xMidYMin meet"
      aria-hidden="true"
      data-place={place}
      data-count={count}
      className={`h-full w-full ${LOOK[place]}`}
    >
      {Array.from({ length: count }, (_unused, index) => (
        <g key={index} data-block={place}>
          <Shape x={(index % PER_ROW) * PITCH_X} y={Math.floor(index / PER_ROW) * PITCH_Y[place]} />
        </g>
      ))}
    </svg>
  );
}
