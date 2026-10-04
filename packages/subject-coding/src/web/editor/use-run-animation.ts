import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@learn/platform-web/ui/useMediaQuery.ts';
import type { RunResult, StepEvent } from '../../core/simulator.ts';

/** The pace of a run (docs/subjects/coding/plan.md §1 principle 7): about 0.7 s per step. */
export const STEP_MS = 700;

export type RunStatus = 'idle' | 'playing' | 'done';

export interface RunAnimation {
  /** `idle`: no run to show; `playing`: steps are being shown; `done`: all of them are. */
  readonly status: RunStatus;
  /** The steps shown so far, in order (all of them once `done`). */
  readonly played: readonly StepEvent[];
  /** The step shown last, or `null` before the first. */
  readonly current: StepEvent | null;
  /** How the run ended: `run.outcome`, once `done`. */
  readonly outcome: RunResult['outcome'] | null;
}

interface Progress {
  readonly run: RunResult;
  readonly shown: number;
  readonly done: boolean;
}

export interface RunAnimationOptions {
  /** Milliseconds per step; `prefers-reduced-motion` makes it 0 whatever this is. */
  readonly stepMs?: number;
  /** Called once when the last step has been shown (from a timer, never during render). */
  readonly onDone?: (run: RunResult) => void;
}

const IDLE: RunAnimation = { status: 'idle', played: [], current: null, outcome: null };

/** Plays `run.steps` one at a time: the first at once, then one per `stepMs`, `done` one step after the last. Passing `null` (or a
 * new run) stops what is playing and shows nothing again. With `prefers-reduced-motion` the end state comes at once. Timers are
 * cleared on unmount. */
export function useRunAnimation(
  run: RunResult | null,
  { stepMs = STEP_MS, onDone }: RunAnimationOptions = {},
): RunAnimation {
  const [progress, setProgress] = useState<Progress | null>(null);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    if (run === null) {
      return;
    }
    const total = run.steps.length;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const finish = (): void => {
      setProgress({ run, shown: total, done: true });
      onDoneRef.current?.(run);
    };
    if (prefersReducedMotion()) {
      timers.push(setTimeout(finish, 0));
    } else {
      for (let shown = 1; shown <= total; shown += 1) {
        timers.push(
          setTimeout(
            () => {
              setProgress({ run, shown, done: false });
            },
            (shown - 1) * stepMs,
          ),
        );
      }
      timers.push(setTimeout(finish, total * stepMs));
    }
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [run, stepMs]);

  if (run === null) {
    return IDLE;
  }
  const mine = progress !== null && progress.run === run ? progress : null;
  const shown = mine?.shown ?? 0;
  const played = run.steps.slice(0, shown);
  const done = mine?.done === true;
  return {
    status: done ? 'done' : 'playing',
    played,
    current: played.at(-1) ?? null,
    outcome: done ? run.outcome : null,
  };
}
