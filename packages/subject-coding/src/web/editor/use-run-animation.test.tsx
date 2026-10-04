import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { stubMatchMedia } from '@learn/platform-web/testing/mock-media-query.ts';
import { parseLevel } from '../../core/level.ts';
import { run } from '../../core/simulator.ts';
import type { RunResult } from '../../core/simulator.ts';
import type { Tile } from '../../core/tiles.ts';
import { STEP_MS, useRunAnimation } from './use-run-animation.ts';
import type { RunAnimation } from './use-run-animation.ts';

const level = parseLevel(['S..*', '.#..', '...F']);
const tiles = (...kinds: Tile['kind'][]): Tile[] => kinds.map((kind) => ({ kind }) as Tile);

/** 5 steps, success. */
const success = run(level, tiles('right', 'right', 'right', 'down', 'down'));
/** Bumps into the rock at its 2nd step. */
const bumped = run(level, tiles('down', 'right', 'right'));
const empty = run(level, []);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('useRunAnimation', () => {
  it('is idle without a run', () => {
    const { result } = renderHook(() => useRunAnimation(null));
    expect(result.current).toEqual({ status: 'idle', played: [], current: null, outcome: null });
  });

  it('plays the first step at once, then one per 700 ms, and is done one step after the last', () => {
    const { result } = renderHook(() => useRunAnimation(success));
    expect(result.current.status).toBe('playing');
    expect(result.current.played).toHaveLength(0);

    advance(0);
    expect(result.current.played).toHaveLength(1);
    expect(result.current.current).toBe(success.steps[0]);
    expect(result.current.outcome).toBeNull();

    advance(STEP_MS - 1);
    expect(result.current.played).toHaveLength(1);
    advance(1);
    expect(result.current.played).toHaveLength(2);

    advance(3 * STEP_MS);
    expect(result.current.played).toHaveLength(5);
    expect(result.current.status).toBe('playing');

    advance(STEP_MS);
    expect(result.current.status).toBe('done');
    expect(result.current.outcome).toBe('success');
    expect(result.current.current).toBe(success.steps[4]);
  });

  it('ends with the run outcome: bumped or unfinished', () => {
    const { result, rerender } = renderHook<RunAnimation, { current: RunResult | null }>(
      ({ current }) => useRunAnimation(current),
      { initialProps: { current: bumped } },
    );
    advance(5 * STEP_MS);
    expect(result.current.status).toBe('done');
    expect(result.current.outcome).toBe('bumped');
    expect(result.current.played.at(-1)?.result).toBe('bumped');

    const unfinished = run(level, tiles('right'));
    rerender({ current: unfinished });
    advance(3 * STEP_MS);
    expect(result.current.outcome).toBe('unfinished');
  });

  it('a run without steps is done at once', () => {
    const { result } = renderHook(() => useRunAnimation(empty));
    advance(0);
    expect(result.current.status).toBe('done');
    expect(result.current.outcome).toBe('unfinished');
    expect(result.current.played).toEqual([]);
  });

  it('honours stepMs', () => {
    const { result } = renderHook(() => useRunAnimation(success, { stepMs: 100 }));
    advance(0);
    advance(100);
    expect(result.current.played).toHaveLength(2);
    advance(400);
    expect(result.current.status).toBe('done');
  });

  it('a new run starts over; null goes back to idle', () => {
    const { result, rerender } = renderHook<RunAnimation, { current: RunResult | null }>(
      ({ current }) => useRunAnimation(current),
      { initialProps: { current: success } },
    );
    advance(2 * STEP_MS);
    expect(result.current.played).toHaveLength(3);

    rerender({ current: run(level, tiles('right', 'right', 'right', 'down', 'down')) });
    expect(result.current.status).toBe('playing');
    expect(result.current.played).toHaveLength(0);
    advance(0);
    expect(result.current.played).toHaveLength(1);

    rerender({ current: null });
    expect(result.current.status).toBe('idle');
    advance(10 * STEP_MS);
    expect(result.current.status).toBe('idle');
  });

  it('calls onDone once, with the run, when the last step has been shown', () => {
    const onDone = vi.fn();
    renderHook(() => useRunAnimation(success, { onDone }));
    advance(5 * STEP_MS - 1);
    expect(onDone).not.toHaveBeenCalled();
    advance(1);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledWith(success);
    advance(10 * STEP_MS);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('stops on unmount: nothing more happens, onDone never comes', () => {
    const onDone = vi.fn();
    const { unmount } = renderHook(() => useRunAnimation(success, { onDone }));
    advance(STEP_MS);
    unmount();
    advance(20 * STEP_MS);
    expect(onDone).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('with reduced motion the end state comes at once (0 ms steps)', () => {
    const restore = stubMatchMedia('(prefers-reduced-motion: reduce)');
    try {
      const onDone = vi.fn();
      const { result } = renderHook(() => useRunAnimation(success, { onDone }));
      advance(0);
      expect(result.current.status).toBe('done');
      expect(result.current.played).toHaveLength(5);
      expect(result.current.outcome).toBe('success');
      expect(onDone).toHaveBeenCalledTimes(1);
    } finally {
      restore();
    }
  });

  it('shows the iteration and path of a step inside a repeat', () => {
    const looped = run(level, [{ kind: 'repeat', times: 3, body: [{ kind: 'right' }] }]);
    const { result } = renderHook(() => useRunAnimation(looped));
    advance(STEP_MS);
    expect(result.current.current?.path).toEqual([0, 0]);
    expect(result.current.current?.iteration).toBe(2);
  });
});
