// The `grid-fill` controls: the number pad of a sudoku, the Notes toggle, and a picture's tool picker (Fill / Cross). Every button is
// 56 px or taller (docs/screens.md §1); the pad wraps into 2 rows on a narrow panel and stays 1 row where 6 buttons fit.
import type { JSX, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Svg } from '@learn/platform-web/ui/ds/icons.tsx';
import { tapClass } from '@learn/platform-web/ui/ds/tap.ts';

/** A picture's tools: fill a cell, or cross it out. */
export type CrossTool = 'fill' | 'cross';

const TOOLS: readonly CrossTool[] = ['fill', 'cross'];

const DIGIT_SHAPE =
  'flex h-14 min-w-14 items-center justify-center rounded-2xl font-display text-2xl font-semibold';

function PencilIcon(): JSX.Element {
  return (
    <Svg size={24}>
      <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z" />
      <path d="M14.5 6.5l3 3" />
    </Svg>
  );
}

export interface DigitPadProps {
  readonly size: number;
  /** Notes mode: the buttons are named "Note 3" and look like the Notes toggle. */
  readonly notes: boolean;
  readonly onDigit: (digit: number) => void;
}

/** Buttons 1..size. A 4-digit pad is one row; 6 digits are one row where the panel is at least 22 rem (a phone, a tablet in
 * portrait) and two rows of 3 on the narrow side panel of a landscape tablet. */
export function DigitPad({ size, notes, onDigit }: DigitPadProps): JSX.Element {
  const { t } = useTranslation();
  const layout =
    size <= 4 ? 'grid-cols-4 gap-2' : 'grid-cols-3 gap-2 @[22rem]:grid-cols-6 @[22rem]:gap-1';
  return (
    <div
      role="group"
      aria-label={t('grid.digits')}
      data-testid="grid-digits"
      className={`grid ${layout}`}
    >
      {Array.from({ length: size }, (_, index) => index + 1).map((digit) => (
        <button
          key={digit}
          type="button"
          aria-label={t(notes ? 'grid.note' : 'grid.put', { digit })}
          onClick={() => {
            onDigit(digit);
          }}
          className={tapClass('custom', notes ? 'info' : 'neutral', DIGIT_SHAPE)}
        >
          {digit}
        </button>
      ))}
    </div>
  );
}

export interface NotesToggleProps {
  readonly on: boolean;
  readonly onToggle: () => void;
}

/** The Notes toggle: a pencil and the word, `aria-pressed`; on, it is blue like the notes-mode pad. */
export function NotesToggle({ on, onToggle }: NotesToggleProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={tapClass(
        'compact',
        on ? 'info' : 'neutral',
        // The pressed state is also a ring, never colour alone.
        on ? 'ring-4 ring-info/40' : '',
      )}
    >
      <PencilIcon />
      {t('grid.notes')}
    </button>
  );
}

export interface ToolPickerProps {
  readonly tool: CrossTool;
  readonly onPick: (tool: CrossTool) => void;
}

const TOOL_GLYPH: Readonly<Record<CrossTool, string>> = { fill: '■', cross: '✕' };

/** The picture's tool radio group: Fill (■) and Cross (✕); one is a tab stop, the arrow keys move between them like a native group. */
export function ToolPicker({ tool, onPick }: ToolPickerProps): JSX.Element {
  const { t } = useTranslation();

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (step === 0) {
      return;
    }
    event.preventDefault();
    const nextIndex = (index + step + TOOLS.length) % TOOLS.length;
    const next = TOOLS[nextIndex];
    if (next === undefined) {
      return;
    }
    onPick(next);
    const radios =
      event.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="radio"]');
    radios?.[nextIndex]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={t('grid.tool')}
      data-testid="grid-tools"
      className="grid grid-cols-2 gap-2"
    >
      {TOOLS.map((candidate, index) => {
        const selected = candidate === tool;
        return (
          <button
            key={candidate}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            data-tool={candidate}
            onClick={() => {
              onPick(candidate);
            }}
            onKeyDown={(event) => {
              onKeyDown(event, index);
            }}
            className={tapClass(
              'compact',
              selected ? 'go' : 'neutral',
              selected ? 'ring-4 ring-go/40' : '',
            )}
          >
            <span aria-hidden="true" className="text-xl leading-none">
              {TOOL_GLYPH[candidate]}
            </span>
            {t(candidate === 'fill' ? 'grid.fill' : 'grid.cross')}
          </button>
        );
      })}
    </div>
  );
}
