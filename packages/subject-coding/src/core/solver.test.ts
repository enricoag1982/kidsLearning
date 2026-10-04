import { describe, expect, it } from 'vitest';
import { parseLevel } from './level.ts';
import { run } from './simulator.ts';
import {
  SOLVER_MAX_SIDE,
  SOLVER_MAX_STARS,
  shortestStraightLength,
  solvableWithoutRepeat,
} from './solver.ts';
import type { PrimitiveKind, Tile } from './tiles.ts';

const ARROWS: readonly PrimitiveKind[] = ['up', 'down', 'left', 'right'];
const RELATIVE: readonly PrimitiveKind[] = ['forward', 'turn-left', 'turn-right'];

describe('shortestStraightLength', () => {
  it('is the Manhattan distance on an open board with arrows', () => {
    const level = parseLevel(['S...', '....', '...F']);
    expect(shortestStraightLength(level, ARROWS, 10)).toBe(5);
  });

  it('goes round a rock', () => {
    const level = parseLevel(['S#.', '...', '..F']);
    expect(shortestStraightLength(level, ARROWS, 10)).toBe(4);
    const wall = parseLevel(['S#F', '.#.', '...']);
    expect(shortestStraightLength(wall, ARROWS, 10)).toBe(6);
  });

  it('finds the best order over several stars', () => {
    const level = parseLevel(['*S*', '...', '..F']);
    // left (star), right, right (star), down, down (flag).
    expect(shortestStraightLength(level, ARROWS, 12)).toBe(5);
  });

  it('counts turns: relative tiles need a turn to change direction', () => {
    const level = parseLevel(['S..', '..F']);
    // forward, forward, turn-right, forward
    expect(shortestStraightLength(level, RELATIVE, 10)).toBe(4);
    // facing the flag's row first
    expect(shortestStraightLength(parseLevel(['S..', '..F'], 'down'), RELATIVE, 10)).toBe(4);
  });

  it('uses a jump to cross a rock and is shorter than going round', () => {
    const level = parseLevel(['S#F']);
    expect(shortestStraightLength(level, ARROWS, 10)).toBeNull();
    expect(shortestStraightLength(level, ['jump'], 10)).toBe(1);
    expect(shortestStraightLength(level, ['forward', 'jump'], 10)).toBe(1);
  });

  it('returns null when the tray cannot do it, or the bound is too short', () => {
    const level = parseLevel(['S...', '....', '...F']);
    expect(shortestStraightLength(level, ['right'], 20)).toBeNull();
    expect(shortestStraightLength(level, ARROWS, 4)).toBeNull();
    expect(shortestStraightLength(level, ARROWS, 5)).toBe(5);
    expect(shortestStraightLength(level, [], 5)).toBeNull();
  });

  it('is never longer than a hand-written solution, and its own length is reached by a real run', () => {
    const level = parseLevel(['S..*', '.#..', '...F']);
    const solution: Tile[] = ['right', 'right', 'right', 'down', 'down'].map((kind) => ({
      kind: kind as PrimitiveKind,
    }));
    expect(run(level, solution).outcome).toBe('success');
    expect(shortestStraightLength(level, ARROWS, 8)).toBe(5);
  });

  it('a bump is never part of a solution (a rock between start and flag in a corridor)', () => {
    const level = parseLevel(['S#F']);
    expect(shortestStraightLength(level, ['right'], 10)).toBeNull();
  });

  it('is 0 when the empty program already succeeds (no star or flag the start does not hold)', () => {
    // Not reachable through `parseLevel` (a star or a flag is required): built by hand.
    const bare = { ...parseLevel(['S*']), stars: [] };
    expect(shortestStraightLength(bare, ARROWS, 3)).toBe(0);
  });

  it('ignores a repeated tray kind', () => {
    const level = parseLevel(['S.F']);
    expect(shortestStraightLength(level, ['right', 'right', 'right'], 5)).toBe(2);
  });
});

describe('solvableWithoutRepeat', () => {
  const corridor = parseLevel(['S....F']);

  it('is true when a straight-line program fits the cap', () => {
    expect(solvableWithoutRepeat(corridor, ARROWS, 5)).toBe(true);
    expect(solvableWithoutRepeat(corridor, ARROWS, 12)).toBe(true);
  });

  it('is false when the cap is one short, so only a loop can do it', () => {
    expect(solvableWithoutRepeat(corridor, ARROWS, 4)).toBe(false);
    expect(solvableWithoutRepeat(corridor, ARROWS, 2)).toBe(false);
  });

  it('is false when the tray cannot do it at all', () => {
    expect(solvableWithoutRepeat(corridor, ['left'], 12)).toBe(false);
  });
});

describe('solver guard', () => {
  it('throws on a grid over 6 × 6 and on more than 6 stars, and accepts exactly 6 × 6 with 6 stars', () => {
    const wide = parseLevel(['S......*']);
    expect(() => shortestStraightLength(wide, ARROWS, 3)).toThrow('over 6 × 6');
    const tall = parseLevel(['S', '.', '.', '.', '.', '.', '.', '*']);
    expect(() => solvableWithoutRepeat(tall, ARROWS, 3)).toThrow('over 6 × 6');
    const stars = parseLevel(['S*****', '**....']);
    expect(() => shortestStraightLength(stars, ARROWS, 3)).toThrow('7 stars is over 6');
    const fits = parseLevel(['S*****', '*.....', '......', '......', '......', '......']);
    expect(SOLVER_MAX_SIDE).toBe(6);
    expect(SOLVER_MAX_STARS).toBe(6);
    expect(shortestStraightLength(fits, ARROWS, 3)).toBeNull();
  });
});

describe('solver speed', () => {
  it('searches a 6 × 6 board with 5 stars and the full tray to a deep bound well within a second', () => {
    const level = parseLevel(['S.#...', '.*..#.', '..#*..', '.#...*', '*..#..', '..*..F']);
    const started = performance.now();
    const length = shortestStraightLength(level, [...ARROWS, ...RELATIVE, 'jump'], 40);
    const elapsed = performance.now() - started;
    expect(length).not.toBeNull();
    expect(elapsed).toBeLessThan(1000);
    // And the worst case: nothing is solvable, so every reachable state is expanded.
    const unreachable = parseLevel(['S.#...', '.*#.#.', '..#*..', '.#.#.*', '*..#..', '..*..F']);
    const worstStarted = performance.now();
    shortestStraightLength(unreachable, [...ARROWS, ...RELATIVE, 'jump'], 60);
    expect(performance.now() - worstStarted).toBeLessThan(1000);
  });
});
