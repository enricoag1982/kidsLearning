import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { parseLevel } from '../core/level.ts';
import { run } from '../core/simulator.ts';
import type { Tile } from '../core/tiles.ts';
import { partialRun, stepsUntil, usePlayback } from './playback.ts';

const level = parseLevel(['S..*', '.#..', '...F']);
const tiles = (...kinds: Tile['kind'][]): Tile[] => kinds.map((kind) => ({ kind }) as Tile);
const program = tiles('right', 'right', 'right', 'up', 'down');
/** Bumps off the top at its 4th step. */
const failing = run(level, program);

describe('partialRun', () => {
  it('keeps the first steps and ends without an outcome of its own', () => {
    const part = partialRun(failing, 2);
    expect(part.steps).toEqual(failing.steps.slice(0, 2));
    expect(part.outcome).toBe('unfinished');
    expect(part.final).toBe(failing.steps[1]?.state);
  });

  it('never goes past the run or below nothing', () => {
    expect(partialRun(failing, 99).steps).toHaveLength(failing.steps.length);
    const none = partialRun(failing, -3);
    expect(none.steps).toEqual([]);
    expect(none.final).toBe(failing.final);
  });
});

describe('stepsUntil', () => {
  it('counts the steps up to and including the first step of the tile', () => {
    expect(stepsUntil(failing, program, [0])).toBe(1);
    expect(stepsUntil(failing, program, [3])).toBe(4);
  });

  it('shows the whole run when it never reaches the tile (it stopped on a bump before)', () => {
    expect(stepsUntil(failing, program, [4])).toBe(failing.steps.length);
  });

  it('a tile inside a repeat: its first step', () => {
    const looped: Tile[] = [
      { kind: 'right' },
      { kind: 'repeat', times: 3, body: [{ kind: 'down' }, { kind: 'right' }] },
    ];
    const result = run(parseLevel(['S...', '....', '...F']), looped);
    expect(stepsUntil(result, looped, [1, 1])).toBe(3);
  });

  it("a repeat's own tile: the end of its whole loop", () => {
    const looped: Tile[] = [
      { kind: 'repeat', times: 3, body: [{ kind: 'right' }] },
      { kind: 'down' },
    ];
    const result = run(parseLevel(['S...', '...F']), looped);
    expect(stepsUntil(result, looped, [0])).toBe(3);
  });
});

describe('usePlayback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  const advance = (ms: number): void => {
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  };

  it('rests until a run is played, plays it, and goes back to rest on stop', () => {
    const { result } = renderHook(() => usePlayback());
    expect(result.current.run).toBeNull();
    expect(result.current.playing).toBe(false);

    act(() => {
      result.current.play(failing);
    });
    expect(result.current.playing).toBe(true);
    advance(0);
    expect(result.current.animation.played).toHaveLength(1);
    advance(10_000);
    expect(result.current.playing).toBe(false);
    expect(result.current.animation.status).toBe('done');
    expect(result.current.animation.outcome).toBe('bumped');

    act(() => {
      result.current.stop();
    });
    expect(result.current.run).toBeNull();
    expect(result.current.animation.status).toBe('idle');
  });

  it('calls `then` once, when the last step has been shown', () => {
    const then = vi.fn();
    const { result } = renderHook(() => usePlayback());
    act(() => {
      result.current.play(failing, { then });
    });
    advance(failing.steps.length * 700 - 1);
    expect(then).not.toHaveBeenCalled();
    advance(1);
    expect(then).toHaveBeenCalledTimes(1);
    advance(20_000);
    expect(then).toHaveBeenCalledTimes(1);
  });

  it('a new play replaces the one showing: its `then` never comes', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result } = renderHook(() => usePlayback());
    act(() => {
      result.current.play(failing, { then: first });
    });
    advance(1400);
    act(() => {
      result.current.play(failing, { then: second });
    });
    advance(20_000);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('stop cancels the pending `then`', () => {
    const then = vi.fn();
    const { result } = renderHook(() => usePlayback());
    act(() => {
      result.current.play(failing, { then });
    });
    advance(700);
    act(() => {
      result.current.stop();
    });
    advance(20_000);
    expect(then).not.toHaveBeenCalled();
  });

  it('returnAfterMs: waits after the last step, then the animal rests again', () => {
    const { result } = renderHook(() => usePlayback());
    act(() => {
      result.current.play(partialRun(failing, 2), { returnAfterMs: 900 });
    });
    advance(2 * 700);
    expect(result.current.animation.status).toBe('done');
    advance(899);
    expect(result.current.run).not.toBeNull();
    advance(1);
    expect(result.current.run).toBeNull();
  });

  it('plays the same run twice by starting over', () => {
    const { result } = renderHook(() => usePlayback());
    act(() => {
      result.current.play(failing);
    });
    advance(20_000);
    expect(result.current.animation.status).toBe('done');
    act(() => {
      result.current.play(failing);
    });
    expect(result.current.animation.status).toBe('playing');
    expect(result.current.animation.played).toHaveLength(0);
  });
});
