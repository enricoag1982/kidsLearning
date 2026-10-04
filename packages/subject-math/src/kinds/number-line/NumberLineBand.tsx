import { useRef } from 'react';
import type { JSX, KeyboardEvent, PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { NumberLineDef } from './def.ts';
import { keyTarget, nearestInteger, nearestTick, tickValues } from './ticks.ts';

/** The band's height: the line, the marker above it, two rows of numbers below. Fixed, so a hint never moves the line under a finger. */
const BAND = 'h-[152px]';
/** Where the line runs, from the band's top (px), and the marker's pin height. */
const LINE_Y = 88;
const PIN_HEIGHT = 56;
/** More numbered ticks than this: every other number drops to a second row, so the numbers never touch. */
const STAGGER_ABOVE = 6;

export interface NumberLineBandProps {
  readonly def: NumberLineDef;
  /** The marker's value, or `null` while none is placed. */
  readonly marker: number | null;
  /** The ticks that show their number now (the def's labels plus what the hints add). */
  readonly numbered: ReadonlySet<number>;
  /** Show the marker's value above it (after hint 3 or once solved). */
  readonly showValue: boolean;
  readonly status: 'idle' | 'wrong' | 'good';
  /** Changes with each wrong Check, so the shake restarts when the same value is checked wrong twice. */
  readonly shakeKey: number;
  /** Nothing moves once solved. */
  readonly locked: boolean;
  readonly onMove: (value: number) => void;
  readonly onCheck: () => void;
}

const PIN_COLOR = { idle: 'text-info', wrong: 'text-today', good: 'text-go' } as const;

/** The number line itself: a slider (`role="slider"`) the child taps, drags or moves with the keys. An exact item snaps to the
 * nearest tick, an estimate item to the nearest whole number; arrows move one tick (exact) or one (estimate), Page keys one
 * interval, Home / End the ends, Enter checks. */
export function NumberLineBand({
  def,
  marker,
  numbered,
  showValue,
  status,
  shakeKey,
  locked,
  onMove,
  onCheck,
}: NumberLineBandProps): JSX.Element {
  const { t } = useTranslation();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const estimate = def.tolerance > 0;
  const span = def.to - def.from;
  const percent = (value: number): number => ((value - def.from) / span) * 100;

  const ticks = tickValues(def);
  const numberedTicks = ticks.filter((tick) => numbered.has(tick));
  const stagger = numberedTicks.length > STAGGER_ABOVE;

  function moveTo(clientX: number): void {
    const track = trackRef.current;
    if (track === null || locked) return;
    const rect = track.getBoundingClientRect();
    const raw = def.from + ((clientX - rect.left) / rect.width) * span;
    onMove(estimate ? nearestInteger(def, raw) : nearestTick(def, raw));
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>): void {
    if (locked) return;
    dragging.current = true;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // No pointer capture (an old browser, a test DOM): the drag then follows the pointer inside the band only.
    }
    moveTo(event.clientX);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>): void {
    if (dragging.current) moveTo(event.clientX);
  }

  function onPointerEnd(): void {
    dragging.current = false;
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (locked || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      onCheck();
      return;
    }
    const target = keyTarget(def, marker ?? def.from, event.key);
    if (target === undefined) return;
    event.preventDefault();
    onMove(target);
  }

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={t('math.line.label', { from: def.from, to: def.to, step: def.step })}
      aria-valuemin={def.from}
      aria-valuemax={def.to}
      aria-valuenow={marker ?? def.from}
      aria-valuetext={
        marker === null ? t('math.line.no-marker') : t('math.line.marker-at', { value: marker })
      }
      aria-readonly={locked}
      data-testid="number-line"
      className={`relative w-full touch-none select-none rounded-3xl border-2 bg-card ${BAND} ${
        status === 'good' ? 'border-go' : 'border-edge-neutral'
      } ${locked ? '' : 'cursor-pointer'} focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-info`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onKeyDown={onKeyDown}
    >
      <div ref={trackRef} data-testid="number-line-track" className="absolute inset-y-0 inset-x-8">
        <div
          className="absolute inset-x-0 h-1.5 -translate-y-1/2 rounded-full bg-ink"
          style={{ top: LINE_Y }}
        />
        {ticks.map((tick) => {
          const isNumbered = numbered.has(tick);
          const row = stagger && isNumbered ? numberedTicks.indexOf(tick) % 2 : 0;
          return (
            <div
              key={tick}
              aria-hidden="true"
              data-testid={`number-line-tick-${String(tick)}`}
              className="absolute -translate-x-1/2"
              style={{ left: `${String(percent(tick))}%`, top: LINE_Y - (isNumbered ? 14 : 9) }}
            >
              <div className={`mx-auto w-0.5 bg-ink ${isNumbered ? 'h-7' : 'h-[18px]'}`} />
              {isNumbered && (
                <span
                  data-testid={`number-line-label-${String(tick)}`}
                  className="absolute left-1/2 -translate-x-1/2 font-display text-xs font-semibold text-ink sm:text-sm"
                  style={{ top: 28 + row * 20 }}
                >
                  {tick}
                </span>
              )}
            </div>
          );
        })}
        {marker !== null && (
          <div
            aria-hidden="true"
            data-testid="number-line-marker"
            data-status={status}
            className="pointer-events-none absolute -translate-x-1/2"
            style={{ left: `${String(percent(marker))}%`, top: LINE_Y - PIN_HEIGHT }}
          >
            {showValue && (
              <span
                data-testid="number-line-value"
                className="absolute -top-6 left-1/2 -translate-x-1/2 font-display text-xl font-bold text-ink"
              >
                {marker}
              </span>
            )}
            <div key={shakeKey} className={status === 'wrong' ? 'card-shake' : undefined}>
              <svg viewBox="0 0 40 56" width="40" height={PIN_HEIGHT} className={PIN_COLOR[status]}>
                <path
                  d="M20 55 C20 55 4 35 4 20 a16 16 0 0 1 32 0 C36 35 20 55 20 55 Z"
                  fill="currentColor"
                />
                <circle cx="20" cy="20" r="6" fill="white" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
