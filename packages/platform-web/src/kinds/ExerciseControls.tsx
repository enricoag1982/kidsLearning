import type { JSX, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Svg } from '../ui/ds/icons.tsx';
import { SECONDARY_BUTTON } from '../ui/lesson/button-styles.ts';

const HintIcon = (): JSX.Element => (
  <Svg size={26}>
    <path d="M9 18h6" />
    <path d="M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
  </Svg>
);

/** `normal`: the 56 px `compact` buttons of the game screens. `large`: every button in the row is 64 px tall, like the other targets of
 * the card kit (docs/screens.md §1; the kit's answer buttons, tiles and pad keys are 64 px or more). */
export type ControlsSize = 'normal' | 'large';

export interface ExerciseControlsProps {
  readonly showHint: boolean;
  readonly onHint: () => void;
  /** A read-only chip that leads the row (a move-counted kind's Moves counter). */
  readonly info?: ReactNode;
  /** select-squares' Check button, or a move-counted kind's Undo button; `undefined` otherwise. */
  readonly slot?: ReactNode;
  /** The host's own buttons for this row (`PlayAreaProps.actions`: Skip on a guided try, the Easier offer). */
  readonly extras?: ReactNode;
  /** Default `normal`. `large` reaches the host's buttons (`extras`) as well, through the row. */
  readonly size?: ControlsSize;
}

/** The exercise's one action row: leading chip, Hint (unless hidden), the kind's extra button, then the host's extras. The buttons
 * (`compact`) share the row's width equally while each fits at its content width; the row wraps when they do not. */
export function ExerciseControls({
  showHint,
  onHint,
  info,
  slot,
  extras,
  size = 'normal',
}: ExerciseControlsProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div
      data-controls-size={size}
      className={`@container flex flex-wrap items-center gap-3${size === 'large' ? ' [&>button]:h-16' : ''}`}
    >
      {info}
      {showHint && (
        <button type="button" onClick={onHint} className={SECONDARY_BUTTON}>
          <HintIcon />
          {t('exercise.hint')}
        </button>
      )}
      {slot}
      {extras}
    </div>
  );
}
