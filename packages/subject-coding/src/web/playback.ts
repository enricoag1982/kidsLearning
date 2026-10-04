// Showing a run on the board: which run, what happens when it ends, and the pieces of a run a hint replays.
import { useCallback, useEffect, useState } from 'react';
import { prefersReducedMotion } from '@learn/platform-web/ui/useMediaQuery.ts';
import type { RunResult } from '../core/simulator.ts';
import { samePath } from '../core/tiles.ts';
import type { Tile } from '../core/tiles.ts';
import { useRunAnimation } from './editor/use-run-animation.ts';
import type { RunAnimation } from './editor/use-run-animation.ts';

export interface PlayOptions {
  /** Called once when the last step has been shown (a kind UI commits its action then, so the note and the praise come after the
   * run). */
  readonly then?: () => void;
  /** After the run ended, wait this long and put the actor back at the start (a hint's replay); absent: stay where it ended. */
  readonly returnAfterMs?: number;
}

export interface Playback {
  readonly animation: RunAnimation;
  /** The run on the board, or `null` while the actor rests at the start. */
  readonly run: RunResult | null;
  readonly playing: boolean;
  /** Shows `run` from its first step; replaces whatever was showing (its `then` never comes). */
  play(run: RunResult, options?: PlayOptions): void;
  /** The actor goes back to the start. */
  stop(): void;
}

interface Shown {
  readonly run: RunResult;
  readonly options: PlayOptions;
}

/** One run at a time on the board: `play` / `stop` and the animation (`useRunAnimation`) of what is showing. */
export function usePlayback(stepMs?: number): Playback {
  const [shown, setShown] = useState<Shown | null>(null);
  const animation = useRunAnimation(shown?.run ?? null, {
    ...(stepMs === undefined ? {} : { stepMs }),
    onDone: () => {
      shown?.options.then?.();
    },
  });
  const done = animation.status === 'done';
  const returnAfterMs = shown?.options.returnAfterMs;

  useEffect(() => {
    if (!done || returnAfterMs === undefined) {
      return;
    }
    const timer = setTimeout(
      () => {
        setShown(null);
      },
      prefersReducedMotion() ? 0 : returnAfterMs,
    );
    return () => {
      clearTimeout(timer);
    };
  }, [done, returnAfterMs, shown]);

  const play = useCallback((run: RunResult, options: PlayOptions = {}) => {
    // A copy, so playing the same run twice starts over (`useRunAnimation` restarts on a new object).
    setShown({ run: { ...run }, options });
  }, []);
  const stop = useCallback(() => {
    setShown(null);
  }, []);

  return {
    animation,
    run: shown?.run ?? null,
    playing: animation.status === 'playing',
    play,
    stop,
  };
}

/** The first `steps` steps of `run`, ending without an outcome of its own (a replay, not a result). */
export function partialRun(run: RunResult, steps: number): RunResult {
  const kept = run.steps.slice(0, Math.max(0, steps));
  return { steps: kept, outcome: 'unfinished', final: kept.at(-1)?.state ?? run.final };
}

/** How many steps of `run` to show to pause on the tile at `bug` (`[top]` or `[top, body]`): up to and including its first step,
 * or for a repeat's own tile its last step (the whole loop). A run that never gets there shows all its steps. */
export function stepsUntil(
  run: RunResult,
  program: readonly Tile[],
  bug: readonly number[],
): number {
  const [top] = bug;
  const tile = top === undefined ? undefined : program[top];
  const at =
    bug.length === 1 && tile?.kind === 'repeat'
      ? run.steps.findLastIndex((step) => step.path[0] === top)
      : run.steps.findIndex((step) => samePath(step.path, bug));
  return at < 0 ? run.steps.length : at + 1;
}
