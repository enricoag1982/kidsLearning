import type { JSX } from 'react';

/** Small inline drawings of `GridBoard` (viewBox 48, colours from the `--color-grid-*` tokens in `theme.css`); all decorative. */

const FILL = 'block h-full w-full';

export function RockIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={FILL}>
      <path
        d="M7 35 L11 18 L22 8 L37 10 L43 24 L39 39 L21 42 Z"
        strokeWidth={3}
        strokeLinejoin="round"
        className="fill-grid-rock stroke-grid-rock-edge"
      />
      <path
        d="M15 21 L23 14 M28 30 L35 27"
        strokeWidth={2.5}
        strokeLinecap="round"
        className="stroke-grid-rock-edge"
        fill="none"
      />
    </svg>
  );
}

export function StarMark(): JSX.Element {
  return (
    <svg viewBox="0 0 45 45" aria-hidden="true" className={FILL}>
      <path
        d="M22.5,5 L32.8,36.7 L5.9,17.1 L39.1,17.1 L12.2,36.7 Z"
        strokeWidth={1.8}
        strokeLinejoin="round"
        className="fill-grid-star stroke-grid-star-edge"
      />
    </svg>
  );
}

export function FlagIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={FILL}>
      <path
        d="M15 41 V7"
        strokeWidth={4}
        strokeLinecap="round"
        className="stroke-ink"
        fill="none"
      />
      <path
        d="M17 8 L41 17 L17 26 Z"
        strokeWidth={2.5}
        strokeLinejoin="round"
        className="fill-grid-goal stroke-grid-goal-edge"
      />
    </svg>
  );
}

/** A footprint: pad and four toes. */
export function PawIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={`${FILL} fill-grid-trail`}>
      <ellipse cx="24" cy="31" rx="9" ry="7.5" />
      <circle cx="11.5" cy="21" r="4.2" />
      <circle cx="19.5" cy="13" r="4.2" />
      <circle cx="28.5" cy="13" r="4.2" />
      <circle cx="36.5" cy="21" r="4.2" />
    </svg>
  );
}

/** Points up; the caller rotates it. */
export function ArrowUpIcon(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      strokeWidth={3.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${FILL} stroke-edge-info`}
    >
      <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
    </svg>
  );
}

export function CheckMark(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      strokeWidth={3.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${FILL} stroke-go`}
    >
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  );
}

/** `className` picks the colour: the cross is both the "wrong" mark and a logic puzzle's crossed cell. */
export function CrossMark({ className }: { readonly className: string }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      strokeWidth={3.4}
      strokeLinecap="round"
      className={`${FILL} ${className}`}
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
