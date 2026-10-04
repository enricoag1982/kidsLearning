import type { JSX } from 'react';
import type { TileKind } from '../../core/tiles.ts';

export interface TileIconProps {
  readonly kind: TileKind;
  /** Side of the square glyph in px (default 40). */
  readonly size?: number;
  readonly className?: string;
}

/** Filled block arrow pointing up (viewBox 40); the four step arrows are this one turned. */
const ARROW = 'M20 4 L35 21 H25 V36 H15 V21 H5 Z';

const TURN_ROTATION = { up: 0, right: 90, down: 180, left: 270 } as const;

/** What the tile's colour says: steps are blue, "ahead" green, turns orange, a jump and a loop their own. */
const TONE: Readonly<Record<TileKind, string>> = {
  up: 'text-edge-info',
  down: 'text-edge-info',
  left: 'text-edge-info',
  right: 'text-edge-info',
  forward: 'text-go',
  'turn-left': 'text-today',
  'turn-right': 'text-today',
  jump: 'text-ink',
  repeat: 'text-info',
};

function Glyph({ kind }: { readonly kind: TileKind }): JSX.Element {
  switch (kind) {
    case 'up':
    case 'right':
    case 'down':
    case 'left':
      return (
        <path
          d={ARROW}
          fill="currentColor"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          transform={`rotate(${String(TURN_ROTATION[kind])} 20 20)`}
        />
      );
    case 'forward':
      return (
        <>
          <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth={3} />
          <path
            d="M20 9 L29 20 H23 V31 H17 V20 H11 Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </>
      );
    case 'turn-left':
    case 'turn-right':
      return (
        <g transform={kind === 'turn-left' ? 'translate(40 0) scale(-1 1)' : undefined}>
          <path
            d="M10 34 V23 A12 12 0 0 1 22 11 H26"
            fill="none"
            stroke="currentColor"
            strokeWidth={5}
            strokeLinecap="round"
          />
          <path
            d="M25 3 L37 11 L25 19 Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </g>
      );
    case 'jump':
      return (
        <>
          <circle cx="20" cy="32" r="4.5" fill="currentColor" />
          <path
            d="M6 28 C9 6 31 6 34 26"
            fill="none"
            stroke="currentColor"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <path
            d="M27 22 L41 22 L34 33 Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </>
      );
    case 'repeat':
      return (
        <>
          <path
            d="M8 19 A12 12 0 0 1 28 10"
            fill="none"
            stroke="currentColor"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <path
            d="M24 3 L35 9 L26 18 Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <path
            d="M32 21 A12 12 0 0 1 12 30"
            fill="none"
            stroke="currentColor"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <path
            d="M16 37 L5 31 L14 22 Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </>
      );
  }
}

/** A tile's picture: a filled arrow for each step, an arrow in a circle for "ahead", a curved arrow per turn, an arc over a dot for
 * the jump, loop arrows for the repeat. No text; decorative (the button or group around it carries the name). */
export function TileIcon({ kind, size = 40, className = '' }: TileIconProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      aria-hidden="true"
      data-tile-icon={kind}
      className={`block flex-none ${TONE[kind]} ${className}`.trim()}
    >
      <Glyph kind={kind} />
    </svg>
  );
}
