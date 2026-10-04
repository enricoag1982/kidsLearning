// Shape tokens of the card kit: kind × colour × size × count drawn as SVG. Everything here is `aria-hidden`: the card or the
// prompt that shows a token names it (`shapeLabel`, `shapeRowLabel` in `item-label.ts`).
import type { JSX } from 'react';
import type {
  CardShape,
  ShapeColour,
  ShapeKind,
  ShapeSize,
} from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import { DEFAULT_SHAPE_SIZE } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import { clusterColumns, SHAPE_PATHS, SHAPE_SIZE_SCALE } from './shape-geometry.ts';

export interface ShapeTokenProps {
  readonly kind: ShapeKind;
  readonly colour: ShapeColour;
  /** Default `big`. */
  readonly size?: ShapeSize;
  /** Sizing classes of the box; default fills the parent. */
  readonly className?: string;
}

/** One drawn shape: its colour as the fill (`--color-shape-<colour>`, `theme.css`) under a dark outline of constant width, so
 * yellow shows on cream; the size scales the drawing inside its box. */
export function ShapeToken({
  kind,
  colour,
  size = DEFAULT_SHAPE_SIZE,
  className = 'h-full w-full',
}: ShapeTokenProps): JSX.Element {
  const scale = SHAPE_SIZE_SCALE[size];
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      data-shape={kind}
      data-colour={colour}
      data-size={size}
      className={className}
    >
      <g transform={`translate(50 50) scale(${String(scale)}) translate(-50 -50)`}>
        <path
          d={SHAPE_PATHS[kind]}
          style={{ fill: `var(--color-shape-${colour})`, stroke: 'var(--color-ink)' }}
          strokeWidth={3}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    </svg>
  );
}

export interface ShapeClusterProps {
  readonly shape: CardShape;
  /** Sizing classes of the whole cluster (a square); default `h-14 w-14`. */
  readonly className?: string;
}

/** A shape's `count` copies (1–9) as a cluster of at most 3 × 3 inside one square box. */
export function ShapeCluster({ shape, className = 'h-14 w-14' }: ShapeClusterProps): JSX.Element {
  const count = shape.count ?? 1;
  const columns = clusterColumns(count);
  return (
    <span
      aria-hidden="true"
      data-count={count}
      className={`flex flex-wrap content-center items-center justify-center ${className}`}
    >
      {Array.from({ length: count }, (_unused, index) => (
        <span key={index} className="aspect-square" style={{ width: `${String(100 / columns)}%` }}>
          <ShapeToken kind={shape.kind} colour={shape.colour} size={shape.size} />
        </span>
      ))}
    </span>
  );
}

export interface ShapeRowProps {
  readonly shapes: readonly (CardShape | 'gap')[];
  /** The smaller row of the Story step. */
  readonly compact?: boolean;
}

/** A prompt's row of tokens; `gap` is a dashed rounded box with a "?". The host names the whole row. */
export function ShapeRow({ shapes, compact = false }: ShapeRowProps): JSX.Element {
  const box = compact ? 'h-9 w-9' : 'h-12 w-12 sm:h-16 sm:w-16';
  return (
    <span
      aria-hidden="true"
      className={`flex flex-wrap items-center justify-center ${compact ? 'gap-1' : 'gap-2'}`}
    >
      {shapes.map((token, index) =>
        token === 'gap' ? (
          <span
            key={index}
            data-gap="true"
            className={`flex items-center justify-center rounded-2xl border-2 border-dashed border-edge-neutral font-display font-bold text-muted ${box} ${compact ? 'text-xl' : 'text-3xl'}`}
          >
            ?
          </span>
        ) : (
          <ShapeCluster key={index} shape={token} className={box} />
        ),
      )}
    </span>
  );
}
